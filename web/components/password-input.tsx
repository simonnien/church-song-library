'use client';
import {useState} from 'react';
export default function PasswordInput({value,onChange,autoComplete='current-password',name='password'}:{value:string;onChange:(value:string)=>void;autoComplete?:string;name?:string}){
 const [visible,setVisible]=useState(false);
 return <span className="password-field"><input type={visible?'text':'password'} inputMode="text" lang="zh-Hant" autoCapitalize="none" autoCorrect="off" spellCheck={false} name={name} autoComplete={autoComplete} value={value} onChange={e=>onChange(e.target.value)} maxLength={256} required/><button type="button" className="subtle" aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'隱藏密碼':'顯示密碼'}</button></span>;
}
