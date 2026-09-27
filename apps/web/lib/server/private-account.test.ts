import {test,expect,vi} from 'vitest';
import {privateAccountRequest} from './private-account';
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
 const req=new Request('https://app.test/api/private-account',{headers:{cookie:'zigoals_session=fixture-token','X-Zigoals-Account':'10000000-0000-4000-8000-000000000001'}});
 expect((await privateAccountRequest(req,config,upstream)).status).toBe(200);expect(upstream.mock.calls[0]?.length).toBeGreaterThan(0);
});
test('vault requests require a captured account fence and forward it without using it as identity',async()=>{
 const cookie='zigoals_session=fixture-token',id='10000000-0000-4000-8000-000000000001';
 const missing=await privateAccountRequest(new Request('https://app.test/api/private-account',{headers:{cookie}}),config,async()=>{throw Error('must not fetch');});expect(missing.status).toBe(400);
 for(const method of ['GET','POST']){
  const request=new Request('https://app.test/api/private-account',{method,headers:{cookie,origin:'https://app.test','content-type':'application/json','X-Zigoals-Account':id},...(method==='POST'?{body:'{"action":"sync","operation":{}}'}:{})});
  const result=await privateAccountRequest(request,config,async(_input,init)=>{const headers=new Headers(init?.headers);expect(headers.get('x-zigoals-account')).toBe(id);expect(headers.get('authorization')).toBe('Bearer fixture-token');return Response.json({error:'ACCOUNT_MISMATCH'},{status:403});});expect(result.status).toBe(403);
 }
});

test('signout clears the local session even when upstream revocation cannot be confirmed',async()=>{
 const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(req,config,async()=>{throw Error('offline');});expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toMatchObject({signedOut:true,remoteRevocationConfirmed:false});
});
test('verify returns only the validated provider account identity, never credentials',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const request=()=>new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'fixture@example.com',code:'123456'})});
 const result=await privateAccountRequest(request(),config,async url=>String(url).endsWith('/v1/sessions')?Response.json({registered:true,id:crypto.randomUUID()}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id,email:'fixture@example.com'}}));expect(await result.json()).toEqual({signedIn:true,accountId:id});
 const invalid=await privateAccountRequest(request(),config,async()=>Response.json({access_token:'fixture-token',expires_in:3600,user:{id:'bad'}}));expect(invalid.status).toBe(400);expect(invalid.headers.get('set-cookie')).toBeNull();
});
test('identity status verifies the cookie at the auth provider and never reads the vault',async()=>{
 const result=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'zigoals_session=fixture-token'}}),config,async(input,init)=>{
  if(String(input).endsWith('/v1/sessions'))return Response.json({sessions:[]});
  expect(input).toBe('https://test.supabase.co/auth/v1/user');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fixture-token');return Response.json({id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.com'});
 });expect(await result.json()).toEqual({signedIn:true,accountId:'10000000-0000-4000-8000-000000000001'});
 const missing=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status'),config,async()=>{throw Error('must not fetch');});expect(await missing.json()).toEqual({signedIn:false});
});
test('signout clears cookies even after hosted configuration disappears',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(request,null,async()=>{throw Error('must not fetch');});expect(result.status).toBe(200);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toEqual({signedOut:true,remoteRevocationConfirmed:false});
});

test('provider verification cannot open an app session unless durable registration succeeds',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'verify',email:'fixture@example.com',code:'123456'})});
 const res=await privateAccountRequest(request,config,async url=>String(url).endsWith('/v1/sessions')?Response.json({error:'SESSION_REVOKED'},{status:401}):Response.json({access_token:'fixture-token',expires_in:3600,user:{id:crypto.randomUUID()}}));expect(res.status).toBe(400);expect(res.headers.has('set-cookie')).toBe(false);
});
test('a revoked durable session is locked even when provider token still validates',async()=>{
 const req=new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'zigoals_session=fixture-token'}});
 const res=await privateAccountRequest(req,config,async url=>String(url).endsWith('/v1/sessions')?Response.json({error:'SESSION_REVOKED'},{status:401}):Response.json({id:crypto.randomUUID()}));expect(res.status).toBe(401);expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
});

test('temporary identity or session-registry outage preserves the session cookie without claiming signed out',async()=>{
 for(const unavailable of ['identity','registry'])for(const status of [429,500,503,507]){
  const req=new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'zigoals_session=fixture-token'}});
  const res=await privateAccountRequest(req,config,async url=>unavailable==='identity'||String(url).endsWith('/v1/sessions')?Response.json({error:'TEMPORARY_UNAVAILABLE'},{status}):Response.json({id:crypto.randomUUID()}));
  expect(res.status).toBe(503);expect(res.headers.has('set-cookie')).toBe(false);expect(await res.json()).not.toHaveProperty('signedIn',false);
 }
});
test('rotation proxy requires captured account and forwards only authenticated lifecycle requests',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 for(const method of ['GET','POST']){
  const operation={action:'commit',operation:crypto.randomUUID()};
  const req=new Request('https://app.test/api/private-account?action=rotation',{method,headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture-token','x-zigoals-account':id},...(method==='POST'?{body:JSON.stringify({action:'rotation',operation})}:{})});
  const result=await privateAccountRequest(req,config,async(url,init)=>{expect(url).toBe(config.syncOrigin+'/v1/rotation');expect(new Headers(init?.headers).get('x-zigoals-account')).toBe(id);if(method==='POST')expect(JSON.parse(init?.body as string)).toEqual(operation);return Response.json({rotation:null});});
  expect(result.status).toBe(200);
 }
});
test('refresh rotates durable session access before exposing new cookies and never sends refresh material to the browser body',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const req=()=>new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=old-token; zigoals_refresh=refresh-secret'},body:'{"action":"refresh"}'});
 const calls:string[]=[];
 const result=await privateAccountRequest(req(),config,async(input,init)=>{calls.push(String(input));if(String(input).includes('/token?grant_type=refresh_token')){expect(JSON.parse(init?.body as string)).toEqual({refresh_token:'refresh-secret'});return Response.json({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600,user:{id}});}expect(JSON.parse(init?.body as string)).toEqual({action:'refresh',previous:'old-token'});return Response.json({registered:true,id:crypto.randomUUID()});});
 expect(result.status).toBe(200);expect(result.headers.getSetCookie().length).toBe(2);expect(result.headers.get('set-cookie')).toContain('HttpOnly');expect(await result.text()).not.toMatch(/new-token|new-refresh|refresh-secret/);expect(calls).toHaveLength(2);
 const denied=await privateAccountRequest(req(),config,async input=>String(input).includes('/token?')?Response.json({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600,user:{id}}):Response.json({error:'SESSION_REVOKED'},{status:401}));expect(denied.status).toBe(400);expect(denied.headers.has('set-cookie')).toBe(false);
});
test('deletion proxy preserves identity-stage pending status and requires a captured account fence',async()=>{
 const id='10000000-0000-4000-8000-000000000001',operation={action:'delete-account',confirm:'DELETE ACCOUNT'};
 const response=await privateAccountRequest(new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture','x-zigoals-account':id},body:JSON.stringify({action:'delete',operation})}),config,async(input,init)=>{expect(input).toBe(config.syncOrigin+'/v1/account');expect(JSON.parse(init?.body as string)).toEqual(operation);return Response.json({deleted:true,providerDeleted:false,providerPending:true},{status:202});});
 expect(response.status).toBe(202);expect(await response.json()).toEqual({deleted:true,providerDeleted:false,providerPending:true});
});
