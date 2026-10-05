import {test,expect,vi} from 'vitest';
import {CODE_REQUEST_MESSAGE,privateAccountRequest} from './private-account';
const config={authOrigin:'https://test.supabase.co',publicKey:'public',syncOrigin:'https://sync.example.workers.dev'};
test('configuration and cross-origin fail closed before external calls',async()=>{
 const fetcher=vi.fn();const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{"action":"send","email":"a@example.com"}'});
 expect((await privateAccountRequest(req,config,fetcher)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
 expect((await privateAccountRequest(new Request('https://app.test/api/private-account'),null,fetcher)).status).toBe(503);
});
test('OTP adapter protects token in HttpOnly cookie and excludes credentials from public response',async()=>{
 const upstream=vi.fn(async(url)=>String(url).endsWith('/v1/sessions')?Response.json({registered:true,id:crypto.randomUUID()}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id:crypto.randomUUID()}}));
 const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'a@example.com',code:'123456'})});
 const result=await privateAccountRequest(req,config,upstream);expect(result.status).toBe(200);expect(result.headers.get('set-cookie')).toContain('HttpOnly');expect(result.headers.get('set-cookie')).toContain('Secure');expect(await result.text()).not.toContain('fixture-token');
});
test('vault proxy takes identity only from protected session and never client account selector',async()=>{
 const upstream=vi.fn(async()=>Response.json({revision:0,records:[]}));
 const req=new Request('https://app.test/api/private-account',{headers:{cookie:'__Host-zigoals_session=fixture-token','X-Zigoals-Account':'10000000-0000-4000-8000-000000000001'}});
 expect((await privateAccountRequest(req,config,upstream)).status).toBe(200);expect(upstream.mock.calls[0]?.length).toBeGreaterThan(0);
});
test('vault requests require a captured account fence and forward it without using it as identity',async()=>{
 const cookie='__Host-zigoals_session=fixture-token',id='10000000-0000-4000-8000-000000000001';
 const missing=await privateAccountRequest(new Request('https://app.test/api/private-account',{headers:{cookie}}),config,async()=>{throw Error('must not fetch');});expect(missing.status).toBe(400);
 for(const method of ['GET','POST']){
  const request=new Request('https://app.test/api/private-account',{method,headers:{cookie,origin:'https://app.test','content-type':'application/json','X-Zigoals-Account':id},...(method==='POST'?{body:'{"action":"sync","operation":{}}'}:{})});
  const result=await privateAccountRequest(request,config,async(_input,init)=>{const headers=new Headers(init?.headers);expect(headers.get('x-zigoals-account')).toBe(id);expect(headers.get('authorization')).toBe('Bearer fixture-token');return Response.json({error:'ACCOUNT_MISMATCH'},{status:403});});expect(result.status).toBe(403);
 }
});

test('signout clears the local session even when upstream revocation cannot be confirmed',async()=>{
 const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'__Host-zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(req,config,async()=>{throw Error('offline');});expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toMatchObject({signedOut:true,remoteRevocationConfirmed:false});
});
test('verify returns only the validated provider account identity, never credentials',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const request=()=>new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'fixture@example.com',code:'123456'})});
 const result=await privateAccountRequest(request(),config,async url=>String(url).endsWith('/v1/sessions')?Response.json({registered:true,id:crypto.randomUUID()}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id,email:'fixture@example.com'}}));expect(await result.json()).toEqual({signedIn:true,accountId:id});
 const invalid=await privateAccountRequest(request(),config,async()=>Response.json({access_token:'fixture-token',expires_in:3600,user:{id:'bad'}}));expect(invalid.status).toBe(400);expect(invalid.headers.get('set-cookie')).toBeNull();
});
test('identity status verifies the cookie at the auth provider and never reads the vault',async()=>{
 const result=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'__Host-zigoals_session=fixture-token'}}),config,async(input,init)=>{
  if(String(input).endsWith('/v1/sessions'))return Response.json({sessions:[]});
  expect(input).toBe('https://test.supabase.co/auth/v1/user');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fixture-token');return Response.json({id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.com'});
 });expect(await result.json()).toEqual({signedIn:true,accountId:'10000000-0000-4000-8000-000000000001'});
 const missing=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status'),config,async()=>{throw Error('must not fetch');});expect(await missing.json()).toEqual({signedIn:false});
});
test('signout clears cookies even after hosted configuration disappears',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'__Host-zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(request,null,async()=>{throw Error('must not fetch');});expect(result.status).toBe(200);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toEqual({signedOut:true,remoteRevocationConfirmed:false});
});

