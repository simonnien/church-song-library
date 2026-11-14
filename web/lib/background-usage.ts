export const RECENT_BACKGROUNDS='song-library-recent-export-backgrounds-by-song';
export function recentBackgrounds(songId?:string):string[]{
 if(!songId)return [];
 try{const value=JSON.parse(localStorage.getItem(RECENT_BACKGROUNDS+':'+songId)||'[]');return Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'):[]}catch{return []}
}
export function recordBackgroundExport(values:{songId:string;backgroundId?:string}[]){
 const ids=[...new Set(values.map(v=>v.backgroundId).filter((v):v is string=>!!v))];if(!ids.length)return;
 for(const {songId,backgroundId} of values){
  if(!songId||!backgroundId)continue;
  try{localStorage.setItem(RECENT_BACKGROUNDS+':'+songId,JSON.stringify([backgroundId,...recentBackgrounds(songId).filter(id=>id!==backgroundId)].slice(0,30)))}catch{}
 }
 const body=JSON.stringify({eventId:crypto.randomUUID(),ids});
 void (async()=>{for(let attempt=0;attempt<2;attempt++){try{const r=await fetch('/api/background-usage',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true});if(r.ok)break}catch{}}window.dispatchEvent(new Event('background-exported'))})();
}
