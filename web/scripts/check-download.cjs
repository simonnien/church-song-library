const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const exportsObject={},saved=[];let pending;
const ctx={exports:exportsObject,require:()=>({}),Blob,setTimeout:()=>0,URL:{createObjectURL(blob){pending=blob;return 'blob:test'},revokeObjectURL(){}},document:{body:{appendChild(){}},createElement(){return {style:{},click(){saved.push({name:this.download,type:pending.type,blob:pending})},remove(){}}}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/exports.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
exportsObject.download('011-聖靈我們歡迎你.pptx',new Blob(['PK'],{type:'application/zip'}));
exportsObject.download('011-聖靈我們歡迎你.show','["id",{}]');
exportsObject.download('歌曲雲端資料庫.json','{}');
assert.equal(saved[0].type,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
assert.equal(saved[1].type,'application/octet-stream');assert.equal(saved[2].type,'application/json');
assert.equal(saved[0].name,'011-聖靈我們歡迎你.pptx');assert.equal(saved[1].name,'011-聖靈我們歡迎你.show');
Promise.all(saved.map(s=>s.blob.text())).then(values=>{assert.deepEqual(values,['PK','["id",{}]','{}']);console.log('PASS: PPTX and FreeShow MIME/filenames, unchanged content, JSON backup preserved')});

