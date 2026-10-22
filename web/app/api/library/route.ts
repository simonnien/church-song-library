import {editor,isAdmin} from '@/lib/auth';
import {config,driveReady,listSongs,saveSong,Conflict} from '@/lib/store';
import {googleReady} from '@/lib/google-auth';
import {validateSong} from '@/lib/model';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{return reply({songs:await listSongs(),isAdmin:await isAdmin(),google:googleReady(),canEdit:!!await editor(),editor:await editor(),storage:driveReady()?'drive':'site',driveFile:'https://drive.google.com/file/d/YOUR_DRIVE_FILE_ID/view'});}catch{return reply({error:'資料庫暫時無法讀取，請稍後重新整理。'},503);}}
export async function PUT(request:Request){
 const username=await editor();if(!username)return reply({error:'請先登入編輯者帳號'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'來源驗證失敗'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'資料格式錯誤'},415);
 try {const body=await request.text();if(body.length>300000)return reply({error:'內容過長'},413);const song=validateSong(JSON.parse(body));return reply({song:await saveSong(song,username)});}
 catch(error){return reply({error:error instanceof Error?error.message:'儲存失敗'},error instanceof Conflict?409:400);}
}
