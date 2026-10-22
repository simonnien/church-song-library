import {config} from './store';
export const GOOGLE_ADMIN='simon930926@gmail.com';
export const GOOGLE_ORIGIN='https://songs.beersheba.cc';
export const GOOGLE_CALLBACK=GOOGLE_ORIGIN+'/api/auth/google/callback';
export const googleReady=()=>Boolean(config().GOOGLE_CLIENT_ID&&config().GOOGLE_CLIENT_SECRET);
export const googleCookie='__Host-google-login-state';
export const stateCookieOptions={httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge:600};
export async function challenge(verifier:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
