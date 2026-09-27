import {test,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',family='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',operation='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function start(persist,mode='serve',anchor,name='lifecycle'){
 const code=(await build({entryPoints:[new URL('../../workers/private-sync/lifecycle.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
 return new Miniflare({...convertV4MiniflareOptions({workers:[{name:'harness',modules:true,script:'export default {fetch(r,e){if(new URL(r.url).pathname.startsWith("/ordinary"))return e.LIFE.fetch(new Request(r.url.replace("/ordinary",""),r));return (new URL(r.url).pathname.startsWith("/admin")?e.ADMIN:e.LIFE).fetch(r)}}',serviceBindings:{ADMIN:{name,entrypoint:'LifecycleRecoveryAdmin'},LIFE:{name,entrypoint:'LifecycleService'}},compatibilityDate:'2026-09-13'},{name,modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:mode,...(anchor?{RECOVERY_ACCOUNT_ID:account,RECOVERY_CHECKPOINT_SHA256:anchor}:{})},outboundService:()=>{throw Error('Recovery must never call external providers');}}],durableObjectsPersist:persist}),resourcePersistencePath:persist});
}
const call=(mf,path,body)=>mf.dispatchFetch('https://fixture'+path,{method:body?'POST':'GET',headers:{'x-verified-account':account,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('external anchored checkpoint restores deletion after total lifecycle loss and receipts survive restart',async()=>{
 const original=await mkdtemp(join(tmpdir(),'run11-life-original-'));let mf=await start(original),checkpoint;
 try{expect((await call(mf,'/account',{action:'delete-domain',domain:'health',generation:0,operation})).status).toBe(200);expect((await call(mf,'/account',{action:'delete',confirm:'DELETE CLOUD DATA',generation:1,family})).status).toBe(200);checkpoint=await(await call(mf,'/admin/export')).json();expect(checkpoint).toHaveProperty('digest');expect(checkpoint.checkpoint.receipts).toHaveLength(1);expect((await call(mf,'/admin/reconcile',checkpoint.checkpoint)).status).toBe(503);}finally{await mf.dispose();}
 const restored=await mkdtemp(join(tmpdir(),'run11-life-restored-'));mf=await start(restored,'reconcile');
 try{expect((await call(mf,'/account')).status).toBe(503);expect((await call(mf,'/admin/reconcile',checkpoint.checkpoint)).status).toBe(503);}finally{await mf.dispose();}
 mf=await start(restored,'reconcile',checkpoint.digest);
 try{expect((await call(mf,'/admin/reconcile',{...checkpoint.checkpoint,account:family})).status).toBe(409);const before=await(await call(mf,'/admin/export')).json();expect(await(await call(mf,'/admin/dry-run',checkpoint.checkpoint)).json()).toMatchObject({applied:false,dryRun:true});expect((await(await call(mf,'/admin/export')).json()).digest).toBe(before.digest);const applied=await call(mf,'/admin/reconcile',checkpoint.checkpoint);expect(applied.status).toBe(200);expect(await applied.json()).toMatchObject({applied:true,replay:false});expect((await call(mf,'/account')).status).toBe(503);}finally{await mf.dispose();}
 mf=await start(restored,'reconcile',checkpoint.digest);
 try{expect(await(await call(mf,'/admin/reconcile',checkpoint.checkpoint)).json()).toMatchObject({applied:true,replay:true});const exported=await(await call(mf,'/admin/export')).json();expect(exported.checkpoint.lifecycle).toMatchObject({deleted:true,generation:2,domainGenerations:{health:1}});expect(exported.checkpoint.receipts).toEqual(checkpoint.checkpoint.receipts);}finally{await mf.dispose();}
 mf=await start(restored,'serve');try{expect(await(await call(mf,'/account')).json()).toMatchObject({deleted:true,generation:2});expect((await call(mf,'/admin/reconcile',checkpoint.checkpoint)).status).toBe(503);}finally{await mf.dispose();}
},30000);
test('older externally anchored checkpoint cannot lower domain fences or undo account deletion',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-life-monotonic-'));let mf=await start(persist),old;
 try{await call(mf,'/account',{action:'delete-domain',domain:'health',generation:0,operation});old=await(await call(mf,'/admin/export')).json();await call(mf,'/account',{action:'delete-domain',domain:'health',generation:1,operation:crypto.randomUUID()});await call(mf,'/account',{action:'delete',confirm:'DELETE CLOUD DATA',generation:1,family});}finally{await mf.dispose();}
 mf=await start(persist,'reconcile',old.digest);try{expect((await call(mf,'/admin/reconcile',old.checkpoint)).status).toBe(200);const current=await(await call(mf,'/admin/export')).json();expect(current.checkpoint.lifecycle).toMatchObject({deleted:true,generation:2,domainGenerations:{health:2}});expect(current.checkpoint.receipts).toHaveLength(2);}finally{await mf.dispose();}
},30000);

const hash=value=>createHash('sha256').update(JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)).digest('hex');
test('validly anchored conflicting receipts and malformed checkpoints fail without writes; admin is not public or on ordinary service',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-life-conflict-'));let mf=await start(persist),original;
 try{
  expect((await (await mf.getWorker('lifecycle')).fetch('https://fixture/admin/export',{headers:{'x-verified-account':account,'x-lifecycle-recovery-admin':'1'}})).status).toBe(404);
  expect((await call(mf,'/ordinary/admin/export')).status).toBe(404);
  await call(mf,'/account',{action:'delete-domain',domain:'health',generation:0,operation});original=await(await call(mf,'/admin/export')).json();
 }finally{await mf.dispose();}
 const conflict=structuredClone(original.checkpoint),other=crypto.randomUUID();conflict.receipts[0].operation=other;conflict.lifecycle.domainDecisions.health.operation=other;
 mf=await start(persist,'reconcile',hash(conflict));try{const rejected=await call(mf,'/admin/reconcile',conflict);expect(rejected.status).toBe(409);expect(await rejected.json()).toEqual({error:'CHECKPOINT_CONFLICT'});expect((await(await call(mf,'/admin/export')).json()).digest).toBe(original.digest);}finally{await mf.dispose();}
 const incomplete={...original.checkpoint,receipts:[]};mf=await start(persist,'reconcile',hash(incomplete));try{expect((await call(mf,'/admin/reconcile',incomplete)).status).toBe(409);expect((await(await call(mf,'/admin/export')).json()).digest).toBe(original.digest);}finally{await mf.dispose();}
},30000);

test('local simultaneous vault and lifecycle rollback remains closed until external reconciliation, then denies offline reenrollment',async()=>{
 const {privateRuntime,createPrivateMiniflare,fixtureToken}=await import('./private-runtime.mjs');const {createVault}=await import('../../apps/web/lib/vault/crypto');
 let r=await privateRuntime(),saved;const backup=await mkdtemp(join(tmpdir(),'run11-both-predelete-'));
 try{
  await r.call('/v1/sessions',{action:'register',label:'Pre-deletion fixture'});const vault=await createVault();expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
  await r.mf.dispose();await cp(r.persist,backup,{recursive:true});r=await privateRuntime(r.persist);
  expect((await r.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  const ns=await r.mf.getDurableObjectNamespace('LIFECYCLES','run11-lifecycle');saved=await(await ns.get(ns.idFromName(account)).fetch('https://internal/admin/export',{headers:{'x-verified-account':account,'x-lifecycle-recovery-admin':'1'}})).json();expect(saved.checkpoint.lifecycle.deleted).toBe(true);
 }finally{await r.mf.dispose();}
 let recovery=await createPrivateMiniflare({persist:backup,recoveryMode:'reconcile'});
 try{expect((await recovery.dispatchFetch('https://sync.test/v1/vault',{headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('fixture'),'x-zigoals-account':account}})).status).toBe(503);}finally{await recovery.dispose();}
 recovery=await start(backup,'reconcile',saved.digest,'run11-lifecycle');try{expect((await(await call(recovery,'/admin/export')).json()).checkpoint.lifecycle.deleted).toBe(false);expect((await call(recovery,'/admin/reconcile',saved.checkpoint)).status).toBe(200);}finally{await recovery.dispose();}
 r=await privateRuntime(backup);try{expect((await r.call('/v1/vault')).status).toBe(410);expect((await r.call('/v1/sessions',{action:'register',label:'Offline old device'},'offline-restored')).status).toBe(410);}finally{await r.mf.dispose();}
},30000);
