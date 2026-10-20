import {editor,validAccount,passwordRecord,verifyPassword,makePasswordHash,sameOrigin,hashToken} from '@/lib/auth';
import {config} from '@/lib/store';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function admin(){return await editor()==='beersheba01'&&!!await passwordRecord('beersheba01')}
export async function GET(){
 if(!await admin())return reply({error:'僅管理者可使用。beersheba01 請先修改初始密碼，再開啟帳號管理。'},403);
 const rows=await config().DB.prepare('SELECT a.username,a.disabled,a.must_change,a.last_login,p.updated FROM editor_accounts a LEFT JOIN editor_passwords p ON a.username=p.username').all();
 return reply({accounts:Array.from({length:10},(_,i)=>{const username='beersheba'+String(i+1).padStart(2,'0');return {username,disabled:0,must_change:0,last_login:null,...rows.results.find(r=>r.username===username)}})});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'來源驗證失敗'},403);
 if(!await admin())return reply({error:'無管理權限，請先修改管理者初始密碼'},403);
 try{
  const raw=await request.text();if(raw.length>4096)return reply({error:'內容過長'},413);
  const {username,action,password,adminPassword}=JSON.parse(raw);
  if(typeof username!=='string'||!validAccount(username)||username==='beersheba01'||!['enable','disable','reset'].includes(action))return reply({error:'無效操作；自己的密碼請由修改密碼變更'},400);
  const db=config().DB,now=Date.now(),key=await hashToken('admin:'+Math.floor(now/600000));
  const attempts=await db.prepare('INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+1200000).first<{count:number}>();
  if((attempts?.count||0)>15)return reply({error:'嘗試太頻繁，請稍後再試'},429);
  if(typeof adminPassword!=='string'||adminPassword.length>256||!await verifyPassword(adminPassword,(await passwordRecord('beersheba01'))?.password_hash))return reply({error:'管理者密碼不正確'},403);
  const statements=[];
  if(action==='reset'){
   if(typeof password!=='string'||password.length<8||password.length>256)return reply({error:'臨時密碼需 8～256 個字元'},400);
   statements.push(db.prepare('INSERT INTO editor_passwords(username,password_hash,updated) VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,updated=excluded.updated').bind(username,await makePasswordHash(password),now));
   statements.push(db.prepare('INSERT INTO editor_accounts(username,must_change) VALUES(?,1) ON CONFLICT(username) DO UPDATE SET must_change=1').bind(username));
  }else statements.push(db.prepare('INSERT INTO editor_accounts(username,disabled) VALUES(?,?) ON CONFLICT(username) DO UPDATE SET disabled=excluded.disabled').bind(username,action==='disable'?1:0));
  statements.push(db.prepare('DELETE FROM editor_sessions WHERE username=?').bind(username));
  statements.push(db.prepare('INSERT INTO editor_audit(actor,target,action,created) VALUES(?,?,?,?)').bind('beersheba01',username,action,now));
  await db.batch(statements);return reply({ok:true});
 }catch{return reply({error:'操作失敗，請稍後再試'},503)}
}
