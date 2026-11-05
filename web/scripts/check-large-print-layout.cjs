const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/large-print-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports});
const {layoutPrintBlock}=mod.exports;
const measure=(s,size)=>Array.from(s).reduce((n,c)=>n+(c===' '?0.25:1)*size,0);
const layout=(s,p='')=>layoutPrintBlock(s,p,measure,200);
let lines=layout('恩典滿溢\n喜樂同行');assert.equal(lines.length,1);assert.equal(lines[0].size,20);assert.equal(lines[0].text,'恩典滿溢  喜樂同行');
lines=layout('恩典滿溢喜樂同行 平安盼望與我同在');assert.equal(lines.length,2);assert(lines.every(l=>l.size===20));assert.equal(lines.map(l=>l.text).join(' '),'恩典滿溢喜樂同行 平安盼望與我同在');
lines=layout('沒有任何空白而且超過整個欄位寬度的完整句子');assert.equal(lines.length,1);assert(lines[0].size<20);assert(measure(lines[0].text,lines[0].size)<=200);
lines=layout('恩典\n\n喜樂');assert.equal(lines.length,1);assert.equal(lines[0].text,'恩典  喜樂');
lines=layout('一二三四五\n六七八九十','1.');assert.equal(lines.length,2);assert(lines.every(l=>l.size===20));assert.equal(lines[0].text,'1.一二三四五');
for(const input of ['短句 長句的完整文字很多很多沒有空白 末句','甲\n乙\n丙','短句\n\n另一段','hello world welcome to worship']){const result=layout(input);assert.equal(result.map(l=>l.text).join('').replace(/\s/g,''),input.replace(/\s/g,''));assert(result.every(l=>measure(l.text,l.size)<=200));}
console.log('PASS: merge short pairs, wrap at spaces, shrink only unbroken phrases, preserve text and remove within-block blank lines, include prefix width');
