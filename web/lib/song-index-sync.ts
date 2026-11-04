import {config} from './store';
export async function flushSongIndex(){
 const {DB,INDEX_SYNC_URL:url,INDEX_SYNC_TOKEN:token}=config();
 if(!url||!token)return 'unconfigured';
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))return 'invalid';
 try{
 const {results}=await DB.prepare(`SELECT p.number,p.token,json_extract(s.data,'$.title') AS title FROM song_index_pending p LEFT JOIN songs s ON s.id=printf('%03d',p.number) ORDER BY p.number`).all<{number:number;token:string;title:string|null}>();
 if(!results.length)return 'current';
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,changes:results.map(({number,title})=>({number,title}))}),signal:AbortSignal.timeout(25000)});
 if(!r.ok||!(await r.json() as {ok:boolean}).ok)return 'pending';
 for(let i=0;i<results.length;i+=64)await DB.batch(results.slice(i,i+64).map(v=>DB.prepare('DELETE FROM song_index_pending WHERE number=? AND token=?').bind(v.number,v.token)));
 return 'synced';
 }catch{return 'pending'}
}
