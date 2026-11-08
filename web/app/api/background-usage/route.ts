import {config} from '@/lib/store';
import {backgroundById} from '@/lib/backgrounds';
export async function GET(){
 const now=new Date(Date.now()+8*3600000);now.setUTCHours(0,0,0,0);now.setUTCDate(now.getUTCDate()-(now.getUTCDay()+6)%7);
 const {results}=await config().DB.prepare('SELECT background_id AS id,count(*) AS total,sum(CASE WHEN exported_at>=? THEN 1 ELSE 0 END) AS week FROM background_exports GROUP BY background_id').bind(now.getTime()-8*3600000).all();
 return Response.json({usage:results},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'來源驗證失敗'},{status:403});
 try{const raw=await request.text();if(raw.length>10000)throw Error();const {eventId,ids}=JSON.parse(raw);
 if(typeof eventId!=='string'||! /^[a-f0-9-]{36}$/i.test(eventId)||!Array.isArray(ids)||ids.length>100)throw Error();
 const unique=[...new Set(ids)];if(unique.some(id=>typeof id!=='string'||!backgroundById(id)))throw Error();
 if(unique.length)await config().DB.batch(unique.map(id=>config().DB.prepare('INSERT INTO background_exports VALUES(?,?,?) ON CONFLICT(event_id,background_id) DO NOTHING').bind(eventId,backgroundById(id)!.id,Date.now())));
 return Response.json({ok:true});}catch{return Response.json({error:'無法記錄匯出次數'},{status:400})}
}
