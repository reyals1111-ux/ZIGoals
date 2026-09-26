import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';
test('selected cloud deletion persists across restart, fences old writes, and preserves other domains',async()=>{
 let r=await privateRuntime();const persist=r.persist;
 try{
  await r.call('/v1/sessions',{action:'register',label:'Fictional'});
  const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  const transport={read:async()=>{const res=await r.call('/v1/vault');expect(res.status).toBe(200);return res.json();},write:async op=>{const res=await r.call('/v1/vault',op);if(!res.ok)throw Error(JSON.stringify(await res.json()));return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async v=>{state=structuredClone(v);}};
  const data={health:'{"fixture":"private meal"}',habits:'{"fixture":"daily walk"}'};
  const synced=await synchronize(transport,journal,vault.key,vault.manifest,data,()=>{},()=>{});await synced.commit();
  const before=await transport.read(),op=crypto.randomUUID();
  const deletion={action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:op};
  expect((await r.call('/v1/domain',deletion)).status).toBe(200);
  expect((await r.call('/v1/domain',deletion)).status).toBe(200);
  const page=await transport.read();expect(page.domainGenerations).toEqual({health:1});expect(page.records.some(row=>row.domain==='health')).toBe(false);
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual({habits:data.habits});
  const row=before.records.find(row=>row.domain==='health');
  const oldWrite=await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:page.revision,changes:[{...row,id:crypto.randomUUID()}]});expect(oldWrite.status).toBe(409);expect(await oldWrite.json()).toMatchObject({error:'DOMAIN_GENERATION_CHANGED'});
  await expect(synchronize(transport,journal,vault.key,vault.manifest,data,()=>{},()=>{})).rejects.toThrow('Health cloud copy was deleted');
  await r.mf.dispose();r=await privateRuntime(persist);
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual({habits:data.habits});
  // A new empty device can read unrelated records without re-creating Health.
  const empty={read:async()=>({version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null}),write:async()=>{}};
  expect((await synchronize(transport,empty,vault.key,vault.manifest,{},()=>{},()=>{})).data).toEqual({habits:data.habits});
 }finally{await r.mf.dispose();}
},30000);

test('an explicit backed-up restore creates a new section generation without replaying old work',async()=>{
 const {prepareDomainReview,acceptDomainRestore}=await import('../../apps/web/lib/vault/domain-lifecycle');
 const {decryptBackup}=await import('../../apps/web/lib/vault/backup');
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Fixture'});const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async value=>{state=structuredClone(value);}},local={health:'{"meal":"fictional"}'};
  await (await synchronize(transport,journal,vault.key,vault.manifest,local,()=>{},()=>{})).commit();
  await r.call('/v1/domain',{action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID()});
  const review=await prepareDomainReview('restore','health',local,transport,journal,vault.key,vault.manifest,()=>{});
  const archive=await decryptBackup(review.file,review.recovery);expect(JSON.parse(archive.settings)).toMatchObject({local,cloud:{}});
  await acceptDomainRestore(review,local,transport,journal,vault.key,vault.manifest,()=>{});
  await (await synchronize(transport,journal,vault.key,vault.manifest,local,()=>{},()=>{})).commit();
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual(local);
  // A fresh session can register after domain deletion and read the new authorized copy.
  expect((await r.call('/v1/sessions',{action:'register',label:'Second'},'second')).status).toBe(200);
  expect((await r.call('/v1/vault',undefined,'second')).status).toBe(200);
 }finally{await r.mf.dispose();}
},30000);
