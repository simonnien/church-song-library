import {editor} from '@/lib/auth';
import {config} from '@/lib/store';
export async function GET(){const user=await editor();if(!user)return Response.json({seen:true});const row=await config().DB.prepare('SELECT username FROM tutorial_seen WHERE username=?').bind(user).first();return Response.json({seen:!!row},{headers:{'Cache-Control':'no-store'}})}
export async function POST(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});const user=await editor();if(!user)return new Response(null,{status:403});await config().DB.prepare('INSERT INTO tutorial_seen VALUES(?,?) ON CONFLICT(username) DO NOTHING').bind(user,Date.now()).run();return Response.json({ok:true})}
