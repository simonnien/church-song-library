import type {Song} from './model';

export function youtubeVideoId(value:string):string|null {
 const input=value.trim();
 try {
  const url=new URL(/^https?:\/\//i.test(input)?input:'https://'+input);
  const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
  let id:string|null=null;
  if(host==='youtu.be')id=parts[0]||null;
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
   id=['shorts','live','embed'].includes(parts[0])?parts[1]:url.searchParams.get('v');
  }
  return id&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}

export function matchesSongSearch(song:Song,query:string):boolean {
 const q=query.trim();if(!q)return true;
 const id=youtubeVideoId(q);
 if(id)return [song.youtube,...(song.links||[]).map(link=>link.url)].some(url=>youtubeVideoId(url||'')===id);
 return `${song.id} ${song.title} ${song.blocks.map(b=>b.text).join(' ')}`.toLowerCase().includes(q.toLowerCase());
}
