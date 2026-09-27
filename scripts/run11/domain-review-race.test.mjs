import {test,expect,vi} from 'vitest';
import {privateRuntime,createPrivateMiniflare,fixtureToken,ACCOUNT} from './private-runtime.mjs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';
import {prepareDomainReview,deleteCloudDomain} from '../../apps/web/lib/vault/domain-lifecycle';
test('cloud deletion refuses changes published after its protected review',async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Fixture'});const v=await createVault();await r.call('/v1/vault',{protocol:1,vault:v.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:v.manifest});
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const res=await r.call('/v1/vault',op);if(!res.ok)throw Error(JSON.stringify(await res.json()));return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async next=>{state=structuredClone(next);}},old={health:'{"meal":"reviewed"}'},newer={health:'{"meal":"reviewed","otherDevice":"unreviewed"}'};
  await (await synchronize(transport,journal,v.key,v.manifest,old,()=>{},()=>{})).commit();
  const review=await prepareDomainReview('delete','health',old,transport,journal,v.key,v.manifest,()=>{});
  await (await synchronize(transport,journal,v.key,v.manifest,newer,()=>{},()=>{})).commit();
  vi.stubGlobal('fetch',async(_url,init)=>r.call('/v1/domain',JSON.parse(init.body).operation));
  await expect(deleteCloudDomain(ACCOUNT,review,()=>{})).rejects.toThrow();
  expect((await cloudSnapshot(transport,v.key,v.manifest)).data).toEqual(newer);
 }finally{vi.unstubAllGlobals();await r.mf.dispose();}
},30000);
test('a real durable alarm completes an interrupted authorized deletion without the client returning',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-domain-alarm-'));let blocked=true;
 const lifecycleService=async(request,mf)=>{if(request.method==='POST'&&blocked)return Response.json({error:'SYNTHETIC_UNAVAILABLE'},{status:503});const ns=await mf.getDurableObjectNamespace('LIFECYCLES','run11-lifecycle');return ns.get(ns.idFromName(ACCOUNT)).fetch(request);};
 const mf=await createPrivateMiniflare({persist,lifecycleService}),call=(path,body)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('owner'),'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{await call('/v1/sessions',{action:'register',label:'Owner'});const v=await createVault();await call('/v1/vault',{protocol:1,vault:v.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:v.manifest});
  expect((await call('/v1/domain',{action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID(),revision:1,generation:0})).status).toBe(503);blocked=false;
  await expect.poll(async()=>{const res=await call('/v1/vault');return res.ok?(await res.json()).domainGenerations:null;},{timeout:75000,interval:1000}).toEqual({health:1});
 }finally{await mf.dispose();}
},90000);
test('durable deletion intent fences writers and resumes a lost authority acknowledgement after restart',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-domain-intent-'));let lost=false;
 const lifecycleService=async(request,mf)=>{const ns=await mf.getDurableObjectNamespace('LIFECYCLES','run11-lifecycle'),res=await ns.get(ns.idFromName(ACCOUNT)).fetch(request);if(request.method==='POST'&&res.ok&&!lost){lost=true;await res.body?.cancel();throw Error('Synthetic lost authority acknowledgement');}return res;};
 let mf=await createPrivateMiniflare({persist,lifecycleService});const call=(path,body)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('owner'),'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  await call('/v1/sessions',{action:'register',label:'Owner'});const v=await createVault();await call('/v1/vault',{protocol:1,vault:v.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:v.manifest});
  const review={action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID(),revision:1,generation:0};
  expect((await call('/v1/domain',review)).status).toBe(503);expect(lost).toBe(true);
  expect((await call('/v1/vault',{protocol:1,vault:v.manifest.vault,operation:crypto.randomUUID(),base:1,changes:[]})).status).toBe(503);
  expect((await call('/v1/rotation',{action:'begin',operation:crypto.randomUUID(),base:1,manifest:(await createVault(v.manifest.vault,2)).manifest})).status).toBe(503);
  await mf.dispose();mf=await createPrivateMiniflare({persist});
  expect((await call('/v1/vault')).status).toBe(503);expect((await call('/v1/domain',review)).status).toBe(200);expect((await call('/v1/domain',review)).status).toBe(200);
  const page=await(await call('/v1/vault')).json();expect(page.domainGenerations).toEqual({health:1});expect(page.revision).toBe(2);
  expect((await call('/v1/domain',{...review,operation:crypto.randomUUID()})).status).toBe(409);
 }finally{await mf.dispose();}
},30000);
