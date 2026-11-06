import {type ReportProgress,zipProgress,yieldForPaint} from './export-progress';
import type {Song,Options} from './model';
import {optionsFor,type SongOptions} from './playlist-options';
import {showFile,filename,download,exportPptx} from './exports';
import {backgroundById,backgroundUrl,SITE_ORIGIN} from './backgrounds';
export type WorshipInfo={id:string;date:string;meeting:string;note:string;responseId:string;responseIds?:string[]};
export const projectName=(info:WorshipInfo)=>`${/^\d{4}-\d{2}-\d{2}$/.test(info.date)?info.date.slice(2).replace(/-/g,'/'):info.date||'未定日期'} ${info.meeting.trim()||'敬拜歌單'}`;
export const planName=(info:WorshipInfo)=>projectName(info).replace(/\//g,'-').replace(/[<>:"\\|?*\x00-\x1f]/g,'_');
export function worshipText(songs:Song[],info:WorshipInfo){
 const date=info.date?info.date.slice(5).replace('-','/'):'';
 let index=0;return `${date}${info.meeting||'敬拜'}詩歌：${info.note?'（'+info.note+'）':''}\n\n`+songs.map(s=>`${(info.responseIds??[info.responseId]).includes(s.id)?'回應：':++index+'.'}${s.id}-${s.title}${(info.responseIds??[info.responseId]).includes(s.id)?'':'：'}\n${s.youtube||'（尚未提供 YouTube 連結）'}`).join('\n\n');
}
export function projectData(songs:Song[],options:Options,info:WorshipInfo,portable=false,individual:SongOptions={}){
 if(!songs.length)throw Error('請先加入歌曲');
 const shows:Record<string,any>={},refs:any[]=[],files:string[]=[],media:Record<string,any>={};
 for(const song of songs){const own=optionsFor(song.id,options,individual),bg=backgroundById(own.backgroundId);const [key,show]=showFile(song,own) as [string,any];
  if(portable&&bg){const path=`church-song-library-media/${bg.id}.mp4`;show.media.background.path=path;if(!files.includes(path))files.push(path);}
  shows[key]=show;refs.push({id:key,name:show.name,type:'show',layout:'default',notes:(info.responseIds??[info.responseId]).includes(song.id)?'回應詩歌':''});
 }
 for(const song of songs){const bg=backgroundById(optionsFor(song.id,options,individual).backgroundId);if(!bg)continue;const fullPath=portable?`church-song-library-media/${bg.id}.mp4`:SITE_ORIGIN+backgroundUrl(bg.id);if(media[fullPath])continue;refs.push({id:fullPath,name:bg.name,type:'video',loop:true,muted:true});media[fullPath]={speed:'1',filter:'',fit:'cover',videoType:'background'};}
 return {project:{id:'church_playlist_'+info.id,name:projectName(info),parent:'/',created:Date.now(),shows:refs,notes:worshipText(songs,info)},shows,files,overlays:{},effects:{},actions:{},media,categories:{song:{name:'歌曲',icon:null}}};
}
export async function projectBlob(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={},report?:ReportProgress){
 const data=projectData(songs,options,info,true,individual);
 if(!data.files.length)return new Blob([JSON.stringify(data)],{type:'application/octet-stream'});
 const {default:JSZip}=await import('jszip');const zip=new JSZip();let serialized=JSON.stringify(data);
 for(const [i,path] of data.files.entries()){
  report?.({label:`正在下載背景影片 ${i+1} / ${data.files.length}`});await yieldForPaint();
  const id=path.split('/').pop()!.slice(0,-4),bytes=await downloadBackground(id,report);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const name=`${id}-${digest}.mp4`,verifiedPath=`church-song-library-verified/${name}`;
  // FreeShow skips extraction when its imported path already exists. Content-addressed
  // paths avoid reusing partial videos imported by older exports, on any computer.
  serialized=serialized.split(JSON.stringify(path)).join(JSON.stringify(verifiedPath));
  zip.file(name,bytes);
 }
 zip.file('data.json',serialized);
 return zip.generateAsync({type:'blob',compression:'STORE'},zipProgress(report));
}
export async function downloadBackground(id:string,report?:ReportProgress){
 const bg=backgroundById(id);if(!bg)throw Error('找不到背景影片');
 const parts:ArrayBuffer[]=[];const chunkSize=1024*1024;
 for(let start=0;start<bg.bytes;start+=chunkSize){
  const end=Math.min(start+chunkSize,bg.bytes)-1;
  for(let attempt=1;attempt<=6;attempt++){
   try{
    const url=backgroundUrl(id)+`?download=1&part=${start}`;
    const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(60000),headers:{Range:`bytes=${start}-${end}`}});
    if(r.status!==206||r.headers.get('content-range')!==`bytes ${start}-${end}/${bg.bytes}`||!r.headers.get('content-type')?.includes('video/')){await r.body?.cancel();throw Error(`分段回應錯誤（HTTP ${r.status}）`);}
    const bytes=await r.arrayBuffer();
    if(bytes.byteLength!==end-start+1)throw Error('影片分段大小不符');
    parts.push(bytes);report?.({label:`正在下載 ${bg.name}：${Math.round((end+1)/bg.bytes*100)}%`});break;
   }catch(error){
    if(attempt===6)throw Error(`${bg.name} 下載不完整：第 ${Math.floor(start/chunkSize)+1}/${Math.ceil(bg.bytes/chunkSize)} 段（位元組 ${start}–${end}）；${error instanceof Error?error.message:'網路連線中斷'}。請重試，未產生不完整專案。`);
    report?.({label:`${bg.name} 分段下載中斷，稍後重試 ${attempt} / 5`});
    await new Promise(resolve=>setTimeout(resolve,1000*Math.min(attempt,3)));
   }
  }
 }
 return new Blob(parts,{type:'video/mp4'}).arrayBuffer();
}
export async function exportProject(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={},report?:ReportProgress){download(planName(info)+'.project',await projectBlob(songs,options,info,individual,report));}
export async function exportSongZip(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={},report?:ReportProgress){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(const [i,s] of songs.entries()){report?.({label:`正在製作歌曲 ${i+1} / ${songs.length}：${s.title}`});await yieldForPaint();zip.file(filename(s)+'.show',JSON.stringify(showFile(s,optionsFor(s.id,options,individual))));}
 zip.file('敬拜資訊.txt',worshipText(songs,info));zip.file('使用說明.txt','個別 .show 的背景是網路連結，需連網。離線移機請另外匯出「FreeShow 歌單＋影片 .project」，直接用 FreeShow 匯入專案，不必解壓縮。\n同一首歌固定 ID；舊版隨機 ID 副本需先在 FreeShow 備份整理。');
 download(planName(info)+'-歌曲.zip',await zip.generateAsync({type:'blob'},zipProgress(report)),'application/zip');
}
export async function exportLocalMediaPack(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={},report?:ReportProgress){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 const data=projectData(songs,options,info,false,individual),map:any[]=[];
 for(const song of songs){const bg=backgroundById(optionsFor(song.id,options,individual).backgroundId);if(!bg||map.some(m=>m.placeholder===`__LOCAL_VIDEO_${bg.id}__`))continue;const placeholder=`__LOCAL_VIDEO_${bg.id}__`,url=SITE_ORIGIN+backgroundUrl(bg.id);map.push({placeholder,filename:bg.filename,bytes:bg.localBytes||bg.bytes});for(const show of Object.values(data.shows))if(show.media?.background?.path===url)show.media.background.path=placeholder;for(const ref of data.project.shows)if(ref.type==='video'&&ref.id===url)ref.id=placeholder;if(data.media[url]){data.media[placeholder]=data.media[url];delete data.media[url];}}
 zip.file(planName(info)+'.project',JSON.stringify(data));
 for(const [id,show] of Object.entries(data.shows))zip.file(show.name+'.show',JSON.stringify([id,show]));
 const r=await fetch('/tools/match-videos.ps1');if(!r.ok)throw Error('配對工具下載失敗');zip.file('match-videos.ps1',await r.arrayBuffer());
 zip.file('start.cmd','@echo off\r\npowershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0match-videos.ps1"\r\npause\r\n');
 zip.file('media-map.json',JSON.stringify(map));
 zip.file('敬拜資訊.txt',worshipText(songs,info));
 zip.file('使用說明.txt','1. 將 ZIP 完整解壓縮到要播放的 Windows 電腦。\r\n2. 執行 start.cmd，工具先讀取 FreeShow 歌曲庫；找不到位置時請選 Shows 資料夾。依編號找歌曲；找到時詢問是否覆蓋。是：備份並覆蓋；否：沿用本機歌曲；取消：停止。缺少時使用下載 .show。\r\n3. 工具會記住影片資料夾，優先搜尋 D:\\FreeShow\\video。缺少影片或同名多個時可手動指定，下一次會記住配對。相同編號有多個本機檔案時會停止，避免選錯歌。\r\n4. 工具會嘗試開啟 matched-... 中的 .project；若未開啟，請在 FreeShow 匯入它。配對結果.txt 會列出沿用、覆蓋與新增歌曲。失敗時請查看 match-error.txt。不要匯入根目錄尚未配對的檔案。\r\n執行前先儲存並完全關閉 FreeShow。覆蓋保留本機 ID 與名稱，原檔備份在 matched-.../original-backup；選否則保留本機內容。不移動或刪除影片。');
 download(planName(info)+'-本機歌曲影片配對.zip',await zip.generateAsync({type:'blob'},zipProgress(report)),'application/zip');
}

export async function exportPptxZip(songs:Song[],options:Options,info:WorshipInfo,individual:SongOptions={},report?:ReportProgress){if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();for(const [i,s] of songs.entries()){await yieldForPaint();zip.file(filename(s)+'.pptx',await (await exportPptx(s,optionsFor(s.id,options,individual),true,p=>report?.({...p,label:`歌曲 ${i+1} / ${songs.length}：${s.title} · ${p.label}`})) as Blob).arrayBuffer());}download(planName(info)+'-PowerPoint.zip',await zip.generateAsync({type:'blob',compression:'STORE'},zipProgress(report)),'application/zip');}

