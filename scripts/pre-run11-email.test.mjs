import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emailCodeOperation,validateEmailTarget} from './pre-run11-email.mjs';
const config={origin:'https://projectabc.supabase.co',allowedOrigin:'https://projectabc.supabase.co',key:'sb_publishable_privatevalue',recipients:['owner@test.invalid']};

test('one request posts the expected email payload',async()=>{
 let calls=0;const r=await emailCodeOperation('request',config,'owner@test.invalid',null,async(url,init)=>{calls++;assert.equal(url,'https://projectabc.supabase.co/auth/v1/otp');assert.equal(JSON.parse(init.body).create_user,true);return new Response('{}',{status:200});});
 assert.equal(calls,1);assert.equal(r,'CODE_REQUEST_ACCEPTED');
});
test('successful verification does not return or print tokens',async()=>{
 const r=await emailCodeOperation('verify',config,'owner@test.invalid','123456',async(url,init)=>{assert.equal(url,'https://projectabc.supabase.co/auth/v1/verify');assert.deepEqual(JSON.parse(init.body),{email:'owner@test.invalid',token:'123456',type:'email'});return Response.json({access_token:'top-secret-token',refresh_token:'other-secret',user:{id:'one'}});});
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
