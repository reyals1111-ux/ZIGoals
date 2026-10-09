import 'server-only';
import * as z from 'zod';
export type AccountConfig={authOrigin:string;publicKey:string;syncOrigin:string};
const configSchema=z.object({authOrigin:z.string().regex(/^https:\/\/[a-z0-9-]+\.supabase\.co$/),publicKey:z.string().min(1).max(4096),syncOrigin:z.string().regex(/^https:\/\/[a-z0-9.-]+\.workers\.dev$/)}).strict();
const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),email:z.email().max(254)}).strict(),
 z.object({action:z.literal('verify'),email:z.email().max(254),code:z.string().regex(/^\d{6,10}$/),label:z.string().trim().min(1).max(80).optional()}).strict(),
 z.object({action:z.literal('signout')}).strict(),
 z.object({action:z.literal('refresh')}).strict(),
 z.object({action:z.literal('sync'),operation:z.unknown()}).strict(),
 z.object({action:z.literal('domain'),operation:z.object({action:z.literal('delete-domain'),domain:z.enum(['finance','health','habits','settings']),confirm:z.string().max(32),operation:z.uuid(),revision:z.number().int().nonnegative(),generation:z.number().int().nonnegative()}).strict()}).strict(),
 z.object({action:z.literal('rotation'),operation:z.unknown()}).strict(),
 // Session U Part 9 (ADR-013): the opt-in Portfolio copy; private sync checks the operation itself (portfolio.mjs).
 z.object({action:z.literal('portfolio'),operation:z.unknown()}).strict(),
 z.object({action:z.literal('delete'),operation:z.discriminatedUnion('action',[z.object({action:z.literal('delete-cloud-data'),confirm:z.literal('DELETE CLOUD DATA')}).strict(),z.object({action:z.literal('delete-account'),confirm:z.literal('DELETE ACCOUNT')}).strict()])}).strict(),
 z.object({action:z.literal('session'),operation:z.discriminatedUnion('action',[z.object({action:z.literal('revoke'),id:z.uuid()}).strict(),z.object({action:z.literal('revoke-others')}).strict()])}).strict(),
]);
/**
 * Session U Part 5 (FIX_PLAN A2, FINDINGS Q-AUTH-06): the one answer to every code request that passes admission. Session
 * P named two provider refusals to the person (403 INVITE_ONLY for `otp_disabled`/`signup_disabled`, 403 EMAIL_UNAVAILABLE
 * for `email_provider_disabled`), which told anyone whether an address was invited; the invite hint is now in this answer,
 * for every address. The panel shows its own words (components/account-access.tsx) and still reads an older relay's 403s.
 */
export const CODE_REQUEST_MESSAGE='If this address has an invite, a code is on its way. Check your inbox and spam folder, and wait at least 60 seconds before requesting another.';
const reply=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function readBounded(response:Request|Response,max:number){
 const reader=response.body?.getReader();if(!reader)throw Error('Missing body');const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>max)throw Error('Too large');chunks.push(part.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const all=new Uint8Array(total);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
}
/** The hosts where plain http is allowed (FIX_PLAN A4): loopback only. */
const LOOPBACK=new Set(['localhost','127.0.0.1','[::1]']);
/**
 * `later` runs work after the answer is sent: the route passes Next's after() (bundled docs 04-functions/after.md; on
 * Cloudflare, OpenNext's waitUntil), proven in the packaged Worker by scripts/run11/packaged-runtime.test.mjs. Without it
 * the work is awaited first, and the answer is the same.
 */
