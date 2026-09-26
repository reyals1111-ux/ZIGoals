import {rotationRequest} from './rotation.mjs';
import {sessionAllowed,sessionsRequest} from './sessions.mjs';
/** Isolated nonproduction encrypted sync worker. No bindings added to Alpha. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAINS=new Set(['finance','health','habits','settings']);
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function exact(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(value,k));}
function envelope(v){return exact(v,['version','nonce','ciphertext'])&&v.version===1&&/^[\w-]{16}$/.test(v.nonce)&&typeof v.ciphertext==='string'&&v.ciphertext.length>=22&&v.ciphertext.length<=350000&&/^[\w-]+$/.test(v.ciphertext);}
function manifest(v){return exact(v,['version','vault','epoch','wrapped'])&&v.version===1&&UUID.test(v.vault)&&Number.isSafeInteger(v.epoch)&&v.epoch>0&&envelope(v.wrapped);}
async function boundedJSON(request,max=1_000_000){
 const reader=request.body?.getReader();if(!reader)throw Error('body');const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('size');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
const privateSyncWorker={async fetch(request,env){
 const url=new URL(request.url);if(!['/v1/vault','/v1/sessions','/v1/account','/v1/rotation'].includes(url.pathname)||!['GET','POST'].includes(request.method))return response({error:'NOT_FOUND'},404);
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.AUTH_ORIGIN??'')||!env.AUTH_PUBLIC_KEY||!env.APP_ORIGIN)return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 const token=request.headers.get('authorization');if(!token||!/^Bearer [A-Za-z0-9._-]{1,4096}$/.test(token))return response({error:'SIGN_IN_REQUIRED'},401);
 let user;
 try{const auth=await fetch(`${env.AUTH_ORIGIN}/auth/v1/user`,{headers:{authorization:token,apikey:env.AUTH_PUBLIC_KEY},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!auth.ok)return response({error:'SIGN_IN_REQUIRED'},401);user=await boundedJSON(auth,32768);}catch{return response({error:'SIGN_IN_REQUIRED'},401);}
 if(!UUID.test(user?.id))return response({error:'SIGN_IN_REQUIRED'},401);
 let family;try{const claims=JSON.parse(atob(token.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.sub!==user.id||!UUID.test(claims.session_id??''))throw Error();family=claims.session_id;}catch{return response({error:'VERIFIED_SESSION_REQUIRED'},401);}
 if(request.headers.get('x-zigoals-account')?.toLowerCase()!==user.id.toLowerCase())return response({error:'ACCOUNT_CHANGED'},409);
 // Client-supplied account/vault identifiers never select another tenant's object.
 const stub=env.VAULTS.get(env.VAULTS.idFromName(user.id)),headers=new Headers(request.headers);headers.delete('x-lifecycle-delete-authorized');headers.set('x-zigoals-session-family',family);headers.set('x-zigoals-token-hash',[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(v=>v.toString(16).padStart(2,'0')).join(''));
 if(!env.LIFECYCLE)return response({error:'LIFECYCLE_CONFIGURATION_REQUIRED'},503);
 const lifecycleCall=async body=>{const result=await env.LIFECYCLE.fetch(new Request('https://lifecycle.internal/account',{method:body?'POST':'GET',headers:{'x-verified-account':user.id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));if(!result.ok)return {error:result};return {value:await boundedJSON(result,4096)};};
 let lifecycle=await lifecycleCall();if(lifecycle.error)return lifecycle.error;
 if(url.pathname==='/v1/account'){
  if(request.method==='GET')return response(lifecycle.value);
  let action;try{action=await boundedJSON(request.clone(),256);}catch{return response({error:'INVALID_ACCOUNT_REQUEST'},400);}
  if(!exact(action,['action','confirm'])||!['delete-cloud-data','delete-account'].includes(action.action)||action.confirm!==(action.action==='delete-account'?'DELETE ACCOUNT':'DELETE CLOUD DATA'))return response({error:'INVALID_ACCOUNT_REQUEST'},400);
  if(!lifecycle.value.deleted){const allowed=await stub.fetch(new Request('https://vault.internal/v1/sessions',{headers}));if(!allowed.ok)return allowed;await allowed.body?.cancel();lifecycle=await lifecycleCall({action:'delete',confirm:'DELETE CLOUD DATA',generation:lifecycle.value.generation,family});if(lifecycle.error)return lifecycle.error;}
  headers.set('x-lifecycle-delete-authorized','1');headers.set('content-type','application/json');
  const erased=await stub.fetch(new Request('https://vault.internal/v1/account',{method:'POST',headers,body:'{"action":"delete-cloud-data","confirm":"DELETE CLOUD DATA"}'}));if(!erased.ok)return erased;await erased.body?.cancel();
  if(action.action==='delete-account'){
   if(lifecycle.value.authorizedFamily!==family)return response({error:'SESSION_REVOKED'},401);
   const recorded=await lifecycleCall({action:'request-provider-delete',family});if(recorded.error)return recorded.error;
   const confirmed=recorded.value.provider==='deleted';return response({deleted:true,providerDeleted:confirmed,providerPending:!confirmed},confirmed?200:202);
  }
  return response({deleted:true});
 }
 if(lifecycle.value.deleted)return response({error:'ACCOUNT_DELETED'},410);
 return stub.fetch(new Request(request,{headers}));
}};
export default privateSyncWorker;
export class PrivateVault{
 constructor(state){this.state=state;}
 async fetch(request){
  const path=new URL(request.url).pathname,sessionHash=request.headers.get('x-zigoals-token-hash');
  if(path==='/v1/rotation')return rotationRequest(request,this.state,boundedJSON,manifest,envelope);
  if(path==='/v1/account'){
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
   let action;try{action=await boundedJSON(request,256);}catch{return response({error:'INVALID_ACCOUNT_REQUEST'},400);}
   if(!exact(action,['action','confirm'])||action.action!=='delete-cloud-data'||action.confirm!=='DELETE CLOUD DATA')return response({error:'INVALID_ACCOUNT_REQUEST'},400);
   return this.state.storage.transaction(async store=>{
    if(await store.get('account-deleted'))return request.headers.get('x-lifecycle-delete-authorized')==='1'?response({deleted:true}):response({error:'ACCOUNT_DELETED'},410);
    if(request.headers.get('x-lifecycle-delete-authorized')!=='1'&&!await sessionAllowed(store,sessionHash))return response({error:'SESSION_REVOKED'},401);
    // Erase all active vault, receipt and session keys atomically, then retain only a
    // terminal marker so an offline device cannot reenroll and recreate this vault.
    for(;;){const batch=await store.list({limit:128});if(!batch.size)break;await store.delete([...batch.keys()]);}
    await store.put('account-deleted',{version:1,at:new Date().toISOString()});return response({deleted:true});
   });
  }
  if(await this.state.storage.get('account-deleted'))return response({error:'ACCOUNT_DELETED'},410);
  if(new URL(request.url).pathname==='/v1/sessions')return sessionsRequest(request,this.state,boundedJSON);
  if(request.method==='GET'){
   const url=new URL(request.url),cursor=url.searchParams.get('cursor')??'';
   if(cursor&&!/^record:[0-9a-f-]{36}$/i.test(cursor))return response({error:'INVALID_CURSOR'},400);
   return this.state.storage.transaction(async store=>{
    if(await store.get('account-deleted'))return response({error:'ACCOUNT_DELETED'},410);
    if(!await sessionAllowed(store,sessionHash))return response({error:'SESSION_REVOKED'},401);
    const rows=await store.list({prefix:'record:',startAfter:cursor||undefined,limit:101}),entries=[...rows.entries()],page=entries.slice(0,100);
    return response({protocol:1,revision:await store.get('revision')??0,manifest:await store.get('manifest')??null,records:page.map(([,v])=>v),cursor:entries.length>100?page.at(-1)[0]:null});
   });
  }
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
  let input;try{input=await boundedJSON(request);}catch{return response({error:'INVALID_OR_OVERSIZED_REQUEST'},400);}
  const allowed=['protocol','vault','operation','base','changes',...(Object.hasOwn(input??{},'manifest')?['manifest']:[])];
  if(!exact(input,allowed)||input.protocol!==1||!UUID.test(input.vault)||!UUID.test(input.operation)||!Number.isSafeInteger(input.base)||input.base<0||!Array.isArray(input.changes)||input.changes.length>100||(input.manifest&&!manifest(input.manifest)))return response({error:'INVALID_PROTOCOL'},400);
  const ids=new Set();for(const row of input.changes){if(!exact(row,['id','domain','revision','epoch','envelope','deleted'])||!UUID.test(row.id)||ids.has(row.id)||!DOMAINS.has(row.domain)||!Number.isSafeInteger(row.revision)||row.revision<1||(!Number.isSafeInteger(row.epoch)||row.epoch<1)||typeof row.deleted!=='boolean'||!envelope(row.envelope))return response({error:'INVALID_RECORD'},400);ids.add(row.id);}
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input))))].map(x=>x.toString(16).padStart(2,'0')).join('');
  return this.state.storage.transaction(async store=>{
   if(await store.get('account-deleted'))return response({error:'ACCOUNT_DELETED'},410);
   if(!await sessionAllowed(store,sessionHash))return response({error:'SESSION_REVOKED'},401);
   if(await store.get('rotation'))return response({error:'ROTATION_IN_PROGRESS'},409);
   const activeManifest=await store.get('manifest');if(activeManifest&&input.changes.some(row=>row.epoch!==activeManifest.epoch))return response({error:'EPOCH_RETIRED'},409);
   const old=await store.get(`receipt:${input.operation}`);if(old)return old.digest===digest?response({revision:old.revision,replayed:true}):response({error:'OPERATION_REUSED'},409);
   const revision=await store.get('revision')??0;if(revision!==input.base)return response({error:'REVISION_CONFLICT',revision},409);
   const currentManifest=await store.get('manifest');if(input.manifest&&currentManifest)return response({error:'VAULT_ALREADY_EXISTS'},409);
   if(!currentManifest&&!input.manifest)return response({error:'ENROLL_FIRST'},409);
   if(!currentManifest&&input.changes.some(row=>row.epoch!==input.manifest.epoch))return response({error:'INVALID_EPOCH'},409);
   if(input.vault!==(currentManifest??input.manifest).vault)return response({error:'VAULT_CHANGED'},409);
   let used=await store.get('bytes')??0,operations=await store.get('operations')??0;
   if(operations>=50000)return response({error:'OPERATION_CAPACITY_EXPORT_REQUIRED'},507);
   for(const row of input.changes){const previous=await store.get(`record:${row.id}`);if((previous?.revision??0)+1!==row.revision||previous&&previous.domain!==row.domain)return response({error:'RECORD_CONFLICT'},409);used+=JSON.stringify(row).length-(previous?JSON.stringify(previous).length:0);}
   if(used>32_000_000)return response({error:'VAULT_CAPACITY_EXPORT_REQUIRED'},507);
   const writes={revision:revision+1,bytes:used,operations:operations+1,[`receipt:${input.operation}`]:{digest,revision:revision+1}};
   if(input.manifest)writes.manifest=input.manifest;for(const row of input.changes)writes[`record:${row.id}`]=row;
   await store.put(writes);return response({revision:revision+1});
  });
 }
}
