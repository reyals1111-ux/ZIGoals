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
 const req=new Request('https://app.test/api/private-account',{headers:{cookie:'zigoals_session=fixture-token'}});
 expect((await privateAccountRequest(req,config,upstream)).status).toBe(200);expect(upstream.mock.calls[0]?.length).toBeGreaterThan(0);
});

test('signout clears the local session even when upstream revocation cannot be confirmed',async()=>{
 const req=new Request('https://app.test/api/private-account',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'zigoals_session=fixture-token'},body:'{"action":"signout"}'});
 const result=await privateAccountRequest(req,config,async()=>{throw Error('offline');});expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(await result.json()).toMatchObject({signedOut:true,remoteRevocationConfirmed:false});
});