export async function privateAccountRequest(request:Request,config:AccountConfig|null,fetcher:typeof fetch=fetch,admit?:(action:'send'|'verify'|'verify-failed',email:string)=>Promise<Response>,later?:(work:()=>Promise<void>)=>void):Promise<Response>{
 const url=new URL(request.url),origin=url.origin;
 // FIX_PLAN A4 (Q-AUTH-09, Session X Part 10): plain http is for this machine only (local development and fixtures on a
 // loopback host); any other http origin would get session cookies without Secure, so it is refused before anything else.
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&LOOPBACK.has(url.hostname)))return reply({error:'ORIGIN_DENIED'},403);
 if(request.method!=='GET'&&(request.method!=='POST'||request.headers.get('origin')!==origin))return reply({error:'ORIGIN_DENIED'},403);
 // Hosted (https) sessions use __Host- cookies: Secure, Path=/ and no Domain, so a sibling
 // subdomain cannot set or shadow them. Plain http exists only for local development and
 // fixtures, where Secure cookies are not portable; it keeps the previous unprefixed names.
 const secure=origin.startsWith('https:'),SESSION=secure?'__Host-zigoals_session':'zigoals_session',REFRESH=secure?'__Host-zigoals_refresh':'zigoals_refresh';
 const pairs=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const at=v.indexOf('=');return at<0?[v,'']:[v.slice(0,at),v.slice(at+1)];});
 const named=(name:string)=>pairs.filter(([key])=>key===name).map(([,value])=>value);
 const cookie=(value:string,age:number,name=SESSION)=>secure?`${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}; Secure`:`${name}=${value}; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=${age}`;
 // Two cookies with one name mean something else set a cookie for this origin: trust neither.
 if(named(SESSION).length>1||named(REFRESH).length>1){const result=reply({error:'DUPLICATE_SESSION_COOKIE',message:'Sign in again.'},400);result.headers.append('Set-Cookie',cookie('',0));result.headers.append('Set-Cookie',cookie('',0,REFRESH));return result;}
 const valid=(value:string|undefined)=>value&&/^[A-Za-z0-9._-]{1,4096}$/.test(value)?value:null;
 const token=valid(named(SESSION)[0]),refresh=valid(named(REFRESH)[0]);
 function withCookies(result:Response,access:string,refreshToken:string|undefined,age:number){result.headers.append('Set-Cookie',cookie(access,age));result.headers.append('Set-Cookie',cookie(refreshToken??'',refreshToken?30*86400:0,REFRESH));
  // Expire the pre-__Host- cookies once, so an old pair cannot linger beside the new one.
  if(secure)for(const legacy of ['zigoals_session','zigoals_refresh'])result.headers.append('Set-Cookie',`${legacy}=; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=0; Secure`);
  return result;}
 async function upstream(url:string,init:RequestInit){return fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});}
 // Session U Part 5 (FIX_PLAN A3, FINDINGS Q-AUTH-02): a revoke ends the provider session too, with Supabase's documented
 // logout only (supabase/auth internal/api/logout.go, read 2026-10-04: `/logout` with the user's own token supports the
 // scopes `local`, `others` and `global`; no admin route ends one session). "Revoke other sessions" logs out `others` with
 // this session's token. A single revoke is enforced by private sync at once, and the revoked session's own provider
 // session is logged out (`local`) the first time that session reaches this relay again: on its status check, a vault or
 // account request, or a refresh (then with the fresh token the provider has just issued).
 async function endProviderSession(cfg:AccountConfig,access:string,scope:'local'|'others'):Promise<boolean>{
  try{const result=await upstream(`${cfg.authOrigin}/auth/v1/logout?scope=${scope}`,{method:'POST',headers:{apikey:cfg.publicKey,authorization:`Bearer ${access}`}});await result.body?.cancel().catch(()=>{});return result.ok;}catch{return false;}
 }
 /** Private sync's answer, relayed as before; a session it refuses as revoked is also logged out at the provider. */
 async function relayed(cfg:AccountConfig,remote:Response,limit:number,headers:Record<string,string>={}){
  const data=await readBounded(remote,limit);
  if(remote.status===401&&data?.error==='SESSION_REVOKED'&&token)await endProviderSession(cfg,token,'local');
  return reply(data,remote.status,headers);
 }
 try{
  let action:z.infer<typeof actionSchema>|undefined;
  if(request.method==='POST'){
   if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return reply({error:'JSON_REQUIRED'},415);
   action=actionSchema.parse(await readBounded(request,1_010_000));
  }
  const parsed=configSchema.safeParse(config);
  if(action?.action==='signout'){
   let remoteRevocationConfirmed=!token;
   if(token&&parsed.success){try{
    const cfg=parsed.data,userResponse=await upstream(`${cfg.authOrigin}/auth/v1/user`,{headers:{apikey:cfg.publicKey,authorization:`Bearer ${token}`}});let syncRevoked=false;
    if(userResponse.ok){const user=z.object({id:z.uuid()}).parse(await readBounded(userResponse,32768));const revoked=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':user.id,'content-type':'application/json'},body:'{"action":"signout"}'});syncRevoked=revoked.ok||revoked.status===401;await revoked.body?.cancel().catch(()=>{});}else{syncRevoked=userResponse.status===401;await userResponse.body?.cancel().catch(()=>{});}
    const result=await upstream(`${cfg.authOrigin}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:cfg.publicKey,authorization:`Bearer ${token}`}});remoteRevocationConfirmed=result.ok&&syncRevoked;await result.body?.cancel().catch(()=>{});
   }catch{remoteRevocationConfirmed=false;}}
   return withCookies(reply({signedOut:true,remoteRevocationConfirmed}), '',undefined,0);
  }
  if(!parsed.success)return reply({error:'HOSTED_CONFIGURATION_REQUIRED',message:'Email and encrypted sync have not been configured. Local records remain available.'},503);
  const cfg=parsed.data;
  if(request.method==='GET'){
   if(new URL(request.url).searchParams.get('action')==='status'){
    if(!token)return reply({signedIn:false});
    const remote=await upstream(`${cfg.authOrigin}/auth/v1/user`,{headers:{apikey:cfg.publicKey,authorization:`Bearer ${token}`}});
    if(!remote.ok){await remote.body?.cancel().catch(()=>{});return remote.status===401||remote.status===403?reply({signedIn:false,error:'SIGN_IN_REQUIRED'},401,refresh?{}:{'Set-Cookie':cookie('',0)}):reply({error:'ACCOUNT_STATUS_UNAVAILABLE'},503);}
    const user=z.object({id:z.uuid()}).parse(await readBounded(remote,32768));
    const allowed=await upstream(`${cfg.syncOrigin}/v1/sessions`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':user.id}});
    // Session Y Part 5, FIX_PLAN A7 (Q-SYNC-05): a revoked session and a deleted account are named, so a remembered device
    // can forget its unlock record on exactly these two answers (and keep it on a routine sign-in or a failed check).
    const denied=allowed.status===401||allowed.status===410?(await readBounded(allowed,4096).catch(()=>null))?.error:(await allowed.body?.cancel().catch(()=>{}),undefined);
    if(allowed.status===401&&denied==='SESSION_REVOKED')await endProviderSession(cfg,token,'local');
    if(allowed.status===410&&denied==='ACCOUNT_DELETED')return reply({signedIn:false,error:'ACCOUNT_DELETED'},401,{'Set-Cookie':cookie('',0)});
    if(!allowed.ok)return allowed.status===401||allowed.status===403?reply({signedIn:false,error:denied==='SESSION_REVOKED'?'SESSION_REVOKED':'SIGN_IN_REQUIRED'},401,refresh?{}:{'Set-Cookie':cookie('',0)}):reply({error:'ACCOUNT_STATUS_UNAVAILABLE'},503);
    return reply({signedIn:true,accountId:user.id.toLowerCase()});
   }
   if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);
   const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account')).toLowerCase();
   if(new URL(request.url).searchParams.get('action')==='rotation'){const remote=await upstream(`${cfg.syncOrigin}/v1/rotation`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence}});return relayed(cfg,remote,32768);}
   if(new URL(request.url).searchParams.get('action')==='portfolio'){const remote=await upstream(`${cfg.syncOrigin}/v1/portfolio`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence}});return relayed(cfg,remote,1_100_000);}
   if(new URL(request.url).searchParams.get('action')==='sessions'){const remote=await upstream(`${cfg.syncOrigin}/v1/sessions`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence}});return relayed(cfg,remote,1_000_000);}
   const query=new URL(request.url).searchParams,cursor=query.get('cursor'),ids=query.has('ids')?query.get('ids')!.split(','):null;if(cursor&&!/^record:[0-9a-f-]{36}$/i.test(cursor))return reply({error:'INVALID_CURSOR'},400);if(ids&&(cursor||ids.length>100||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!z.uuid().safeParse(id).success)))return reply({error:'INVALID_RECORD_SELECTION'},400);
   const remote=await upstream(`${cfg.syncOrigin}/v1/vault${ids?'?ids='+encodeURIComponent(ids.join(',')):cursor?'?cursor='+encodeURIComponent(cursor):''}`,{headers:{authorization:`Bearer ${token}`,origin,'x-zigoals-account':accountFence}});
   return relayed(cfg,remote,36_000_000);
  }
  if(!action)throw Error('Missing account action.');
  if(action.action==='refresh'){
   if(!token||!refresh)return reply({error:'SIGN_IN_REQUIRED'},401);
   const remote=await upstream(`${cfg.authOrigin}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publicKey,'content-type':'application/json'},body:JSON.stringify({refresh_token:refresh})});
   if(!remote.ok){await remote.body?.cancel().catch(()=>{});return reply({error:'REFRESH_NOT_CONFIRMED'},remote.status===429?429:401);}
   const refreshed=z.object({access_token:z.string().regex(/^[A-Za-z0-9._-]{1,4096}$/),refresh_token:z.string().regex(/^[A-Za-z0-9._-]{1,4096}$/),expires_in:z.number().int().min(1).max(86400),user:z.object({id:z.uuid()})}).parse(await readBounded(remote,32768));
   const registry=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${refreshed.access_token}`,'x-zigoals-account':refreshed.user.id,'content-type':'application/json'},body:JSON.stringify({action:'refresh',previous:token})});
   if(!registry.ok){if(registry.status===401&&(await readBounded(registry,4096).catch(()=>null))?.error==='SESSION_REVOKED')await endProviderSession(cfg,refreshed.access_token,'local');else await registry.body?.cancel().catch(()=>{});throw Error('Session refresh denied.');}z.object({registered:z.literal(true),id:z.uuid()}).parse(await readBounded(registry,32768));
   return withCookies(reply({signedIn:true,accountId:refreshed.user.id.toLowerCase()}),refreshed.access_token,refreshed.refresh_token,30*86400);
  }
  if(action.action==='session'){if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account'));const remote=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence,'content-type':'application/json'},body:JSON.stringify(action.operation)});const data=await readBounded(remote,32768);
   if(remote.ok&&action.operation.action==='revoke-others'){data.providerSignedOut=await endProviderSession(cfg,token,'others');return reply(data,remote.status);}
   if(remote.ok&&data.currentRevoked===true||remote.status===401&&data?.error==='SESSION_REVOKED')await endProviderSession(cfg,token,'local');
   return reply(data,remote.status,data.currentRevoked?{'Set-Cookie':cookie('',0)}:{});}
  if(action.action==='sync'||action.action==='rotation'||action.action==='delete'||action.action==='domain'||action.action==='portfolio'){
   if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);
   const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account')).toLowerCase();
   const remote=await upstream(`${cfg.syncOrigin}/v1/${action.action==='rotation'?'rotation':action.action==='delete'?'account':action.action==='domain'?'domain':action.action==='portfolio'?'portfolio':'vault'}`,{method:'POST',headers:{authorization:`Bearer ${token}`,origin,'x-zigoals-account':accountFence,'content-type':'application/json'},body:JSON.stringify(action.operation)});
   return relayed(cfg,remote,action.action==='rotation'?1_000_000:32768);
  }
  // Session U Part 5 (FIX_PLAN A1, FINDINGS Q-AUTH-01): a code request never asks the provider to create a user, so an
  // address that is not on the invite list stays unknown even if sign-ups are ever switched back on.
  if(admit){const admission=await admit(action.action,action.email);await admission.body?.cancel().catch(()=>{});if(!admission.ok)return reply({error:admission.status===429?'TRY_LATER':'AUTH_ADMISSION_UNAVAILABLE',message:'Code requests are temporarily unavailable. Wait before trying again.'},admission.status===429?429:503);}
  if(action.action==='send'){
   // Session U Part 5 (FIX_PLAN A2): whatever the provider does with the request (a code sent; 422 `otp_disabled` or
   // `signup_disabled` for an address not on the invite list; `email_provider_disabled`; its own rate limit; an outage),
   // the answer is CODE_REQUEST_MESSAGE, byte for byte. With `later` the provider call starts after the answer, so its
   // timing says nothing either. Help says what to do when no code arrives.
   const send=async()=>{try{const remote=await upstream(`${cfg.authOrigin}/auth/v1/otp`,{method:'POST',headers:{apikey:cfg.publicKey,'content-type':'application/json'},body:JSON.stringify({email:action.email,create_user:false})});await remote.body?.cancel().catch(()=>{});}catch{/* The same answer either way. */}};
   if(later)later(send);else await send();
   return reply({message:CODE_REQUEST_MESSAGE});
  }
  const remote=await upstream(`${cfg.authOrigin}/auth/v1/verify`,{method:'POST',headers:{apikey:cfg.publicKey,'content-type':'application/json'},body:JSON.stringify({email:action.email,token:action.code,type:'email'})});
  if(!remote.ok){
   await remote.body?.cancel().catch(()=>{});
   // A rejected code counts toward the per-email daily cap on failed verifications.
   if(remote.status!==429&&admit){const failed=await admit('verify-failed',action.email).catch(()=>null);await failed?.body?.cancel().catch(()=>{});}
   return reply({error:remote.status===429?'TRY_LATER':'AUTH_FAILED',message:'Check your code or request a new one after the cooldown.'},remote.status===429?429:400);}
  const session=z.object({access_token:z.string().regex(/^[A-Za-z0-9._-]{1,4096}$/),expires_in:z.number().int().min(1).max(86400),refresh_token:z.string().regex(/^[A-Za-z0-9._-]{1,4096}$/).optional(),user:z.object({id:z.uuid()})}).parse(await readBounded(remote,32768));
  const registered=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${session.access_token}`,'x-zigoals-account':session.user.id,'content-type':'application/json'},body:JSON.stringify({action:'register',label:action.label??'Browser session'})});if(!registered.ok){await registered.body?.cancel().catch(()=>{});throw Error('Session registration not confirmed.');}z.object({registered:z.literal(true),id:z.uuid()}).parse(await readBounded(registered,32768));
  return withCookies(reply({signedIn:true,accountId:session.user.id.toLowerCase()}),session.access_token,session.refresh_token,session.refresh_token?30*86400:session.expires_in);
 }catch{return reply({error:'REQUEST_FAILED',message:'The operation was not confirmed. Your local records were preserved.'},400);}
}
