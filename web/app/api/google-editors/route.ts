import {isAdmin,sameOrigin} from '@/lib/auth';
import {config} from '@/lib/store';
import {GOOGLE_ADMIN,googleReady} from '@/lib/google-auth';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){if(!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);return reply({users:(await config().DB.prepare('SELECT email,disabled FROM google_editors ORDER BY email').all()).results});}
export async function POST(request:Request){
 if(!sameOrigin(request)||!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);
 try{const raw=await request.text();if(raw.length>1024)return reply({error:'內容過長'},413);const input=JSON.parse(raw);const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||email===GOOGLE_ADMIN||!['enable','disable'].includes(input.action))return reply({error:'請輸入其他編輯者的有效 Google 信箱'},400);
 const db=config().DB;await db.batch([db.prepare('INSERT INTO google_editors(email,disabled) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET disabled=excluded.disabled').bind(email,input.action==='disable'?1:0),db.prepare('DELETE FROM editor_sessions WHERE username=?').bind(email)]);return reply({ok:true});
 }catch{return reply({error:'儲存失敗'},500)}
}
