import {cookies} from 'next/headers';
import {config} from '@/lib/store';
import {newToken,hashToken,cookieName} from '@/lib/auth';
import {googleReady,GOOGLE_ORIGIN,GOOGLE_CALLBACK,googleCookie,stateCookieOptions} from '@/lib/google-auth';
const finish=(error='')=>new Response(null,{status:302,headers:{Location:GOOGLE_ORIGIN+(error?'/?loginError='+encodeURIComponent(error):'/'),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 const jar=await cookies(),u=new URL(request.url),state=u.searchParams.get('state'),code=u.searchParams.get('code'),saved=jar.get(googleCookie)?.value;
 jar.set(googleCookie,'',{...stateCookieOptions,maxAge:0});
 if(!googleReady()||!state||!saved||state!==saved||!/^[a-f0-9]{64}$/.test(state))return finish('登入驗證已失效，請重新登入');
 try{
  const db=config().DB,now=Date.now();
  const flow=await db.prepare('DELETE FROM google_oauth_states WHERE state_hash=? AND expires>? RETURNING verifier').bind(await hashToken(state),now).first<{verifier:string}>();
  if(!flow||!code||code.length>4096)return finish('登入未完成，請再試一次');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config().GOOGLE_CLIENT_ID!,client_secret:config().GOOGLE_CLIENT_SECRET!,code,code_verifier:flow.verifier,grant_type:'authorization_code',redirect_uri:GOOGLE_CALLBACK}),signal:AbortSignal.timeout(15000)});
  const token=await r.json() as {access_token?:string};if(!r.ok||!token.access_token)return finish('Google 驗證失敗，請重新登入');
  const info=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(15000)});
  const user=await info.json() as {email?:string;email_verified?:boolean;sub?:string};
  if(!info.ok||user.email_verified!==true||typeof user.email!=='string'||typeof user.sub!=='string'||!user.sub)return finish('Google 帳號尚未完成信箱驗證');
  const email=user.email.toLowerCase();
  const allowed=await db.prepare('UPDATE google_editors SET subject=? WHERE email=? AND disabled=0 AND (subject IS NULL OR subject=?) RETURNING email').bind(user.sub,email,user.sub).first();
  if(!allowed)return finish('此 Google 帳號未獲編輯權限，請聯絡管理者');
  const session=newToken(),old=jar.get(cookieName)?.value;
  if(old)await db.prepare('DELETE FROM editor_sessions WHERE token_hash=?').bind(await hashToken(old)).run();
  await db.batch([db.prepare('INSERT INTO editor_sessions VALUES(?,?,?)').bind(await hashToken(session),email,now+86400000),db.prepare('DELETE FROM editor_sessions WHERE expires<?').bind(now)]);
  jar.set(cookieName,session,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:86400});return finish();
 }catch{return finish('登入暫時無法完成，請稍後重試')}
}
