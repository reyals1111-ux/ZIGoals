import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
test('refresh inherits device identity, retires old token, and cannot revive a revoked session',async()=>{
 const runtime=await privateRuntime();try{
  const first=await(await runtime.call('/v1/sessions',{action:'register',label:'Original'},'old')).json();
  const next=await runtime.call('/v1/sessions',{action:'refresh',previous:'old'},'new');expect(next.status).toBe(200);expect((await next.json()).id).toBe(first.id);
  expect((await runtime.call('/v1/sessions',{action:'refresh',previous:'old'},'new')).status).toBe(200);
  expect((await runtime.call('/v1/vault',undefined,'old')).status).toBe(401);
  expect((await runtime.call('/v1/sessions',{action:'register',label:'Cannot revive'},'old')).status).toBe(401);
  expect((await runtime.call('/v1/sessions',{action:'refresh',previous:'old'},'racer')).status).toBe(401);
  expect((await runtime.call('/v1/sessions',{action:'signout'},'new')).status).toBe(200);
  expect((await runtime.call('/v1/sessions',{action:'refresh',previous:'new'},'revived')).status).toBe(401);
  expect((await runtime.call('/v1/sessions',{action:'register',label:'Direct provider refresh bypass'},'revived')).status).toBe(401);
 }finally{await runtime.mf.dispose();}
},30000);
