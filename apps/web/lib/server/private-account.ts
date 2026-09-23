import 'server-only';
import {z} from 'zod';
export type AccountConfig={authOrigin:string;publicKey:string;syncOrigin:string};
const configSchema=z.object({authOrigin:z.string().regex(/^https:\/\/[a-z0-9-]+\.supabase\.co$/),publicKey:z.string().min(1).max(4096),syncOrigin:z.string().regex(/^https:\/\/[a-z0-9.-]+\.workers\.dev$/)}).strict();
const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),email:z.email().max(254)}).strict(),
 z.object({action:z.literal('verify'),email:z.email().max(254),code:z.string().regex(/^\d{6,10}$/),label:z.string().trim().min(1).max(80).optional()}).strict(),
 z.object({action:z.literal('signout')}).strict(),
 z.object({action:z.literal('sync'),operation:z.unknown()}).strict(),
 z.object({action:z.literal('session'),operation:z.discriminatedUnion('action',[z.object({action:z.literal('revoke'),id:z.uuid()}).strict(),z.object({action:z.literal('revoke-others')}).strict()])}).strict(),
]);
const reply=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function readBounded(response:Request|Response,max:number){
 const reader=response.body?.getReader();if(!reader)throw Error('Missing body');const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>max)throw Error('Too large');chunks.push(part.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const all=new Uint8Array(total);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
}
export async function privateAccountRequest(request:Request,config:AccountConfig|null,fetcher:typeof fetch=fetch):Promise<Response>{
 const origin=new URL(request.url).origin;
 if(request.method!=='GET'&&(request.method!=='POST'||request.headers.get('origin')!==origin))return reply({error:'ORIGIN_DENIED'},403);
 const rawToken=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('zigoals_session='))?.slice(16);
 const token=rawToken&&/^[A-Za-z0-9._-]{1,4096}$/.test(rawToken)?rawToken:null;
 const cookie=(value:string,age:number)=>`zigoals_session=${value}; HttpOnly; SameSite=Strict; Path=/api/private-account; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`;
 async function upstream(url:string,init:RequestInit){return fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});}
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
   return reply({signedOut:true,remoteRevocationConfirmed},200,{'Set-Cookie':cookie('',0)});
  }
  if(!parsed.success)return reply({error:'HOSTED_CONFIGURATION_REQUIRED',message:'Email and encrypted sync have not been configured. Local records remain available.'},503);
  const cfg=parsed.data;
  if(request.method==='GET'){
   if(new URL(request.url).searchParams.get('action')==='status'){
    if(!token)return reply({signedIn:false});
    const remote=await upstream(`${cfg.authOrigin}/auth/v1/user`,{headers:{apikey:cfg.publicKey,authorization:`Bearer ${token}`}});
    if(!remote.ok){await remote.body?.cancel().catch(()=>{});return remote.status===401||remote.status===403?reply({signedIn:false,error:'SIGN_IN_REQUIRED'},401,{'Set-Cookie':cookie('',0)}):reply({error:'ACCOUNT_STATUS_UNAVAILABLE'},503);}
    const user=z.object({id:z.uuid()}).parse(await readBounded(remote,32768));
    const allowed=await upstream(`${cfg.syncOrigin}/v1/sessions`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':user.id}});await allowed.body?.cancel().catch(()=>{});if(!allowed.ok)return allowed.status===401||allowed.status===403?reply({signedIn:false,error:'SIGN_IN_REQUIRED'},401,{'Set-Cookie':cookie('',0)}):reply({error:'ACCOUNT_STATUS_UNAVAILABLE'},503);
    return reply({signedIn:true,accountId:user.id.toLowerCase()});
   }
   if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);
   const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account')).toLowerCase();
   if(new URL(request.url).searchParams.get('action')==='sessions'){const remote=await upstream(`${cfg.syncOrigin}/v1/sessions`,{headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence}});return reply(await readBounded(remote,1_000_000),remote.status);}
   const cursor=new URL(request.url).searchParams.get('cursor');if(cursor&&!/^record:[0-9a-f-]{36}$/i.test(cursor))return reply({error:'INVALID_CURSOR'},400);
   const remote=await upstream(`${cfg.syncOrigin}/v1/vault${cursor?'?cursor='+encodeURIComponent(cursor):''}`,{headers:{authorization:`Bearer ${token}`,origin,'x-zigoals-account':accountFence}});
   return reply(await readBounded(remote,36_000_000),remote.status);
  }
  if(!action)throw Error('Missing account action.');
  if(action.action==='session'){if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account'));const remote=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${token}`,'x-zigoals-account':accountFence,'content-type':'application/json'},body:JSON.stringify(action.operation)});const data=await readBounded(remote,32768);return reply(data,remote.status,data.currentRevoked?{'Set-Cookie':cookie('',0)}:{});}
  if(action.action==='sync'){
   if(!token)return reply({error:'SIGN_IN_REQUIRED'},401);
   const accountFence=z.uuid().parse(request.headers.get('x-zigoals-account')).toLowerCase();
   const remote=await upstream(`${cfg.syncOrigin}/v1/vault`,{method:'POST',headers:{authorization:`Bearer ${token}`,origin,'x-zigoals-account':accountFence,'content-type':'application/json'},body:JSON.stringify(action.operation)});
   return reply(await readBounded(remote,32768),remote.status);
  }
  const remote=await upstream(`${cfg.authOrigin}/auth/v1/${action.action==='send'?'otp':'verify'}`,{method:'POST',headers:{apikey:cfg.publicKey,'content-type':'application/json'},body:JSON.stringify(action.action==='send'?{email:action.email,create_user:true}:{email:action.email,token:action.code,type:'email'})});
  if(!remote.ok){await remote.body?.cancel().catch(()=>{});return reply({error:remote.status===429?'TRY_LATER':'AUTH_FAILED',message:'Check your code or request a new one after the cooldown.'},remote.status===429?429:400);}
  if(action.action==='send'){await remote.body?.cancel().catch(()=>{});return reply({message:'If this address can receive a code, check your inbox. Wait at least 60 seconds before requesting another.'});}
  const session=z.object({access_token:z.string().regex(/^[A-Za-z0-9._-]{1,4096}$/),expires_in:z.number().int().min(1).max(86400),user:z.object({id:z.uuid()})}).parse(await readBounded(remote,32768));
  const registered=await upstream(`${cfg.syncOrigin}/v1/sessions`,{method:'POST',headers:{origin,authorization:`Bearer ${session.access_token}`,'x-zigoals-account':session.user.id,'content-type':'application/json'},body:JSON.stringify({action:'register',label:action.label??'Browser session'})});if(!registered.ok){await registered.body?.cancel().catch(()=>{});throw Error('Session registration not confirmed.');}z.object({registered:z.literal(true),id:z.uuid()}).parse(await readBounded(registered,32768));
  return reply({signedIn:true,accountId:session.user.id.toLowerCase()},200,{'Set-Cookie':cookie(session.access_token,session.expires_in)});
 }catch{return reply({error:'REQUEST_FAILED',message:'The operation was not confirmed. Your local records were preserved.'},400);}
}
