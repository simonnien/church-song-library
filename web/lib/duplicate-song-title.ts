type NamedSong={id:string;number:number;title:string};
function titleKey(title:string){return title.normalize('NFKC').replace(/\s+/gu,'').toLocaleLowerCase('zh-Hant');}
export function duplicateSongTitles<T extends NamedSong>(songs:T[],title:string,excludeId?:string):T[]{
 const key=titleKey(title);return key?songs.filter(s=>s.id!==excludeId&&titleKey(s.title)===key).sort((a,b)=>a.number-b.number):[];
}
export function duplicateTitleNotice(songs:NamedSong[],action="新增"){return '發現重複歌名：\n\n'+songs.map(s=>`${s.id}－${s.title}`).join('\n')+'\n\n請確認是否為不同版本。仍要繼續'+action+'嗎？\n按「取消」可返回修改，不會覆蓋原有歌曲。';}
