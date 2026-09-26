import {test,expect} from 'vitest';
import {cp,rm,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {privateRuntime,fixtureToken} from './private-runtime.mjs';
test('independent lifecycle decision denies restored pre-delete vault and fails closed in recovery mode',async()=>{
 let runtime=await privateRuntime();try{
  await runtime.call('/v1/sessions',{action:'register',label:'Before deletion'});
  const backup=await mkdtemp(join(tmpdir(),'run11-predelete-'));await runtime.mf.dispose();const vaultDir=join(runtime.persist,'do/run11-private-sync-PrivateVault');await cp(vaultDir,join(backup,'vault'),{recursive:true});runtime=await privateRuntime(runtime.persist);
  expect((await runtime.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  await runtime.mf.dispose();await rm(vaultDir,{recursive:true});await cp(join(backup,'vault'),vaultDir,{recursive:true});runtime=await privateRuntime(runtime.persist);
  expect((await runtime.call('/v1/vault')).status).toBe(410);
  expect((await runtime.call('/v1/sessions',{action:'register',label:'Offline reenroll'},'new-offline')).status).toBe(410);
  const again=await runtime.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'});expect(again.status).toBe(200);
 }finally{await runtime.mf.dispose();}
},30000);
test('lifecycle recovery mode disables serving even with otherwise valid identity',async()=>{
 const {createPrivateMiniflare}=await import('./private-runtime.mjs');const persist=await mkdtemp(join(tmpdir(),'run11-recovery-paused-'));
 const mf=await createPrivateMiniflare({persist,recoveryMode:'reconcile'});try{const response=await mf.dispatchFetch('https://sync.test/v1/vault',{headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('fixture'),'x-zigoals-account':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}});expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'LIFECYCLE_RECONCILIATION_REQUIRED'});}finally{await mf.dispose();}
},30000);
test('provider-account failure persists separately after deletion and retry cannot reopen vault',async()=>{
 const {createPrivateMiniflare}=await import('./private-runtime.mjs');const persist=await mkdtemp(join(tmpdir(),'run11-provider-delete-'));let fail=true,attempts=0;
 const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const mf=await createPrivateMiniflare({persist,bindings:{AUTH_ADMIN_KEY:'fixture-admin-secret'},outboundService:async request=>{if(new URL(request.url).pathname.includes('/admin/users/')){attempts++;expect(request.headers.get('apikey')).toBe('fixture-admin-secret');return Response.json({}, {status:fail?503:200});}return Response.json({id:account});}});
 const call=(path,body)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('fixture'),'x-zigoals-account':account,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{await call('/v1/sessions',{action:'register',label:'Owner'});const deletion={action:'delete-account',confirm:'DELETE ACCOUNT'};
  const first=await call('/v1/account',deletion);expect(first.status).toBe(202);expect(await first.json()).toEqual({deleted:true,providerDeleted:false,providerPending:true});
  expect((await call('/v1/vault')).status).toBe(410);expect(await(await call('/v1/account')).json()).toMatchObject({deleted:true,provider:'pending'});
  fail=false;expect((await call('/v1/account',deletion)).status).toBe(200);expect((await call('/v1/account',deletion)).status).toBe(200);expect(attempts).toBe(2);
 }finally{await mf.dispose();}
},30000);
test('cloud deletion cannot let a previously revoked device escalate to identity deletion',async()=>{
 const runtime=await privateRuntime();try{
  const revoked=await(await runtime.call('/v1/sessions',{action:'register',label:'Revoked'},'revoked-device')).json();
  await runtime.call('/v1/sessions',{action:'register',label:'Owner'},'owner-device');
  await runtime.call('/v1/sessions',{action:'revoke',id:revoked.id},'owner-device');
  await runtime.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'},'owner-device');
  expect((await runtime.call('/v1/account',{action:'delete-account',confirm:'DELETE ACCOUNT'},'revoked-device')).status).toBe(401);
 }finally{await runtime.mf.dispose();}
},30000);
test('provider deletion acknowledgement loss recovers after restart without the deleted identity credentials',async()=>{
 const {createPrivateMiniflare}=await import('./private-runtime.mjs');const persist=await mkdtemp(join(tmpdir(),'run11-deletion-job-'));let identityExists=true,attempts=0;
 const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',outboundService=async request=>{if(new URL(request.url).pathname.includes('/admin/users/')){attempts++;if(identityExists){identityExists=false;throw Error('Synthetic lost provider acknowledgement');}return Response.json({}, {status:404});}return Response.json(identityExists?{id:account}:{},{status:identityExists?200:401});};
 const options={persist,bindings:{AUTH_ADMIN_KEY:'fixture-admin-secret'},outboundService};let mf=await createPrivateMiniflare(options);
 const call=(body)=>mf.dispatchFetch('https://sync.test'+(body.action==='register'?'/v1/sessions':'/v1/account'),{method:'POST',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('owner'),'x-zigoals-account':account,'content-type':'application/json'},body:JSON.stringify(body)});
 try{await call({action:'register',label:'Owner'});expect((await call({action:'delete-account',confirm:'DELETE ACCOUNT'})).status).toBe(202);expect(identityExists).toBe(false);
  await mf.dispose();mf=await createPrivateMiniflare(options);expect((await call({action:'delete-account',confirm:'DELETE ACCOUNT'})).status).toBe(401);
  const ns=await mf.getDurableObjectNamespace('LIFECYCLES','run11-lifecycle');const resumed=await ns.get(ns.idFromName(account)).fetch('https://internal/account',{method:'POST',headers:{'x-verified-account':account,'content-type':'application/json'},body:'{"action":"resume-provider"}'});expect(await resumed.json()).toMatchObject({deleted:true,provider:'deleted'});expect(attempts).toBe(2);
 }finally{await mf.dispose();}
},30000);
