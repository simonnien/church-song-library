import {cookies} from 'next/headers';
import {config} from '@/lib/store';
import {newToken,hashToken} from '@/lib/auth';
import {googleReady,GOOGLE_ORIGIN,GOOGLE_CALLBACK,googleCookie,stateCookieOptions,challenge} from '@/lib/google-auth';
export async function GET(request:Request){
 if(new URL(request.url).origin!==GOOGLE_ORIGIN)return Response.redirect(GOOGLE_ORIGIN+'/api/auth/google',302);
 if(!googleReady())return Response.json({error:'Google 登入尚未完成設定'}, {status:503});
 const state=newToken(),verifier=newToken(),now=Date.now();
 await config().DB.batch([config().DB.prepare('DELETE FROM google_oauth_states WHERE expires<?').bind(now),config().DB.prepare('INSERT INTO google_oauth_states VALUES(?,?,?)').bind(await hashToken(state),verifier,now+600000)]);
 (await cookies()).set(googleCookie,state,stateCookieOptions);
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 u.search=new URLSearchParams({client_id:config().GOOGLE_CLIENT_ID!,redirect_uri:GOOGLE_CALLBACK,response_type:'code',scope:'openid email',state,code_challenge:await challenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
 return new Response(null,{status:302,headers:{Location:u.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
