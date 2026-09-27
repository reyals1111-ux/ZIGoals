import {test,expect} from 'vitest';
import {createVault,sealRecord,openRecord} from '../../apps/web/lib/vault/crypto.ts';
import {privateRuntime} from './private-runtime.mjs';
test('persistent rotation stages invisibly, resumes after restart and atomically fences old epoch writers',async()=>{
 let runtime=await privateRuntime();const call=(...args)=>runtime.call(...args);
 try{
  await call('/v1/sessions',{action:'register',label:'Fixture device'});
  const old=await createVault(),next=await createVault(old.manifest.vault,2),id=crypto.randomUUID();
  const context={vault:old.manifest.vault,domain:'health',object:id,revision:1,epoch:1};
  const row={id,domain:'health',revision:1,epoch:1,deleted:false,envelope:await sealRecord(old.key,context,{exact:'20000.0000001'})};
  const write={protocol:1,vault:old.manifest.vault,operation:crypto.randomUUID(),base:0,manifest:old.manifest,changes:[row]};
  expect((await call('/v1/vault',write)).status).toBe(200);
  const operation=crypto.randomUUID(),begin={action:'begin',operation,base:1,manifest:next.manifest};
  expect((await call('/v1/rotation',begin)).status).toBe(200);
  expect((await call('/v1/rotation',begin)).status).toBe(200);
  const newRow={...row,epoch:2,envelope:await sealRecord(next.key,{...context,epoch:2},{exact:'20000.0000001'})};
  expect((await call('/v1/rotation',{action:'commit',operation})).status).toBe(409);
  expect((await call('/v1/vault',{...write,manifest:undefined,operation:crypto.randomUUID(),base:1})).status).toBe(409);
  const active=await (await call('/v1/vault')).json();expect(active.manifest).toEqual(old.manifest);expect(await openRecord(old.key,context,active.records[0].envelope)).toEqual({exact:'20000.0000001'});
  expect((await call('/v1/rotation',{action:'stage',operation,rows:[newRow]})).status).toBe(200);
  await runtime.mf.dispose();runtime=await privateRuntime(runtime.persist);
  expect(await(await call('/v1/rotation')).json()).toMatchObject({rotation:{operation,base:1,manifest:next.manifest}});
  expect((await call('/v1/rotation',{action:'stage',operation,rows:[{...newRow,envelope:row.envelope}]})).status).toBe(409);
  const commit=await call('/v1/rotation',{action:'commit',operation});expect(commit.status).toBe(200);expect(await commit.json()).toMatchObject({revision:2,epoch:2});
  expect((await call('/v1/rotation',{action:'commit',operation})).status).toBe(200);
  const final=await(await call('/v1/vault')).json();expect(final.manifest).toEqual(next.manifest);expect(await openRecord(next.key,{...context,epoch:2},final.records[0].envelope)).toEqual({exact:'20000.0000001'});
  expect((await call('/v1/vault',{protocol:1,vault:old.manifest.vault,operation:crypto.randomUUID(),base:2,changes:[{...row,revision:2}]})).status).toBe(409);
  await expect(openRecord(old.key,context,final.records[0].envelope)).rejects.toThrow();
 }finally{await runtime.mf.dispose();}
},30000);
test.each(['stage','commit'])('client rotation recovers lost %s acknowledgement without losing exact data',async(failurePhase)=>{
 const {synchronize,cloudSnapshot}=await import('../../apps/web/lib/vault/cloud-sync.ts');
 const {rotateVault}=await import('../../apps/web/lib/vault/rotation.ts');
 const runtime=await privateRuntime();const call=runtime.call;
 try{
  await call('/v1/sessions',{action:'register',label:'Fixture'});const vault=await createVault();
  await call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  const transport={read:async cursor=>(await call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),write:async operation=>{const r=await call('/v1/vault',operation);if(!r.ok)throw Error('Write failed');return r.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async v=>{state=structuredClone(v);}};
  const data={finance:JSON.stringify({exact:'20000.0000000000000001'}),health:JSON.stringify({unknown:null,label:'Fixture health',long:'a'.repeat(100000)})};
  await(await synchronize(transport,journal,vault.key,vault.manifest,data,()=>{},()=>{})).commit();
  const next=await createVault(vault.manifest.vault,2);let fail=true;
  const rotation={request:async operation=>{const r=await call('/v1/rotation',operation);if(!r.ok)throw Error('Rotation '+r.status);const result=await r.json();if(operation?.action===failurePhase&&fail){fail=false;throw Error('lost ack');}return result;}};
  await expect(rotateVault(transport,rotation,journal,vault.key,vault.manifest,next.key,next.manifest,()=>{})).rejects.toThrow('lost ack');
  expect((await cloudSnapshot(transport,failurePhase==='stage'?vault.key:next.key,failurePhase==='stage'?vault.manifest:next.manifest)).data).toEqual(data);
  await rotateVault(transport,rotation,journal,vault.key,vault.manifest,next.key,next.manifest,()=>{});
  expect((await cloudSnapshot(transport,next.key,next.manifest)).data).toEqual(data);expect(state.epoch).toBe(2);
 }finally{await runtime.mf.dispose();}
},30000);
