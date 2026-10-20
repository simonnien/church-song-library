'use client';
import {useState} from 'react';
import type {Song,Options} from '@/lib/model';
import {optionSummary,type SongOptions} from '@/lib/playlist-options';
export default function PlaylistDock({individual,defaults,songs,ids,onChange,onOpen,onSelect}:{individual:SongOptions;defaults:Options;songs:Song[];ids:string[];onChange:(ids:string[])=>void;onOpen:()=>void;onSelect:(song:Song)=>void}){
 const [collapsed,setCollapsed]=useState(false);
 if(!ids.length)return null;
 return <aside className="playlist-dock" aria-label="已選歌曲小框"><header><strong>已選歌曲 · {ids.length}</strong><button onClick={()=>setCollapsed(!collapsed)} aria-expanded={!collapsed}>{collapsed?'展開':'收合'}</button></header>{!collapsed&&<><ol>{ids.map(id=>{const s=songs.find(s=>s.id===id);return s?<li key={id}><button onClick={()=>onSelect(s)}>{s.id} · {s.title}<small className="song-option-summary">{individual[id]?'個別：':'共用：'}{optionSummary(individual[id]||defaults)}</small></button><button aria-label={`移除${s.title}`} onClick={()=>onChange(ids.filter(x=>x!==id))}>×</button></li>:null})}</ol><button className="primary" onClick={onOpen}>排序與準備匯出 →</button></>}</aside>;
}
