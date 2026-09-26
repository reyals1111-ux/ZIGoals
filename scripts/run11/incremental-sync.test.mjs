import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';
test('selective sync sends one changed chunk, reclaims unreachable ciphertext and rejects stale compaction',async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Delta fixture'});const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  let downloaded=0,written=0;const transport={read:async cursor=>(await r.call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),readRows:async ids=>{const res=await r.call('/v1/vault?ids='+ids.join(','));expect(res.status).toBe(200);const p=await res.json();downloaded+=JSON.stringify(p).length;return p;},write:async op=>{written+=JSON.stringify(op).length;const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();},compact:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async value=>{state=structuredClone(value);}},base={health:JSON.stringify({records:'a'.repeat(2_500_000)})};
  await(await synchronize(transport,journal,vault.key,vault.manifest,base,()=>{},()=>{})).commit();const first=await transport.read(null),head=first.records.find(v=>v.id.endsWith('000000000001')),beforeBytes=first.storedBytes;downloaded=0;written=0;
  const next={health:base.health.replace('aaaa','aaab')};await(await synchronize(transport,journal,vault.key,vault.manifest,next,()=>{},()=>{})).commit();expect(written).toBeLessThan(100000);expect(downloaded).toBeLessThan(30000);
  const final=await transport.read(null);expect(final.storedBytes).toBeLessThan(beforeBytes+2000);expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual(next);
  const stale=await r.call('/v1/vault',{protocol:1,action:'compact',vault:vault.manifest.vault,operation:crypto.randomUUID(),base:first.revision,epoch:1,headDigest:'0'.repeat(64),retain:[head.id],domainGenerations:{}});expect(stale.status).toBe(409);
  expect((await r.call('/v1/vault?ids='+Array.from({length:101},()=>crypto.randomUUID()).join(','))).status).toBe(400);
 }finally{await r.mf.dispose();}
},30000);
test('receipt compaction fences operations outside the revision horizon without replay or deletion resurrection',async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Horizon fixture'});const vault=await createVault(),original={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest};await r.call('/v1/vault',original);
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async value=>{state=structuredClone(value);}},transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  await(await synchronize(transport,journal,vault.key,vault.manifest,{settings:'{"fixture":1}'},()=>{},()=>{})).commit();let revision=state.revision;
  for(let i=0;i<2002;i++){const res=await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:revision,changes:[]});expect(res.status).toBe(200);revision=(await res.json()).revision;}
  const snapshot=await cloudSnapshot(transport,vault.key,vault.manifest),operation={protocol:1,action:'compact',vault:vault.manifest.vault,operation:crypto.randomUUID(),base:revision,epoch:1,headDigest:snapshot.headDigest,retain:[...snapshot.rows.keys()],domainGenerations:{}};
  expect((await r.call('/v1/vault',operation)).status).toBe(200);expect((await r.call('/v1/vault',operation)).status).toBe(200);
  const replay=await r.call('/v1/vault',original);expect(replay.status).toBe(409);expect(await replay.json()).toMatchObject({error:'REPLAY_HORIZON_REQUIRES_RECOVERY'});
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual({settings:'{"fixture":1}'});
 }finally{await r.mf.dispose();}
},60000);
