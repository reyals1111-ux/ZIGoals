import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSetup, formatSetup} from './pre-run11-setup.mjs';

const good={
 ZIGOALS_AUTH_ORIGIN:'https://sandboxabc.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'sb_publishable_abc123',
 ZIGOALS_SYNC_ORIGIN:'https://private-sync.owner.workers.dev',
 AUTH_ORIGIN:'https://sandboxabc.supabase.co',AUTH_PUBLIC_KEY:'sb_publishable_abc123',
 APP_ORIGIN:'https://preview.owner.test',
};
const worker={name:'private-sync',durable_objects:{bindings:[{name:'VAULTS',class_name:'PrivateVault'}]},migrations:[{new_sqlite_classes:['PrivateVault']}]};
const status=(report,id)=>report.checks.find(x=>x.id===id)?.status;

test('missing input gives owner actions and never implies live proof',()=>{
 const r=checkSetup({},null,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_auth_origin'),'MISSING');assert.equal(status(r,'worker_config'),'MISSING');
 assert.equal(r.local_configuration,'MISSING');assert.equal(r.live_authentication,'LIVE_NOT_VERIFIED');
 assert.equal(r.encrypted_sync,'NOT_VERIFIED');
});
test('rejects malformed and non-HTTPS origins',()=>{
 const r=checkSetup({...good,ZIGOALS_SYNC_ORIGIN:'http://private-sync.owner.workers.dev',APP_ORIGIN:'https://preview.owner.test/path'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_sync_origin'),'INVALID');assert.equal(status(r,'worker_app_origin'),'INVALID');
});
test('rejects mismatched auth origins',()=>{
 const r=checkSetup({...good,AUTH_ORIGIN:'https://other.supabase.co'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'auth_match'),'INVALID');
});
test('rejects detectable service role credentials and placeholders',()=>{
 const r=checkSetup({...good,ZIGOALS_AUTH_PUBLIC_KEY:'sb_secret_dont_use',AUTH_PUBLIC_KEY:'sb_secret_dont_use',AUTH_ORIGIN:'https://unconfigured.supabase.co'},worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(status(r,'app_public_key'),'INVALID');assert.equal(status(r,'worker_public_key'),'INVALID');assert.equal(status(r,'worker_auth_origin'),'INVALID');
});
test('consistent fictional setup remains live unverified and output redacts values',()=>{
 const r=checkSetup(good,worker,{node:'v24.19.0',pnpm:'11.19.0'});
 assert.equal(r.local_configuration,'PASS');assert.equal(r.live_authentication,'LIVE_NOT_VERIFIED');
 assert.equal(r.encrypted_sync,'NOT_VERIFIED');
 const out=formatSetup(r);for(const secret of Object.values(good))assert.ok(!out.includes(secret));
 assert.match(out,/LIVE_NOT_VERIFIED/);
});
