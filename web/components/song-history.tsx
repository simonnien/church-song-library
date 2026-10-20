'use client';
import {useEffect,useState} from 'react';
import type {Song} from '@/lib/model';
export default function SongHistory({song,onRestore,onClose}:{song:Song;onRestore:(song:Song)=>void;onClose:()=>void}){
 const [versions,setVersions]=useState<{id:number;saved_at:string;actor:string;song:Song}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch('/api/history?id='+encodeURIComponent(song.id)).then(async r=>{const d=await r.json() as {versions:typeof versions;error:string};if(!r.ok)throw Error(d.error);setVersions(d.versions)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[song.id]);
 return <div className="modal-backdrop"><section className="settings-modal" role="dialog" aria-modal="true" aria-label="修改紀錄"><button className="close-modal" onClick={onClose}>×</button><h2>{song.title} · 修改紀錄</h2><p>選取舊版本後先載入編輯區，按儲存才會更新資料庫。</p>{loading&&<p>載入中…</p>}{!loading&&!error&&!versions.length&&<p>尚無修改紀錄。</p>}{versions.map(v=><article className="history-version" key={v.id}><strong>{new Date(v.saved_at).toLocaleString('zh-TW')} 修改前</strong><small>變更者：{v.actor||'早期紀錄'}</small><details><summary>查看此版本</summary><pre>{v.song.blocks.map(b=>`${b.type}${b.number}\n${b.text}`).join('\n\n')}</pre></details><button className="secondary" onClick={()=>{if(confirm('將此版本載入編輯區？目前未儲存修改將被替換。')){onRestore({...v.song,revision:song.revision});onClose()}}}>載入此版本</button></article>)}{error&&<p role="alert">{error}</p>}</section></div>
}
