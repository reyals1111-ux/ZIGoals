import {test} from 'vitest';
import assert from 'node:assert/strict';
import {emailCodeOperation,validateEmailTarget} from './pre-run11-email.mjs';
const config={origin:'https://projectabc.supabase.co',allowedOrigin:'https://projectabc.supabase.co',key:'sb_publishable_privatevalue',recipients:['owner@test.invalid']};

test('one request posts the expected email payload',async()=>{
 let calls=0;const r=await emailCodeOperation('request',config,'owner@test.invalid',null,async(url,init)=>{calls++;assert.equal(url,'https://projectabc.supabase.co/auth/v1/otp');assert.equal(JSON.parse(init.body).create_user,true);return new Response('{}',{status:200});});
 assert.equal(calls,1);assert.equal(r,'CODE_REQUEST_ACCEPTED');
});
test('successful verification does not return or print tokens',async()=>{
 const r=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async(url,init)=>{assert.equal(url,'https://projectabc.supabase.co/auth/v1/verify');assert.deepEqual(JSON.parse(init.body),{email:'owner@test.invalid',token:'123456',type:'email'});return Response.json({access_token:'top-secret-token',refresh_token:'other-secret',user:{id:'00000000-0000-4000-8000-000000000001',email:'owner@test.invalid'}});});
 assert.equal(r,'CODE_VERIFIED');assert.ok(!r.includes('secret'));
});
test('wrong or expired code and rate limit are sanitized',async()=>{
 for(const [status,expected] of [[400,'CODE_REJECTED'],[429,'RATE_LIMITED']]){
  const r=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async()=>new Response('{"message":"sensitive provider detail"}',{status}));
  assert.equal(r,expected);
 }
});
test('network errors are sanitized',async()=>{
 assert.equal(await emailCodeOperation('request',config,'owner@test.invalid',null,async()=>{throw Error('secret URL');}),'NETWORK_ERROR');
});
test('invalid or unapproved origins and recipients never call network',async()=>{
 for(const changed of [{origin:'http://projectabc.supabase.co'},{origin:'https://evil.example'},{allowedOrigin:'https://other.supabase.co'}]){
  assert.equal(validateEmailTarget({...config,...changed},'owner@test.invalid'),'TARGET_NOT_APPROVED');
 }
 let called=false;const r=await emailCodeOperation('request',config,'outsider@test.invalid',null,async()=>{called=true;throw Error('should not call');});
 assert.equal(r,'RECIPIENT_NOT_APPROVED');assert.equal(called,false);
});
test('fixture secrets do not occur in status output',async()=>{
 const r=await emailCodeOperation('verify',config,'owner@test.invalid','000000',async()=>new Response('token top-secret-token',{status:400}));
 assert.equal(r,'CODE_REJECTED');
});
const jwt=role=>`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({role,iss:'supabase'})).toString('base64url')}.signature`;
test('privileged and unknown key classes never reach provider',async()=>{
 let calls=0;for(const key of [jwt('service_role'),jwt('supabase_admin'),jwt('authenticated'),'a.b.c','random-key','sb_secret_value']){
  const result=await emailCodeOperation('request',{...config,key},'owner@test.invalid',null,async()=>{calls++;return new Response('{}');});
  assert.equal(result,'PUBLIC_KEY_REQUIRED');
 }assert.equal(calls,0);
});
test('invalid JSON and incomplete or wrong identity are not verification success',async()=>{
 for(const body of ['{bad','{"access_token":"token","user":{}}','{"access_token":"token","user":{"id":"one","email":"other@test.invalid"}}']){
  const result=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async()=>new Response(body,{status:200}));
  assert.equal(result,'VERIFY_RESPONSE_INVALID');
 }
});
test('unannounced oversized response stops reading early and cancels body',async()=>{
 let reads=0,cancelled=false;
 const stream=new ReadableStream({pull(controller){if(reads===32){controller.close();return;}reads++;controller.enqueue(new Uint8Array(8192));},cancel(){cancelled=true;}});
 const result=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async()=>new Response(stream,{status:200}));
 assert.equal(result,'VERIFY_RESPONSE_INVALID');assert.ok(reads<32,`read ${reads} chunks`);assert.equal(cancelled,true);
});
test('redirect is refused and never followed',async()=>{
 const result=await emailCodeOperation('request',config,'owner@test.invalid',null,async(_url,init)=>{assert.equal(init.redirect,'manual');return new Response('',{status:302,headers:{location:'https://elsewhere.invalid'}});});
 assert.equal(result,'PROVIDER_REDIRECT');
});
test('malformed length is invalid and announced oversize cancels body',async()=>{
 for(const header of ['wrong','262144']){
  let cancelled=false;const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(8192));},cancel(){cancelled=true;}});
  const result=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async()=>new Response(body,{status:200,headers:{'content-length':header}}));
  assert.equal(result,'VERIFY_RESPONSE_INVALID');assert.equal(cancelled,true);
 }
});
test('stream failure is a transport error without body leakage',async()=>{
 const body=new ReadableStream({pull(controller){controller.error(Error('private response body'));}});
 assert.equal(await emailCodeOperation('verify',config,'owner@test.invalid','123456',async()=>new Response(body,{status:200})),'NETWORK_ERROR');
});