test('provider verification cannot open an app session unless durable registration succeeds',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'fixture@example.com',code:'123456'})});
 const res=await privateAccountRequest(request,config,async url=>String(url).endsWith('/v1/sessions')?Response.json({error:'SESSION_REVOKED'},{status:401}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id:crypto.randomUUID()}}));expect(res.status).toBe(400);expect(res.headers.has('set-cookie')).toBe(false);
});
test('a revoked durable session is locked even when provider token still validates',async()=>{
 const req=new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'__Host-zigoals_session=fixture-token'}});
 const res=await privateAccountRequest(req,config,async url=>String(url).endsWith('/v1/sessions')?Response.json({error:'SESSION_REVOKED'},{status:401}):Response.json({id:crypto.randomUUID()}));expect(res.status).toBe(401);expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
});

test('temporary identity or session-registry outage preserves the session cookie without claiming signed out',async()=>{
 for(const unavailable of ['identity','registry'])for(const status of [429,500,503,507]){
  const req=new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'__Host-zigoals_session=fixture-token'}});
  const res=await privateAccountRequest(req,config,async url=>unavailable==='identity'||String(url).endsWith('/v1/sessions')?Response.json({error:'TEMPORARY_UNAVAILABLE'},{status}):Response.json({id:crypto.randomUUID()}));
  expect(res.status).toBe(503);expect(res.headers.has('set-cookie')).toBe(false);expect(await res.json()).not.toHaveProperty('signedIn',false);
 }
});
test('rotation proxy requires captured account and forwards only authenticated lifecycle requests',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 for(const method of ['GET','POST']){
  const operation={action:'commit',operation:crypto.randomUUID()};
  const req=new Request('https://app.test/api/private-account?action=rotation',{method,headers:{origin:'https://app.test','content-type':'application/json',cookie:'__Host-zigoals_session=fixture-token','x-zigoals-account':id},...(method==='POST'?{body:JSON.stringify({action:'rotation',operation})}:{})});
  const result=await privateAccountRequest(req,config,async(url,init)=>{expect(url).toBe(config.syncOrigin+'/v1/rotation');expect(new Headers(init?.headers).get('x-zigoals-account')).toBe(id);if(method==='POST')expect(JSON.parse(init?.body as string)).toEqual(operation);return Response.json({rotation:null});});
  expect(result.status).toBe(200);
 }
});
test('refresh rotates durable session access before exposing new cookies and never sends refresh material to the browser body',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const req=()=>new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'__Host-zigoals_session=old-token; __Host-zigoals_refresh=refresh-secret'},body:'{"action":"refresh"}'});
 const calls:string[]=[];
 const result=await privateAccountRequest(req(),config,async(input,init)=>{calls.push(String(input));if(String(input).includes('/token?grant_type=refresh_token')){expect(JSON.parse(init?.body as string)).toEqual({refresh_token:'refresh-secret'});return Response.json({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600,user:{id}});}expect(JSON.parse(init?.body as string)).toEqual({action:'refresh',previous:'old-token'});return Response.json({registered:true,id:crypto.randomUUID()});});
 expect(result.status).toBe(200);expect(result.headers.getSetCookie().map(v=>v.split('=')[0])).toEqual(['__Host-zigoals_session','__Host-zigoals_refresh','zigoals_session','zigoals_refresh']);expect(result.headers.getSetCookie().slice(2).every(v=>v.includes('Max-Age=0'))).toBe(true);expect(result.headers.get('set-cookie')).toContain('HttpOnly');expect(await result.text()).not.toMatch(/new-token|new-refresh|refresh-secret/);expect(calls).toHaveLength(2);
 const denied=await privateAccountRequest(req(),config,async input=>String(input).includes('/token?')?Response.json({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600,user:{id}}):Response.json({error:'SESSION_REVOKED'},{status:401}));expect(denied.status).toBe(400);expect(denied.headers.has('set-cookie')).toBe(false);
});
test('deletion proxy preserves identity-stage pending status and requires a captured account fence',async()=>{
 const id='10000000-0000-4000-8000-000000000001',operation={action:'delete-account',confirm:'DELETE ACCOUNT'};
 const response=await privateAccountRequest(new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'__Host-zigoals_session=fixture','x-zigoals-account':id},body:JSON.stringify({action:'delete',operation})}),config,async(input,init)=>{expect(input).toBe(config.syncOrigin+'/v1/account');expect(JSON.parse(init?.body as string)).toEqual(operation);return Response.json({deleted:true,providerDeleted:false,providerPending:true},{status:202});});
 expect(response.status).toBe(202);expect(await response.json()).toEqual({deleted:true,providerDeleted:false,providerPending:true});
});

