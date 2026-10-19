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
