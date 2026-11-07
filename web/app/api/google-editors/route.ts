import {isAdmin,sameOrigin,editor} from '@/lib/auth';
import {config} from '@/lib/store';
import {GOOGLE_ADMIN,googleReady} from '@/lib/google-auth';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 if(!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);
 const db=config().DB;
 const [users,groups,members]=await Promise.all([
  db.prepare('SELECT email,disabled,label,name,is_admin FROM google_editors ORDER BY is_admin DESC,name,email').all(),
  db.prepare('SELECT g.id,g.name,COUNT(m.email) AS members FROM editor_groups g LEFT JOIN editor_group_members m ON m.group_id=g.id GROUP BY g.id ORDER BY g.name').all(),
  db.prepare('SELECT email,group_id FROM editor_group_members').all<{email:string;group_id:number}>()
 ]);
 return reply({owner:GOOGLE_ADMIN,current:await editor(),users:users.results.map((u:any)=>({...u,groupIds:members.results.filter(m=>m.email===u.email).map(m=>m.group_id)})),groups:groups.results});
}
export async function POST(request:Request){
 if(!sameOrigin(request)||!googleReady()||!await isAdmin())return reply({error:'無管理權限'},403);
 try{
  const raw=await request.text();if(raw.length>2048)return reply({error:'內容過長'},413);
  const input=JSON.parse(raw),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  const current=await editor(),db=config().DB;
  if(['group-create','group-rename','group-delete'].includes(input.action)){
   const name=typeof input.name==='string'?input.name.trim():'';
   if(input.action!=='group-create'&&(!Number.isSafeInteger(input.id)||input.id<1))return reply({error:'請選擇有效標籤'},400);
   if(input.action!=='group-delete'&&(!name||name.length>40))return reply({error:'小組／身分標籤請填 1～40 字'},400);
   if(input.action!=='group-delete'){
    const duplicate=await db.prepare('SELECT id FROM editor_groups WHERE name=? AND id<>?').bind(name,input.id||0).first();
    if(duplicate)return reply({error:'已有同名標籤，請使用現有標籤'},409);
   }
   if(input.action==='group-create')await db.prepare('INSERT INTO editor_groups(name) VALUES(?)').bind(name).run();
   else if(input.action==='group-rename')await db.prepare('UPDATE editor_groups SET name=? WHERE id=?').bind(name,input.id).run();
   else await db.batch([db.prepare('DELETE FROM editor_group_members WHERE group_id=?').bind(input.id),db.prepare('DELETE FROM editor_groups WHERE id=?').bind(input.id)]);
   return reply({ok:true});
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!['enable','disable','update'].includes(input.action))return reply({error:'請輸入有效 Google 信箱與操作'},400);
  if(input.action==='update'){
   const name=input.name??input.label;
   if(typeof name!=='string'||name.trim().length>80||typeof input.isAdmin!=='boolean')return reply({error:'姓名限 80 字，請選擇有效權限'},400);
   const groupIds=input.groupIds;
   if(groupIds!==undefined&&(!Array.isArray(groupIds)||groupIds.length>30||groupIds.some((id:unknown)=>!Number.isSafeInteger(id)||Number(id)<1)||new Set(groupIds).size!==groupIds.length))return reply({error:'請選擇有效的小組／身分標籤，最多 30 個'},400);
   if(groupIds?.length){const rows=await db.prepare('SELECT id FROM editor_groups').all<{id:number}>();if(groupIds.some((id:number)=>!rows.results.some(g=>g.id===id)))return reply({error:'標籤已被移除，請重新載入管理頁'},409);}
   if((email===GOOGLE_ADMIN||email===current)&&!input.isAdmin)return reply({error:'不能移除擁有者或自己的管理員權限'},400);
   const statements=[db.prepare('INSERT INTO google_editors(email,label,name,is_admin,disabled) VALUES(?,?,?,?,0) ON CONFLICT(email) DO UPDATE SET label=excluded.label,name=excluded.name,is_admin=excluded.is_admin').bind(email,name.trim(),name.trim(),input.isAdmin?1:0)];
   if(groupIds!==undefined){statements.push(db.prepare('DELETE FROM editor_group_members WHERE email=?').bind(email));for(const id of groupIds)statements.push(db.prepare('INSERT INTO editor_group_members(email,group_id) VALUES(?,?)').bind(email,id));}
   await db.batch(statements);
  }else{
   if((email===GOOGLE_ADMIN||email===current)&&input.action==='disable')return reply({error:'不能停用擁有者或自己的帳號'},400);
   await db.batch([db.prepare('INSERT INTO google_editors(email,disabled) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET disabled=excluded.disabled').bind(email,input.action==='disable'?1:0),db.prepare('DELETE FROM editor_sessions WHERE username=?').bind(email)]);
  }
  return reply({ok:true});
 }catch{return reply({error:'儲存失敗'},500)}
}
