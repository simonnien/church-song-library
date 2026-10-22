'use client';
import {useState,useEffect} from 'react';
import SwapNumbers from './swap-numbers';
export default function GoogleEditors({onClose}:{onClose:()=>void}){
 const [users,setUsers]=useState<{email:string;disabled:number}[]>([]),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){const r=await fetch('/api/google-editors');const d=await r.json();if(!r.ok)throw Error(d.error);setUsers(d.users)}
 useEffect(()=>{load().catch(e=>setError(e.message))},[]);
 async function save(email:string,action:string){if(!confirm(`${action==='enable'?'允許':'停用'} ${email} 編輯網站？`))return;setBusy(true);setError('');try{const r=await fetch('/api/google-editors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,action})});const d=await r.json();if(!r.ok)throw Error(d.error);setEmail('');await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="modal-backdrop"><section className="settings-modal login-modal admin-modal" role="dialog" aria-modal="true" aria-label="Google 帳號管理"><button className="close-modal" disabled={busy} onClick={onClose}>×</button><h2>管理</h2><SwapNumbers/><h3>Google 編輯者</h3><p>只有以下啟用的帳號能編輯。密碼由 Google 管理。</p><ul>{users.map(u=><li key={u.email}>{u.email} · {u.disabled?'已停用':'啟用'}{u.email!=='simon930926@gmail.com'&&<button disabled={busy} onClick={()=>save(u.email,u.disabled?'enable':'disable')}>{u.disabled?'啟用':'停用'}</button>}</li>)}</ul><form onSubmit={e=>{e.preventDefault();save(email,'enable')}}><label>新增編輯者 Google 信箱<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary" disabled={busy}>新增編輯者</button></form>{error&&<p role="alert">{error}</p>}</section></div>;
}
