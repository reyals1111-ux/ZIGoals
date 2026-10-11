import {boundedJSON,response,verifySession} from '../push-reminders/verify.mjs';
import {RelayBudget,inputEstimate} from './budget.mjs';
import {LIMITS} from './limits.mjs';
import {configured,invited,metered,paused,upstreamBody,upstreamUrl} from './relay.mjs';
import {anthropicHeaders,anthropicStream,isAnthropic} from './anthropic.mjs';
import {costMicros} from './pricing.mjs';
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
 * @typedef {{ZIGI_BUDGET:DurableObjectNamespace,AUTH_ORIGIN?:string,AUTH_PUBLIC_KEY?:string,APP_ORIGIN?:string,ZIGI_UPSTREAM_URL?:string,ZIGI_UPSTREAM_KEY?:string,ZIGI_PROVIDER_NAME?:string,ZIGI_MODEL?:string,ZIGI_ALLOWLIST?:string,ZIGI_KILL_SWITCH?:string,ZIGI_THINKING?:string,ZIGI_DAILY_REQUESTS?:string,ZIGI_DAILY_TOKENS?:string,ZIGI_GLOBAL_DAILY_TOKENS?:string,ZIGI_MONTHLY_REQUESTS?:string,ZIGI_DAILY_USD?:string,ZIGI_MONTHLY_USD?:string,ZIGI_GLOBAL_DAILY_USD?:string,ISOLATED_FIXTURE?:string}} RelayEnv
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
 // Session Z-Cloud Part 6: the system prompt is a cached text block now; its text counts as before.
 const input=inputEstimate(JSON.stringify(body.messages)+JSON.stringify(body.tools??[])+(typeof body.system==='string'?body.system:Array.isArray(body.system)?body.system.map(/** @param {any} b */b=>String(b.text??'')).join('\n'):''));
 // Session X P2.7: an Anthropic prompt stays below the provider's long-context price (LIMITS.anthropicInputTokens).
 if(isAnthropic(url)&&input>LIMITS.anthropicInputTokens)return response({error:'REQUEST_TOO_LARGE'},413);
 // Session Z-Cloud Part 6 (ADR-019 C40): money is reserved as the dearest the reply could be (the whole prompt written to
 // the cache, the whole output cap) and settled from the reply's own usage; a model without a price reserves none.
 const anthropic=isAnthropic(url),translator=anthropic?anthropicStream(String(env.ZIGI_MODEL)):undefined;
 const reserveMicros=costMicros(String(env.ZIGI_MODEL),{cacheWrite:input,output:cap})??0;
 const admitted=await budget.fetch(internal('/reserve',{account,id,tokens:input+cap,micros:reserveMicros}));
 if(!admitted.ok)return admitted;
 await admitted.body?.cancel().catch(()=>{});
 const settle=(/** @type {number|null} */used,/** @type {Outcome} */outcome)=>{const micros=used===0?0:translator?.cost()??null;ctx.waitUntil(budget.fetch(internal('/settle',{id,used,outcome,micros})).then(r=>r.body?.cancel()).catch(()=>{}));};
 const controller=new AbortController(),waiting=setTimeout(()=>controller.abort(),LIMITS.headerTimeoutMs);
 let upstream;
 const headers=anthropic?anthropicHeaders(env):{authorization:`Bearer ${env.ZIGI_UPSTREAM_KEY}`,'content-type':'application/json',accept:'text/event-stream'};
 const send=(/** @type {Record<string,unknown>} */payload)=>fetch(url.href,{method:'POST',headers,body:JSON.stringify(payload),redirect:'manual',signal:controller.signal});
 try{
  upstream=await send(body);
  // Session Z-Cloud Part 6 (Z-Local's rule): a model that rejects `output_config` (a 400 naming it) gets the same request
  // once more without it. Only the error's words are read, to decide; they are never passed on.
  if(anthropic&&upstream.status===400&&body.output_config){const said=await upstream.text().catch(()=>'');if(/output_config/.test(said.slice(0,4096))){const {output_config:_dropped,...rest}=body;void _dropped;upstream=await send(rest);}else upstream=new Response(null,{status:400});}
 }
 catch{clearTimeout(waiting);settle(0,'failure');return response({error:'UPSTREAM_UNAVAILABLE'},502);}
 clearTimeout(waiting);
 if(!upstream.ok||!upstream.body){
  // The provider's own error body is not passed on: it can quote the request back.
  await upstream.body?.cancel().catch(()=>{});
  const busy=upstream.status===429,failed=busy||upstream.status>=500||upstream.status===401||upstream.status===403;
  settle(0,failed?'failure':'neutral');
  return response({error:busy?'UPSTREAM_BUSY':failed?'UPSTREAM_UNAVAILABLE':'UPSTREAM_REFUSED',status:upstream.status},busy?429:502);
 }
 return new Response(metered(upstream.body,controller,settle,translator),{status:200,headers:{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
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
