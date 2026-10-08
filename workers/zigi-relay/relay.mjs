import {UUID,providerConfigured} from '../push-reminders/verify.mjs';
import {positive} from './budget.mjs';
import {LIMITS} from './limits.mjs';
import {anthropicBody,anthropicStream,isAnthropic} from './anthropic.mjs';
/**
 * The relay's pure parts (Session V Part 17, ADR-014), apart from worker.mjs so that its module exports only the
 * handler and the budget object: who may use it, the body the provider gets, and the metered stream.
 * @typedef {import('./worker.mjs').RelayEnv} RelayEnv
 * @typedef {'ok'|'failure'|'neutral'} Outcome
 */
const ROLES=new Set(['system','user','assistant','tool']);
/** @param {RelayEnv} env */
export function upstreamUrl(env){try{const url=new URL(env.ZIGI_UPSTREAM_URL??'');return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash?url:null;}catch{return null;}}
/** Every value the relay needs, or false: it then answers 503 to everything but /health. @param {RelayEnv} env */
export function configured(env){
 return providerConfigured(env)&&!!upstreamUrl(env)&&!!env.ZIGI_UPSTREAM_KEY&&/^[A-Za-z0-9._:/-]{1,100}$/.test(env.ZIGI_MODEL??'')&&/^[\w .()-]{1,40}$/.test(env.ZIGI_PROVIDER_NAME??'')
  &&!!positive(env.ZIGI_DAILY_REQUESTS)&&!!positive(env.ZIGI_DAILY_TOKENS)&&!!positive(env.ZIGI_GLOBAL_DAILY_TOKENS)
  // Session X Part 9: the Anthropic upstream's thinking choice; absent means off. Anything else fails closed.
  &&(env.ZIGI_THINKING===undefined||env.ZIGI_THINKING==='off'||env.ZIGI_THINKING==='model-default');
}
/** Paused unless the switch is exactly "off": a missing or mistyped value fails closed. @param {RelayEnv} env */
export const paused=env=>env.ZIGI_KILL_SWITCH!=='off';
/** The invited accounts (a secret): account ids, separated by commas or spaces. @param {RelayEnv} env */
export const invited=env=>new Set((env.ZIGI_ALLOWLIST??'').split(/[\s,]+/).filter(id=>UUID.test(id)).map(id=>id.toLowerCase()));
/** @param {any} tool */
const validTool=tool=>!!tool&&typeof tool==='object'&&tool.type==='function'&&!!tool.function&&typeof tool.function==='object'&&typeof tool.function.name==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(tool.function.name)
 &&(tool.function.description===undefined||typeof tool.function.description==='string')&&(tool.function.parameters===undefined||(!!tool.function.parameters&&typeof tool.function.parameters==='object'&&!Array.isArray(tool.function.parameters)));
/** One message, with only the fields the wire defines for its role. @param {any} m */
function message(m){
 if(!m||typeof m!=='object'||!ROLES.has(m.role))return null;
 const content=m.content===null||typeof m.content==='string'||Array.isArray(m.content)?m.content:undefined;
 if(content===undefined)return null;
 /** @type {Record<string,unknown>} */const out={role:m.role,content};
 if(m.role==='assistant'&&Array.isArray(m.tool_calls))out.tool_calls=m.tool_calls;
 if(m.role==='tool'){if(typeof m.tool_call_id!=='string')return null;out.tool_call_id=m.tool_call_id;}
 return out;
}
/**
 * The provider's request, rebuilt from the app's: the messages and tool definitions only; the model, the output cap
 * (at most LIMITS.maxOutputTokens), streaming with a usage chunk and, on OpenAI, store:false are the relay's. Null when
 * the body is not a chat. On Anthropic's address (Session X Part 9) the same checked chat goes out as a Messages API
 * request (anthropic.mjs). @param {any} body @param {RelayEnv} env @param {URL} url
 */
