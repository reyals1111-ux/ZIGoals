import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,cpSync,symlinkSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkSetup, formatSetup} from './pre-run11-setup.mjs';

const good={
 ZIGOALS_AUTH_ORIGIN:'https://sandboxabc.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'sb_publishable_abc123',
 ZIGOALS_SYNC_ORIGIN:'https://private-sync.owner.workers.dev',
 AUTH_ORIGIN:'https://sandboxabc.supabase.co',AUTH_PUBLIC_KEY:'sb_publishable_abc123',
 APP_ORIGIN:'https://preview.owner.test',
};
const worker={name:'private-sync',durable_objects:{bindings:[{name:'VAULTS',class_name:'PrivateVault'}]},migrations:[{new_sqlite_classes:['PrivateVault']}]};
const status=(report,id)=>report.checks.find(x=>x.id===id)?.status;

test('missing input gives owner actions and never implies live proof',()=>{
 const r=checkSetup({},null,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_auth_origin'),'MISSING');assert.equal(status(r,'worker_config'),'MISSING');
 assert.equal(r.local_configuration,'MISSING');assert.equal(r.live_authentication,'LIVE_NOT_VERIFIED');
 assert.equal(r.encrypted_sync,'NOT_VERIFIED');
});
test('rejects malformed and non-HTTPS origins',()=>{
 const r=checkSetup({...good,ZIGOALS_SYNC_ORIGIN:'http://private-sync.owner.workers.dev',APP_ORIGIN:'https://preview.owner.test/path'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_sync_origin'),'INVALID');assert.equal(status(r,'worker_app_origin'),'INVALID');
});
test('rejects mismatched auth origins',()=>{
 const r=checkSetup({...good,AUTH_ORIGIN:'https://other.supabase.co'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'auth_match'),'INVALID');
});
test('rejects detectable service role credentials and placeholders',()=>{
 const r=checkSetup({...good,ZIGOALS_AUTH_PUBLIC_KEY:'sb_secret_dont_use',AUTH_PUBLIC_KEY:'sb_secret_dont_use',AUTH_ORIGIN:'https://unconfigured.supabase.co'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_public_key'),'INVALID');assert.equal(status(r,'worker_public_key'),'INVALID');assert.equal(status(r,'worker_auth_origin'),'INVALID');
});
test('consistent fictional setup remains live unverified and output redacts values',()=>{
 const r=checkSetup(good,worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(r.local_configuration,'PASS');assert.equal(r.live_authentication,'LIVE_NOT_VERIFIED');
 assert.equal(r.encrypted_sync,'NOT_VERIFIED');
 const out=formatSetup(r);for(const secret of Object.values(good))assert.ok(!out.includes(secret));
 assert.match(out,/LIVE_NOT_VERIFIED/);
});
const jwt=role=>`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({role,iss:'supabase'})).toString('base64url')}.signature`;
test('setup rejects privileged, malformed and unknown public-key classes',()=>{
 for(const key of [jwt('service_role'),jwt('supabase_admin'),jwt('authenticated'),'abc.def.ghi','random-key','session-token']){
  const r=checkSetup({...good,ZIGOALS_AUTH_PUBLIC_KEY:key,AUTH_PUBLIC_KEY:key},worker,{node:'v24.19.0',pnpm:'11.19.0'});
  assert.equal(status(r,'app_public_key'),'INVALID',key);assert.equal(status(r,'worker_public_key'),'INVALID',key);
 }
 assert.equal(status(checkSetup({...good,ZIGOALS_AUTH_PUBLIC_KEY:jwt('anon'),AUTH_PUBLIC_KEY:jwt('anon')},worker,{node:'v24.19.0',pnpm:'11.19.0'}),'app_public_key'),'PASS');
});
function cliFixture(text,{mode=0o600,ignored=true,symlink=false,authOnly=false}={}){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'pre11b-setup-')));
 try{
  mkdirSync(join(dir,'scripts/lib'),{recursive:true});mkdirSync(join(dir,'workers'));
  cpSync(new URL('./pre-run11-setup.mjs',import.meta.url),join(dir,'scripts/pre-run11-setup.mjs'));
  cpSync(new URL('./lib/supabase-public-key.mjs',import.meta.url),join(dir,'scripts/lib/supabase-public-key.mjs'));
  symlinkSync(realpathSync(resolve('node_modules')),join(dir,'node_modules'));
  spawnSync('git',['init','-q'],{cwd:dir});
  if(ignored)writeFileSync(join(dir,'.gitignore'),'workers/owner.jsonc\n');
  const file=join(dir,'workers/owner.jsonc');
  if(symlink){const external=join(tmpdir(),`pre11b-external-${process.pid}.jsonc`);writeFileSync(external,text);chmodSync(external,0o600);symlinkSync(external,file);}else{writeFileSync(file,text);chmodSync(file,mode);}
  const env={...process.env,...good,ZIGOALS_OWNER_WORKER_CONFIG:authOnly?'not-there':file,ZIGOALS_ALLOWED_AUTH_ORIGIN:good.ZIGOALS_AUTH_ORIGIN,ZIGOALS_TEST_RECIPIENTS:'owner@controlled.invalid'};
  delete env.AUTH_ORIGIN;delete env.APP_ORIGIN;
  const result=spawnSync('fnm',['exec','--using','24.19.0','node',join(dir,'scripts/pre-run11-setup.mjs'),...(authOnly?['--auth-only']:[])],{cwd:dir,env,encoding:'utf8',timeout:5000});
  return {output:result.stdout+result.stderr,code:result.status};
 }finally{rmSync(dir,{recursive:true,force:true});if(symlink)rmSync(join(tmpdir(),`pre11b-external-${process.pid}.jsonc`),{force:true});}
}
const jsonc=`{ // private preview\n "name":"private-sync", "vars":{"AUTH_ORIGIN":"https://sandboxabc.supabase.co","APP_ORIGIN":"https://preview.owner.test",}, "durable_objects":{"bindings":[{"name":"VAULTS","class_name":"PrivateVault"}]}, "migrations":[{"new_sqlite_classes":["PrivateVault"]}],}`;
test('CLI accepts ignored mode-0600 JSONC with comments/trailing commas and preserves HTTPS',()=>{
 const r=cliFixture(jsonc);assert.equal(r.code,0,r.output);assert.match(r.output,/LOCAL_CONFIGURATION: PASS/);assert.ok(!r.output.includes('sandboxabc'));
});
test('CLI rejects malformed, readable-by-others, unignored and escaping files',()=>{
 for(const [text,opts] of [['{oops',{}],[jsonc,{mode:0o644}],[jsonc,{ignored:false}],[jsonc,{symlink:true}]]){
  const r=cliFixture(text,opts);assert.notEqual(r.code,0);assert.match(r.output,/INVALID: worker_config/);assert.match(r.output,/LOCAL_CONFIGURATION: INVALID/);
 }
});
test('CLI refuses a public key stored in worker vars and does not echo it',()=>{
 const strict=JSON.stringify(JSON.parse(jsonc.replace(/\/\/ private preview/,'').replace(/,([}\]])/g,'$1')));
 const r=cliFixture(strict.replace('"AUTH_ORIGIN":','"AUTH_PUBLIC_KEY":"sb_publishable_never_print", "AUTH_ORIGIN":'));
 assert.notEqual(r.code,0);assert.match(r.output,/INVALID: worker_config/);assert.ok(!r.output.includes('sb_publishable_never_print'));
});
test('auth-only CLI passes without a Worker or sync backend and stays unverified',()=>{
 const r=cliFixture(jsonc,{authOnly:true});assert.equal(r.code,0,r.output);
 assert.match(r.output,/AUTH_CONFIGURATION: PASS/);assert.match(r.output,/LIVE_AUTHENTICATION: LIVE_NOT_VERIFIED/);
 assert.doesNotMatch(r.output,/worker_config/);
});
