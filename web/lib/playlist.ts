import type {Song,Options} from './model';
import {optionsFor,type SongOptions} from './playlist-options';
import {showFile,filename,download,exportPptx} from './exports';
import {backgroundById,backgroundUrl,SITE_ORIGIN} from './backgrounds';
export type WorshipInfo={id:string;date:string;meeting:string;note:string;responseId:string};
export const planName=(info:WorshipInfo)=>`${info.date||'未定日期'}-${info.meeting||'敬拜歌單'}`.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
export function worshipText(songs:Song[],info:WorshipInfo){
 const date=info.date?info.date.slice(5).replace('-','/'):'';
 let index=0;return `${date}${info.meeting||'敬拜'}詩歌：${info.note?'（'+info.note+'）':''}\n\n`+songs.map(s=>`${s.id===info.responseId?'回應：':++index+'.'}${s.title}${s.id===info.responseId?'':'：'}\n${s.youtube||'（尚未提供 YouTube 連結）'}`).join('\n\n');
}
export function projectData(songs:Song[],options:Options,info:WorshipInfo,portable=false,individual:SongOptions={}){
 if(!songs.length)throw Error('請先加入歌曲');
 const shows:Record<string,any>={},refs:any[]=[],files:string[]=[],media:Record<string,any>={};
 for(const song of songs){const own=optionsFor(song.id,options,individual),bg=backgroundById(own.backgroundId);const [key,show]=showFile(song,own) as [string,any];
  if(portable&&bg){const path=`church-song-library-media/${bg.id}.mp4`;show.media.background.path=path;if(!files.includes(path))files.push(path);}
  shows[key]=show;refs.push({id:key,name:show.name,type:'show',layout:'default',notes:song.id===info.responseId?'回應詩歌':''});
 }
 for(const song of songs){const bg=backgroundById(optionsFor(song.id,options,individual).backgroundId);if(!bg)continue;const fullPath=portable?`church-song-library-media/${bg.id}.mp4`:SITE_ORIGIN+backgroundUrl(bg.id);if(media[fullPath])continue;refs.push({id:fullPath,name:bg.name,type:'video',loop:true,muted:true});media[fullPath]={speed:'1',filter:'',fit:'cover',videoType:'background'};}
 return {project:{id:'church_playlist_'+info.id,name:planName(info),parent:'/',created:Date.now(),shows:refs,notes:worshipText(songs,info)},shows,files,overlays:{},effects:{},actions:{},media,categories:{song:{name:'歌曲',icon:null}}};
}
export async function projectBlob(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={}){
 const data=projectData(songs,options,info,true,individual);
 if(!data.files.length)return new Blob([JSON.stringify(data)],{type:'application/octet-stream'});
 const {default:JSZip}=await import('jszip');const zip=new JSZip();zip.file('data.json',JSON.stringify(data));
 for(const path of data.files){const name=path.split('/').pop()!,id=name.slice(0,-4);const r=await fetch(backgroundUrl(id));if(!r.ok||!r.headers.get('content-type')?.includes('video/'))throw Error('背景影片下載失敗，未產生不完整歌單');zip.file(name,await r.arrayBuffer());}
 return zip.generateAsync({type:'blob',compression:'STORE'});
}
export async function exportProject(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={}){download(planName(info)+'.project',await projectBlob(songs,options,info,individual));}
export async function exportSongZip(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={}){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(const s of songs)zip.file(filename(s)+'.show',JSON.stringify(showFile(s,optionsFor(s.id,options,individual))));
 zip.file('敬拜資訊.txt',worshipText(songs,info));zip.file('使用說明.txt','個別 .show 的背景是網路連結，需連網。離線移機請另外匯出「FreeShow 歌單＋影片 .project」，直接用 FreeShow 匯入專案，不必解壓縮。\n同一首歌固定 ID；舊版隨機 ID 副本需先在 FreeShow 備份整理。');
 download(planName(info)+'-歌曲.zip',await zip.generateAsync({type:'blob'}),'application/zip');
}
export async function exportLocalMediaPack(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={}){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 const data=projectData(songs,options,info,false,individual),map:any[]=[];
 for(const song of songs){const bg=backgroundById(optionsFor(song.id,options,individual).backgroundId);if(!bg||map.some(m=>m.placeholder===`__LOCAL_VIDEO_${bg.id}__`))continue;const placeholder=`__LOCAL_VIDEO_${bg.id}__`,url=SITE_ORIGIN+backgroundUrl(bg.id);map.push({placeholder,filename:bg.filename,bytes:bg.localBytes||bg.bytes});for(const show of Object.values(data.shows))if(show.media?.background?.path===url)show.media.background.path=placeholder;for(const ref of data.project.shows)if(ref.type==='video'&&ref.id===url)ref.id=placeholder;if(data.media[url]){data.media[placeholder]=data.media[url];delete data.media[url];}}
 zip.file(planName(info)+'.project',JSON.stringify(data));
 for(const [id,show] of Object.entries(data.shows))zip.file(show.name+'.show',JSON.stringify([id,show]));
 const r=await fetch('/tools/match-videos.ps1');if(!r.ok)throw Error('配對工具下載失敗');zip.file('match-videos.ps1',await r.arrayBuffer());
 zip.file('start.cmd','@echo off\r\npowershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0match-videos.ps1"\r\npause\r\n');
 zip.file('media-map.json',JSON.stringify(map));
 zip.file('敬拜資訊.txt',worshipText(songs,info));
 zip.file('使用說明.txt','1. 將 ZIP 完整解壓縮到要播放的 Windows 電腦。\r\n2. 執行 start.cmd，工具先讀取 FreeShow 歌曲庫；找不到位置時請選 Shows 資料夾。已有歌曲直接引用，只有缺少的才使用下載 .show。\r\n3. 工具會記住影片資料夾，優先搜尋 D:\\FreeShow\\video。缺少影片或同名多個時可手動指定，下一次會記住配對。歌曲同名多個仍會停止，避免選錯歌。\r\n4. 工具會嘗試開啟 matched-... 中的 .project；若未開啟，請在 FreeShow 匯入它。配對結果.txt 會列出沿用與新增歌曲。不要匯入根目錄尚未配對的檔案。\r\n執行前先儲存 FreeShow 修改。沿用本機歌曲不覆蓋歌詞、版面與影片；只新增歌單缺少的歌曲。不移動或刪除影片。');
 download(planName(info)+'-本機歌曲影片配對.zip',await zip.generateAsync({type:'blob'}),'application/zip');
}

export async function exportPptxZip(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={}){if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();for(const s of songs)zip.file(filename(s)+'.pptx',await (await exportPptx(s,optionsFor(s.id,options,individual),true) as Blob).arrayBuffer());download(planName(info)+'-PowerPoint.zip',await zip.generateAsync({type:'blob',compression:'STORE'}),'application/zip');}

