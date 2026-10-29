const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
function moduleAt(file){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(source,{module,exports:module.exports,require:p=>p.endsWith('.json')?JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),p),'utf8')):moduleAt(path.resolve(path.dirname(file),p+'.ts')),crypto:require('node:crypto').webcrypto,structuredClone,document:{createElement:()=>({getContext:()=>({font:'',measureText(t){return {width:t.length*Number(this.font.match(/[\d.]+/)[0])}}})})}});return module.exports;}
const {showFile}=moduleAt(path.resolve('lib/exports.ts'));
const css=(s,k)=>Number(s.match(new RegExp('(?:^|;)\\s*'+k+'\\s*:\\s*([\\d.]+)'))?.[1]||0);
for(const ratio of ['16:9','32:9']){
const scale=ratio==='32:9'?2:1;
const [,show]=showFile({id:'275',number:275,title:'新酒',youtube:'',blocks:[{type:'主歌',number:1,text:'hey\n新酒澆灌帶下新鮮恩膏 說不盡的喜樂 充滿我'}]}, {ratio,showTitle:true,showPageNumbers:true,showFooterTitle:true,textColor:'#00FFCC',backgroundId:'1FfQHYWRgsiOKIEnSDUcPLNJSXTYe8V_1'});
assert(show.media.background.loop&&show.media.background.muted);
for(const entry of show.layouts.default.slides)assert.equal(entry.background,'background');
for(const slide of Object.values(show.slides)) for(const item of slide.items){
 assert(css(item.style,'left')+css(item.style,'width')<=1920,ratio+': text box exceeds FreeShow normalized canvas');
 assert(css(item.style,'top')+css(item.style,'height')<=1080,ratio+': footer exceeds canvas');
 assert(item.lines[0].text[0].style.includes('color:#00FFCC'));
 const size=css(item.lines[0].text[0].style,'font-size');
 assert(size*item.lines.length*1.4<=css(item.style,'height')/scale,ratio+': text exceeds scaled height');
}
}
console.log('PASS: 16:9 and 32:9 FreeShow text and footers fit normalized canvas');
const {pagesFor}=moduleAt(path.resolve('lib/exports.ts'));
const song={id:'001',title:'Layout test',blocks:[{type:'主歌',number:1,text:'A\nB\nC\nD\nE'},{type:'副歌',number:0,text:'F\nG'}]};
const narrow=pagesFor(song,{ratio:'16:9',showTitle:false});
const wide=pagesFor(song,{ratio:'32:9',showTitle:false});
assert.equal(narrow.length,4);assert.equal(wide.length,3);
assert.equal(JSON.stringify(wide.map(p=>p.lines)),JSON.stringify([['A B','C D'],['E'],['F G']]));
console.log('PASS: wide layout pairs lines, preserves odd final lines and section boundaries');
const {compactShortPages}=moduleAt(path.resolve('lib/exports.ts'));
const compact=(p,w=100)=>JSON.stringify(compactShortPages(p,w,t=>t.length));
assert.equal(compact([['A','B'],['C','D']]),JSON.stringify([['A B','C D']]));
for(const length of [50,51]){const input=[['X'.repeat(length),'B'],['C','D']];assert.equal(compact(input),JSON.stringify(input));}
const overflow=[['x'.repeat(49),'x'.repeat(49)],['x'.repeat(49),'x'.repeat(49)]];
assert.equal(compact(overflow,98.5),JSON.stringify(overflow));
for(const input of [[['A',''],['C','D']],[['A','B'],['C']]])assert.equal(compact(input),JSON.stringify(input));
assert.equal(compact(Array.from({length:4},(_,i)=>[`${i}a`,`${i}b`])),JSON.stringify([['0a 0b 1a 1b','2a 2b 3a 3b']]));
const eight={...song,blocks:[{type:'主歌',number:1,text:'A\nB\nC\nD\nE\nF\nG\nH'}]};
const merged=pagesFor(eight,{ratio:'32:9',showTitle:false,showPageNumbers:true});
assert.equal(merged.length,1);assert.equal(merged[0].number,'1 / 1');
assert.equal(JSON.stringify(merged[0].lines),JSON.stringify(['A B C D','E F G H']));
assert.equal(pagesFor(eight,{ratio:'16:9',showTitle:false}).length,4);
console.log('PASS: strict 50% threshold, width guard, recursive merge, boundaries and page numbers');

for(const ratio of ['16:9','32:9']){
 for(const separator of ['\n\n\n','\r\n\r\n\r\n','\n  \n  \n','\n\n\n\n']){
  const hard={...song,blocks:[{type:'主歌',number:1,text:'A'+separator+'B'}]};
  const result=pagesFor(hard,{ratio,showTitle:false,showPageNumbers:true});
  assert.equal(JSON.stringify(result.map(p=>p.lines)),JSON.stringify([['A'],['B']]));
  assert.equal(result[1].number,'2 / 2');
 }
}
const boundary={...eight,blocks:[{type:'主歌',number:1,text:'A\nB\nC\nD\n\n\nE\nF\nG\nH'}]};
assert.equal(JSON.stringify(pagesFor(boundary,{ratio:'32:9',showTitle:false}).map(p=>p.lines)),JSON.stringify([['A B','C D'],['E F','G H']]));
console.log('PASS: blank lines force page breaks in both ratios, including compact short pages');

for(const ratio of ['16:9','32:9']){
 const check=text=>JSON.stringify(pagesFor({...song,blocks:[{type:'主歌',number:1,text}]},{ratio,showTitle:false}).map(p=>p.lines));
 assert.equal(check('A\n\nB'),JSON.stringify([['A','B']]));
 assert.equal(check('A\n  \nB'),JSON.stringify([['A','B']]));
}
const protectedLines=pagesFor({...song,blocks:[{type:'主歌',number:1,text:'A\n\nB\n\nC\n\nD'}]},{ratio:'32:9',showTitle:false});
assert.equal(JSON.stringify(protectedLines.map(p=>p.lines)),JSON.stringify([['A','B'],['C','D']]));
console.log('PASS: one blank line protects line breaks against wide pairing and recursive compaction');
