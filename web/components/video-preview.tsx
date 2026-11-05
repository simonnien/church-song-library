'use client';
import {useEffect,useRef,useState} from 'react';
export default function VideoPreview({src,poster}:{src:string;poster?:string}){
 const video=useRef<HTMLVideoElement>(null);
 const [waiting,setWaiting]=useState(true),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  setWaiting(true);setFailed(false);
  let lastTime=video.current?.currentTime??0,lastMovement=performance.now();
  // canplay/playing can fire before frames actually advance. Keep the loading
  // overlay until the playback clock moves, and restore it on silent stalls.
  const timer=window.setInterval(()=>{
   const element=video.current;if(!element||element.error)return;
   if(element.currentTime!==lastTime){lastTime=element.currentTime;lastMovement=performance.now();setWaiting(false)}
   else if(performance.now()-lastMovement>=1500)setWaiting(true);
  },250);
  return ()=>window.clearInterval(timer);
 },[src,retry]);
 return <><video ref={video} className="background-video" key={`${src}:${retry}`} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" onLoadStart={()=>setWaiting(true)} onWaiting={()=>setWaiting(true)} onSeeking={()=>setWaiting(true)} onError={()=>{setWaiting(false);setFailed(true)}}/>{waiting&&!failed&&<div className="video-loading" role="status"><span className="spinner"/><span>影片載入中</span></div>}{failed&&<div className="video-loading" role="alert"><span>影片載入失敗</span><button onClick={()=>{setFailed(false);setWaiting(true);setRetry(x=>x+1)}}>重新載入影片</button></div>}</>;
}
