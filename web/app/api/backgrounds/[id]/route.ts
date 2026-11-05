import {backgroundById} from '@/lib/backgrounds';
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
 const {id}=await context.params;
 if(!backgroundById(id))return new Response('找不到影片',{status:404});
 const range=request.headers.get('range');
 const download=new URL(request.url).searchParams.has('download');
 if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response('無效範圍',{status:416});
 if(download){const part=range?.match(/^bytes=(\d+)-(\d+)$/);if(!part||Number(part[2])<Number(part[1])||Number(part[2])-Number(part[1])>=4*1024*1024)return new Response('下載需使用最多 4 MB 的分段範圍',{status:400});}
 try{
  const response=await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,{headers:range?{Range:range}:{},signal:AbortSignal.timeout(300000)});
  if(response.status===416)return new Response(null,{status:416});
  if(!response.ok||!response.headers.get('content-type')?.includes('video/')){await response.body?.cancel();return new Response('Drive 影片暫時無法讀取，請稍後重試',{status:502});}
  const headers=new Headers({'Content-Type':'video/mp4','Cache-Control':new URL(request.url).searchParams.has('download')?'no-store':'public, max-age=3600','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});
  for(const key of ['content-length','content-range','etag','last-modified']){const v=response.headers.get(key);if(v)headers.set(key,v);}
  if(download){
   const bytes=await response.arrayBuffer();
   const part=range!.match(/^bytes=(\d+)-(\d+)$/)!;
   const expected=Number(part[2])-Number(part[1])+1;
   if(response.status!==206||bytes.byteLength!==expected)return new Response('影片分段不完整，請重試',{status:502});
   headers.set('Content-Length',String(bytes.byteLength));
   return new Response(bytes,{status:206,headers});
  }
  return new Response(response.body,{status:response.status,headers});
 }catch{return new Response('影片連線失敗，請稍後重試',{status:502});}
}
