import {editor,passwordRecord,sameOrigin,isAdmin} from '@/lib/auth';
import {config,driveReady} from '@/lib/store';
import type {Song} from '@/lib/model';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'來源驗證失敗'},403);
 if(!await isAdmin())return reply({error:'僅已修改初始密碼的管理者可交換編號'},403);
 if(driveReady())return reply({error:'Drive 模式尚不支援交換編號'},409);
 try{
  const raw=await request.text();if(raw.length>1024)return reply({error:'內容過長'},413);
  const {a,b,revisionA,revisionB}=JSON.parse(raw);
  if(![a,b].every(x=>typeof x==='string'&&/^\d{1,8}$/.test(x))||Number(a)===Number(b)||![revisionA,revisionB].every(x=>Number.isInteger(x)&&x>=0))return reply({error:'請選擇兩首不同歌曲'},400);
  const db=config().DB;
  const rows=await db.prepare('SELECT id,data,revision FROM songs WHERE id IN (?,?)').bind(a,b).all<{id:string;data:string;revision:number}>();
  const ra=rows.results.find(r=>r.id===a),rb=rows.results.find(r=>r.id===b);
  if(!ra||!rb)return reply({error:'找不到其中一首歌曲'},404);
  if(ra.revision!==revisionA||rb.revision!==revisionB)return reply({error:'歌曲已更新，請重新開啟管理畫面後再試'},409);
  const sa=JSON.parse(ra.data) as Song,sb=JSON.parse(rb.data) as Song,now=new Date().toISOString();
  const guard='(SELECT COUNT(*) FROM songs WHERE (id=? AND revision=?) OR (id=? AND revision=?))=2';
  const args=[a,revisionA,b,revisionB];
  const results=await db.batch([
   db.prepare(`INSERT INTO song_history(song_id,data,saved_at,actor) SELECT id,data,?,'beersheba01' FROM songs WHERE id IN (?,?) AND ${guard}`).bind(now,a,b,...args),
   db.prepare(`UPDATE songs SET data=CASE id WHEN ? THEN ? ELSE ? END,revision=revision+1,updated=? WHERE id IN (?,?) AND ${guard}`).bind(a,JSON.stringify({...sb,id:a,number:sa.number,revision:revisionA+1}),JSON.stringify({...sa,id:b,number:sb.number,revision:revisionB+1}),now,a,b,...args),
  ]);
  if(results[1].meta.changes!==2)return reply({error:'歌曲已更新，交換未執行，請重新載入'},409);
  return reply({ok:true,a,b});
 }catch{return reply({error:'交換失敗，請重新讀取歌曲確認狀態'},500)}
}
