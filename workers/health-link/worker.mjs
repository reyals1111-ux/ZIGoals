import {boundedJSON,providerConfigured,response,verifySession} from '../push-reminders/verify.mjs';
import {LinkBudget,linkPolicy} from './budget.mjs';
import {LIMITS} from './limits.mjs';
import {enabled,isProvider,namedRequest,polarRegistration,publicConfig,revokeRequest,tokenRequest,tokensFrom,withingsNonceRequest,withingsRevokeRequest} from './providers.mjs';
export {LinkBudget};
/**
 * The health-link Worker (Session W Part 8, [TIER 3] (new Worker); off by default, never deployed by the session). A
 * stateless door from ZIGoals to Oura, Withings, Polar and Strava, which each need ZIGoals' client secret for their
 * token calls and refuse browser calls (CORS), so the app cannot reach them itself:
 * - GET /health: the Worker answers; nothing about its configuration.
 * - GET /v1/config: the providers this deployment is registered with and their public client ids, and the redirect
 *   address (from APP_ORIGIN, never from a request).
 * - POST /v1/token, /v1/refresh: a code (with Oura's PKCE verifier) or a refresh token for tokens, which go back to the
 *   browser; the browser keeps them sealed on its device (lib/links/token-store.ts). Nothing is stored here.
 * - POST /v1/data: one named request from a fixed list (providers.mjs NAMED) with checked parameters; the provider's
 *   JSON comes back as it is, size-capped. Never an arbitrary path.
 * - POST /v1/register (Polar's required user registration) and POST /v1/revoke (each provider's documented way).
 * Every call needs the app's origin and an account session verified like the push, private-sync and ZIGi relay Workers.
 * Paused unless HEALTH_LINK_KILL_SWITCH is exactly "off"; 503 until the account provider and budgets are set. Per-account
 * and per-provider daily budgets and a breaker per provider: budget.mjs. No console call, observability off: it keeps
 * counts only, never a token, a code or a record.
 * @typedef {import('./providers.mjs').ProviderEnv & import('./budget.mjs').BudgetEnv & {LINK_BUDGET:DurableObjectNamespace,AUTH_ORIGIN?:string,AUTH_PUBLIC_KEY?:string,HEALTH_LINK_KILL_SWITCH?:string}} LinkEnv
 */
const ROUTES=/** @type {Record<string,string>} */({'/health':'GET','/v1/config':'GET','/v1/token':'POST','/v1/refresh':'POST','/v1/data':'POST','/v1/register':'POST','/v1/revoke':'POST','/v1/fixture':'POST'});
const internal=(/** @type {string} */path,/** @type {unknown} */body)=>new Request('https://link.internal'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const budgetOf=(/** @type {LinkEnv} */env)=>env.LINK_BUDGET.get(env.LINK_BUDGET.idFromName('health-link'));
/** @param {LinkEnv} env */
const configured=env=>providerConfigured(env)&&!!linkPolicy(env);
/** @param {LinkEnv} env */
const paused=env=>env.HEALTH_LINK_KILL_SWITCH!=='off';
/** The provider's answer read up to the cap. @param {Response} res */
async function bounded(res){
 const reader=res.body?.getReader();if(!reader)return '';
 const chunks=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>LIMITS.responseBytes)throw Error('size');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const all=new Uint8Array(total);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}
 return new TextDecoder().decode(all);
}
/**
 * One call to a provider under the budget: reserved first, settled after (a failure counts toward the breaker).
 * @param {LinkEnv} env @param {ExecutionContext} ctx @param {string} account @param {string} provider @param {import('./providers.mjs').Upstream} upstream
 * @returns {Promise<{status:number,json:unknown}|Response>}
 */
