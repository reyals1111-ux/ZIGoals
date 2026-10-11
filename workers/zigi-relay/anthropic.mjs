import {costMicros} from './pricing.mjs';
import {LIMITS} from './limits.mjs';
/**
 * The relay's Anthropic upstream (Session X Part 9, ADR-014 / ADR-016). Chosen only by the exact address
 * ANTHROPIC_MESSAGES. The app keeps speaking the OpenAI Chat Completions wire it already speaks to the relay; here the
 * relay translates to Anthropic's native Messages API and the stream back. Anthropic's OpenAI-compatible endpoint is
 * "not considered a long-term or production-ready solution for most use cases" (platform.claude.com, OpenAI SDK
 * compatibility, read 2026-10-08), so it is not used. Facts this file relies on (platform.claude.com, read 2026-10-08):
 * - POST https://api.anthropic.com/v1/messages with `x-api-key` and `anthropic-version: 2023-06-01` (Versions);
 * - one system text, then turns that start with the person's; tools as {name, description, input_schema}; a tool call
 *   is a `tool_use` block, its result a `tool_result` block in the next user turn; photos as base64 `image` blocks;
 * - `thinking: {type: "disabled"}` turns thinking off on models that accept it (Claude Haiku 5.5 at effort high or
 *   below; its default is medium); thinking tokens are billed as output tokens and count toward `max_tokens` (Thinking);
 * - the stream: message_start (usage), content blocks (content_block_start / _delta / _stop), message_delta (stop
 *   reason; "the token counts shown in the usage field of the message_delta event are cumulative"), message_stop; ping
 *   events anywhere; an `error` event such as overloaded_error; new event types may appear (Streaming).
 * Nothing is kept or logged: every event is read once, translated and handed on.
 *
 * Session Z-Cloud Part 6 (ADR-019 C40; Z-Local's handoff, Part 3 entry, owner follow-up 2): the body follows the app's own
 * Anthropic adapter (`apps/web/lib/ai/adapters/anthropic.ts`, Z-Local ADR-020 L2–L4), all in `anthropicBody` so the two
 * stay easy to align: no `thinking` field (Claude Sonnet 5.5 and Claude Opus 5.5 answer 400 to `disabled`; adaptive
 * thinking is their default), depth by `output_config.effort` ("low" for the quick reply, "high" for "Think deeper",
 * never per model; a model that rejects `output_config` gets the same request once more without it, worker.mjs), the
 * system prompt as one text block with `cache_control: {type: "ephemeral"}` and a top-level `cache_control` for the
 * automatic breakpoint on the conversation's last block (two of the four markers), and no `tool_choice` (forced choices
 * answer 400 on the 5.5 models). Only the models in ANTHROPIC_MODELS may be configured. The usage counts and the price
 * table (pricing.mjs, a copy of Z-Local's `lib/ai/pricing.ts`) cost each reply in micro-dollars.
 * @typedef {import('./worker.mjs').RelayEnv} RelayEnv
 */
export const ANTHROPIC_MESSAGES='https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION='2023-06-01';
/** The models the relay may be configured with on Anthropic's address: Claude Sonnet 5.5 (the default) and Claude Haiku 5.5. */
export const ANTHROPIC_MODELS=Object.freeze(['claude-sonnet-5-5','claude-haiku-5-5']);
/** The effort the app may ask for: the quick reply, or "Think deeper". @param {unknown} value @returns {'low'|'high'} */
export const effortOf=value=>value==='high'?'high':'low';
/** @param {URL} url */
export const isAnthropic=url=>url.href===ANTHROPIC_MESSAGES;
/** The headers Anthropic needs; the key never goes anywhere else. @param {RelayEnv} env */
export const anthropicHeaders=env=>({'x-api-key':String(env.ZIGI_UPSTREAM_KEY),'anthropic-version':ANTHROPIC_VERSION,'content-type':'application/json',accept:'text/event-stream'});

