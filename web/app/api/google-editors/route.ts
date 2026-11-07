import {isAdmin,sameOrigin,editor} from '@/lib/auth';
import {config} from '@/lib/store';
import {GOOGLE_ADMIN,googleReady} from '@/lib/google-auth';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){if(!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);return reply({owner:GOOGLE_ADMIN,current:await editor(),users:(await config().DB.prepare('SELECT email,disabled,label,is_admin FROM google_editors ORDER BY is_admin DESC,label,email').all()).results});}
export async function POST(request:Request){
 if(!sameOrigin(request)||!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);
 try{
  const raw=await request.text();if(raw.length>2048)return reply({error:'內容過長'},413);
  const input=JSON.parse(raw),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!['enable','disable','update'].includes(input.action))return reply({error:'請輸入有效 Google 信箱與操作'},400);
  const current=await editor(),db=config().DB;
  if(input.action==='update'){
   if(typeof input.label!=='string'||input.label.trim().length>80||typeof input.isAdmin!=='boolean')return reply({error:'標籤限 80 字，請選擇有效權限'},400);
   if((email===GOOGLE_ADMIN||email===current)&&!input.isAdmin)return reply({error:'不能移除擁有者或自己的管理員權限'},400);
   await db.prepare('INSERT INTO google_editors(email,label,is_admin,disabled) VALUES(?,?,?,0) ON CONFLICT(email) DO UPDATE SET label=excluded.label,is_admin=excluded.is_admin').bind(email,input.label.trim(),input.isAdmin?1:0).run();
  }else{
   if((email===GOOGLE_ADMIN||email===current)&&input.action==='disable')return reply({error:'不能停用擁有者或自己的帳號'},400);
   await db.batch([db.prepare('INSERT INTO google_editors(email,disabled) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET disabled=excluded.disabled').bind(email,input.action==='disable'?1:0),db.prepare('DELETE FROM editor_sessions WHERE username=?').bind(email)]);
  }
  return reply({ok:true});
 }catch{return reply({error:'儲存失敗'},500)}
}
