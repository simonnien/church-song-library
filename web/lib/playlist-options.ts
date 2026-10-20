import type {Options} from './model';
import {backgroundById} from './backgrounds';

export const DEFAULT_OPTIONS:Options={showPageNumbers:false,showTitle:true,showFooterTitle:false,ratio:'32:9',textColor:'#FFFFFF',backgroundId:''};
export type SongOptions=Record<string,Options>;
export function cleanOptions(value:Partial<Options>={}):Options {
 value=value||{};
 return {...DEFAULT_OPTIONS,ratio:value.ratio==='16:9'?'16:9':'32:9',textColor:/^#[0-9a-f]{6}$/i.test(value.textColor||'')?value.textColor:'#FFFFFF',backgroundId:backgroundById(value.backgroundId)?.id||'',showTitle:typeof value.showTitle==='boolean'?value.showTitle:DEFAULT_OPTIONS.showTitle,showPageNumbers:!!value.showPageNumbers,showFooterTitle:!!value.showFooterTitle};
}
export function readSongOptions(raw:string|null):SongOptions {
 try {const data=JSON.parse(raw||'{}');if(!data||Array.isArray(data)||typeof data!=='object')return {};return Object.fromEntries(Object.entries(data).filter(([id,v])=>/^\d{1,8}$/.test(id)&&v&&typeof v==='object').map(([id,v])=>[id,cleanOptions(v as Options)]));}catch{return {}}
}
export const optionsFor=(id:string,defaults:Options,individual:SongOptions={})=>individual[id]||defaults;
export function optionSummary(options:Options):string {
 const o=cleanOptions(options),differences:string[]=[];
 if(o.ratio!=='32:9')differences.push(o.ratio);
 if(o.textColor!.toUpperCase()!=='#FFFFFF')differences.push('文字 '+o.textColor!.toUpperCase());
 const bg=backgroundById(o.backgroundId);if(bg)differences.push('背景：'+bg.name);
 if(!o.showTitle)differences.push('不顯示歌名頁');
 if(o.showFooterTitle)differences.push('下方歌名');
 if(o.showPageNumbers)differences.push('頁碼');
 return differences.length?differences.join(' · '):'白字 · 黑底 · 32:9';
}