const IMAGE=/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const TOOL_ID=/^[A-Za-z0-9_-]{1,128}$/;
/** A message's words: a string, or text parts joined; null for anything else. @param {unknown} content */
function words(content){
 if(content===null)return '';
 if(typeof content==='string')return content;
 if(!Array.isArray(content))return null;
 const parts=content.map(/** @param {any} p */p=>p&&p.type==='text'&&typeof p.text==='string'?p.text:null);
 return parts.some(p=>p===null)?null:parts.join('\n');
}
/** A person's turn: words and photos (data addresses only; the relay never lets the provider fetch an address). @param {unknown} content */
function userBlocks(content){
 if(typeof content==='string')return content?[{type:'text',text:content}]:[];
 if(!Array.isArray(content))return null;
 /** @type {Record<string,unknown>[]} */const out=[];
 for(const p of content){
  if(p&&p.type==='text'&&typeof p.text==='string'){if(p.text)out.push({type:'text',text:p.text});}
  else if(p&&p.type==='image_url'&&typeof p.image_url?.url==='string'){const m=IMAGE.exec(p.image_url.url);if(!m)return null;out.push({type:'image',source:{type:'base64',media_type:m[1],data:m[2]}});}
  else return null;
 }
 return out;
}
/**
 * The Messages API request, rebuilt from the relay's own checked chat (relay.mjs upstreamBody): the system texts
 * joined into one cached block, the turns translated, the tools' schemas as they are; the model, the output cap, the
 * effort, caching and streaming are the relay's. Null when the chat cannot be expressed exactly.
 * @param {Record<string,any>[]} messages @param {any[]|undefined} tools @param {RelayEnv} env @param {number} cap
 * @param {'low'|'high'} [effort]
 */
export function anthropicBody(messages,tools,env,cap,effort='low'){
 /** @type {string[]} */const system=[];
 /** @type {{role:'user'|'assistant',content:Record<string,unknown>[]}[]} */const turns=[];
 /** Consecutive turns of one role become one, in order (a tool's results and the next words share the person's turn). @param {'user'|'assistant'} role @param {Record<string,unknown>[]} blocks */
 const add=(role,blocks)=>{if(!blocks.length)return;const last=turns.at(-1);if(last?.role===role)last.content.push(...blocks);else turns.push({role,content:[...blocks]});};
 for(const m of messages){
  if(m.role==='system'){const text=words(m.content);if(text===null)return null;if(text)system.push(text);continue;}
  if(m.role==='user'){const blocks=userBlocks(m.content);if(!blocks)return null;add('user',blocks);continue;}
  if(m.role==='assistant'){
   const text=words(m.content);if(text===null)return null;
   /** @type {Record<string,unknown>[]} */const blocks=text?[{type:'text',text}]:[];
   for(const call of Array.isArray(m.tool_calls)?m.tool_calls:[]){
    if(!call||call.type!=='function'||typeof call.id!=='string'||!TOOL_ID.test(call.id)||typeof call.function?.name!=='string')return null;
    let input;try{input=JSON.parse(typeof call.function.arguments==='string'&&call.function.arguments?call.function.arguments:'{}');}catch{return null;}
    if(!input||typeof input!=='object'||Array.isArray(input))return null;
    blocks.push({type:'tool_use',id:call.id,name:call.function.name,input});
   }
   add('assistant',blocks);continue;
  }
  if(m.role==='tool'){const text=words(m.content);if(text===null||!TOOL_ID.test(m.tool_call_id))return null;add('user',[{type:'tool_result',tool_use_id:m.tool_call_id,content:text}]);}
 }
 // The Messages API starts with the person's turn: a greeting the app keeps before the first question is left out.
 while(turns[0]?.role==='assistant'&&turns[0].content.every(b=>b.type==='text'))turns.shift();
 if(turns[0]?.role!=='user')return null;
 /** @type {Record<string,unknown>} */const out={model:env.ZIGI_MODEL,max_tokens:cap,stream:true,cache_control:{type:'ephemeral'},output_config:{effort},messages:turns};
 if(system.length)out.system=[{type:'text',text:system.join('\n'),cache_control:{type:'ephemeral'}}];
 if(tools?.length)out.tools=tools.map(t=>({name:t.function.name,...(t.function.description!==undefined?{description:t.function.description}:{}),input_schema:t.function.parameters??{type:'object',properties:{}}}));
 return out;
}

const FINISH=/** @type {Record<string,string>} */({end_turn:'stop',stop_sequence:'stop',pause_turn:'stop',max_tokens:'length',tool_use:'tool_calls',refusal:'content_filter'});
const count=(/** @type {unknown} */n)=>Number.isSafeInteger(n)&&/** @type {number} */(n)>=0?/** @type {number} */(n):null;
/**
 * Anthropic's stream in, the app's Chat Completions chunks out, one complete event at a time. The tokens used are known
 * only once a message_delta reports them (its counts are cumulative, so the last one wins); a reply that breaks off
 * before then reports none and keeps its reservation, as on the OpenAI wire. An `error` event becomes the relay's own
 * words (the provider's text is not passed on) and marks the reply failed.
 * @param {string} model
 */
