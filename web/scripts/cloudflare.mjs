import {spawnSync} from 'node:child_process';
import {readFileSync,copyFileSync} from 'node:fs';
const [action,...args]=process.argv.slice(2);
const run=(script,argv)=>{const r=spawnSync(process.execPath,[script,...argv],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)};
const wrangler='node_modules/wrangler/bin/wrangler.js';
if(action==='dev')run('node_modules/vinext/dist/cli.js',[action,'--config','vite.cloudflare.config.ts',...args]);
else if(action==='build'){
 run('node_modules/vinext/dist/cli.js',['build','--config','vite.cloudflare.config.ts','--prerender-all',...args]);
 // The homepage is a public client shell: account and song data load from APIs.
 // Serve its build-time HTML as a static asset, avoiding per-request React SSR CPU.
 const html=readFileSync('dist/server/prerendered-routes/index.html','utf8');
 if(!html.includes('<html')||!html.includes('詩歌書房'))throw Error('Homepage prerender missing; refusing to deploy an incomplete shell');
 copyFileSync('dist/server/prerendered-routes/index.html','dist/client/index.html');
}
else if(action==='deploy'){
 const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
 if(config.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')throw Error('請先建立 Cloudflare D1，並填入 wrangler.jsonc 的 database_id。');
 run(wrangler,['d1','migrations','apply','DB','--remote','--config','wrangler.jsonc']);
 run(wrangler,['deploy','--config','dist/server/wrangler.json',...args]);
}else if(action==='login')run(wrangler,['login',...args]);
else throw Error('Usage: node scripts/cloudflare.mjs dev|build|deploy|login');
