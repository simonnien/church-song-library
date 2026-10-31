"use client";
import {useEffect,useRef,useState} from 'react';
import PlaylistShare from './playlist-share';
const keys=['worship-song-ids','worship-song-options-v1','worship-default-options-v1','worship-info'];
const fields=['ids','individual','options','info'];
function read(){return Object.fromEntries(keys.map((k,i)=>{try{return [fields[i],JSON.parse(localStorage.getItem(k)|| (i===0?'[]':'{}'))]}catch{return [fields[i],i===0?[]:{}]}}))}
export default function PlaylistSync({user,onLoad}:{user:string;onLoad:()=>void}){
 const callback=useRef(onLoad);callback.current=onLoad;
 const [status,setStatus]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
 let stopped=false,ready=false,saving=false,dirty=false,revision=0,timer:ReturnType<typeof setTimeout>;
 const owner=localStorage.getItem('playlist-owner')||'';
 if(owner!==user){localStorage.setItem('playlist-backup:'+owner,JSON.stringify(read()));keys.forEach(k=>localStorage.removeItem(k));const backup=localStorage.getItem('playlist-backup:'+user);if(backup){try{const data=JSON.parse(backup);keys.forEach((k,i)=>localStorage.setItem(k,JSON.stringify(data[fields[i]])))}catch{}}else if(user&&!owner){const guest=localStorage.getItem('playlist-backup:');if(guest){const data=JSON.parse(guest);keys.forEach((k,i)=>localStorage.setItem(k,JSON.stringify(data[fields[i]])))}}localStorage.setItem('playlist-owner',user);callback.current();}
 if(!user){setStatus('未登入：歌單僅存在這台裝置');setLoading(false);return;}
 async function save(){
  if(!ready||saving||stopped||!dirty)return;saving=true;dirty=false;setStatus('歌單同步中…');
  try{const r=await fetch('/api/playlist',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:read(),revision,owner:user}),keepalive:true});const result=await r.json();if(!r.ok)throw Error(result.error);revision=result.revision;if(!stopped)setStatus('歌單已同步至帳號');}
  catch(e){ready=false;if(!stopped)setStatus((e as Error).message+'（本機副本已保留）');}
  finally{saving=false;if(dirty&&ready)void save();}
 }
 const changed=()=>{dirty=true;localStorage.setItem('playlist-backup:'+user,JSON.stringify(read()));clearTimeout(timer);timer=setTimeout(()=>void save(),400)};
 async function load(){setLoading(true);setStatus('正在載入帳號歌單…');try{
  const r=await fetch('/api/playlist',{cache:'no-store'}),result=await r.json();if(!r.ok)throw Error(result.error);if(stopped)return;
  revision=result.revision;if(result.data){localStorage.setItem('playlist-backup:'+user,JSON.stringify(read()));keys.forEach((k,i)=>localStorage.setItem(k,JSON.stringify(result.data[fields[i]])));callback.current();}
  ready=true;setStatus('歌單已同步至帳號');if(!result.data){dirty=true;await save();}
 }catch(e){if(!stopped)setStatus((e as Error).message);}finally{if(!stopped)setLoading(false)}}
 void load();window.addEventListener('playlist-change',changed);
 return ()=>{if(dirty&&ready&&!saving)void save();stopped=true;clearTimeout(timer);window.removeEventListener('playlist-change',changed)};
 },[user,retry]);
 return <div style={{padding:'6px 16px',background:'#edf3e9',fontSize:12}} role="status">{status}{user&&<button style={{marginLeft:12}} onClick={()=>{localStorage.setItem('playlist-backup:'+user,JSON.stringify(read()));setRetry(n=>n+1)}}>重新載入雲端歌單</button>}{!loading&&(!user||status==='歌單已同步至帳號')&&<PlaylistShare user={user} read={read} onImport={data=>{localStorage.setItem('playlist-before-import:'+user,JSON.stringify(read()));keys.forEach((k,i)=>localStorage.setItem(k,JSON.stringify(data[fields[i]])));callback.current();window.dispatchEvent(new Event('playlist-change'));}}/>}{loading&&<div style={{position:'fixed',inset:0,zIndex:9999,background:'#ffffffdd',display:'grid',placeItems:'center'}}>正在載入帳號歌單…</div>}</div>;
}