export function upstreamBody(body,env,url){
 if(!body||typeof body!=='object'||Array.isArray(body)||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>LIMITS.messages)return null;
 const messages=/** @type {(Record<string,unknown>|null)[]} */(body.messages.map(message));if(messages.some(m=>m===null))return null;
 if(body.tools!==undefined&&(!Array.isArray(body.tools)||body.tools.length>LIMITS.tools||!body.tools.every(validTool)))return null;
 const asked=[body.max_completion_tokens,body.max_tokens].find(n=>Number.isSafeInteger(n)&&n>0)??LIMITS.maxOutputTokens,cap=Math.min(asked,LIMITS.maxOutputTokens),openai=url.hostname==='api.openai.com';
 if(isAnthropic(url))return anthropicBody(/** @type {Record<string,any>[]} */(messages),body.tools,env,cap);
 /** @type {Record<string,unknown>} */const out={model:env.ZIGI_MODEL,stream:true,stream_options:{include_usage:true},messages,...(openai?{max_completion_tokens:cap,store:false}:{max_tokens:cap})};
 if(body.tools?.length)out.tools=body.tools.map(/** @param {any} t */t=>({type:'function',function:{name:t.function.name,...(t.function.description!==undefined?{description:t.function.description}:{}),...(t.function.parameters!==undefined?{parameters:t.function.parameters}:{})}}));
 return out;
}
/** The tokens one SSE line reports (input plus output), or null. @param {string} line */
export function usageIn(line){
 if(!line.startsWith('data:')||!line.includes('"usage"'))return null;
 try{const u=JSON.parse(line.slice(5).trim())?.usage;return u&&Number.isSafeInteger(u.prompt_tokens)&&Number.isSafeInteger(u.completion_tokens)?u.prompt_tokens+u.completion_tokens:null;}catch{return null;}
}
const encoder=new TextEncoder();
const sseError=(/** @type {number} */code,/** @type {string} */message)=>encoder.encode(`data: ${JSON.stringify({error:{code,message}})}\n\n`);
/** Where the last complete event ends (after its blank line), or -1. @param {string} text */
export function lastBoundary(text){let end=-1;for(const match of text.matchAll(/\r?\n\r?\n/g))end=match.index+match[0].length;return end;}
/**
 * The provider's stream, passed through event by event as it arrives (a reply is never cut inside an event): past
 * LIMITS.responseBytes, or with one event longer than LIMITS.eventBytes, it ends with an error event; it ends after
 * LIMITS.streamTimeoutMs. The usage it reports settles the reservation once it ends, breaks off or the person stops it.
 * Nothing is kept: the text is only scanned for the usage line. With a translator (the Anthropic upstream), each complete
 * event is translated into the app's chunks first, the size limits count what is handed on, and the translator reports
 * the usage and whether the provider ended with an error event.
 * @param {ReadableStream<Uint8Array>} body @param {AbortController} controller @param {(used:number|null,outcome:Outcome)=>void} settle
 * @param {ReturnType<typeof anthropicStream>} [translator]
 */
export function metered(body,controller,settle,translator){
 const reader=body.getReader(),decoder=new TextDecoder();
 let bytes=0,pending='',used=/** @type {number|null} */(null),done=false;
 const timer=setTimeout(()=>controller.abort(),LIMITS.streamTimeoutMs);
 const finish=(/** @type {Outcome} */outcome)=>{if(done)return;done=true;clearTimeout(timer);if(translator){used=translator.used();if(outcome==='ok'&&translator.failed())outcome='failure';}settle(used,outcome);};
 /** Forwards complete events; false once the reply is too long. @param {string} text @param {ReadableStreamDefaultController<Uint8Array>} out */
 const forward=(text,out)=>{
  if(!text)return true;
  if(translator)text=text.split(/\r?\n\r?\n/).map(block=>block.trim()?translator.event(block):'').join('');
  if(!text)return true;
  const piece=encoder.encode(text);
  if(bytes+piece.length>LIMITS.responseBytes)return false;
  bytes+=piece.length;
  if(!translator)for(const line of text.split(/\r?\n/)){const n=usageIn(line.trim());if(n!==null)used=n;}
  out.enqueue(piece);return true;
 };
 // The provider's body is let go without waiting: a cancel can take as long as the provider's connection does.
 const tooLong=(/** @type {ReadableStreamDefaultController<Uint8Array>} */out)=>{reader.cancel().catch(()=>{});finish('neutral');out.enqueue(sseError(413,'The reply was longer than ZIGoals hosted allows.'));out.close();};
 return new ReadableStream({
  // A pull must hand on something or end: one that enqueues nothing is not called again, so it reads until a whole
  // event is ready (an event can arrive in several pieces).
  async pull(out){
   while(true){
    let part;
    try{part=await reader.read();}catch{finish('failure');out.enqueue(sseError(502,'The provider\'s reply broke off.'));out.close();return;}
    if(part.done){pending+=decoder.decode();if(!forward(pending,out)){tooLong(out);return;}finish('ok');out.close();return;}
    pending+=decoder.decode(part.value,{stream:true});
    const end=lastBoundary(pending);
    if(end>=0){const ready=pending.slice(0,end);pending=pending.slice(end);if(!forward(ready,out)){tooLong(out);return;}}
    if(pending.length>LIMITS.eventBytes){tooLong(out);return;}
    if(end>=0)return;
   }
  },
  cancel(){finish('neutral');reader.cancel().catch(()=>{});},
 });
}
