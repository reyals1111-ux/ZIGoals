#!/usr/bin/env node
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const actions={
 tool_node:'Select repository Node 24.19.0.',tool_pnpm:'Select pnpm 11.19.0.',
 app_auth_origin:'Set ZIGOALS_AUTH_ORIGIN to the exact Supabase HTTPS project origin.',
 app_public_key:'Set ZIGOALS_AUTH_PUBLIC_KEY to a public/anon client key, never a service-role key.',
 app_sync_origin:'Set ZIGOALS_SYNC_ORIGIN to the isolated private Worker HTTPS origin.',
 worker_config:'Set ZIGOALS_OWNER_WORKER_CONFIG to a private ignored 0600 Worker JSONC file.',
 worker_auth_origin:'Set Worker vars.AUTH_ORIGIN to the exact Supabase HTTPS origin.',
 worker_app_origin:'Set Worker vars.APP_ORIGIN to the exact isolated app HTTPS origin.',
 worker_public_key:'Privately supply Worker AUTH_PUBLIC_KEY as a public/anon key; do not add it to JSONC.',
 worker_binding:'Configure VAULTS/PrivateVault and its SQLite migration in the isolated Worker file.',
 auth_match:'Make app and Worker auth origins identical.',key_match:'Use the same public client key in app and Worker configuration.',
 sync_match:'Match the app sync origin to the isolated Worker name and workers.dev host.',
};
const pending=v=>!v||/placeholder|unconfigured|changeme|replace|example|your[-_]|dummy|fixture|fictional/i.test(v);
function exactOrigin(value,kind){
 if(pending(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&u.username===''&&u.password===''&&u.port===''&&
  (kind==='auth'?/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname):kind==='sync'?/^[a-z0-9.-]+\.workers\.dev$/.test(u.hostname):u.hostname!=='alpha.zigoals.app');}catch{return false;}
}
function publicKey(v){
 if(pending(v)||v.length>4096)return false;
 if(/service[_-]?role|sb_secret_/i.test(v))return false;
 if(v.split('.').length===3){try{const payload=JSON.parse(Buffer.from(v.split('.')[1],'base64url').toString());if(payload.role==='service_role'||payload.role==='supabase_admin')return false;}catch{}}
 return true;
}
export function checkSetup(input={},worker=null,tools={}){
 const checks=[];const add=(id,status)=>checks.push({id,status,action:status==='PASS'?null:actions[id]});
 add('tool_node',tools.node==='v24.19.0'?'PASS':tools.node?'INVALID':'MISSING');
 add('tool_pnpm',tools.pnpm==='11.19.0'?'PASS':tools.pnpm?'INVALID':'MISSING');
 const field=(id,value,valid)=>add(id,!value?'MISSING':valid(value)?'PASS':'INVALID');
 field('app_auth_origin',input.ZIGOALS_AUTH_ORIGIN,v=>exactOrigin(v,'auth'));
 field('app_public_key',input.ZIGOALS_AUTH_PUBLIC_KEY,publicKey);
 field('app_sync_origin',input.ZIGOALS_SYNC_ORIGIN,v=>exactOrigin(v,'sync'));
 add('worker_config',worker?'PASS':'MISSING');
 field('worker_auth_origin',input.AUTH_ORIGIN,v=>exactOrigin(v,'auth'));
 field('worker_app_origin',input.APP_ORIGIN,v=>exactOrigin(v,'app'));
 field('worker_public_key',input.AUTH_PUBLIC_KEY,publicKey);
 add('worker_binding',!worker?'NOT_VERIFIED':worker?.durable_objects?.bindings?.some(b=>b.name==='VAULTS'&&b.class_name==='PrivateVault')&&worker?.migrations?.some(m=>m.new_sqlite_classes?.includes('PrivateVault'))?'PASS':'INVALID');
 add('auth_match',!input.ZIGOALS_AUTH_ORIGIN||!input.AUTH_ORIGIN?'NOT_VERIFIED':input.ZIGOALS_AUTH_ORIGIN===input.AUTH_ORIGIN?'PASS':'INVALID');
 add('key_match',!input.ZIGOALS_AUTH_PUBLIC_KEY||!input.AUTH_PUBLIC_KEY?'NOT_VERIFIED':input.ZIGOALS_AUTH_PUBLIC_KEY===input.AUTH_PUBLIC_KEY?'PASS':'INVALID');
 const sync=input.ZIGOALS_SYNC_ORIGIN;
 add('sync_match',!worker||!sync?'NOT_VERIFIED':typeof worker.name==='string'&&worker.name!=='zigoals-alpha'&&sync.startsWith(`https://${worker.name}.`)&&exactOrigin(sync,'sync')?'PASS':'INVALID');
 return {checks,local_configuration:checks.every(c=>c.status==='PASS')?'PASS':'MISSING',live_authentication:'LIVE_NOT_VERIFIED',encrypted_sync:'NOT_VERIFIED'};
}
export function formatSetup(r){return ['Pre-Run 11 setup — offline/read-only',...r.checks.map(c=>`${c.status}: ${c.id}${c.action?' — '+c.action:''}`),`LOCAL_CONFIGURATION: ${r.local_configuration}`,`LIVE_AUTHENTICATION: ${r.live_authentication}`,`ENCRYPTED_SYNC: ${r.encrypted_sync}`].join('\n');}
function main(){
 let worker=null;let input={...process.env};let configProblem=null;
 const path=process.env.ZIGOALS_OWNER_WORKER_CONFIG;
 if(path){try{
  const full=resolve(path),root=resolve(fileURLToPath(new URL('../',import.meta.url)));
  if(!full.startsWith(root+'/'))throw Error();
  if(statSync(full).mode&0o077)throw Error();
  const ignored=spawnSync('git',['check-ignore','-q',full],{cwd:root});if(ignored.status!==0)throw Error();
  worker=JSON.parse(readFileSync(full,'utf8'));input={...input,...worker.vars};
 }catch{configProblem='INVALID';}}
 const pnpm=spawnSync('pnpm',['--version'],{encoding:'utf8',timeout:3000});
 const report=checkSetup(input,worker,{node:process.version,pnpm:pnpm.status===0?pnpm.stdout.trim():null});
 if(configProblem){const c=report.checks.find(x=>x.id==='worker_config');c.status='INVALID';report.local_configuration='MISSING';}
 console.log(formatSetup(report));
 process.exitCode=report.local_configuration==='PASS'?0:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
