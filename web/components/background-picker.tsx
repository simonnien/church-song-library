'use client';
import {useState} from 'react';
import {BACKGROUNDS} from '@/lib/backgrounds';
export default function BackgroundPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
 const [filter,setFilter]=useState('all');
 return <section className="background-picker"><div className="picker-heading"><strong>背景影片</strong><select aria-label="篩選影片比例" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">所有比例</option><option>16:9</option><option>32:9</option></select></div><div className="background-grid"><button type="button" className={!value?'selected':''} onClick={()=>onChange('')}><span className="black-thumbnail"/><span>純黑背景</span></button>{BACKGROUNDS.filter(v=>filter==='all'||v.ratio===filter).map(v=><button type="button" key={v.id} className={value===v.id?'selected':''} aria-pressed={value===v.id} onClick={()=>onChange(v.id)}><img src={`/background-thumbnails/${v.id}.jpg`} loading="lazy" alt=""/><span>{v.name.replace(/_(16|32)比9/g,'').replaceAll('_',' · ')}</span><small>{v.ratio} · {(v.bytes/1000000).toFixed(1)} MB</small></button>)}</div></section>;
}
