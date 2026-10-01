/** Local-only owner recovery administration (ADR-007 option A). Never deployed: only
 * scripts/run11/recovery-admin.mjs runs it, through `wrangler dev` on 127.0.0.1, for one command.
 * ADMIN is the remote service binding to the private lifecycle Worker's LifecycleRecoveryAdmin
 * entrypoint, opened by the owner's own Cloudflare login. Each run sets a random
 * ADMIN_SESSION_TOKEN; a request without it is refused, so other local processes and pages that
 * rebind a hostname to 127.0.0.1 cannot use the open port. */
/** @typedef {{ADMIN?:Fetcher,ADMIN_SESSION_TOKEN?:string}} AdminEnv */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Lowercase only, as the auth provider issues it: the lifecycle authority keys its Durable Object by the exact string.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** @type {Record<string,'GET'|'POST'>} */
const ROUTES={'/status':'GET','/admin/export':'GET','/admin/dry-run':'POST','/admin/reconcile':'POST'};
// The lifecycle authority refuses checkpoints above 16 MiB itself; this only bounds what is buffered here.
const MAX_BODY=16*1024*1024;
/** Compares without returning early on the first differing byte. @param {string} a @param {string} b */
function sameToken(a,b){
 const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]??0)^(y[i]??0);
 return diff===0;
}
/** @param {Request} request */
async function boundedBody(request){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array(0);const chunks=[];let length=0;
 for(;;){const row=await reader.read();if(row.done)break;length+=row.value.byteLength;if(length>MAX_BODY){await reader.cancel();return null;}chunks.push(row.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const row of chunks){bytes.set(row,offset);offset+=row.byteLength;}return bytes;
}
const recoveryAdminWorker={
 /** @param {Request} request @param {AdminEnv} env */
 async fetch(request,env){
  const token=env.ADMIN_SESSION_TOKEN??'';
  if(token.length<32)return reply({error:'ADMIN_SESSION_UNCONFIGURED'},503);
  if(!sameToken(request.headers.get('x-admin-session')??'',token))return reply({error:'ADMIN_SESSION_REQUIRED'},403);
  const url=new URL(request.url),method=ROUTES[url.pathname];
  if(url.search||!method)return reply({error:'NOT_FOUND'},404);
  if(request.method!==method)return reply({error:'METHOD_NOT_ALLOWED'},405);
  if(!env.ADMIN)return reply({error:'ADMIN_BINDING_MISSING'},503);
  if(url.pathname==='/status')return reply({ok:true,service:'zigoals-recovery-admin'});
  const account=request.headers.get('x-verified-account')??'';
  if(!UUID.test(account))return reply({error:'IDENTITY_REQUIRED'},403);
  // Only the account selector and the JSON body cross the binding; no other caller header is forwarded.
  /** @type {Record<string,string>} */
  const headers={'x-verified-account':account};let body;
  if(method==='POST'){
   if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return reply({error:'JSON_REQUIRED'},415);
   body=await boundedBody(request);if(body===null)return reply({error:'RECOVERY_CAPACITY'},413);headers['content-type']='application/json';
  }
  const response=await env.ADMIN.fetch(new Request('https://recovery-admin.internal'+url.pathname,{method,headers,...(body?{body}:{})}));
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 },
};
export default recoveryAdminWorker;
