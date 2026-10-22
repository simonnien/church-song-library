import {editor,passwordRecord,sameOrigin,isAdmin} from '@/lib/auth';
import {config,driveReady} from '@/lib/store';
import type {Song} from '@/lib/model';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request)||!await isAdmin())return reply({error:'僅管理者可修改歌曲編號'},403);
 if(driveReady())return reply({error:'Drive 模式尚不支援改編號'},409);
 try{
  const raw=await request.text();if(raw.length>1024)return reply({error:'內容過長'},413);
  const {id,number,revision}=JSON.parse(raw);
  if(typeof id!=='string'||!/^\d{1,8}$/.test(id)||!Number.isInteger(number)||number<1||number>99999999||!Number.isInteger(revision)||revision<0)return reply({error:'請輸入 1～99999999 的整數編號'},400);
  const db=config().DB,newId=String(number).padStart(3,'0');
  const current=await db.prepare('SELECT data,revision FROM songs WHERE id=?').bind(id).first<{data:string;revision:number}>();
  if(!current||current.revision!==revision)return reply({error:'歌曲已更新，請重新整理後再試'},409);
  const song=JSON.parse(current.data) as Song;if(song.number===number)return reply({song});
  const conflict=await db.prepare('SELECT data FROM songs WHERE CAST(id AS INTEGER)=?').bind(number).first<{data:string}>();
  if(conflict){const s=JSON.parse(conflict.data);return reply({error:`編號 ${number} 已被「${s.title}」使用，請改選其他編號或使用交換功能`,conflict:{id:s.id,title:s.title}},409);}
  const next={...song,id:newId,number,revision:Math.max(Date.now(),revision+1)},now=new Date().toISOString();
  const guard='EXISTS(SELECT 1 FROM songs WHERE id=? AND revision=?) AND NOT EXISTS(SELECT 1 FROM songs WHERE CAST(id AS INTEGER)=?)';
  const args=[id,revision,number];
  const result=await db.batch([
   db.prepare(`INSERT INTO song_history(song_id,data,saved_at,actor) SELECT ?,data,?,'beersheba01' FROM songs WHERE id=? AND ${guard}`).bind(newId,now,id,...args),
   db.prepare(`INSERT INTO retired_song_ids(id,replacement) SELECT ?,? WHERE ${guard} ON CONFLICT(id) DO UPDATE SET replacement=excluded.replacement`).bind(id,newId,...args),
   db.prepare(`UPDATE songs SET id=?,data=?,revision=?,updated=? WHERE id=? AND ${guard}`).bind(newId,JSON.stringify(next),next.revision,now,id,...args),
  ]);
  if(result[2].meta.changes!==1)return reply({error:'編號或歌曲已被其他人更新，請重新整理'},409);
  return reply({song:next});
 }catch{return reply({error:'修改失敗，請重新整理確認歌曲與編號'},500)}
}
