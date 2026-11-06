'use client';
import {BACKGROUNDS} from '@/lib/backgrounds';
export default function BackgroundPicker({value,ratio,onChange}:{value:string;ratio:'16:9'|'32:9';onChange:(id:string)=>void}){
 return <section className="background-picker"><div className="picker-heading"><strong>背景影片 · {ratio}</strong><small>{ratio==='16:9'?'1920 × 1080':'3840 × 1080'} · 30 fps · 靜音循環</small></div><div className="background-grid"><button type="button" className={!value?'selected':''} onClick={()=>onChange('')}><span className="black-thumbnail"/><span>純黑背景</span></button>{BACKGROUNDS.filter(v=>v.ratio===ratio).map(v=><button type="button" key={v.id} className={value===v.id?'selected':''} aria-pressed={value===v.id} onClick={()=>onChange(v.id)}><img src={`/background-thumbnails/${v.id}.jpg`} loading="lazy" alt=""/><span>{v.name.replace(/_(16|32)比9/g,'').replaceAll('_',' · ')}</span><small>{v.ratio} · {(v.bytes/1000000).toFixed(1)} MB</small></button>)}</div></section>;
}
