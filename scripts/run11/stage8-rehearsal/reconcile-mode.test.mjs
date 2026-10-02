// Stage 8 row D3, the logic only (Session L rehearsal): while the lifecycle authority is in RECOVERY_MODE=reconcile,
// as after a point-in-time restore, private sync refuses every account route, not only reads, and the pause changes
// nothing. Real private-sync and lifecycle Workers in Miniflare, one persisted state restarted in each mode.
// What this cannot show: a hosted point-in-time restore (Stage 8, OWNER_RECOVERY_ADMIN.md).
import {test,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ACCOUNT,createPrivateMiniflare,fixtureToken} from '../private-runtime.mjs';

const origin='https://app.test';
const call=(mf,path,body)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin,authorization:'Bearer '+fixtureToken('stage8-reconcile'),'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});

test('reconcile mode refuses reads, writes, registration, section deletion, rotation and account deletion, then serving resumes unchanged',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'stage8-reconcile-'));
 let mf=await createPrivateMiniflare({persist,origin});
 let before;
 try{
  expect((await call(mf,'/v1/sessions',{action:'register',label:'Before the restore'})).status).toBe(200);
  const vault=await call(mf,'/v1/vault');expect(vault.status).toBe(200);
  const account=await call(mf,'/v1/account');expect(account.status).toBe(200);
  before={vault:await vault.json(),account:await account.json()};
  expect(before.account.deleted).toBeFalsy();
 }finally{await mf.dispose();}
 mf=await createPrivateMiniflare({persist,origin,recoveryMode:'reconcile'});
 try{
  const requests=[
   ['GET /v1/vault',['/v1/vault']],
   ['write /v1/vault',['/v1/vault',{operation:'stage8-fixture'}]],
   ['register /v1/sessions',['/v1/sessions',{action:'register',label:'After the restore'}]],
   ['GET /v1/account',['/v1/account']],
   ['delete /v1/account',['/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}]],
   ['section /v1/domain',['/v1/domain',{action:'delete',domain:'health'}]],
   ['rotation /v1/rotation',['/v1/rotation',{action:'stage'}]],
  ];
  for(const [name,[path,body]] of requests){
   const response=await call(mf,path,body);
   expect([name,response.status,await response.json()]).toEqual([name,503,{error:'LIFECYCLE_RECONCILIATION_REQUIRED'}]);
  }
 }finally{await mf.dispose();}
 mf=await createPrivateMiniflare({persist,origin});
 try{
  const vault=await call(mf,'/v1/vault'),account=await call(mf,'/v1/account');
  expect(vault.status).toBe(200);expect(account.status).toBe(200);
  expect({vault:await vault.json(),account:await account.json()}).toEqual(before);
 }finally{await mf.dispose();}
},60000);
