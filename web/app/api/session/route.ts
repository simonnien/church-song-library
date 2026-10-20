import {config} from '@/lib/store';
import {cookieName,editor,hashToken,newToken,sameOrigin,validAccount,verifyPassword,passwordRecord,accountState} from '@/lib/auth';
import {cookies} from 'next/headers';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const username=await editor(true);return reply({username,mustChange:username?!!(await accountState(username)).must_change:false});}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'來源驗證失敗'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'資料格式錯誤'},415);
 try {
 const raw=await request.text();if(raw.length>2048)return reply({error:'資料過長'},413);
 const {username,password}=JSON.parse(raw);if(typeof username!=='string'||typeof password!=='string'||password.length>256)return reply({error:'帳號或密碼不正確'},401);
 const db=config().DB,now=Date.now(),window=Math.floor(now/600000);
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 // Atomic fixed-window counter bounds password guessing before expensive hashing.
 const limitKey=await hashToken(ip+':'+window);
 const attempts=await db.prepare('INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(limitKey,now+1200000).first<{count:number}>();
 if((attempts?.count||0)>30)return reply({error:'登入嘗試太頻繁，請 10 分鐘後再試'},429);
 const record=validAccount(username)?await passwordRecord(username):null;
 const ok=await verifyPassword(password,record?.password_hash);
 if(!validAccount(username)||!ok||(await accountState(username)).disabled)return reply({error:'帳號或密碼不正確，或帳號已停用'},401);
 const token=newToken(),expiry=now+86400000;
 const jar=await cookies(),old=jar.get(cookieName)?.value;
 if(old)await db.prepare('DELETE FROM editor_sessions WHERE token_hash=?').bind(await hashToken(old)).run();
 await db.batch([db.prepare('INSERT INTO editor_sessions(token_hash,username,expires) VALUES(?,?,?)').bind(await hashToken(token),username,expiry),db.prepare('DELETE FROM editor_sessions WHERE expires<?').bind(now),db.prepare('DELETE FROM login_attempts WHERE expires<?').bind(now)]);
 jar.set(cookieName,token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:86400});
 await db.prepare('INSERT INTO editor_accounts(username,last_login) VALUES(?,?) ON CONFLICT(username) DO UPDATE SET last_login=excluded.last_login').bind(username,now).run();
 return reply({username,mustChange:!!(await accountState(username)).must_change});
 }catch{return reply({error:'登入服務暫時無法使用，請稍後重試'},503)}
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return reply({error:'來源驗證失敗'},403);
 const jar=await cookies(),token=jar.get(cookieName)?.value;
 if(token)await config().DB.prepare('DELETE FROM editor_sessions WHERE token_hash=?').bind(await hashToken(token)).run();
 jar.set(cookieName,'',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:0});return reply({ok:true});
}
