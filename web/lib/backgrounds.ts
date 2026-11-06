import catalog from './background-catalog.json';
type Background=typeof catalog[number]&{sourceId?:string;originalId?:string;width?:number;height?:number;fps?:number;loop?:boolean};
export const BACKGROUNDS:Background[]=catalog;
export const backgroundById=(id?:string)=>BACKGROUNDS.find(v=>v.id===id)||BACKGROUNDS.find(v=>v.originalId===id)||BACKGROUNDS.find(v=>v.sourceId===id);
export function backgroundForRatio(id:string|undefined,ratio:'16:9'|'32:9'){
 const current=backgroundById(id);if(!current)return '';
 return BACKGROUNDS.find(v=>(v.sourceId||v.id)===(current.sourceId||current.id)&&v.ratio===ratio)?.id||'';
}
export const backgroundUrl=(id:string)=>`/api/backgrounds/${encodeURIComponent(id)}`;
export const exportColor=(color?:string)=>/^#[0-9a-f]{6}$/i.test(color||'')?color!:'#FFFF00';
export const SITE_ORIGIN=typeof window!=='undefined'?window.location.origin:'https://beersheba-songs.bluechub6.chatgpt.site';
