const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/duplicate-song-title.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports});
const songs=[{id:'002',number:2,title:'新 酒'},{id:'001',number:1,title:'新酒'},{id:'003',number:3,title:'ＡＢＣ'},{id:'004',number:4,title:'新酒（現場版）'}];
const find=(title,id)=>Array.from(m.exports.duplicateSongTitles(songs,title,id),s=>s.id);
assert.deepEqual(find(' 新酒　'),['001','002']);assert.deepEqual(find('abc'),['003']);assert.deepEqual(find('新酒','001'),['002']);assert.deepEqual(find('新歌'),[]);assert.deepEqual(find('  '),[]);assert.deepEqual(find('新酒(現場版)'),['004']);
assert.match(m.exports.duplicateTitleNotice(songs),/001－新酒/);
console.log('PASS: all-title matching, whitespace/fullwidth/case normalization, distinct versions and duplicate numbers in notice');
