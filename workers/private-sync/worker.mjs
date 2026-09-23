/** Isolated nonproduction encrypted sync worker. No bindings added to Alpha. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAINS=new Set(['finance','health','habits','settings']);
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function exact(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(value,k));}
function envelope(v){return exact(v,['version','nonce','ciphertext'])&&v.version===1&&/^[\w-]{16}$/.test(v.nonce)&&typeof v.ciphertext==='string'&&v.ciphertext.length>=22&&v.ciphertext.length<=350000&&/^[\w-]+$/.test(v.ciphertext);}
function manifest(v){return exact(v,['version','vault','epoch','wrapped'])&&v.version===1&&UUID.test(v.vault)&&v.epoch===1&&envelope(v.wrapped);}
async function boundedJSON(request,max=1_000_000){
 const reader=request.body?.getReader();if(!reader)throw Error('body');const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('size');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
export default {async fetch(request,env){
 const url=new URL(request.url);if(url.pathname!=='/v1/vault'||!['GET','POST'].includes(request.method))return response({error:'NOT_FOUND'},404);
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.AUTH_ORIGIN??'')||!env.AUTH_PUBLIC_KEY||!env.APP_ORIGIN)return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 const token=request.headers.get('authorization');if(!token||!/^Bearer [A-Za-z0-9._-]{1,4096}$/.test(token))return response({error:'SIGN_IN_REQUIRED'},401);
 let user;
 try{const auth=await fetch(`${env.AUTH_ORIGIN}/auth/v1/user`,{headers:{authorization:token,apikey:env.AUTH_PUBLIC_KEY},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!auth.ok)return response({error:'SIGN_IN_REQUIRED'},401);user=await boundedJSON(auth,32768);}catch{return response({error:'SIGN_IN_REQUIRED'},401);}
 if(!UUID.test(user?.id))return response({error:'SIGN_IN_REQUIRED'},401);
 if(request.headers.get('x-zigoals-account')?.toLowerCase()!==user.id.toLowerCase())return response({error:'ACCOUNT_CHANGED'},409);
 // Client-supplied account/vault identifiers never select another tenant's object.
 const stub=env.VAULTS.get(env.VAULTS.idFromName(user.id));return stub.fetch(request);
}};
export class PrivateVault{
 constructor(state){this.state=state;}
 async fetch(request){
  if(request.method==='GET'){
   const url=new URL(request.url),cursor=url.searchParams.get('cursor')??'';
   if(cursor&&!/^record:[0-9a-f-]{36}$/i.test(cursor))return response({error:'INVALID_CURSOR'},400);
   const rows=await this.state.storage.list({prefix:'record:',startAfter:cursor||undefined,limit:101});const entries=[...rows.entries()];const page=entries.slice(0,100);
   return response({protocol:1,revision:await this.state.storage.get('revision')??0,manifest:await this.state.storage.get('manifest')??null,records:page.map(([,v])=>v),cursor:entries.length>100?page.at(-1)[0]:null});
  }
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
  let input;try{input=await boundedJSON(request);}catch{return response({error:'INVALID_OR_OVERSIZED_REQUEST'},400);}
  const allowed=['protocol','vault','operation','base','changes',...(Object.hasOwn(input??{},'manifest')?['manifest']:[])];
  if(!exact(input,allowed)||input.protocol!==1||!UUID.test(input.vault)||!UUID.test(input.operation)||!Number.isSafeInteger(input.base)||input.base<0||!Array.isArray(input.changes)||input.changes.length>100||(input.manifest&&!manifest(input.manifest)))return response({error:'INVALID_PROTOCOL'},400);
  const ids=new Set();for(const row of input.changes){if(!exact(row,['id','domain','revision','epoch','envelope','deleted'])||!UUID.test(row.id)||ids.has(row.id)||!DOMAINS.has(row.domain)||!Number.isSafeInteger(row.revision)||row.revision<1||row.epoch!==1||typeof row.deleted!=='boolean'||!envelope(row.envelope))return response({error:'INVALID_RECORD'},400);ids.add(row.id);}
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input))))].map(x=>x.toString(16).padStart(2,'0')).join('');
  return this.state.storage.transaction(async store=>{
   const old=await store.get(`receipt:${input.operation}`);if(old)return old.digest===digest?response({revision:old.revision,replayed:true}):response({error:'OPERATION_REUSED'},409);
   const revision=await store.get('revision')??0;if(revision!==input.base)return response({error:'REVISION_CONFLICT',revision},409);
   const currentManifest=await store.get('manifest');if(input.manifest&&currentManifest)return response({error:'VAULT_ALREADY_EXISTS'},409);
   if(!currentManifest&&!input.manifest)return response({error:'ENROLL_FIRST'},409);
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
