import {backgroundById} from '@/lib/backgrounds';
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
 const {id}=await context.params;
 if(!backgroundById(id))return new Response('找不到影片',{status:404});
 const range=request.headers.get('range');
 if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response('無效範圍',{status:416});
 try{
  const response=await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,{headers:range?{Range:range}:{},signal:AbortSignal.timeout(30000)});
  if(response.status===416)return new Response(null,{status:416});
  if(!response.ok||!response.headers.get('content-type')?.includes('video/')){await response.body?.cancel();return new Response('Drive 影片暫時無法讀取，請稍後重試',{status:502});}
  const headers=new Headers({'Content-Type':'video/mp4','Cache-Control':'public, max-age=3600','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});
  for(const key of ['content-length','content-range','etag','last-modified']){const v=response.headers.get(key);if(v)headers.set(key,v);}
  return new Response(response.body,{status:response.status,headers});
 }catch{return new Response('影片連線失敗，請稍後重試',{status:502});}
}