test('hosted sessions use __Host- cookies and expire the legacy names',async()=>{
 const upstream=vi.fn(async(url)=>String(url).endsWith('/v1/sessions')?Response.json({registered:true,id:crypto.randomUUID()}):Response.json({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_in:3600,user:{id:crypto.randomUUID()}}));
 const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'a@example.com',code:'123456'})});
 const cookies=(await privateAccountRequest(req,config,upstream)).headers.getSetCookie();
 expect(cookies.slice(0,2)).toEqual(['__Host-zigoals_session=fixture-token; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000; Secure','__Host-zigoals_refresh=fixture-refresh; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000; Secure']);
 for(const cookie of cookies.slice(0,2))expect(cookie).not.toMatch(/Domain=/i);
 expect(cookies.slice(2)).toEqual(['zigoals_session=; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=0; Secure','zigoals_refresh=; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=0; Secure']);
});

test('hosted requests ignore unprefixed session cookies a sibling subdomain could set',async()=>{
 const upstream=vi.fn(async()=>Response.json({revision:0,records:[]}));
 const req=new Request('https://app.test/api/private-account',{headers:{cookie:'zigoals_session=injected-token','X-Zigoals-Account':'10000000-0000-4000-8000-000000000001'}});
 expect((await privateAccountRequest(req,config,upstream)).status).toBe(401);expect(upstream).not.toHaveBeenCalled();
});

test('duplicate same-name session cookies are rejected and cleared before any upstream call',async()=>{
 const upstream=vi.fn();
 for(const cookie of ['__Host-zigoals_session=a; __Host-zigoals_session=b','__Host-zigoals_session=a; __Host-zigoals_refresh=r; __Host-zigoals_refresh=s']){
  const result=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status',{headers:{cookie}}),config,upstream);
  expect(result.status).toBe(400);expect(await result.json()).toMatchObject({error:'DUPLICATE_SESSION_COOKIE'});expect(result.headers.getSetCookie().every(v=>v.includes('Max-Age=0'))).toBe(true);
 }
 expect(upstream).not.toHaveBeenCalled();
});

test('local http development keeps the unprefixed cookie names without Secure',async()=>{
 const upstream=vi.fn(async(url)=>String(url).endsWith('/v1/sessions')?Response.json({registered:true,id:crypto.randomUUID()}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id:crypto.randomUUID()}}));
 const req=new Request('http://127.0.0.1:3100/api/private-account',{method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'a@example.com',code:'123456'})});
 const cookies=(await privateAccountRequest(req,config,upstream)).headers.getSetCookie();
 expect(cookies).toEqual(['zigoals_session=fixture-token; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=3600','zigoals_refresh=; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=0']);
 const read=vi.fn(async()=>Response.json({revision:0,records:[]}));
 expect((await privateAccountRequest(new Request('http://127.0.0.1:3100/api/private-account',{headers:{cookie:'zigoals_session=fixture-token','X-Zigoals-Account':'10000000-0000-4000-8000-000000000001'}}),config,read)).status).toBe(200);
});

test('a rejected code is reported to admission as a failed verification; a provider throttle is not',async()=>{
 for(const [status,reported] of [[400,true],[403,true],[429,false]] as const){
  const admit=vi.fn<(action:'send'|'verify'|'verify-failed',email:string)=>Promise<Response>>(async()=>Response.json({allowed:true}));
  const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'a@example.com',code:'123456'})});
  const result=await privateAccountRequest(req,config,async()=>Response.json({},{status}),admit);
  expect(result.ok).toBe(false);expect(admit.mock.calls.map(c=>c[0])).toEqual(reported?['verify','verify-failed']:['verify']);
 }
});

