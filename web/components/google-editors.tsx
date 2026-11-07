'use client';
import {useState,useEffect} from 'react';
import {readApiJson} from '@/lib/api-response';
import SwapNumbers from './swap-numbers';
type User={email:string;disabled:number;label:string;is_admin:number};
export default function GoogleEditors({onClose}:{onClose:()=>void}){
 const [users,setUsers]=useState<User[]>([]),[email,setEmail]=useState(''),[label,setLabel]=useState(''),[admin,setAdmin]=useState(false),[editing,setEditing]=useState(false),[owner,setOwner]=useState(''),[current,setCurrent]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const r=await fetch('/api/google-editors');const d=await readApiJson(r);if(!r.ok)throw Error(d.error);setUsers(d.users);setOwner(d.owner);setCurrent(d.current)}
 useEffect(()=>{load().catch(e=>setError(e.message))},[]);
 function reset(){setEmail('');setLabel('');setAdmin(false);setEditing(false)}
 async function save(target:string,action:string){
  const existing=users.find(u=>u.email===target.trim().toLowerCase());
  if(action==='disable'&&!confirm(`停用 ${existing?.label||target} 的網站權限？`))return;
  if(action==='update'&&admin&&!existing?.is_admin&&!confirm(`將 ${label||target} 設為管理員？管理員可管理其他帳號及修改歌曲編號。`))return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/google-editors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:target,action,...(action==='update'?{label,isAdmin:admin}:{})})});const d=await readApiJson(r);if(!r.ok)throw Error(d.error);if(action==='update')reset();await load();setNotice('已儲存帳號設定');}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="modal-backdrop"><section className="settings-modal login-modal admin-modal" role="dialog" aria-modal="true" aria-label="Google 帳號管理"><button className="close-modal" disabled={busy} onClick={onClose}>×</button><h2>管理</h2><SwapNumbers/><h3>管理員與編輯者</h3><p>標籤可填姓名或用途，顯示在帳號前方。管理員可管理帳號與歌曲編號；密碼由 Google 管理。</p><ul>{users.map(u=><li key={u.email} style={{padding:'12px 0',borderBottom:'1px solid #ddd'}}><strong>{u.label||'未設定標籤'}</strong><div style={{overflowWrap:'anywhere'}}>{u.email}</div><small>{u.email===owner?'擁有者':u.is_admin?'管理員':'編輯者'} · {u.disabled?'已停用':'啟用'}</small><div><button disabled={busy} onClick={()=>{setEditing(true);setEmail(u.email);setLabel(u.label);setAdmin(!!u.is_admin);setError('')}}>編輯標籤／權限</button>{u.email!==owner&&u.email!==current&&<button disabled={busy} onClick={()=>save(u.email,u.disabled?'enable':'disable')}>{u.disabled?'啟用':'停用'}</button>}</div></li>)}</ul><form onSubmit={e=>{e.preventDefault();save(email,'update')}}><h3>{editing?'編輯帳號':'新增帳號'}</h3><label>Google 信箱<input type="email" required disabled={busy||editing} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>標籤（姓名或用途）<input maxLength={80} disabled={busy} placeholder="例如：小明／敬拜團" value={label} onChange={e=>setLabel(e.target.value)}/></label><label>權限<select disabled={busy||email===owner||email===current} value={admin?'admin':'editor'} onChange={e=>setAdmin(e.target.value==='admin')}><option value="editor">編輯者</option><option value="admin">管理員</option></select></label><button className="primary" disabled={busy}>{busy?'儲存中…':editing?'儲存修改':'新增帳號'}</button>{editing&&<button type="button" disabled={busy} onClick={reset}>取消編輯</button>}</form>{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</section></div>;
}
