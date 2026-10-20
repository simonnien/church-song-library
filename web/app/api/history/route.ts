import {editor} from '@/lib/auth';
import {config,driveReady} from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(!await editor())return Response.json({error:'請先登入'},{status:403,headers});
 if(driveReady())return Response.json({error:'Drive 模式請由 Drive 備份還原'},{status:409,headers});
 const id=new URL(request.url).searchParams.get('id')||'';
 if(!/^\d{1,8}$/.test(id))return Response.json({error:'歌曲編號不正確'},{status:400,headers});
 const rows=await config().DB.prepare('SELECT id,data,saved_at,actor FROM song_history WHERE song_id=? ORDER BY id DESC LIMIT 20').bind(id).all<{id:number;data:string;saved_at:string;actor:string}>();
 return Response.json({versions:rows.results.map(r=>({...r,song:JSON.parse(r.data),data:undefined}))},{headers});
}