export function anthropicStream(model){
 const created=Math.floor(Date.now()/1000);
 let id='relay',stop=/** @type {string|null} */(null),final=false,failed=/** @type {'busy'|'failed'|null} */(null),next=0;
 const usage={input:0,cacheWrite:0,cacheRead:0,output:0};
 /** @type {Map<number,number>} */const tools=new Map();
 /** @param {any} u */
 const apply=u=>{if(!u||typeof u!=='object')return;const i=count(u.input_tokens),w=count(u.cache_creation_input_tokens),r=count(u.cache_read_input_tokens),o=count(u.output_tokens);if(i!==null)usage.input=i;if(w!==null)usage.cacheWrite=w;if(r!==null)usage.cacheRead=r;if(o!==null)usage.output=o;};
 const line=(/** @type {unknown} */value)=>`data: ${JSON.stringify(value)}\n\n`;
 const chunk=(/** @type {Record<string,unknown>} */delta,/** @type {string|null} */finish=null)=>line({id,object:'chat.completion.chunk',created,model,choices:[{index:0,delta,finish_reason:finish}]});
 const prompt=()=>usage.input+usage.cacheWrite+usage.cacheRead;
 return {
  /** One complete event (its lines, without the blank line) → what the app receives; '' for events it does not need. @param {string} block */
  event(block){
   let data='';for(const raw of block.split(/\r?\n/))if(raw.startsWith('data:'))data+=raw.slice(5).trim();
   if(!data)return '';
   let e;try{e=JSON.parse(data);}catch{return '';}
   switch(e?.type){
    case 'message_start':if(typeof e.message?.id==='string')id=e.message.id;apply(e.message?.usage);return chunk({role:'assistant',content:''});
    case 'content_block_start':{
     const b=e.content_block;if(b?.type!=='tool_use'||!Number.isSafeInteger(e.index))return '';
     const index=next++;tools.set(e.index,index);
     return chunk({tool_calls:[{index,id:String(b.id),type:'function',function:{name:String(b.name),arguments:''}}]});
    }
    case 'content_block_delta':{
     const d=e.delta;
     if(d?.type==='text_delta'&&typeof d.text==='string'&&d.text)return chunk({content:d.text});
     if(d?.type==='input_json_delta'&&typeof d.partial_json==='string'&&d.partial_json&&tools.has(e.index))return chunk({tool_calls:[{index:tools.get(e.index),function:{arguments:d.partial_json}}]});
     return '';
    }
    case 'message_delta':if(typeof e.delta?.stop_reason==='string')stop=e.delta.stop_reason;if(e.usage&&typeof e.usage==='object'){apply(e.usage);if(count(e.usage.output_tokens)!==null)final=true;}return '';// Session X P2.7: final only with an output count (a usage object without one would settle with message_start's)
    case 'message_stop':return chunk({},FINISH[stop??'']??'stop')+(final?line({id,object:'chat.completion.chunk',created,model,choices:[],usage:{prompt_tokens:prompt(),completion_tokens:usage.output,total_tokens:prompt()+usage.output}}):'')+'data: [DONE]\n\n';
    case 'error':{
     failed=e.error?.type==='overloaded_error'||e.error?.type==='rate_limit_error'?'busy':'failed';
     return line({error:failed==='busy'?{code:503,message:'The provider is busy right now. Try again in a moment.'}:{code:502,message:'The provider\'s reply broke off.'}});
    }
    default:return '';// ping, content_block_stop, thinking deltas and events added later
   }
  },
  /** Tokens to settle with: input (with cache) plus output, once reported; else null. */
  used(){return final?prompt()+usage.output:null;},
  /** Session Z-Cloud Part 6: the reply's cost in micro-dollars from its four usage counts (pricing.mjs), once reported; else null. */
  cost(){return final?costMicros(model,usage):null;},
  /** Whether the provider ended the reply with an error event. */
  failed(){return failed;},
 };
}
/**
 * Session Z-Cloud Gate B (the relay's security read, ADR-019 C48): the most an Anthropic prompt can be billed as, for the
 * reservation, the money and the long-prompt guard (the reply then settles from its own usage). Words at two characters a
 * token (dense text, numbers and codes run well above the usual four) and every character outside ASCII as one; each
 * photo at LIMITS.imageTokens whatever its base64 size (a tiny file can be a large, dear picture); the provider's own
 * tool-use system prompt when tools go.
 * @param {{messages:{content:Record<string,unknown>[]}[],system?:{text?:unknown}[],tools?:unknown[]}} body
 * @returns {{tokens:number,images:number}}
 */
export function promptCeiling(body){
 let images=0;
 const turns=body.messages.map(t=>Array.isArray(t.content)?{...t,content:t.content.filter(b=>b?.type==='image'?(images++,false):true)}:t);
 const text=JSON.stringify(turns)+JSON.stringify(body.tools??[])+(body.system??[]).map(b=>String(b.text??'')).join('\n');
 let wide=0;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)>127)wide++;
 return {tokens:Math.ceil((text.length-wide)/2)+wide+images*LIMITS.imageTokens+(body.tools?.length?LIMITS.toolPromptTokens:0),images};
}
