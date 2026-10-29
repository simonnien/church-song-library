import videoTiming from './video-timing.json';
import {backgroundById,backgroundUrl,exportColor,SITE_ORIGIN} from './backgrounds';
import type {Song,Options} from './model';
import {label} from './model';
import source from './template.json';
import wideSource from './template-wide.json';
import settings from './groups.json';
export type Page={group:string;block:number;lines:string[];size:number;width:number;height:number;title:string;number:string};
export const filename=(s:Song)=>`${s.id}-${s.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[ .]+$/g,'').slice(0,100)||'未命名'}`;
export function measured(text:string,size:number,font='"Microsoft JhengHei", "Noto Sans TC", sans-serif'){const ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`bold ${size}px ${font}`;return ctx.measureText(text).width;}
// Only complete, nonblank neighboring pages qualify. Never cross a song block.
export function compactShortPages(pages:string[][],usableWidth:number,measure:(text:string)=>number,hardLines:Set<number>=new Set()):string[][]{
 let index=0;let result=pages.map(p=>p.map(text=>({text,start:index++}))),changed=true;
 while(changed){changed=false;const next:typeof result=[];
  for(let i=0;i<result.length;i++){
   const a=result[i],b=result[i+1];
   if(b&&a.length===2&&b.length===2&&!hardLines.has(a[1].start)&&!hardLines.has(b[1].start)&&[...a,...b].every(t=>t.text.trim()&&measure(t.text)<usableWidth*.5)){
    const joined=[{text:a.map(t=>t.text).join(' '),start:a[0].start},{text:b.map(t=>t.text).join(' '),start:b[0].start}];
    if(joined.every(t=>measure(t.text)<=usableWidth)){next.push(joined);i++;changed=true;continue;}
   }
   next.push(a);
  }
  result=next;
 }
 return result.map(p=>p.map(t=>t.text));
}
export function pagesFor(song:Song,o:Options):Page[]{
 const width=o.ratio==='32:9'?3840:1920,pages:Page[]=[];
 const add=(group:string,lines:string[],block:number,base=88)=>{const largest=Math.max(1,...lines.map(t=>measured(t,base)));const size=Math.floor(Math.min(base,base*(width-48)*.96/largest)*10)/10;if(size<1)throw Error('有一行過長，請先調整歌詞。');pages.push({group,block,lines,size,width,height:1080,title:'',number:''});};
 if(!song.title.trim())throw Error('請輸入歌名');
 if(!song.blocks.some(b=>b.text.trim()&&!b.type.startsWith('歌名')))throw Error('請先輸入歌詞');
 if(o.showTitle&&!song.blocks[0]?.type.startsWith('歌名'))add('歌名',[song.title],-1,140);
 song.blocks.forEach((b,i)=>{
  if(!o.showTitle&&b.type.startsWith('歌名'))return;
  // Two blank lines force a page; one blank line protects a line boundary.
  const sections=b.text.replace(/\r\n?/g,'\n').split(/\n(?:[^\S\n]*\n){2,}/);
  for(const section of sections){
   if(!section.trim())continue;
   const wide=o.ratio==='32:9'&&!b.type.startsWith('歌名');
   const lines:string[]=[],hardLines=new Set<number>();
   for(const part of section.split(/\n[^\S\n]*\n/)){
    if(!part.trim())continue;
    const original=part.split('\n');
    if(lines.length)hardLines.add(lines.length);
    lines.push(...(wide?original.filter((_,j)=>j%2===0).map((line,j)=>original[j*2+1]===undefined?line:line+' '+original[j*2+1]):original));
   }
   let chunks:string[][]=[];
   for(let j=0;j<lines.length;j+=2)chunks.push(lines.slice(j,j+2));
   if(wide){
    const item=wideSource.template.items[0],style=item.lines[0].text[0].style;
    const value=(css:string,key:string,fallback:number)=>Number(css.match(new RegExp(`(?:^|;)\\s*${key}\\s*:\\s*([\\d.]+)`))?.[1]??fallback);
    const font=style.match(/font-family\s*:\s*([^;]+)/)?.[1]||'Microsoft New Tai Lue';
    const usable=(value(item.style,'width',1890)-19.2-2*value(style,'-webkit-text-stroke-width',0))*.96;
    chunks=compactShortPages(chunks,usable,t=>measured(t,value(style,'font-size',55),font),hardLines);
   }
   chunks.forEach(chunk=>add(label(b),chunk,i));
  }
 });
 return pages.map((p,i)=>({...p,title:o.showFooterTitle?song.title:'',number:o.showPageNumbers?`${i+1} / ${pages.length}`:''}));
}
export function download(name:string,content:Blob|string,type='application/json'){
 // Mobile browsers append extensions based on the Blob MIME, even when download has a filename.
 const mime=name.toLowerCase().endsWith('.pptx')?'application/vnd.openxmlformats-officedocument.presentationml.presentation':(/\.(show|project)$/i.test(name))?'application/octet-stream':type;
 const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.type=mime;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function groupColor(name:string){const groups=settings.groups as Record<string,{name:string;color:string}>;const compact=name.replace(/\s/g,'');const exact=Object.entries(groups).find(([,v])=>v.name.replace(/\s/g,'')===compact);const key=exact?.[0]||({'主歌':'verse','副歌':'chorus','導歌':'pre_chorus','橋段':'bridge','尾句':'tag'} as Record<string,string>)[compact.replace(/\d+$/,'')];return {key,color:groups[key]?.color||'#FFFFFF'};}
export function showFile(song:Song,options:Options){
 const pages=pagesFor(song,options);const template=structuredClone(options.ratio==='32:9'?wideSource.template:source.template);const prototype=template.items.find(i=>i.type==='text')!;
 const num=(style:string,k:string,fallback:number)=>Number(style.match(new RegExp(`(?:^|;)\\s*${k}\\s*:\\s*([\\d.]+)`))?.[1]??fallback);
 const scale=options.ratio==='32:9'?2:1;
 // FreeShow normalizes item coordinates to 1920x1080, then adapts them to the output aspect ratio.
 // The dedicated wide template already contains its intended normalized font size.
 const runStyle=prototype.lines[0].text[0].style,base=num(runStyle,'font-size',96),width=num(prototype.style,'width',1889.76),height=num(prototype.style,'height',272.12);
 const font=runStyle.match(/font-family\s*:\s*([^;]+)/)?.[1]||'Microsoft JhengHei';
 const usableWidth=width-19.2-num(runStyle,'-webkit-text-stroke-width',0)*2,usableHeight=height/scale-9.6;
 const slides:Record<string,any>={},layout:any[]=[],parents=new Map<number,{id:string;entry:any}>();
 pages.forEach((p,i)=>{const id=`slide_${i+1}`,size=Math.floor(Math.min(base,base*usableWidth*.96/Math.max(1,...p.lines.map(t=>measured(t,base,font))),usableHeight/(p.lines.length*1.4))*10)/10;
 const item:any=structuredClone(prototype);item.auto=false;item.textFit='none';item.lines=p.lines.map(t=>({align:prototype.lines[0].align+';white-space:pre;text-wrap:nowrap;',text:[{value:t,style:runStyle.replace(/(?:^|;)\s*color\s*:[^;]+/g,';color:'+exportColor(options.textColor)).replace(/font-size\s*:\s*[\d.]+px/,`font-size:${size}px`)+';white-space:pre;text-wrap:nowrap;overflow-wrap:normal;word-break:keep-all;'}]}));
 const items:any[]=[item];
 for(const footer of [{text:p.title,x:24,width:p.width-220,align:'left'},{text:p.number,x:p.width-180,width:156,align:'right'}])if(footer.text){const fs=Math.min(28,28*footer.width/Math.max(1,measured(footer.text,28)))/scale;items.push({type:'text',auto:false,textFit:'none',style:`left:${footer.x/scale}px;top:1020px;width:${footer.width/scale}px;height:40px;`,lines:[{align:`text-align:${footer.align};white-space:pre;text-wrap:nowrap;`,text:[{value:footer.text,style:`font-family:Microsoft JhengHei;font-size:${fs}px;color:${exportColor(options.textColor)};white-space:pre;text-wrap:nowrap;`}]}]});}
 const slide:any={group:null,color:null,settings:{resolution:{width:p.width,height:p.height},color:'#000000'},notes:'',items};
 const parent=parents.get(p.block);if(!parent){const g=groupColor(p.group);slide.group=p.group;slide.color=g.color;slide.children=[];if(g.key)slide.globalGroup=g.key;const entry={id,children:{}};layout.push(entry);parents.set(p.block,{id,entry});}else{slides[parent.id].children.push(id);parent.entry.children[id]={};}slides[id]=slide;
 });const bg=backgroundById(options.backgroundId);const media:any={};if(bg){media.background={name:bg.name,path:SITE_ORIGIN+backgroundUrl(bg.id),type:'video',muted:true,loop:true};for(const entry of layout){entry.background='background';for(const child of Object.values(entry.children) as any[])child.background='background';}}const now=Date.now();return ['church_song_library_'+Number(song.id),{name:filename(song),category:'song',settings:{activeLayout:'default',template:null},timestamps:{created:Math.floor(now/1000),modified:now,used:null},meta:{number:song.id,title:song.title},slides,layouts:{default:{name:'預設',notes:song.youtube,slides:layout}},media}];
}
export async function exportPptx(song:Song,options:Options,returnBlob=false){
 const {default:PptxGenJS}=await import('pptxgenjs');const bg=backgroundById(options.backgroundId);let video:Blob|null=null;if(bg){const r=await fetch(backgroundUrl(bg.id));if(!r.ok||!r.headers.get('content-type')?.includes('video/'))throw Error('背景影片下載失敗，未匯出不完整檔案');video=await r.blob();}const cover=video?await videoPoster(video):'';const pptx=new PptxGenJS(),pages=pagesFor(song,options);
 pptx.defineLayout({name:'LYRICS',width:pages[0].width/144,height:7.5});pptx.layout='LYRICS';pptx.title=song.title;pptx.subject='教會歌曲資料庫';
 pages.forEach(p=>{const s=pptx.addSlide();s.background={color:'000000'};if(video)s.addMedia({type:'video',data:'video/mp4;base64,AAAA',extn:'mp4',objectName:'背景影片',x:0,y:0,w:p.width/144,h:7.5,cover});
 p.lines.forEach((line,i)=>s.addText(line,{x:24/144,y:(24+i*p.size*1.4)/144,w:(p.width-48)/144,h:p.size*1.4/144,fontFace:'Microsoft JhengHei',fontSize:p.size/2,bold:true,color:exportColor(options.textColor).slice(1),align:'center',valign:'middle',margin:0,wrap:false,breakLine:false}));
 if(p.title)s.addText(p.title,{x:24/144,y:1020/144,w:(p.width-220)/144,h:40/144,fontFace:'Microsoft JhengHei',fontSize:Math.min(14,14*(p.width-220)/Math.max(1,measured(p.title,28))),color:exportColor(options.textColor).slice(1),margin:0,wrap:false});
 if(p.number)s.addText(p.number,{x:(p.width-180)/144,y:1020/144,w:156/144,h:40/144,fontSize:14,color:exportColor(options.textColor).slice(1),align:'right',margin:0,wrap:false});if(song.youtube)s.addNotes(song.youtube);
 });const blob=video?await exportVideoPptx(pptx,video):await pptx.write({outputType:'blob'}) as Blob;if(returnBlob)return blob;download(filename(song)+'.pptx',blob);
}


// One shared media part keeps large backgrounds from being duplicated per slide.
async function exportVideoPptx(pptx:import('pptxgenjs').default,video:Blob){
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await pptx.write({outputType:'arraybuffer'}) as ArrayBuffer);
 for(const file of Object.keys(zip.files)){
  if(/^ppt\/media\/.*\.mp4$/.test(file))zip.remove(file);
  else if(/^ppt\/slides\/_rels\/slide\d+\.xml.rels$/.test(file)){const xml=await zip.file(file)!.async('string');zip.file(file,xml.replace(/Target="[^"<>]+\.mp4"/g,'Target="../media/background.mp4"'));}
  else if(/^ppt\/slides\/slide\d+\.xml$/.test(file)){let xml=await zip.file(file)!.async('string');const id=xml.match(/<p:cNvPr[^>]*id="(\d+)"[^>]*name="背景影片"/)?.[1];if(!id)throw Error('影片版面建立失敗');
   const timing=videoTiming.replaceAll('__VIDEO_ID__',id);
   xml=xml.replace('</p:sld>',timing+'</p:sld>');zip.file(file,xml);
  }
 }
 zip.file('ppt/media/background.mp4',await video.arrayBuffer(),{compression:'STORE'});
 return zip.generateAsync({type:'blob',compression:'STORE'});
}

async function videoPoster(blob:Blob):Promise<string>{
 const video=document.createElement('video'),url=URL.createObjectURL(blob);video.muted=true;video.preload='auto';
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,640,360);
 try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('poster timeout')),10000);video.onloadeddata=()=>{clearTimeout(timer);resolve()};video.onerror=()=>{clearTimeout(timer);reject(Error('poster unavailable'))};video.src=url;});ctx.drawImage(video,0,0,640,360);}catch{}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 return canvas.toDataURL('image/png');
}
