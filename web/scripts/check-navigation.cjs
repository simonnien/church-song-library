const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/song-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,module:mod});
let entries=[{router:'keep'}],index=0,handler,screen='list',allow=true,checks=0;
const win={history:{get state(){return entries[index]},replaceState(s){entries[index]=s},pushState(s){entries=entries.slice(0,index+1);entries.push(s);index++},back(){index--;handler({state:entries[index]})}},matchMedia:()=>({matches:true}),addEventListener:(_,fn)=>handler=fn,removeEventListener:()=>{}};
const nav=mod.exports.createSongNavigation(win,v=>screen=v,()=>{checks++;return allow});
nav.open();assert.equal(entries.length,2);assert.equal(screen,'detail');assert.equal(win.history.state.router,'keep');nav.open();assert.equal(entries.length,2);
allow=false;nav.back();assert.equal(screen,'detail');assert.equal(index,1);assert.equal(checks,1);
allow=true;nav.back();assert.equal(screen,'list');assert.equal(index,0);nav.open();win.history.back();assert.equal(screen,'list');assert.equal(index,0);nav.dispose();console.log('PASS: phone navigation stays in site, cancel preserves detail, toolbar/browser back share guard, repeated song selection adds no extra history');
