import {env} from 'cloudflare:workers';
import initial from '@/data/songs.json';
import {Song} from './model';
type Bindings={DB:D1Database;OWNER_EMAIL?:string;EDITOR_PASSWORD_HASH?:string;DRIVE_BRIDGE_URL?:string;DRIVE_BRIDGE_TOKEN?:string};
export const config=()=>env as unknown as Bindings;
export const driveReady=()=>Boolean(config().DRIVE_BRIDGE_URL&&config().DRIVE_BRIDGE_TOKEN);
async function drive(action:string,data:object={}) {
 const c=config();const u=new URL(c.DRIVE_BRIDGE_URL!);
 if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!u.pathname.startsWith('/macros/s/'))throw Error('Google Drive 同步網址設定錯誤');
 const response=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:c.DRIVE_BRIDGE_TOKEN,action,...data}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Google Drive 暫時無法連線，未變更資料');
 const result=await response.json() as {ok:boolean;error?:string;conflict?:boolean;songs?:Song[];song?:Song};
 if(!result.ok){if(result.conflict)throw new Conflict();throw Error(result.error||'Google Drive 同步失敗');}return result;
}
export class Conflict extends Error {constructor(){super('歌曲已在其他裝置更新。請重新載入後再編輯；畫面上的修改仍保留。')}}
export async function listSongs():Promise<Song[]> {
 if(driveReady()){const r=await drive('read');if(!Array.isArray(r.songs))throw Error('Google Drive 資料格式不正確');return r.songs;}
 const rows=await config().DB.prepare('SELECT data FROM songs').all<{data:string}>();
 const merged=new Map<string,Song>((initial as Song[]).map(s=>[s.id,s]));
 for(const row of rows.results) {const s=JSON.parse(row.data) as Song;merged.set(s.id,s);}return [...merged.values()].sort((a,b)=>a.number-b.number);
}
export async function saveSong(song:Song,actor:string=''):Promise<Song> {
 if(driveReady()){const r=await drive('save',{song});if(!r.song)throw Error('Google Drive 未回傳儲存結果');return r.song;}
 const c=config(), now=new Date().toISOString(),next={...song,revision:song.revision+1};
 const seed=(initial as Song[]).find(s=>s.id===song.id);
 const current=await c.DB.prepare('SELECT data,revision FROM songs WHERE id=?').bind(song.id).first<{data:string;revision:number}>();
 if((current?.revision??0)!==song.revision)throw new Conflict();
 if(!current&&song.revision!==0)throw new Conflict();
 const before=current?.data??(seed?JSON.stringify(seed):'');
 const statements=[];
 if(before)statements.push(c.DB.prepare('INSERT INTO song_history(song_id,data,saved_at,actor) SELECT ?,?,?,? WHERE COALESCE((SELECT revision FROM songs WHERE id=?),0)=?').bind(song.id,before,now,actor,song.id,song.revision));
 statements.push(c.DB.prepare('INSERT INTO songs(id,data,revision,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated=excluded.updated WHERE songs.revision=?').bind(song.id,JSON.stringify(next),next.revision,now,song.revision));
 const results=await c.DB.batch(statements);if(!results.at(-1)?.meta.changes)throw new Conflict();return next;
}
