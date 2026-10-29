import {editor,sameOrigin} from '@/lib/auth';
import {config} from '@/lib/store';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await editor();if(!user)return reply({error:'請先登入'},401);
 const row=await config().DB.prepare('SELECT data,revision FROM account_playlists WHERE username=?').bind(user).first<{data:string;revision:number}>();
 return reply({data:row?JSON.parse(row.data):null,revision:row?.revision||0});
}
export async function PUT(request:Request){
 const user=await editor();if(!user||!sameOrigin(request))return reply({error:'請先登入'},403);
 try{
 const raw=await request.text();if(raw.length>250000)return reply({error:'歌單內容過大'},413);
 const {data,revision,owner}=JSON.parse(raw);
 if(owner!==user)return reply({error:"帳號已變更，請重新整理"},409);
 if(!Number.isSafeInteger(revision)||revision<0||!data||!Array.isArray(data.ids)||data.ids.length>2000||data.ids.some((id:unknown)=>typeof id!=='string'||!/^\d{1,8}$/.test(id)))return reply({error:'歌單格式錯誤'},400);
 const payload=JSON.stringify({ids:[...new Set(data.ids)],individual:data.individual||{},options:data.options||{},info:data.info||{}});
 const db=config().DB;
 const result=revision===0?await db.prepare('INSERT INTO account_playlists(username,data,revision) VALUES(?,?,1) ON CONFLICT(username) DO NOTHING').bind(user,payload).run():await db.prepare('UPDATE account_playlists SET data=?,revision=revision+1 WHERE username=? AND revision=?').bind(payload,user,revision).run();
 if(!result.meta.changes)return reply({error:'另一台裝置已更新歌單，請重新載入雲端歌單'},409);
 return reply({revision:revision+1});
 }catch{return reply({error:'歌單同步失敗，請重試'},500)}
}
