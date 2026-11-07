const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),{webcrypto,createHash}=require('crypto');
const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE google_editors(email TEXT PRIMARY KEY,subject TEXT UNIQUE,disabled INTEGER NOT NULL DEFAULT 0);CREATE TABLE editor_sessions(token_hash TEXT,username TEXT,expires INTEGER);INSERT INTO google_editors VALUES('simon930926@gmail.com','owner',0);");db.exec(fs.readFileSync('drizzle/0009_editor_labels_roles.sql','utf8'));
const DB={prepare(sql){let values=[];return {bind(...args){values=args;return this},async first(){return db.prepare(sql).get(...values)||null},async all(){return {results:db.prepare(sql).all(...values)}},async run(){return db.prepare(sql).run(...values)}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
db.exec(fs.readFileSync('drizzle/0010_editor_groups.sql','utf8'));db.exec('PRAGMA foreign_keys=ON');
let token='';const owner='simon930926@gmail.com';const google={GOOGLE_ADMIN:owner,googleReady:()=>true};
function load(file,imports){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require:p=>imports[p],crypto:webcrypto,TextEncoder,URL,Response,Date});return mod.exports;}
const auth=load('lib/auth.ts',{'next/headers':{cookies:async()=>({get:()=>token?{value:token}:undefined})},'./store':{config:()=>({DB})},'./google-auth':google});
const api=load('app/api/google-editors/route.ts',{'@/lib/auth':auth,'@/lib/store':{config:()=>({DB})},'@/lib/google-auth':google});
function login(email){token=createHash('sha256').update(email).digest('hex');db.prepare('INSERT INTO editor_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),email,Date.now()+60000);}
async function post(data,origin='https://songs.beersheba.cc'){return api.POST(new Request('https://songs.beersheba.cc/api/google-editors',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)}));}
(async()=>{
 assert.equal((await api.GET()).status,403);login(owner);
 assert.equal((await post({email:'admin@example.com',action:'update',label:'小明',isAdmin:true},'https://other.example')).status,403);
 assert.equal((await post({email:'admin@example.com',action:'update',label:'小明',isAdmin:true})).status,200);
 db.prepare('UPDATE google_editors SET subject=? WHERE email=?').run('admin','admin@example.com');login('admin@example.com');assert.equal(await auth.isAdmin(),true);
 assert.equal((await post({email:owner,action:'disable'})).status,400);
 assert.equal((await post({email:owner,action:'update',label:'owner',isAdmin:false})).status,400);
 assert.equal((await post({email:'admin@example.com',action:'update',label:'self',isAdmin:false})).status,400);
 assert.equal((await post({email:'editor@example.com',action:'update',label:'音控',isAdmin:false})).status,200);
 assert.equal((await post({email:'editor@example.com',action:'disable'})).status,200);
 await post({email:'editor@example.com',action:'update',label:'已停用音控',isAdmin:false});assert.equal(db.prepare('SELECT disabled FROM google_editors WHERE email=?').get('editor@example.com').disabled,1);
 await post({email:'editor@example.com',action:'enable'});db.prepare('UPDATE google_editors SET subject=? WHERE email=?').run('editor','editor@example.com');
 const data=await (await api.GET()).json();assert(data.users.some(u=>u.label==='小明'&&u.is_admin===1));
 assert.equal((await post({action:'group-create',name:'敬拜團'})).status,200);
 assert.equal((await post({action:'group-create',name:'青年小組'})).status,200);
 assert.equal((await post({action:'group-create',name:'敬拜團'})).status,409);
 let tags=(await (await api.GET()).json()).groups;const ids=tags.map(g=>g.id);
 assert.equal((await post({action:'update',email:'editor@example.com',name:'小美',groupIds:ids,isAdmin:false})).status,200);
 let member=(await (await api.GET()).json()).users.find(u=>u.email==='editor@example.com');assert.equal(member.name,'小美');assert.equal(member.groupIds.length,2);
 assert.equal((await post({action:'update',email:'editor@example.com',name:'小美',groupIds:[9999],isAdmin:false})).status,409);
 assert.equal((await post({action:'group-rename',id:ids[0],name:'新團名'})).status,200);
 assert.equal((await (await api.GET()).json()).groups.find(g=>g.id===ids[0]).members,1);
 await post({action:'group-delete',id:ids[0]});member=(await (await api.GET()).json()).users.find(u=>u.email==='editor@example.com');assert.equal(member.groupIds.length,1);assert.equal(member.name,'小美');
 login('editor@example.com');assert.equal((await post({action:'group-create',name:'越權'})).status,403);assert.equal(await auth.isAdmin(),false);assert.equal((await api.GET()).status,403);assert.equal((await post({email:'editor@example.com',action:'update',label:'escalate',isAdmin:true})).status,403);
 console.log('PASS: migration, labels, delegated admins, owner/self protection, disabled state, session authorization and escalation rejection');
})().catch(e=>{console.error(e);process.exit(1)});
