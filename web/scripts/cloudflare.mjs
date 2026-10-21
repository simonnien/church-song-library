import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const [action,...args]=process.argv.slice(2);
const run=(script,argv)=>{const r=spawnSync(process.execPath,[script,...argv],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)};
const wrangler='node_modules/wrangler/bin/wrangler.js';
if(action==='dev'||action==='build')run('node_modules/vinext/dist/cli.js',[action,'--config','vite.cloudflare.config.ts',...args]);
else if(action==='deploy'){
 const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
 if(config.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')throw Error('請先建立 Cloudflare D1，並填入 wrangler.jsonc 的 database_id。');
 run(wrangler,['d1','migrations','apply','DB','--remote','--config','wrangler.jsonc']);
 run(wrangler,['deploy','--config','dist/server/wrangler.json',...args]);
}else if(action==='login')run(wrangler,['login',...args]);
else throw Error('Usage: node scripts/cloudflare.mjs dev|build|deploy|login');
