export type Block = {type:string;number:string;text:string};
export type Video = {url:string;title:string;type:string;status:string};
export type Song = {id:string;number:number;title:string;youtube:string;links:Video[];blocks:Block[];status:string;revision:number};
export type Options = {showPageNumbers:boolean;showTitle:boolean;showFooterTitle:boolean;ratio:'16:9'|'32:9';textColor?:string;backgroundId?:string};
export const TYPES=['歌名','主歌','副歌','尾句','導歌','橋段'];
export const label=(b:Block)=>b.type+(Number(b.number)?' '+Number(b.number):'');
export const safeYoutube=(value:string)=>{if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&['youtube.com','www.youtube.com','m.youtube.com','youtu.be','music.youtube.com'].includes(u.hostname)}catch{return false}};
export function validateSong(value:unknown):Song {
 const s=value as Song;
 if(!s||typeof s.id!=='string'||!/^\d{1,8}$/.test(s.id)||!Number.isInteger(s.number)||s.number<1||Number(s.id)!==s.number)throw Error('歌曲編號無效');
 if(typeof s.title!=='string'||!s.title.trim()||s.title.length>160)throw Error('請填寫歌名（最多 160 字）');
 if(typeof s.youtube!=='string'||!safeYoutube(s.youtube))throw Error('請輸入有效的 HTTPS YouTube 連結');
 if(!Number.isInteger(s.revision)||s.revision<0)throw Error('歌曲版本無效');
 if(!Array.isArray(s.blocks)||!s.blocks.length||s.blocks.length>200)throw Error('請加入歌詞段落');
 let total=0;
 for(const b of s.blocks){if(!b||typeof b.type!=='string'||!b.type.trim()||b.type.length>40||typeof b.number!=='string'||!/^\d{0,4}$/.test(b.number)||typeof b.text!=='string')throw Error('段落格式無效');total+=b.text.length;}
 if(total>100000)throw Error('單首歌詞最多 100,000 字');
 return {...s,title:s.title.trim(),links:Array.isArray(s.links)?s.links.filter(v=>v&&typeof v.url==='string'&&safeYoutube(v.url)).slice(0,30):[],blocks:s.blocks.map(b=>({...b,number:Number(b.number)?String(Number(b.number)):''})),status:'已確認'};
}

export function songVolumes(songs:Song[]){
 const indexes=[...new Set(songs.map(s=>Math.floor((s.number-1)/100)))].sort((a,b)=>a-b);
 return indexes.map(index=>({index,start:String(index*100+1).padStart(3,'0'),end:String((index+1)*100).padStart(3,'0'),songs:songs.filter(s=>Math.floor((s.number-1)/100)===index)}));
}