// Session U Part 5 (FIX_PLAN A2, FINDINGS Q-AUTH-06): every code request that passes admission gets one answer, byte for
// byte, whatever the provider answers, and the provider is asked only after that answer exists. Session P named two of
// these refusals to the person (403 INVITE_ONLY, 403 EMAIL_UNAVAILABLE), which told anyone whether an address was
// invited. The refusals below are Supabase's own, verified 2026-10-03 from github.com/supabase/auth (internal/api/otp.go,
// internal/api/apierrors): with sign-ups disabled, POST /auth/v1/otp for an unknown address answers 422 with
// `x-sb-error-code: otp_disabled` and {"code":422,"error_code":"otp_disabled","msg":"Signups not allowed for otp"} in the
// legacy shape this relay receives, or {"code":"otp_disabled","message":"Signups not allowed for otp"} from API version
// 2024-01-01.
const sendRequest=()=>new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'send',email:'friend@example.com'})});
const OUTCOMES:[string,()=>Promise<Response>][]=[
 ['a code sent',async()=>Response.json({})],
 ['not on the invite list (legacy body and header)',async()=>Response.json({code:422,error_code:'otp_disabled',msg:'Signups not allowed for otp'},{status:422,headers:{'x-sb-error-code':'otp_disabled'}})],
 ['not on the invite list (2024-01-01 body)',async()=>Response.json({code:'otp_disabled',message:'Signups not allowed for otp'},{status:422})],
 ['sign-ups closed',async()=>Response.json({code:422,error_code:'signup_disabled',msg:'Signups not allowed for this instance'},{status:422,headers:{'x-sb-error-code':'signup_disabled'}})],
 ['email sign-in switched off',async()=>Response.json({code:422,error_code:'email_provider_disabled',msg:'Email logins are disabled'},{status:422,headers:{'x-sb-error-code':'email_provider_disabled'}})],
 ['the provider\u2019s email rate limit',async()=>Response.json({code:429,error_code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'},{status:429,headers:{'x-sb-error-code':'over_email_send_rate_limit'}})],
 ['the provider\u2019s email quota',async()=>Response.json({code:422,error_code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'},{status:422,headers:{'x-sb-error-code':'over_email_send_rate_limit'}})],
 ['an address the provider rejects',async()=>Response.json({code:400,error_code:'validation_failed',msg:'Unable to validate email address'},{status:400})],
 ['an outage',async()=>new Response('not json at all',{status:500})],
 ['no answer at all',async()=>{throw TypeError('fetch failed');}],
];
const snapshot=async(response:Response)=>({status:response.status,headers:[...response.headers.entries()],body:await response.text()});
test('every outcome of a code request gets the same answer, byte for byte, and the provider is asked only after it',async()=>{
 const answers=[];
 for(const [name,outcome] of OUTCOMES){
  const calls:unknown[]=[],queued:(()=>Promise<void>)[]=[],admit=vi.fn(async()=>new Response(null,{status:204}));
  const result=await privateAccountRequest(sendRequest(),config,async(url,init)=>{calls.push([String(url),JSON.parse(String(init?.body))]);return outcome();},admit,work=>{queued.push(work);});
  expect(calls,name).toEqual([]);expect(queued,name).toHaveLength(1);
  answers.push(await snapshot(result));
  await queued[0]!();
  expect(calls,name).toEqual([['https://test.supabase.co/auth/v1/otp',{email:'friend@example.com',create_user:false}]]);
  expect(admit.mock.calls.map(c=>c[0]),name).toEqual(['send']);
 }
 expect(answers[0]).toEqual({status:200,headers:expect.any(Array),body:JSON.stringify({message:CODE_REQUEST_MESSAGE})});
 for(const answer of answers)expect(answer).toEqual(answers[0]);
 expect(answers[0]!.headers.map(([name])=>name)).not.toContain('set-cookie');
});
test('without a scheduler the provider call is awaited first, and the answer is still the same for every outcome',async()=>{
 const answers=[];
 for(const [,outcome] of OUTCOMES){const upstream=vi.fn(async()=>outcome());answers.push(await snapshot(await privateAccountRequest(sendRequest(),config,upstream)));expect(upstream).toHaveBeenCalledTimes(1);}
 expect(answers[0]!.body).toBe(JSON.stringify({message:CODE_REQUEST_MESSAGE}));
 for(const answer of answers)expect(answer).toEqual(answers[0]);
});
test('our own admission still answers for itself, before any provider call: the same for every address',async()=>{
 for(const [status,error] of [[429,'TRY_LATER'],[503,'AUTH_ADMISSION_UNAVAILABLE']] as const){
  const upstream=vi.fn(),queued:unknown[]=[];
  const result=await privateAccountRequest(sendRequest(),config,upstream,async()=>Response.json({},{status}),work=>{queued.push(work);});
  expect(result.status).toBe(status);expect((await result.json()).error).toBe(error);expect(upstream).not.toHaveBeenCalled();expect(queued).toEqual([]);
 }
});
test('a rejected code never reads as invite-only, even when the provider names otp_disabled',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'friend@example.com',code:'123456'})});
 const result=await privateAccountRequest(request,config,async()=>Response.json({code:422,error_code:'otp_disabled',msg:'Signups not allowed for otp'},{status:422,headers:{'x-sb-error-code':'otp_disabled'}}));
 expect(result.status).toBe(400);expect(await result.json()).toEqual({error:'AUTH_FAILED',message:'Check your code or request a new one after the cooldown.'});expect(result.headers.get('set-cookie')).toBeNull();
});
// Session U Part 5 (FIX_PLAN A1, FINDINGS Q-AUTH-01): the request body itself, for an address the provider does not know.
test('a code request never asks the provider to create a user',async()=>{
 const bodies:unknown[]=[];
 const result=await privateAccountRequest(sendRequest(),config,async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return Response.json({});});
 expect(result.status).toBe(200);expect(bodies).toEqual([{email:'friend@example.com',create_user:false}]);
 expect(JSON.stringify(bodies)).not.toContain('"create_user":true');
});
