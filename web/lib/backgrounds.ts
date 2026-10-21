import catalog from './background-catalog.json';
export const BACKGROUNDS=catalog;
export const backgroundById=(id?:string)=>BACKGROUNDS.find(v=>v.id===id);
export const backgroundUrl=(id:string)=>`/api/backgrounds/${encodeURIComponent(id)}`;
export const exportColor=(color?:string)=>/^#[0-9a-f]{6}$/i.test(color||'')?color!:'#FFFF00';
export const SITE_ORIGIN=typeof window!=='undefined'?window.location.origin:'https://beersheba-songs.bluechub6.chatgpt.site';
