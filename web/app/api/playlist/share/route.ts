import {editor,sameOrigin,newToken,hashToken} from '@/lib/auth';
import {config} from '@/lib/store';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'請從本站操作分享歌單'},403);
 const user=(await editor())||'';
 try{
 const raw=await request.text();if(raw.length>250000)return reply({error:'歌單內容過大'},413);
 const input=JSON.parse(raw);if(input.owner!==user)return reply({error:'帳號已變更，請重新整理'},409);
 const db=config().DB,now=Date.now();
 if(input.action==='create'){
 const d=input.data;if(!d||!Array.isArray(d.ids)||!d.ids.length||d.ids.length>2000||d.ids.some((id:unknown)=>typeof id!=='string'||!/^\d{1,8}$/.test(id)))return reply({error:'請先選擇歌曲'},400);
 const token=newToken().slice(0,32),expires=now+7*24*60*60*1000;
 const data=JSON.stringify({ids:[...new Set(d.ids)],individual:d.individual||{},options:d.options||{},info:d.info||{}});
 await db.batch([db.prepare('DELETE FROM playlist_shares WHERE expires<=?').bind(now),db.prepare('INSERT INTO playlist_shares(token_hash,data,expires) VALUES(?,?,?)').bind(await hashToken(token),data,expires)]);
 return reply({id:token,expires,count:d.ids.length});
 }
 if(input.action==='read'){
 const token=typeof input.id==='string'?input.id.trim().toLowerCase():'';
 if(!/^[a-f0-9]{32}$/.test(token))return reply({error:'分享 ID 格式不正確'},400);
 const row=await db.prepare('SELECT data,expires FROM playlist_shares WHERE token_hash=? AND expires>?').bind(await hashToken(token),now).first<{data:string;expires:number}>();
 if(!row)return reply({error:'分享 ID 不存在或已過期，請對方重新匯出'},404);
 return reply({data:JSON.parse(row.data),expires:row.expires});
 }
 return reply({error:'不支援的操作'},400);
 }catch{return reply({error:'分享操作失敗，請稍後重試'},500)}
}
