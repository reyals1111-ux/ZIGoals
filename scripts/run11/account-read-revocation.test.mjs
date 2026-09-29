import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
test('account state is readable only by an active session, and the deleted state stays readable',async()=>{
 const runtime=await privateRuntime();try{
  await runtime.call('/v1/sessions',{action:'register',label:'Owner'},'owner-device');
  const revoked=await(await runtime.call('/v1/sessions',{action:'register',label:'Revoked'},'revoked-device')).json();
  expect((await runtime.call('/v1/account',undefined,'revoked-device')).status).toBe(200);
  expect((await runtime.call('/v1/sessions',{action:'revoke',id:revoked.id},'owner-device')).status).toBe(200);
  const denied=await runtime.call('/v1/account',undefined,'revoked-device');expect(denied.status).toBe(401);expect(await denied.json()).toMatchObject({error:'SESSION_REVOKED'});
  expect((await runtime.call('/v1/account',undefined,'never-registered')).status).toBe(401);
  expect((await runtime.call('/v1/account',undefined,'owner-device')).status).toBe(200);
  expect((await runtime.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'},'owner-device')).status).toBe(200);
  expect(await(await runtime.call('/v1/account',undefined,'owner-device')).json()).toMatchObject({deleted:true});
 }finally{await runtime.mf.dispose();}
},60000);
