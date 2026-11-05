import {flushSongIndex} from '@/lib/song-index-sync';
import {editor,isAdmin} from '@/lib/auth';
import {config,driveReady,listSongsJson,saveSong,Conflict} from '@/lib/store';
import {googleReady} from '@/lib/google-auth';
import {validateSong} from '@/lib/model';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{
 const songs=await listSongsJson(),username=await editor();
 const metadata=JSON.stringify({isAdmin:username?await isAdmin():false,google:googleReady(),canEdit:!!username,editor:username,storage:driveReady()?'drive':'site'});
 return new Response('{"songs":'+songs+','+metadata.slice(1),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
}catch{return reply({error:'資料庫暫時無法讀取，請稍後重新整理。'},503);}}
export async function PUT(request:Request){
 const username=await editor();if(!username)return reply({error:'請先登入編輯者帳號'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'來源驗證失敗'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'資料格式錯誤'},415);
 try {const body=await request.text();if(body.length>300000)return reply({error:'內容過長'},413);const song=validateSong(JSON.parse(body));const saved=await saveSong(song,username);return reply({song:saved,indexSync:await flushSongIndex()});}
 catch(error){return reply({error:error instanceof Error?error.message:'儲存失敗'},error instanceof Conflict?409:400);}
}
