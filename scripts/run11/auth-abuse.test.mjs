import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
test('durable auth admission binds email and IP, survives restart, expires safely and fails closed',async()=>{
 const script=(await build({entryPoints:[new URL('../../workers/auth-abuse/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
 const persist=await mkdtemp(join(tmpdir(),'run11-auth-'));let mf;const now=Date.now();
 const runtime=(time,key='fixture-secret-00000000000000000000')=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(r,e){return e.GATE.fetch(r)}}',serviceBindings:{GATE:{name:'gate',entrypoint:'AdmissionService'}}},{name:'gate',modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:key,ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time)},outboundService:()=>{throw Error('No network authorized');}}]}),resourcePersistencePath:persist});
 const call=(action='send',email='fiction@example.invalid',ip='192.0.2.1')=>mf.dispatchFetch('https://gate.test/',{method:'POST',body:JSON.stringify({action,email,ip})});
 try{
  mf=runtime(now);expect((await call()).status).toBe(200);expect((await call('send','FICTION@example.invalid','192.0.2.2')).status).toBe(429);
  await mf.dispose();mf=runtime(now+1000);expect((await call()).status).toBe(429);
  for(let i=0;i<10;i++)expect((await call('verify')).status).toBe(200);expect((await call('verify')).status).toBe(429);
  for(let i=0;i<29;i++)expect((await call('send','other'+i+'@example.invalid')).status).toBe(200);expect((await call('send','last@example.invalid')).status).toBe(429);
  await mf.dispose();mf=runtime(now+86400001);expect((await call()).status).toBe(200);
  await mf.dispose();mf=runtime(now+86400002,'');expect((await call()).status).toBe(503);
  expect((await call('send','fiction@example.invalid','')).status).toBe(400);
 }finally{await mf?.dispose();}
},30000);
