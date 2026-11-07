const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/song-search.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,URL});
const {youtubeVideoId:id,matchesSongSearch:match}=mod.exports;
const key='AjL3gfY9SOA',song={id:'123',title:'測試詩歌',youtube:'https://youtu.be/'+key,links:[{url:'https://www.youtube.com/watch?v=5hkbct1UPK8'}],blocks:[{text:'讚美祢'}]};
for(const url of [`https://youtube.com/watch?v=${key}&t=30`,`https://youtu.be/${key}?si=shared`,`https://m.youtube.com/shorts/${key}`,`https://youtube.com/live/${key}`,`https://www.youtube-nocookie.com/embed/${key}`,`music.youtube.com/watch?v=${key}`]){assert.equal(id(url),key);assert(match(song,url));}
assert(match(song,'https://youtu.be/5hkbct1UPK8?si=test'));
assert(!match(song,'https://youtu.be/ajL3gfY9SOA'));
assert.equal(id('https://youtube.com.evil.example/watch?v='+key),null);
assert.equal(id('https://youtube.com/playlist?list=PL123'),null);
assert(match(song,'123'));assert(match(song,'詩歌'));assert(match(song,'讚美'));assert(!match(song,'其他歌'));assert(match(song,''));
console.log('PASS: YouTube URL formats, exact case-sensitive IDs, candidate links and text search');
