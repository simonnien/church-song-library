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
assert.equal(narrow.length,3);assert.equal(wide.length,2);
assert.equal(JSON.stringify(wide.map(p=>p.lines)),JSON.stringify([['A  B','C  D  E'],['F  G']]));
console.log('PASS: wide layout pairs lines, preserves odd final lines and section boundaries');
const {compactShortPages}=moduleAt(path.resolve('lib/exports.ts'));
const compact=(p,w=100)=>JSON.stringify(compactShortPages(p,w,t=>t.length));
assert.equal(compact([['A','B'],['C','D']]),JSON.stringify([['A  B','C  D']]));
for(const length of [50,51]){const input=[['X'.repeat(length),'B'],['C','D']];assert.equal(compact(input),JSON.stringify(input));}
const overflow=[['x'.repeat(49),'x'.repeat(49)],['x'.repeat(49),'x'.repeat(49)]];
assert.equal(compact(overflow,98.5),JSON.stringify(overflow));
for(const input of [[['A',''],['C','D']]])assert.equal(compact(input),JSON.stringify(input));
assert.equal(compact(Array.from({length:4},(_,i)=>[`${i}a`,`${i}b`])),JSON.stringify([['0a  0b  1a  1b','2a  2b  3a  3b']]));
const eight={...song,blocks:[{type:'主歌',number:1,text:'A\nB\nC\nD\nE\nF\nG\nH'}]};
const merged=pagesFor(eight,{ratio:'32:9',showTitle:false,showPageNumbers:true});
assert.equal(merged.length,1);assert.equal(merged[0].number,'1 / 1');
assert.equal(JSON.stringify(merged[0].lines),JSON.stringify(['A  B  C  D','E  F  G  H']));
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
assert.equal(JSON.stringify(pagesFor(boundary,{ratio:'32:9',showTitle:false}).map(p=>p.lines)),JSON.stringify([['A  B','C  D'],['E  F','G  H']]));
console.log('PASS: blank lines force page breaks in both ratios, including compact short pages');

for(const ratio of ['16:9','32:9']){
 const check=text=>JSON.stringify(pagesFor({...song,blocks:[{type:'主歌',number:1,text}]},{ratio,showTitle:false}).map(p=>p.lines));
 assert.equal(check('A\n\nB'),JSON.stringify([['A','B']]));
 assert.equal(check('A\n  \nB'),JSON.stringify([['A','B']]));
}
const protectedLines=pagesFor({...song,blocks:[{type:'主歌',number:1,text:'A\n\nB\n\nC\n\nD'}]},{ratio:'32:9',showTitle:false});
assert.equal(JSON.stringify(protectedLines.map(p=>p.lines)),JSON.stringify([['A','B'],['C','D']]));
console.log('PASS: one blank line protects line breaks against wide pairing and recursive compaction');

const [,wideTemplateShow]=showFile({...song,blocks:[{type:'主歌',number:1,text:'A\n\nB'}]},{ratio:'32:9',showTitle:false,textColor:'#FFFFFF'});
const wideItem=Object.values(wideTemplateShow.slides)[0].items[0];
assert.equal(wideItem.style,JSON.parse(fs.readFileSync('lib/template-wide.json','utf8')).template.items[0].style);
assert(wideItem.lines[0].text[0].style.includes("font-family:'Microsoft New Tai Lue'"));
assert.equal(css(wideItem.lines[0].text[0].style,'font-size'),55);
assert.equal(css(wideItem.lines[0].text[0].style,'-webkit-text-stroke-width'),10);
console.log('PASS: dedicated 32:9 template geometry, font and stroke preserved without double scaling');
const {freeShowTextLayout}=moduleAt(path.resolve('lib/exports.ts'));
for(const lines of [['短句'],['A','B'],['長'.repeat(80)]]){
 const text=''+lines.join('\n\n');
 const [,output]=showFile({...song,blocks:[{type:'主歌',number:1,text}]},{ratio:'32:9',showTitle:false,textColor:'#FFFFFF'});
 const actual=Object.values(output.slides)[0];
 assert.equal(actual.settings.resolution.width,3840);
 assert.equal(actual.settings.resolution.height,1080);
 assert.equal(css(actual.items[0].lines[0].text[0].style,'font-size'),freeShowTextLayout(lines,'32:9').size);
}
console.log('PASS: preview and export share font sizing at 3840x1080');

const spaced={...song,blocks:[{type:'主歌',number:1,text:'  A   B\n    C　　D  '}]};
assert.equal(JSON.stringify(pagesFor(spaced,{ratio:'32:9',showTitle:false}).map(p=>p.lines)),JSON.stringify([['A B  C D']]));
assert.equal(JSON.stringify(pagesFor(spaced,{ratio:'16:9',showTitle:false}).map(p=>p.lines)),JSON.stringify([['A B','C D']]));
console.log('PASS: source whitespace becomes one space, joined source lines get two spaces');

assert.equal(compact([['A','B'],['C']]),JSON.stringify([['A  B','C']]));
assert.equal(JSON.stringify(compactShortPages([['A','B'],['C']],100,t=>t.length,new Set([1,2]))),JSON.stringify([['A','B'],['C']]));
const tooLong=[['A'.repeat(60),'B'.repeat(60)],['C'.repeat(60)]];
assert.equal(compact(tooLong),JSON.stringify(tooLong));
console.log('PASS: trailing single lines rebalance only when width and explicit breaks allow');

const fitFirst={...song,blocks:[{type:'主歌',number:1,text:Array(4).fill('字'.repeat(20)).join('\n')}]};
const fitPages=pagesFor(fitFirst,{ratio:'32:9',showTitle:false});
assert.equal(fitPages.length,2);
assert(fitPages.every(p=>p.lines.length===2&&p.lines.every(line=>line==='字'.repeat(20))));
assert(fitPages.every(p=>freeShowTextLayout(p.lines,'32:9').size===55));
const unavoidable=pagesFor({...song,blocks:[{type:'主歌',number:1,text:'字'.repeat(80)}]},{ratio:'32:9',showTitle:false});
assert.equal(unavoidable[0].lines[0],'字'.repeat(80));
assert(freeShowTextLayout(unavoidable[0].lines,'32:9').size<55);
console.log('PASS: preserve template font by adding pages; shrink only an individually overlong source line');
