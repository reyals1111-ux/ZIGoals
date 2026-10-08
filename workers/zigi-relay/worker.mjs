import {boundedJSON,response,verifySession} from '../push-reminders/verify.mjs';
import {RelayBudget,reserveFor} from './budget.mjs';
import {LIMITS} from './limits.mjs';
import {configured,invited,metered,paused,upstreamBody,upstreamUrl} from './relay.mjs';
import {anthropicHeaders,anthropicStream,isAnthropic} from './anthropic.mjs';
export {RelayBudget};
/**
 * ZIGoals hosted, the relay (Session V Part 17, ADR-014; owner decision D2: off by default, never deployed by the
 * session). A stateless relay to ONE provider and model the owner configures, for invited accounts only:
 * - GET /health: the relay answers; nothing about its configuration.
 * - GET /v1/entitlement: whether this account may use it today ({entitled, provider, model, remaining}), or why not.
 * - POST /v1/chat: one streamed reply. The body is rebuilt here from the messages and the tool definitions only (the
 *   model, the output cap, streaming with usage and, for OpenAI, store:false are the relay's); the provider's stream is
 *   passed through as it arrives. Tools run in the person's browser; the relay never runs one.
 * Every call needs the app's origin and an account session verified exactly like the push and private-sync Workers do
 * (workers/push-reminders/verify.mjs: the bearer verified at the provider, the session claim, the account header).
 * The relay is paused unless ZIGI_KILL_SWITCH is exactly "off", and answers 503 until every value it needs is set.
 * Who may use it, the provider's body and the metered stream: relay.mjs; budgets and the breaker: budget.mjs; the
 * size caps: limits.mjs. Privacy: it never stores or logs a message or a
 * reply (there is no console call in this Worker, and observability is off in its configuration); only counts are kept.
 * Cloudflare itself processes the connection (addresses, headers) as it does for every Worker; nothing here keeps them.
 * @typedef {{ZIGI_BUDGET:DurableObjectNamespace,AUTH_ORIGIN?:string,AUTH_PUBLIC_KEY?:string,APP_ORIGIN?:string,ZIGI_UPSTREAM_URL?:string,ZIGI_UPSTREAM_KEY?:string,ZIGI_PROVIDER_NAME?:string,ZIGI_MODEL?:string,ZIGI_ALLOWLIST?:string,ZIGI_KILL_SWITCH?:string,ZIGI_THINKING?:string,ZIGI_DAILY_REQUESTS?:string,ZIGI_DAILY_TOKENS?:string,ZIGI_GLOBAL_DAILY_TOKENS?:string,ISOLATED_FIXTURE?:string}} RelayEnv
 * @typedef {'ok'|'failure'|'neutral'} Outcome
 */
const ROUTES=/** @type {Record<string,string>} */({'/health':'GET','/v1/entitlement':'GET','/v1/chat':'POST','/v1/fixture':'POST'});
/** @param {string} path @param {unknown} body */
const internal=(path,body)=>new Request('https://relay.internal'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
/** @param {RelayEnv} env */
const budgetOf=env=>env.ZIGI_BUDGET.get(env.ZIGI_BUDGET.idFromName('relay'));
/** @param {Request} request @param {RelayEnv} env @param {ExecutionContext} ctx @param {string} account */
async function chat(request,env,ctx,account){
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
 if(Number(request.headers.get('content-length')??0)>LIMITS.requestBytes)return response({error:'REQUEST_TOO_LARGE'},413);
 let parsed;try{parsed=await boundedJSON(request,LIMITS.requestBytes);}catch(error){return error instanceof Error&&error.message==='size'?response({error:'REQUEST_TOO_LARGE'},413):response({error:'INVALID_CHAT_REQUEST'},400);}
 const url=/** @type {URL} */(upstreamUrl(env)),body=upstreamBody(parsed,env,url);if(!body)return response({error:'INVALID_CHAT_REQUEST'},400);
 const id=crypto.randomUUID(),budget=budgetOf(env),cap=Number(body.max_completion_tokens??body.max_tokens);
 const admitted=await budget.fetch(internal('/reserve',{account,id,tokens:reserveFor(JSON.stringify(body.messages).length+JSON.stringify(body.tools??[]).length+(typeof body.system==='string'?body.system.length:0),cap)}));
 if(!admitted.ok)return admitted;
 await admitted.body?.cancel().catch(()=>{});
 const settle=(/** @type {number|null} */used,/** @type {Outcome} */outcome)=>{ctx.waitUntil(budget.fetch(internal('/settle',{id,used,outcome})).then(r=>r.body?.cancel()).catch(()=>{}));};
 const controller=new AbortController(),waiting=setTimeout(()=>controller.abort(),LIMITS.headerTimeoutMs);
 let upstream;
 const anthropic=isAnthropic(url),headers=anthropic?anthropicHeaders(env):{authorization:`Bearer ${env.ZIGI_UPSTREAM_KEY}`,'content-type':'application/json',accept:'text/event-stream'};
 try{upstream=await fetch(url.href,{method:'POST',headers,body:JSON.stringify(body),redirect:'manual',signal:controller.signal});}
 catch{clearTimeout(waiting);settle(0,'failure');return response({error:'UPSTREAM_UNAVAILABLE'},502);}
 clearTimeout(waiting);
 if(!upstream.ok||!upstream.body){
  // The provider's own error body is not passed on: it can quote the request back.
  await upstream.body?.cancel().catch(()=>{});
  const busy=upstream.status===429,failed=busy||upstream.status>=500||upstream.status===401||upstream.status===403;
  settle(0,failed?'failure':'neutral');
  return response({error:busy?'UPSTREAM_BUSY':failed?'UPSTREAM_UNAVAILABLE':'UPSTREAM_REFUSED',status:upstream.status},busy?429:502);
 }
 return new Response(metered(upstream.body,controller,settle,anthropic?anthropicStream(String(env.ZIGI_MODEL)):undefined),{status:200,headers:{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
/** @type {ExportedHandler<RelayEnv>} */
const relay={async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(!Object.hasOwn(ROUTES,url.pathname))return response({error:'NOT_FOUND'},404);
 if(request.method!==ROUTES[url.pathname])return response({error:'METHOD_NOT_ALLOWED'},405);
 if(url.pathname==='/health')return response({ok:true});
 if(url.pathname==='/v1/fixture'){if(env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);return budgetOf(env).fetch(internal('/fixture',await boundedJSON(request,1024).catch(()=>({}))));}
 if(!configured(env))return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 if(paused(env))return url.pathname==='/v1/entitlement'?response({entitled:false,reason:'paused'}):response({error:'HOSTED_PAUSED'},503);
 const verified=await verifySession(request,env);if('response' in verified)return verified.response;
 const account=verified.account.toLowerCase();
 if(!invited(env).has(account))return url.pathname==='/v1/entitlement'?response({entitled:false,reason:'not-invited'}):response({error:'NOT_INVITED'},403);
 if(url.pathname==='/v1/entitlement'){
  const left=await budgetOf(env).fetch(internal('/remaining',{account}));
  if(!left.ok)return left;
  return response({entitled:true,provider:env.ZIGI_PROVIDER_NAME,model:env.ZIGI_MODEL,remaining:await left.json()});
 }
 return chat(request,env,ctx,account);
}};
export default relay;
