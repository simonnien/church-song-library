import {cookies} from 'next/headers';
import {config} from '@/lib/store';
import {cookieName,editor,hashToken,makePasswordHash,passwordRecord,sameOrigin,verifyPassword} from '@/lib/auth';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'來源驗證失敗'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'資料格式錯誤'},415);
 try{
  const username=await editor();if(!username)return reply({error:'請先登入'},401);
  const raw=await request.text();if(raw.length>4096)return reply({error:'資料過長'},413);
  const {currentPassword,newPassword}=JSON.parse(raw);
  if(typeof currentPassword!=='string'||currentPassword.length>256||typeof newPassword!=='string'||newPassword.length<8||newPassword.length>256)return reply({error:'新密碼請輸入 8～256 個字元'},400);
  const db=config().DB,now=Date.now();
  const key=await hashToken('password:'+username+':'+Math.floor(now/600000));
  const attempts=await db.prepare('INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+1200000).first<{count:number}>();
  if((attempts?.count||0)>10)return reply({error:'嘗試太頻繁，請 10 分鐘後再試'},429);
  const record=await passwordRecord(username);
  if(!await verifyPassword(currentPassword,record?.password_hash))return reply({error:'目前密碼不正確'},400);
  if(currentPassword===newPassword)return reply({error:'新密碼需與目前密碼不同'},400);
  const next=await makePasswordHash(newPassword);
  // Compare-and-swap prevents concurrent requests using the same old password.
  // Revoke sessions only if this request installed the new hash.
  const update=record
   ?db.prepare('UPDATE editor_passwords SET password_hash=?,updated=? WHERE username=? AND password_hash=?').bind(next,now,username,record.password_hash)
   :db.prepare('INSERT INTO editor_passwords(username,password_hash,updated) VALUES(?,?,?) ON CONFLICT(username) DO NOTHING').bind(username,next,now);
  const results=await db.batch([update,db.prepare('DELETE FROM editor_sessions WHERE username=? AND EXISTS (SELECT 1 FROM editor_passwords WHERE username=? AND password_hash=?)').bind(username,username,next)]);
  if(!results[0].meta.changes)return reply({error:'密碼已在其他裝置變更，請重新登入'},409);
  (await cookies()).set(cookieName,'',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:0});
  return reply({ok:true});
 }catch{return reply({error:'密碼變更暫時無法完成，請稍後重試'},503)}
}
