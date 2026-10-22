'use client';
import {useEffect,useState} from 'react';
import type {Song} from '@/lib/model';
export default function SwapNumbers(){
 const [songs,setSongs]=useState<Song[]>([]),[a,setA]=useState(''),[b,setB]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState('');
 useEffect(()=>{fetch('/api/library').then(r=>r.json()).then(d=>{if(!d.songs)throw Error('歌曲讀取失敗');setSongs(d.songs)}).catch(e=>setError(e.message))},[]);
 const first=songs.find(s=>s.id===a),second=songs.find(s=>s.id===b);
 async function swap(){
  if(!first||!second||a===b)return;
  if(!confirm(`交換後：\n${a} → ${second.title}\n${b} → ${first.title}\n\n歌詞與影片連結會一起交換。其他裝置的已選歌單及既有匯出檔請重新確認。確定交換？`))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/swap-numbers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a,b,revisionA:first.revision,revisionB:second.revision})});const d=await r.json();if(!r.ok)throw Error(d.error);
   setDone(`已交換 ${a} 與 ${b}。請重新整理網站，並重新確認已選歌單與個別版面設定。`);setSongs([]);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section><h3>交換歌曲編號</h3><p>選兩首歌曲，交換編號及整首內容。此操作不會自動改動已下載的檔案。</p>{!done&&<><label>第一首<select disabled={busy} value={a} onChange={e=>setA(e.target.value)}><option value="">請選擇</option>{songs.map(s=><option key={s.id} value={s.id}>{s.id} {s.title}</option>)}</select></label><label>第二首<select disabled={busy} value={b} onChange={e=>setB(e.target.value)}><option value="">請選擇</option>{songs.map(s=><option key={s.id} value={s.id}>{s.id} {s.title}</option>)}</select></label>{first&&second&&a!==b&&<p>交換後：{a} {second.title}<br/>{b} {first.title}</p>}<button className="primary" disabled={busy||!first||!second||a===b} onClick={swap}>{busy?'交換中…':'交換這兩首歌曲的編號'}</button></>}{error&&<p role="alert">{error}</p>}{done&&<p role="status">{done}<button onClick={()=>location.reload()}>重新整理網站</button></p>}</section>;
}
