'use client';
import {useState} from 'react';
import type {Options} from '@/lib/model';
import {backgroundById} from '@/lib/backgrounds';

export default function SongThumbnail({title,options}:{title:string;options:Options}){
 const bg=backgroundById(options.backgroundId),[failed,setFailed]=useState('');
 const color=/^#[0-9a-f]{6}$/i.test(options.textColor||'')?options.textColor:'#FFFFFF';
 return <span className="song-thumbnail" role="img" aria-label={`${title}，背景：${bg?.name||'純黑'}，${options.ratio}`} style={{aspectRatio:options.ratio==='16:9'?'16/9':'32/9',color}}>
  {bg&&failed!==bg.id&&<img src={`/background-thumbnails/${bg.id}.jpg`} alt="" loading="lazy" onError={()=>setFailed(bg.id)}/>}
  <span className="song-thumbnail-title">{title}</span>
 </span>;
}
