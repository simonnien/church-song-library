import type {Song} from './model';
export type Draft={song:Song;savedAt:string};
export const draftKey=(user:string,id:string)=>`song-draft:${user}:${id}`;
export function readDraft(storage:Storage,user:string,id:string):Draft|null{
 try{const d=JSON.parse(storage.getItem(draftKey(user,id))||'null');return d?.song?.id===id&&typeof d.song.title==='string'&&Array.isArray(d.song.blocks)?d:null}catch{return null}
}
export function writeDraft(storage:Storage,user:string,song:Song){storage.setItem(draftKey(user,song.id),JSON.stringify({song,savedAt:new Date().toISOString()}))}
export function clearDraft(storage:Storage,user:string,id:string){storage.removeItem(draftKey(user,id))}
