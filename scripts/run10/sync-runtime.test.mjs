import {test,expect} from 'vitest';
import {createVault,unlockVault,sealRecord,openRecord} from '../../apps/web/lib/vault/crypto.ts';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
test('real Workers durable storage: two clients, auth denial, conflict, retry, deletion and restart',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'zigoals-run10-sync-'));
 async function runtime(){
  const outboundService=async request=>{const token=request.headers.get('authorization');const id=token==='Bearer account-a'?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':token==='Bearer account-b'?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':null;return Response.json(id?{id}:{},{status:id?200:401});};
  return new Miniflare({...convertV4MiniflareOptions({name:"private-sync-test",modules:true,script:await readFile(new URL('../../workers/private-sync/worker.mjs',import.meta.url),'utf8'),compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},durableObjectsPersist:persist,bindings:{AUTH_ORIGIN:'https://test.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN:'https://app.test'},outboundService}),resourcePersistencePath:persist});
 }
 let mf=await runtime();const call=(who,body)=>mf.dispatchFetch('https://sync.test/v1/vault',{method:body?'POST':'GET',headers:{authorization:`Bearer ${who}`,origin:'https://app.test','content-type':'application/json','x-zigoals-account':who==='account-b'?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  expect((await call('invalid')).status).toBe(401);
  const vault=await createVault();const independentKey=await unlockVault(vault.manifest,vault.recovery);
  const create={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,manifest:vault.manifest,changes:[]};
  expect((await call('account-a',create)).status).toBe(200);
  expect((await (await call('account-b')).json()).revision).toBe(0);
  const object=crypto.randomUUID(),context={vault:vault.manifest.vault,domain:'health',object,revision:1,epoch:1};
  const record={id:object,domain:'health',revision:1,epoch:1,envelope:await sealRecord(vault.key,context,{meal:'FICTIONAL_SENSITIVE_MEAL',amount:42}),deleted:false};
  const edit={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:1,changes:[record]};
  expect((await call('account-a',edit)).status).toBe(200);expect((await call('account-a',edit)).status).toBe(200);
  expect((await call('account-a',{...edit,operation:crypto.randomUUID()})).status).toBe(409);
  expect((await call('account-a',{...edit,changes:[]})).status).toBe(409);
  const b=await (await call('account-a')).json();expect(b.records).toHaveLength(1);expect(b.revision).toBe(2);expect(JSON.stringify(b)).not.toContain('FICTIONAL_SENSITIVE_MEAL');expect(await openRecord(independentKey,context,b.records[0].envelope)).toEqual({meal:'FICTIONAL_SENSITIVE_MEAL',amount:42});
  const del={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:2,changes:[{...record,revision:2,deleted:true}]};expect((await call('account-a',del)).status).toBe(200);
  await mf.dispose();mf=await runtime();const restored=await (await call('account-a')).json();expect(restored.revision).toBe(3);expect(restored.records[0].deleted).toBe(true);
  expect((await call('account-a',{...edit,operation:crypto.randomUUID()})).status).toBe(409);
 }finally{await mf.dispose();}
},30000);
