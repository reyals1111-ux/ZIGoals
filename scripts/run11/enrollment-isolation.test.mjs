import {test,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivateMiniflare,fixtureToken,ACCOUNT as A} from './private-runtime.mjs';
import {createVault,unlockVault,sealRecord} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot} from '../../apps/web/lib/vault/cloud-sync';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const identity=request=>JSON.parse(Buffer.from(request.headers.get('authorization').slice(7).split('.')[1],'base64url').toString()).sub;
async function runtime(persist){
 const mf=await createPrivateMiniflare({persist,outboundService:async request=>Response.json({id:identity(request)})});
 const call=(account,path,body,fence=account,alias='device-'+account)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken(alias,account),'x-zigoals-account':fence,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {mf,call};
}
const journal=()=>{let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};return {read:async()=>structuredClone(state),write:async next=>{state=structuredClone(next);}};};
test('JRN04 empty second device repeats interrupted enrollment without replacing ciphertext, epoch or records',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-enrollment-'));let r=await runtime(persist);
 try{
  expect((await r.call(A,'/v1/sessions',{action:'register',label:'A populated device'})).status).toBe(200);
  const vault=await createVault(),enroll={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest};
  // Discard the first acknowledgement, then replay exactly: durable receipt must survive.
  expect((await r.call(A,'/v1/vault',enroll)).status).toBe(200);
  const transport={read:async cursor=>(await r.call(A,'/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),write:async op=>{const res=await r.call(A,'/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  const aJournal=journal(),working={settings:JSON.stringify({fictional:'Private A retained fixture',preferences:{theme:'dark'}})};
  await(await synchronize(transport,aJournal,vault.key,vault.manifest,working,()=>{},()=>{})).commit();const aBefore=await aJournal.read(),before=await transport.read(null);
  expect(before.records.length).toBeGreaterThan(1);expect(JSON.stringify(before)).not.toContain('Private A retained fixture');
  expect((await r.call(A,'/v1/sessions',{action:'register',label:'B empty second device'},A,'second-device')).status).toBe(200);
  let writes=0;const bTransport={read:async cursor=>(await r.call(A,'/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''),undefined,A,'second-device')).json(),write:async op=>{writes++;return transport.write(op);}};
  const wrong=await createVault();await expect(unlockVault(before.manifest,wrong.recovery)).rejects.toThrow(/Unlock or integrity/);
  expect(await transport.read(null)).toEqual(before);expect(await aJournal.read()).toEqual(aBefore);expect(working.settings).toContain('Private A retained fixture');
  const secondKey=await unlockVault(before.manifest,vault.recovery),bJournal=journal();
  const interrupted=await synchronize(bTransport,bJournal,secondKey,before.manifest,{},()=>{},()=>{});expect(interrupted.data).toEqual(working);
  // Browser closes after decryption but before local commit. Restart actual durable Workers.
  expect((await bJournal.read()).base).toEqual({});await r.mf.dispose();r=await runtime(persist);
  const replay=await r.call(A,'/v1/vault',enroll);expect(await replay.json()).toEqual({revision:1,replayed:true});
  for(let attempt=0;attempt<2;attempt++){
   const result=await synchronize(bTransport,bJournal,secondKey,before.manifest,{},()=>{},()=>{});expect(result.data).toEqual(working);
   if(attempt===1)await result.commit();
  }
  expect(writes).toBe(0);expect((await bJournal.read()).base).toEqual(working);expect(await transport.read(null)).toEqual(before);
  // Even an erroneous fresh-key enrollment is rejected at both stale/current revisions.
  for(const base of [0,before.revision]){const rejected=await r.call(A,'/v1/vault',{...enroll,operation:crypto.randomUUID(),base,manifest:wrong.manifest,vault:wrong.manifest.vault},A,'second-device');expect(rejected.status).toBe(409);}
  expect(await transport.read(null)).toEqual(before);expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual(working);expect(await aJournal.read()).toEqual(aBefore);
 }finally{await r.mf.dispose();}
},30000);

test('JRN08 hostile B identity cannot read, select, page, overwrite or delete A through any private Worker route',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-hostile-')),r=await runtime(persist);
 try{
  for(const account of [A,B])expect((await r.call(account,'/v1/sessions',{action:'register',label:'Fictional tenant'})).status).toBe(200);
  const vault=await createVault(),rows=await Promise.all(Array.from({length:101},async()=>{const row={id:crypto.randomUUID(),domain:'health',revision:1,epoch:1,deleted:false};return {...row,envelope:await sealRecord(vault.key,{vault:vault.manifest.vault,domain:row.domain,object:row.id,revision:1,epoch:1},{fictional:'A private record'})};}));
  expect((await r.call(A,'/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:rows.slice(0,100),manifest:vault.manifest})).status).toBe(200);
  expect((await r.call(A,'/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:1,changes:rows.slice(100)})).status).toBe(200);
  const before=await(await r.call(A,'/v1/vault')).json();expect(before.records).toHaveLength(100);expect(before.cursor).toBeTruthy();const second=await(await r.call(A,'/v1/vault?cursor='+encodeURIComponent(before.cursor))).json();expect(second.records).toHaveLength(1);
  const selected='/v1/vault?ids='+rows.slice(0,3).map(r=>r.id).join(','),paged='/v1/vault?cursor='+encodeURIComponent(before.cursor),write={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:before.revision,changes:[{...rows[0],revision:2,deleted:true}]};
  const attacks=[['read','/v1/vault'],['batch',selected],['page',paged],['write','/v1/vault',write],['domain-delete','/v1/domain',{action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID(),revision:before.revision,generation:0}],['account-read','/v1/account'],['cloud-delete','/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}],['identity-delete','/v1/account',{action:'delete-account',confirm:'DELETE ACCOUNT'}],['sessions','/v1/sessions'],['rotation','/v1/rotation',{action:'status'}]];
  for(const [name,path,body]of attacks){const res=await r.call(B,path,body,A);expect(res.status,name).toBe(409);expect(await res.json(),name).toEqual({error:'ACCOUNT_CHANGED'});}
  // Correct B fence with stolen A identifiers still selects only B's object.
  for(const path of ['/v1/vault',selected,paged]){const res=await r.call(B,path);expect(res.status).toBe(200);expect(await res.json()).toEqual({protocol:1,revision:0,manifest:null,records:[],domainGenerations:{},storedBytes:0,cursor:null});}
  const bVault=await createVault();expect((await r.call(B,'/v1/vault',{protocol:1,vault:bVault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:bVault.manifest})).status).toBe(200);
  const stolen=await r.call(B,'/v1/vault',{...write,base:1});expect(stolen.status).toBe(409);expect(await stolen.json()).toEqual({error:'VAULT_CHANGED'});
  // Unknown direct blob/export/signed-link surfaces expose no alternate handler.
  for(const path of ['/v1/blob/'+rows[0].id,'/v1/export/'+vault.manifest.vault,'/v1/vault/'+vault.manifest.vault,'/download?account='+A]){const res=await r.call(B,path);expect(res.status).toBe(404);expect(await res.json()).toEqual({error:'NOT_FOUND'});}
  expect((await r.call(B,'/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  expect(await(await r.call(A,'/v1/vault')).json()).toEqual(before);expect(await(await r.call(A,'/v1/vault?cursor='+encodeURIComponent(before.cursor))).json()).toEqual(second);
 }finally{await r.mf.dispose();}
},30000);
