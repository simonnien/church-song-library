'use client';
import {useState} from 'react';
export default function VideoPreview({src,poster}:{src:string;poster?:string}){
 const [waiting,setWaiting]=useState(true),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 return <><video className="background-video" key={retry} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" onLoadStart={()=>setWaiting(true)} onWaiting={()=>setWaiting(true)} onCanPlay={()=>setWaiting(false)} onPlaying={()=>setWaiting(false)} onError={()=>{setWaiting(false);setFailed(true)}}/>{waiting&&!failed&&<div className="video-loading" role="status"><span className="spinner"/><span>影片載入中</span></div>}{failed&&<div className="video-loading" role="alert"><span>影片載入失敗</span><button onClick={()=>{setFailed(false);setWaiting(true);setRetry(x=>x+1)}}>重新載入影片</button></div>}</>;
}
