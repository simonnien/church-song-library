const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const catalog=JSON.parse(fs.readFileSync('lib/background-catalog.json','utf8'));
const moduleStub={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/backgrounds.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module:moduleStub,exports:moduleStub.exports,require:()=>catalog});
const {backgroundForRatio,backgroundById}=moduleStub.exports;
assert.equal(catalog.length,54);
for(const bg of catalog){
 assert.equal(bg.width,bg.ratio==='16:9'?1920:3840);assert.equal(bg.height,1080);assert.equal(bg.fps,30);assert.equal(bg.loop,true);
 assert(fs.existsSync('public/background-thumbnails/'+bg.id+'.jpg'));
 for(const ratio of ['16:9','32:9']){
  const mapped=backgroundById(backgroundForRatio(bg.id,ratio));assert.equal(mapped.ratio,ratio);assert.equal(mapped.sourceId,bg.sourceId);
  assert.equal(backgroundById(backgroundForRatio(bg.originalId,ratio)).ratio,ratio);
 }
}
assert.equal(backgroundForRatio('', '16:9'),'');
console.log('PASS: 27 paired backgrounds, 54 standardized videos, ratio switching and legacy IDs');
