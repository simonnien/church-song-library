import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
const [input,output='.sites-runtime/cloudflare/songs.sql']=process.argv.slice(2);
if(!input)throw Error('Usage: node scripts/prepare-song-import.mjs <歌曲備份.json> [輸出.sql]');
const destination=relative(resolve('.sites-runtime'),resolve(output));
if(destination.startsWith('..')||isAbsolute(destination))throw Error('SQL 請放在 .sites-runtime 內，避免上傳歌曲資料到 GitHub。');
const data=JSON.parse(readFileSync(input,'utf8').replace(/^\uFEFF/,'')),songs=Array.isArray(data)?data:data.songs;
if(!Array.isArray(songs)||!songs.length)throw Error('備份沒有歌曲，未產生匯入檔。');
const quote=v=>"'"+String(v).replaceAll("'","''")+"'",seen=new Set();
const rows=songs.map(s=>{
 if(!/^\d{1,8}$/.test(s.id)||seen.has(s.id)||!s.title||!Array.isArray(s.blocks)||!Number.isInteger(s.revision)||s.revision<0)throw Error('歌曲格式或編號重複，請重新下載備份。');
 seen.add(s.id);
 return `INSERT INTO songs(id,data,revision,updated) VALUES(${quote(s.id)},${quote(JSON.stringify(s))},${s.revision},${quote(new Date().toISOString())}) ON CONFLICT(id) DO NOTHING;`;
});
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,rows.join('\n')+'\n');
console.log(`已準備 ${songs.length} 首歌曲：${output}（不覆寫已存在的歌曲）`);
