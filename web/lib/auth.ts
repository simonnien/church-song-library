import {cookies} from 'next/headers';
import {config} from './store';
const encoder=new TextEncoder();
export const cookieName='song_editor_session';
export const validAccount=(name:string)=>/^beershebr(0[1-9]|10)$/.test(name);
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export async function hashToken(token:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(token)));}
export async function verifyPassword(password:string){
 const stored=config().EDITOR_PASSWORD_HASH;if(!stored)return false;
 const [salt,expected]=stored.split(':');if(!salt||!expected)return false;
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
 let mismatch=actual.length^expected.length;for(let i=0;i<actual.length;i++)mismatch|=actual.charCodeAt(i)^expected.charCodeAt(i);return mismatch===0;
}
export async function editor(){
 const token=(await cookies()).get(cookieName)?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await config().DB.prepare('SELECT username FROM editor_sessions WHERE token_hash=? AND expires>?').bind(await hashToken(token),Date.now()).first<{username:string}>();
 return row&&validAccount(row.username)?row.username:null;
}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export function newToken(){return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);}
