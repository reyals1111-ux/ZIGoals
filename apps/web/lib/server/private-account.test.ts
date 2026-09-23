import {test,expect,vi} from 'vitest';
import {privateAccountRequest} from './private-account';
const config={authOrigin:'https://test.supabase.co',publicKey:'public',syncOrigin:'https://sync.example.workers.dev'};
test('configuration and cross-origin fail closed before external calls',async()=>{
 const fetcher=vi.fn();const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{"action":"send","email":"a@example.com"}'});
 expect((await privateAccountRequest(req,config,fetcher)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
 expect((await privateAccountRequest(new Request('https://app.test/api/private-account'),null,fetcher)).status).toBe(503);
});
test('OTP adapter protects token in HttpOnly cookie and excludes credentials from public response',async()=>{
 const upstream=vi.fn(async()=>Response.json({access_token:'fixture-token',expires_in:3600,user:{id:crypto.randomUUID()}}));
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
 const result=await privateAccountRequest(request(),config,async()=>Response.json({access_token:'fixture-token',expires_in:3600,user:{id,email:'fixture@example.com'}}));expect(await result.json()).toEqual({signedIn:true,accountId:id});
 const invalid=await privateAccountRequest(request(),config,async()=>Response.json({access_token:'fixture-token',expires_in:3600,user:{id:'bad'}}));expect(invalid.status).toBe(400);expect(invalid.headers.get('set-cookie')).toBeNull();
});
test('identity status verifies the cookie at the auth provider and never reads the vault',async()=>{
 const result=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status',{headers:{cookie:'zigoals_session=fixture-token'}}),config,async(input,init)=>{
  expect(input).toBe('https://test.supabase.co/auth/v1/user');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fixture-token');return Response.json({id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.com'});
 });expect(await result.json()).toEqual({signedIn:true,accountId:'10000000-0000-4000-8000-000000000001'});
 const missing=await privateAccountRequest(new Request('https://app.test/api/private-account?action=status'),config,async()=>{throw Error('must not fetch');});expect(await missing.json()).toEqual({signedIn:false});
});
test('signout clears cookies even after hosted configuration disappears',async()=>{
 const request=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(request,null,async()=>{throw Error('must not fetch');});expect(result.status).toBe(200);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toEqual({signedOut:true,remoteRevocationConfirmed:false});
});
