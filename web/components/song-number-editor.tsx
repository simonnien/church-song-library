'use client';
import {useState} from 'react';
import type {Song} from '@/lib/model';
export default function SongNumberEditor({song,songs,dirty,onSaved}:{song:Song;songs:Song[];dirty:boolean;onSaved:(s:Song)=>void}){
 const [value,setValue]=useState(String(song.number)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const number=Number(value),conflict=songs.find(s=>s.number===number&&s.id!==song.id);
 async function submit(){
  if(dirty||conflict||busy)return;
  if(!confirm(`將「${song.id} ${song.title}」改為 ${number}？其他裝置的歌單與已匯出檔案需重新確認。`))return;
  setBusy(true);setError('');try{const r=await fetch('/api/song-number',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:song.id,number,revision:song.revision})});const d=await r.json();if(!r.ok)throw Error(d.error);onSaved(d.song)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="song-number-editor"><label>歌曲編號（管理者）<input aria-label="歌曲編號" inputMode="numeric" value={value} disabled={busy} onChange={e=>{if(/^\d{0,8}$/.test(e.target.value)){setValue(e.target.value);setError('')}}}/></label>{conflict&&<p role="alert">編號衝突：{conflict.id}「{conflict.title}」。請使用其他編號，或到「管理」交換編號。</p>}{dirty&&<p>請先儲存或重置歌詞修改，再變更編號。</p>}<button className="secondary" disabled={busy||dirty||!!conflict||!Number.isInteger(number)||number<1||number===song.number} onClick={submit}>{busy?'修改中…':'儲存新編號'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
