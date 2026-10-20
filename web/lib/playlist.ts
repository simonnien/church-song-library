import type {Song,Options} from './model';
import {showFile,filename,download} from './exports';
import {backgroundById,backgroundUrl} from './backgrounds';
export type WorshipInfo={id:string;date:string;meeting:string;note:string;responseId:string};
export const planName=(info:WorshipInfo)=>`${info.date||'未定日期'}-${info.meeting||'敬拜歌單'}`.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
export function worshipText(songs:Song[],info:WorshipInfo){
 const date=info.date?info.date.slice(5).replace('-','/'):'';
 let index=0;return `${date}${info.meeting||'敬拜'}詩歌：${info.note?'（'+info.note+'）':''}\n\n`+songs.map(s=>`${s.id===info.responseId?'回應：':++index+'.'}${s.title}${s.id===info.responseId?'':'：'}\n${s.youtube||'（尚未提供 YouTube 連結）'}`).join('\n\n');
}
export function projectData(songs:Song[],options:Options,info:WorshipInfo,portable=false){
 if(!songs.length)throw Error('請先加入歌曲');
 const shows:Record<string,any>={},refs:any[]=[],files:string[]=[];const bg=backgroundById(options.backgroundId);
 for(const song of songs){const [key,show]=showFile(song,options) as [string,any];
  if(portable&&bg){const path=`church-song-library-media/${bg.id}.mp4`;show.media.background.path=path;if(!files.includes(path))files.push(path);}
  shows[key]=show;refs.push({id:key,name:show.name,type:'show',layout:'default',notes:song.id===info.responseId?'回應詩歌':''});
 }
 return {project:{id:'church_playlist_'+info.id,name:planName(info),parent:'/',created:Date.now(),shows:refs,notes:worshipText(songs,info)},shows,files,overlays:{},effects:{},actions:{},media:{},categories:{song:{name:'歌曲',icon:null}}};
}
export async function projectBlob(songs:Song[],options:Options,info:WorshipInfo){
 const data=projectData(songs,options,info,true),bg=backgroundById(options.backgroundId);
 if(!bg)return new Blob([JSON.stringify(data)],{type:'application/octet-stream'});
 const r=await fetch(backgroundUrl(bg.id));if(!r.ok||!r.headers.get('content-type')?.includes('video/'))throw Error('背景影片下載失敗，未產生不完整歌單');
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 zip.file('data.json',JSON.stringify(data));zip.file(`${bg.id}.mp4`,await r.arrayBuffer());
 return zip.generateAsync({type:'blob',compression:'STORE'});
}
export async function exportProject(songs:Song[],options:Options,info:WorshipInfo){download(planName(info)+'.project',await projectBlob(songs,options,info));}
export async function exportSongZip(songs:Song[],options:Options,info:WorshipInfo){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(const s of songs)zip.file(filename(s)+'.show',JSON.stringify(showFile(s,options)));
 zip.file('敬拜資訊.txt',worshipText(songs,info));zip.file('使用說明.txt','個別 .show 的背景是網路連結，需連網。離線移機請另外匯出「FreeShow 歌單＋影片 .project」，直接用 FreeShow 匯入專案，不必解壓縮。\n同一首歌固定 ID；舊版隨機 ID 副本需先在 FreeShow 備份整理。');
 download(planName(info)+'-歌曲.zip',await zip.generateAsync({type:'blob'}),'application/zip');
}
export async function exportLocalMediaPack(songs:Song[],options:Options,info:WorshipInfo){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 const data=projectData(songs,options,info),bg=backgroundById(options.backgroundId),map:any[]=[];
 if(bg){const placeholder=`__LOCAL_VIDEO_${bg.id}__`;map.push({placeholder,filename:bg.name+'.mp4'});for(const show of Object.values(data.shows))show.media.background.path=placeholder;}
 zip.file(planName(info)+'.project',JSON.stringify(data));
 for(const [id,show] of Object.entries(data.shows))zip.file(show.name+'.show',JSON.stringify([id,show]));
 const r=await fetch('/tools/match-videos.ps1');if(!r.ok)throw Error('配對工具下載失敗');zip.file('match-videos.ps1',await r.arrayBuffer());
 zip.file('start.cmd','@echo off\r\npowershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0match-videos.ps1"\r\npause\r\n');
 zip.file('media-map.json',JSON.stringify(map));
 zip.file('敬拜資訊.txt',worshipText(songs,info));
 zip.file('使用說明.txt','1. 將 ZIP 完整解壓縮到要播放的 Windows 電腦。\r\n2. 執行 start.cmd，選擇影片所在資料夾（會搜尋子資料夾）。\r\n3. 同名多個或找不到會停止；可改選更精確的資料夾後重試。\r\n4. 匯入新產生 matched-... 資料夾內的 .project（整份歌單）或 .show（單首）。不要匯入根目錄尚未配對的檔案。\r\n只建立新檔，不移動或刪除影片、不更改 FreeShow 資料庫。');
 download(planName(info)+'-本機影片配對.zip',await zip.generateAsync({type:'blob'}),'application/zip');
}
