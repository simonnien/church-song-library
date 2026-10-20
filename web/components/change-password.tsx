'use client';
import {useState} from 'react';
import PasswordInput from './password-input';
export default function ChangePassword({username,onClose,onChanged}:{username:string;onClose:()=>void;onChanged:()=>void}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');
  if(next.length<8){setError('新密碼至少需要 8 個字元');return}
  if(next!==repeat){setError('兩次輸入的新密碼不同');return}
  setBusy(true);
  try{const r=await fetch('/api/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword:next})});const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error||'變更失敗');onChanged();}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="modal-backdrop"><section className="settings-modal login-modal" role="dialog" aria-modal="true" aria-label="修改密碼"><button className="close-modal" onClick={onClose} disabled={busy} aria-label="關閉修改密碼">×</button><h2>修改密碼</h2><p>{username} · 只變更自己的密碼。完成後所有裝置需重新登入。</p><form onSubmit={submit}><input type="hidden" autoComplete="username" value={username}/><label>目前密碼<PasswordInput value={current} onChange={setCurrent}/></label><label>新密碼<PasswordInput value={next} onChange={setNext} name="new-password" autoComplete="new-password"/></label><label>再次輸入新密碼<PasswordInput value={repeat} onChange={setRepeat} name="repeat-password" autoComplete="new-password"/></label>{error&&<p className="login-error" role="alert">{error}</p>}<button type="submit" className="primary" disabled={busy}>{busy?'變更中…':'變更密碼'}</button></form><small>可使用中文、英文與符號，至少 8 個字元。若手機無法切換鍵盤，可先按「顯示密碼」。系統不提供原始密碼查詢。</small></section></div>
}
