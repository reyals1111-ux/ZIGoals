// ADR-006 against the real private sync Worker (Miniflare, local workerd): a head write
// the Worker applies but whose response never reaches the browser. See
// sync-lost-ack.test.ts for the in-memory cases and guards, and
// docs/architecture/ADR-006-sync-lost-confirmation.md for the fix. The `test.fails`
// case flips when option A lands; the precondition test must pass before and after.
import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';

const HEAD_SUFFIX='000000000001',F0='{"fixture":"F0"}',F1='{"fixture":"F1"}',F2='{"fixture":"F2"}';
// The same client transport shape as incremental-sync.test.mjs. `loseNextHeadAck`
// lets the Worker apply the next head write, then drops its response.
async function device(r){
 await r.call('/v1/sessions',{action:'register',label:'Lost acknowledgement fixture'});const vault=await createVault();
 expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 const d={vault,loseNextHeadAck:false,state:{version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null}};
 d.journal={read:async()=>structuredClone(d.state),write:async value=>{d.state=structuredClone(value);}};
 d.transport={
  read:async cursor=>(await r.call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),
  readRows:async ids=>{const res=await r.call('/v1/vault?ids='+ids.join(','));expect(res.status).toBe(200);return res.json();},
  write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);const answer=await res.json();if(d.loseNextHeadAck&&op.changes.some(row=>row.id.endsWith(HEAD_SUFFIX))){d.loseNextHeadAck=false;throw new TypeError('network');}return answer;},
  compact:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();},
 };
 d.sync=async data=>{const result=await synchronize(d.transport,d.journal,vault.key,vault.manifest,data,()=>{},()=>{});await result.commit();return result;};
 d.cloud=async()=>(await cloudSnapshot(d.transport,vault.key,vault.manifest)).data;
 return d;
}
async function publishWithLostAck(d){
 await d.sync({finance:F0});d.loseNextHeadAck=true;
 await expect(d.sync({finance:F1})).rejects.toThrow('network');
 return d.state.pending;
}

test('precondition: the sync Worker applies the head and answers its replay idempotently with base+1',async()=>{
 const r=await privateRuntime();try{
  const d=await device(r),pending=await publishWithLostAck(d);
  expect(pending.changes.map(row=>row.id.endsWith(HEAD_SUFFIX))).toEqual([true]);expect(d.state.base).toEqual({finance:F0});expect(await d.cloud()).toEqual({finance:F1});
  const before=await d.transport.read(null),replay=await r.call('/v1/vault',pending);
  expect(replay.status).toBe(200);expect((await replay.json()).revision).toBe(pending.base+1);expect((await d.transport.read(null)).revision).toBe(before.revision);
 }finally{await r.mf.dispose();}
},60_000);
test.fails('a finance edit after a lost acknowledgement syncs without a false conflict against the real sync Worker',async()=>{
 const r=await privateRuntime();try{
  const d=await device(r);await publishWithLostAck(d);
  const result=await d.sync({finance:F2});
  expect(result.data.finance).toBe(F2);expect((await d.cloud()).finance).toBe(F2);expect(d.state).toMatchObject({base:{finance:F2},pending:null});
 }finally{await r.mf.dispose();}
},60_000);
