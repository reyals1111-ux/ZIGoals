import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';
import {openPortfolio,portfolioCloudSchema,sealPortfolio} from '../../apps/web/lib/vault/portfolio-sync';

// Session U Part 9 ([TIER 3] (sync), ADR-013): the opt-in Portfolio copy in the real private-sync Worker (Miniflare,
// fixture identities, the same Durable Object as the vault). Its keyspace is separate: the vault's own reads, writes and
// compaction (today's client, unchanged) never see or remove it; the account erase does.
const TEXT=JSON.stringify({version:1,portfolios:[]});
async function setup(){
 const r=await privateRuntime();
 await r.call('/v1/sessions',{action:'register',label:'Portfolio fixture'});
 const vault=await createVault();
 expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 const json=async(path,body,token)=>{const res=await r.call(path,body,token);return {status:res.status,body:await res.json()};};
 const put=async(base,{text=TEXT,generation=0,epoch=vault.manifest.epoch,operation=crypto.randomUUID()}={})=>json('/v1/portfolio',{protocol:1,action:'put',vault:vault.manifest.vault,operation,base,generation,epoch,parts:await sealPortfolio(vault.key,vault.manifest,base+1,text)});
 return {r,vault,json,put};
}
test('a snapshot is written by compare-and-swap, replayed by its operation id, and read back sealed',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  expect(await json('/v1/portfolio')).toEqual({status:200,body:{protocol:1,revision:0,generation:0,epoch:null,parts:[]}});
  const operation=crypto.randomUUID(),first=await put(0,{operation});
  expect(first).toEqual({status:200,body:{revision:1,generation:0}});
  // The same operation again answers as before; the same id with another body is refused; a stale base conflicts.
  const sealed=await sealPortfolio(vault.key,vault.manifest,1,TEXT);
  expect((await json('/v1/portfolio',{protocol:1,action:'put',vault:vault.manifest.vault,operation,base:0,generation:0,epoch:vault.manifest.epoch,parts:sealed})).body).toEqual({error:'OPERATION_REUSED'});
  expect(await put(0)).toEqual({status:409,body:{error:'REVISION_CONFLICT',revision:1}});
  expect((await put(1,{epoch:vault.manifest.epoch+1})).body).toEqual({error:'EPOCH_RETIRED'});
  expect((await put(1,{generation:3})).body).toEqual({error:'PORTFOLIO_DELETED',generation:0});
  for(const bad of [{parts:[]},{parts:[{version:2}]},{parts:Array.from({length:17},()=>sealed[0])},{extra:true}]){
   const res=await json('/v1/portfolio',{protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),base:1,generation:0,epoch:vault.manifest.epoch,parts:sealed,...bad});
   expect(res,JSON.stringify(bad).slice(0,40)).toEqual({status:400,body:{error:'INVALID_PORTFOLIO_REQUEST'}});
  }
  const read=portfolioCloudSchema.parse((await json('/v1/portfolio')).body);
  expect(read.revision).toBe(1);expect(await openPortfolio(vault.key,vault.manifest,read)).toBe(TEXT);
 }finally{await r.mf.dispose();}
},60000);
test('today\'s vault client never sees the Portfolio copy, and its sync and compaction leave it in place',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  await put(0);
  const transport={read:async cursor=>(await r.call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),readRows:async ids=>(await r.call('/v1/vault?ids='+ids.join(','))).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();},compact:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async value=>{state=structuredClone(value);}};
  for(const settings of ['{"a":1}','{"a":2}','{"a":3}'])await(await synchronize(transport,journal,vault.key,vault.manifest,{settings},()=>{},()=>{})).commit();
  const listed=await transport.read(null);
  expect(listed.records.every(row=>['finance','habits','health','settings'].includes(row.domain))).toBe(true);
  expect(JSON.stringify(listed)).not.toContain('portfolio');
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual({settings:'{"a":3}'});
  const after=portfolioCloudSchema.parse((await json('/v1/portfolio')).body);
  expect(after.revision).toBe(1);expect(await openPortfolio(vault.key,vault.manifest,after)).toBe(TEXT);
 }finally{await r.mf.dispose();}
},60000);
test('writes wait for a staged rotation; a deletion counts a generation; the account erase removes the copy',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  await put(0);
  const next=await createVault(vault.manifest.vault,vault.manifest.epoch+1);
  expect((await json('/v1/rotation',{action:'begin',operation:crypto.randomUUID(),base:1,manifest:next.manifest})).status).toBe(200);
  expect((await put(1)).body).toEqual({error:'ROTATION_IN_PROGRESS'});
  const staged=(await json('/v1/rotation')).body.rotation;
  expect((await json('/v1/rotation',{action:'abort',operation:staged.operation})).status).toBe(200);
  expect((await json('/v1/portfolio',{protocol:1,action:'delete',vault:vault.manifest.vault,operation:crypto.randomUUID(),base:1,generation:0})).body).toEqual({revision:2,generation:1});
  expect((await json('/v1/portfolio')).body).toEqual({protocol:1,revision:2,generation:1,epoch:null,parts:[]});
  expect((await put(2,{generation:1})).status).toBe(200);
  expect((await json('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  expect(await json('/v1/portfolio')).toEqual({status:410,body:{error:'ACCOUNT_DELETED'}});
 }finally{await r.mf.dispose();}
},60000);
