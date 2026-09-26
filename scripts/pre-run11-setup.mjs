#!/usr/bin/env node
import {readFileSync,statSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {isPublicSupabaseKey} from './lib/supabase-public-key.mjs';

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
 auth_allowed_origin:'Set ZIGOALS_ALLOWED_AUTH_ORIGIN equal to the approved Supabase project origin.',
 test_recipients:'Set ZIGOALS_TEST_RECIPIENTS to controlled test inboxes in the private environment file.',
};
const pending=v=>!v||/placeholder|unconfigured|changeme|replace|example|your[-_]|dummy|fixture|fictional/i.test(v);
function exactOrigin(value,kind){
 if(pending(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&u.username===''&&u.password===''&&u.port===''&&
  (kind==='auth'?/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname):kind==='sync'?/^[a-z0-9.-]+\.workers\.dev$/.test(u.hostname):u.hostname!=='alpha.zigoals.app');}catch{return false;}
}
export function checkSetup(input={},worker=null,tools={},options={}){
 const authOnly=options.authOnly===true;
 const checks=[];const add=(id,status)=>checks.push({id,status,action:status==='PASS'?null:actions[id]});
 add('tool_node',tools.node==='v24.19.0'?'PASS':tools.node?'INVALID':'MISSING');
 if(!authOnly)add('tool_pnpm',tools.pnpm==='11.19.0'?'PASS':tools.pnpm?'INVALID':'MISSING');
 const field=(id,value,valid)=>add(id,!value?'MISSING':valid(value)?'PASS':'INVALID');
 field('app_auth_origin',input.ZIGOALS_AUTH_ORIGIN,v=>exactOrigin(v,'auth'));
 field('app_public_key',input.ZIGOALS_AUTH_PUBLIC_KEY,isPublicSupabaseKey);
 if(authOnly){
  field('auth_allowed_origin',input.ZIGOALS_ALLOWED_AUTH_ORIGIN,v=>exactOrigin(v,'auth')&&v===input.ZIGOALS_AUTH_ORIGIN);
  field('test_recipients',input.ZIGOALS_TEST_RECIPIENTS,v=>typeof v==='string'&&v.split(',').every(email=>/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email.trim())&&!pending(email)));
 }else{
 field('app_sync_origin',input.ZIGOALS_SYNC_ORIGIN,v=>exactOrigin(v,'sync'));
 add('worker_config',worker?'PASS':'MISSING');
 field('worker_auth_origin',input.AUTH_ORIGIN,v=>exactOrigin(v,'auth'));
 field('worker_app_origin',input.APP_ORIGIN,v=>exactOrigin(v,'app'));
 field('worker_public_key',input.AUTH_PUBLIC_KEY,isPublicSupabaseKey);
 add('worker_binding',!worker?'NOT_VERIFIED':worker?.durable_objects?.bindings?.some(b=>b.name==='VAULTS'&&b.class_name==='PrivateVault')&&worker?.migrations?.some(m=>m.new_sqlite_classes?.includes('PrivateVault'))?'PASS':'INVALID');
 add('auth_match',!input.ZIGOALS_AUTH_ORIGIN||!input.AUTH_ORIGIN?'NOT_VERIFIED':input.ZIGOALS_AUTH_ORIGIN===input.AUTH_ORIGIN?'PASS':'INVALID');
 add('key_match',!input.ZIGOALS_AUTH_PUBLIC_KEY||!input.AUTH_PUBLIC_KEY?'NOT_VERIFIED':input.ZIGOALS_AUTH_PUBLIC_KEY===input.AUTH_PUBLIC_KEY?'PASS':'INVALID');
 const sync=input.ZIGOALS_SYNC_ORIGIN;
 add('sync_match',!worker||!sync?'NOT_VERIFIED':typeof worker.name==='string'&&worker.name!=='zigoals-alpha'&&sync.startsWith(`https://${worker.name}.`)&&exactOrigin(sync,'sync')?'PASS':'INVALID');
 }
 return {checks,mode:authOnly?'AUTH_ONLY':'FULL',local_configuration:checks.some(c=>c.status==='INVALID')?'INVALID':checks.every(c=>c.status==='PASS')?'PASS':'MISSING',live_authentication:'LIVE_NOT_VERIFIED',encrypted_sync:'NOT_VERIFIED'};
}
export function formatSetup(r){return [`Pre-Run 11 ${r.mode==='AUTH_ONLY'?'auth-only':'full'} setup — offline/read-only`,...r.checks.map(c=>`${c.status}: ${c.id}${c.action?' — '+c.action:''}`),`${r.mode==='AUTH_ONLY'?'AUTH_CONFIGURATION':'LOCAL_CONFIGURATION'}: ${r.local_configuration}`,`LIVE_AUTHENTICATION: ${r.live_authentication}`,`ENCRYPTED_SYNC: ${r.encrypted_sync}`].join('\n');}
export function readOwnerWorkerConfig(path,root){
 const base=realpathSync(root),full=resolve(path),actual=realpathSync(full);
 if(!full.startsWith(base+'/')||!actual.startsWith(base+'/'))throw Error('path');
 const info=statSync(actual);if(!info.isFile()||info.size>65536||info.mode&0o077)throw Error('file');
 const ignored=spawnSync('git',['check-ignore','-q',full],{cwd:base});if(ignored.status!==0)throw Error('ignore');
 const worker=JSON5.parse(readFileSync(actual,'utf8'));
 if(!worker||typeof worker!=='object'||Array.isArray(worker)||typeof worker.name!=='string'||worker.name==='zigoals-alpha'||!worker.vars||typeof worker.vars!=='object'||Array.isArray(worker.vars))throw Error('root');
 if(Object.keys(worker.vars).some(k=>/key|secret|token|password/i.test(k)))throw Error('credential');
 return worker;
}
function main(){
 const authOnly=process.argv.length===3&&process.argv[2]==='--auth-only';
 if(process.argv.length>2&&!authOnly){console.error('Usage: node scripts/pre-run11-setup.mjs [--auth-only]');process.exitCode=2;return;}
 let worker=null;let input={...process.env};let configProblem=null;
 const path=process.env.ZIGOALS_OWNER_WORKER_CONFIG;
 if(path&&!authOnly){try{worker=readOwnerWorkerConfig(path,fileURLToPath(new URL('../',import.meta.url)));input.AUTH_ORIGIN=worker.vars.AUTH_ORIGIN;input.APP_ORIGIN=worker.vars.APP_ORIGIN;}catch{configProblem='INVALID';}}
 const pnpm=spawnSync('pnpm',['--version'],{encoding:'utf8',timeout:3000});
 const report=checkSetup(input,worker,{node:process.version,pnpm:pnpm.status===0?pnpm.stdout.trim():null},{authOnly});
 if(configProblem){const c=report.checks.find(x=>x.id==='worker_config');c.status='INVALID';report.local_configuration='INVALID';}
 console.log(formatSetup(report));
 process.exitCode=report.local_configuration==='PASS'?0:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