async function call(env,ctx,account,provider,upstream){
 const budget=budgetOf(env),admitted=await budget.fetch(internal('/reserve',{account,provider}));
 if(!admitted.ok)return admitted;
 await admitted.body?.cancel().catch(()=>{});
 const settle=(/** @type {'ok'|'failure'|'neutral'} */outcome)=>{ctx.waitUntil(budget.fetch(internal('/settle',{provider,outcome})).then(r=>r.body?.cancel()).catch(()=>{}));};
 let res;
 try{res=await fetch(upstream.url,{method:upstream.method,headers:upstream.headers,...(upstream.body!==undefined?{body:upstream.body}:{}),redirect:'manual',signal:AbortSignal.timeout(LIMITS.timeoutMs)});}
 catch{settle('failure');return response({error:'PROVIDER_UNAVAILABLE'},502);}
 const failed=res.status===429||res.status>=500;
 settle(failed?'failure':res.ok?'ok':'neutral');
 let text;try{text=await bounded(res);}catch{return response({error:'PROVIDER_ANSWER_TOO_LARGE'},502);}
 let json=null;try{json=text?JSON.parse(text):null;}catch{json=null;}
 return {status:res.status,json};
}
/** Withings answers 200 with its own status: "Authentication failed" (100–102, 200, 401), "Invalid params" (201–213), "Too many request" (601). @param {unknown} s */
const withingsAuthFailed=s=>s===100||s===101||s===102||s===200||s===401;
/** @param {unknown} s */
const withingsBusy=s=>s===601;
/** @param {unknown} s */
const withingsGrantRefused=s=>withingsAuthFailed(s)||(typeof s==='number'&&s>=201&&s<=213);
/** The provider's status in the app's words (its own error body is never passed on: it can quote the request back). @param {number} status */
function refused(status){
 if(status===401)return response({error:'TOKEN_EXPIRED'},401);
 if(status===403)return response({error:'PROVIDER_FORBIDDEN'},403);
 if(status===429)return response({error:'PROVIDER_BUSY'},429);
 return response({error:status>=500?'PROVIDER_UNAVAILABLE':'PROVIDER_REFUSED',status},502);
}
/** @type {ExportedHandler<LinkEnv>} */
const worker={async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(!Object.hasOwn(ROUTES,url.pathname))return response({error:'NOT_FOUND'},404);
 if(request.method!==ROUTES[url.pathname])return response({error:'METHOD_NOT_ALLOWED'},405);
 if(url.pathname==='/health')return response({ok:true});
 if(url.pathname==='/v1/fixture'){if(env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);return budgetOf(env).fetch(internal('/fixture',await boundedJSON(request,1024).catch(()=>({}))));}
 if(!configured(env))return response({error:'HEALTH_LINK_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 if(paused(env))return response({error:'HEALTH_LINK_PAUSED'},503);
 const verified=await verifySession(request,env);if('response' in verified)return verified.response;
 const account=verified.account.toLowerCase();
 if(url.pathname==='/v1/config')return response(publicConfig(env));
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
 let body;try{body=await boundedJSON(request,LIMITS.requestBytes);}catch(error){return error instanceof Error&&error.message==='size'?response({error:'REQUEST_TOO_LARGE'},413):response({error:'INVALID_REQUEST'},400);}
 const provider=body?.provider;
 if(!isProvider(provider)||!enabled(env,provider))return response({error:'PROVIDER_NOT_CONFIGURED'},404);
 const now=Date.now();
 if(url.pathname==='/v1/token'||url.pathname==='/v1/refresh'){
  const grant=url.pathname==='/v1/token'
   ?(typeof body.code==='string'&&/^[A-Za-z0-9._~+/=-]{4,2048}$/.test(body.code)?{code:body.code,...(typeof body.verifier==='string'&&/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier)?{verifier:body.verifier}:{})}:null)
   :(typeof body.refreshToken==='string'&&/^[A-Za-z0-9._~+/=-]{8,4000}$/.test(body.refreshToken)?{refreshToken:body.refreshToken}:null);
  if(!grant)return response({error:'INVALID_REQUEST'},400);
  const result=await call(env,ctx,account,provider,tokenRequest(env,provider,grant));
  if(result instanceof Response)return result;
  const tokens=result.status<300?tokensFrom(provider,result.json,now):null;
  if(tokens)return response(tokens);
  // invalid_grant (an expired or reused code or refresh token) means: connect again. Withings says so in its own status;
  // its "too many requests" is a pause, not a refusal, so the tokens are kept.
  if(provider==='withings'&&result.status<300){const s=/** @type {any} */(result.json)?.status;return withingsBusy(s)?response({error:'PROVIDER_BUSY'},429):withingsGrantRefused(s)?response({error:'RECONNECT_REQUIRED'},409):response({error:'PROVIDER_REFUSED',status:typeof s==='number'?s:null},502);}
  return result.status===400||result.status===401?response({error:'RECONNECT_REQUIRED'},409):refused(result.status);
 }
 if(url.pathname==='/v1/data'){
  if(typeof body.request!=='string'||typeof body.accessToken!=='string')return response({error:'INVALID_REQUEST'},400);
  const upstream=namedRequest(body.request,provider,body.params,body.accessToken);
  if(!upstream)return response({error:'INVALID_REQUEST'},400);
  const result=await call(env,ctx,account,provider,upstream);
  if(result instanceof Response)return result;
  if(result.status>=300)return refused(result.status);
  // Withings answers 200 with its own status: 0 is success; 401 means the token expired.
  if(provider==='withings'){const s=/** @type {any} */(result.json)?.status;if(withingsAuthFailed(s))return response({error:'TOKEN_EXPIRED'},401);if(withingsBusy(s))return response({error:'PROVIDER_BUSY'},429);if(s!==0)return response({error:'PROVIDER_REFUSED',status:typeof s==='number'?s:null},502);}
  return response({data:result.json});
 }
 if(url.pathname==='/v1/register'){
  if(provider!=='polar'||typeof body.accessToken!=='string'||typeof body.memberId!=='string'||!/^[A-Za-z0-9-]{8,64}$/.test(body.memberId))return response({error:'INVALID_REQUEST'},400);
  const result=await call(env,ctx,account,provider,polarRegistration(body.accessToken,body.memberId));
  if(result instanceof Response)return result;
  // 409: already registered with ZIGoals' client; both mean the data can be read.
  return result.status<300||result.status===409?response({ok:true}):refused(result.status);
 }
 const userId=typeof body.userId==='string'&&/^\d{1,20}$/.test(body.userId)?body.userId:undefined;
 if(provider==='withings'){
  if(!userId)return response({ok:false,reason:'NOT_OFFERED'});
  const nonce=await call(env,ctx,account,provider,await withingsNonceRequest(env,now));
  if(nonce instanceof Response)return nonce;
  const value=/** @type {any} */(nonce.json)?.status===0?/** @type {any} */(nonce.json)?.body?.nonce:null;
  if(typeof value!=='string'||!/^[A-Za-z0-9._-]{1,200}$/.test(value))return response({ok:false});
  const revoked=await call(env,ctx,account,provider,await withingsRevokeRequest(env,value,userId));
  if(revoked instanceof Response)return revoked;
  return response({ok:revoked.status<300&&/** @type {any} */(revoked.json)?.status===0});
 }
 const revoke=revokeRequest(env,provider,typeof body.accessToken==='string'?body.accessToken:'',userId);
 if(!revoke)return response({ok:false,reason:'NOT_OFFERED'});
 const result=await call(env,ctx,account,provider,revoke);
 if(result instanceof Response)return result;
 return response({ok:result.status<300||result.status===401||result.status===404});
}};
export default worker;
