export const RECENT_BACKGROUNDS='song-library-recent-export-backgrounds';
export function recentBackgrounds():string[]{try{return JSON.parse(localStorage.getItem(RECENT_BACKGROUNDS)||'[]')}catch{return []}}
export function recordBackgroundExport(values:(string|undefined)[]){
 const ids=[...new Set(values.filter((v):v is string=>!!v))];if(!ids.length)return;
 try{localStorage.setItem(RECENT_BACKGROUNDS,JSON.stringify([...ids,...recentBackgrounds().filter(id=>!ids.includes(id))].slice(0,30)))}catch{}
 const body=JSON.stringify({eventId:crypto.randomUUID(),ids});
 void (async()=>{for(let attempt=0;attempt<2;attempt++){try{const r=await fetch('/api/background-usage',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true});if(r.ok)break}catch{}}window.dispatchEvent(new Event('background-exported'))})();
}
