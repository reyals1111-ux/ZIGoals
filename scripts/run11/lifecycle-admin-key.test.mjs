import {test,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createPrivateMiniflare,fixtureToken,ACCOUNT} from './private-runtime.mjs';

// Session S Part 1 (Q-OPS-03 / FIX_PLAN H2): the header form of the provider identity deletion
// (DELETE /auth/v1/admin/users/{id}) for each admin-key format. Every provider is the local stub of private-runtime.mjs;
// nothing reaches Supabase. Fixture keys are built at runtime so the tracked-file secret scan has nothing to match.
const secretKey='sb_secret_'+'fixture-owner-key';
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const legacyKey=[b64({alg:'HS256',typ:'JWT'}),b64({role:'fixture-admin',iss:'fixture'}),'fixture-signature'].join('.');

async function deleteAccount(key,{providerStatus=()=>200}={}){
 const persist=await mkdtemp(join(tmpdir(),'run11-admin-key-')),requests=[];
 const mf=await createPrivateMiniflare({persist,bindings:{AUTH_ADMIN_KEY:key},outboundService:async request=>{
  const url=new URL(request.url);
  if(url.pathname.startsWith('/auth/v1/admin/')){requests.push({method:request.method,path:url.pathname,headers:Object.fromEntries(request.headers)});return Response.json({},{status:providerStatus(requests.length)});}
  return Response.json({id:ACCOUNT});
 }});
 const call=(path,body)=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken('owner'),'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const texts=[];const read=async response=>{const text=await response.text();texts.push(text);return {status:response.status,body:JSON.parse(text)};};
 await (await call('/v1/sessions',{action:'register',label:'Owner'})).text();
 return {mf,requests,texts,read,deletion:()=>call('/v1/account',{action:'delete-account',confirm:'DELETE ACCOUNT'}),state:()=>call('/v1/account')};
}

test('a Supabase secret key is sent on apikey and Authorization with the identical value',async()=>{
 const run=await deleteAccount(secretKey);
 try{
  expect(await run.read(await run.deletion())).toEqual({status:200,body:{deleted:true,providerDeleted:true,providerPending:false}});
  expect(run.requests).toHaveLength(1);
  const [request]=run.requests;
  expect(request.method).toBe('DELETE');expect(request.path).toBe('/auth/v1/admin/users/'+ACCOUNT);
  expect(request.headers.apikey).toBe(secretKey);expect(request.headers.authorization).toBe('Bearer '+secretKey);
  expect(request.headers.authorization.slice('Bearer '.length)).toBe(request.headers.apikey);
 }finally{await run.mf.dispose();}
},30000);

test('a legacy service_role JWT keeps both headers, as before',async()=>{
 const run=await deleteAccount(legacyKey);
 try{
  expect((await run.read(await run.deletion())).status).toBe(200);
  expect(run.requests.map(r=>[r.headers.apikey,r.headers.authorization])).toEqual([[legacyKey,'Bearer '+legacyKey]]);
 }finally{await run.mf.dispose();}
},30000);

test.each([
 ['a publishable key','sb_publishable_'+'fixture'],
 ['an arbitrary string','fixture-admin-secret'],
 ['a key with a space','sb_secret_'+'fixture key'],
 ['a two-part token','header.payload'],
])('%s is never sent: the identity deletion stays pending and fails safe',async(_label,key)=>{
 const run=await deleteAccount(key);
 try{
  expect(await run.read(await run.deletion())).toEqual({status:202,body:{deleted:true,providerDeleted:false,providerPending:true}});
  expect((await run.read(await run.state())).body).toMatchObject({deleted:true,provider:'pending'});
  expect(run.requests).toEqual([]);
  for(const text of run.texts)expect(text).not.toContain(key);
 }finally{await run.mf.dispose();}
},30000);

test('a provider refusal stays pending, retries on resume, and the key never appears in a response',async()=>{
 const run=await deleteAccount(secretKey,{providerStatus:n=>n===1?503:200});
 try{
  expect((await run.read(await run.deletion())).status).toBe(202);
  expect((await run.read(await run.state())).body).toMatchObject({provider:'pending'});
  expect((await run.read(await run.deletion())).status).toBe(200);
  expect((await run.read(await run.state())).body).toMatchObject({provider:'deleted'});
  expect(run.requests).toHaveLength(2);
  for(const text of run.texts){expect(text).not.toContain(secretKey);expect(text).not.toContain('fixture-owner-key');}
 }finally{await run.mf.dispose();}
},30000);
