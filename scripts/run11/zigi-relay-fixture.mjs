// ZIGoals hosted, the relay (Session V Part 17), in Miniflare: the real workers/zigi-relay/worker.mjs with its SQLite
// RelayBudget object, and every outbound call kept in this process. The account provider answers from the token's own
// subject, so invited and uninvited accounts can both sign in; the upstream is a MOCK chat provider that records each
// request it gets and answers with whatever the test sets. Every log line the runtime writes is captured (Miniflare's
// structured logs), with a second, tiny Worker that logs a known line as the proof that the capture works. Fictional
// accounts and a fake provider key only; nothing leaves the machine.
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureToken} from './private-runtime.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
// A fictional provider key, joined at run time so no key-shaped literal sits in the source (Session X Part 2).
export const RELAY_KEY=['sk','test','FAKE-relay-key'].join('-');
export const APP_ORIGIN='https://app.test',UPSTREAM='https://api.openai.com/v1/chat/completions',PROBE_LINE='LOG_PROBE_7f3a_capture_works';
export const INVITED='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',STRANGER='33333333-3333-4333-8333-333333333333';
let bundled;
async function bundle(){bundled??=(await build({entryPoints:[new URL('../../workers/zigi-relay/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text;return bundled;}
/** @param {Request} request */
const claims=request=>{try{return JSON.parse(Buffer.from(String(request.headers.get('authorization')).slice(7).split('.')[1],'base64url').toString());}catch{return null;}};
/** A streamed Chat Completions answer: each item one `data:` line (a string goes as it is), then `[DONE]`. @param {unknown[]} items */
export const sse=(...items)=>new Response(items.map(item=>typeof item==='string'?item:`data: ${JSON.stringify(item)}\n\n`).join('')+'data: [DONE]\n\n',{status:200,headers:{'content-type':'text/event-stream'}});
/** @param {string} content */
export const delta=content=>({id:'mock',object:'chat.completion.chunk',choices:[{index:0,delta:{content},finish_reason:null}]});
/** @param {number} input @param {number} output */
export const usage=(input,output)=>({id:'mock',object:'chat.completion.chunk',choices:[],usage:{prompt_tokens:input,completion_tokens:output,total_tokens:input+output}});
// Session X Part 9: Anthropic's Messages API as the MOCK provider (platform.claude.com, Streaming, read 2026-10-08).
export const ANTHROPIC='https://api.anthropic.com/v1/messages';
/** An Anthropic stream: each item one named event (`event:` and `data:` lines); a string goes as it is. No [DONE] on this wire. @param {unknown[]} items */
export const anthropicSse=(...items)=>new Response(items.map(item=>typeof item==='string'?item:`event: ${/** @type {any} */(item).type}\ndata: ${JSON.stringify(item)}\n\n`).join(''),{status:200,headers:{'content-type':'text/event-stream'}});
/** @param {number} input @param {{cacheWrite?:number,cacheRead?:number}} [cache] */
export const messageStart=(input,{cacheWrite=0,cacheRead=0}={})=>({type:'message_start',message:{id:'msg_mock',type:'message',role:'assistant',content:[],model:'claude-haiku-5-5',stop_reason:null,stop_sequence:null,usage:{input_tokens:input,cache_creation_input_tokens:cacheWrite,cache_read_input_tokens:cacheRead,output_tokens:1}}});
/** @param {number} index @param {string} text */
export const textBlock=(index,text)=>[{type:'content_block_start',index,content_block:{type:'text',text:''}},{type:'content_block_delta',index,delta:{type:'text_delta',text}},{type:'content_block_stop',index}];
/** @param {number} index @param {string} id @param {string} name @param {string[]} pieces */
export const toolBlock=(index,id,name,pieces)=>[{type:'content_block_start',index,content_block:{type:'tool_use',id,name,input:{}}},...pieces.map(partial_json=>({type:'content_block_delta',index,delta:{type:'input_json_delta',partial_json}})),{type:'content_block_stop',index}];
/** @param {string} stop @param {number} output */
export const messageEnd=(stop,output)=>[{type:'message_delta',delta:{stop_reason:stop,stop_sequence:null},usage:{output_tokens:output}},{type:'message_stop'}];
/**
 * @param {{bindings?:Record<string,string>,omit?:string[]}} [options]
 */
export async function relayRuntime({bindings={},omit=[]}={}){
 const upstream={/** @type {{headers:Record<string,string>,body:any}[]} */requests:[],/** @type {(body:any,n:number)=>Response|Promise<Response>} */reply:()=>sse(delta('MOCK hello'),usage(100,20))};
 /** @param {Request} request */
 const outbound=async request=>{
  const url=new URL(request.url);
  if(url.hostname==='fixture.supabase.co'){const c=claims(request);return !c||c.fixture_alias==='invalid'?Response.json({},{status:401}):Response.json({id:c.sub});}
  // The MOCK provider answers at whichever address the relay is configured with (OpenAI's by default; Anthropic's in
  // Session X Part 9's tests).
  if(url.href===vars.ZIGI_UPSTREAM_URL){const body=JSON.parse(await request.text());upstream.requests.push({headers:Object.fromEntries(request.headers),body});return upstream.reply(body,upstream.requests.length);}
  return new Response('unexpected host',{status:599});
 };
 /** @type {Record<string,string>} */
 const vars={AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN,ZIGI_UPSTREAM_URL:UPSTREAM,ZIGI_UPSTREAM_KEY:RELAY_KEY,ZIGI_PROVIDER_NAME:'OpenAI',ZIGI_MODEL:'gpt-6-luna',ZIGI_ALLOWLIST:`${INVITED}, ${OTHER}`,ZIGI_KILL_SWITCH:'off',ZIGI_DAILY_REQUESTS:'5',ZIGI_DAILY_TOKENS:'20000',ZIGI_GLOBAL_DAILY_TOKENS:'30000',ISOLATED_FIXTURE:'true',...bindings};
 for(const name of omit)delete vars[name];
 /** @type {string[]} */const logs=[];
 const persist=await mkdtemp(join(tmpdir(),'zigoals-relay-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'run11-zigi-relay',modules:true,script:await bundle(),compatibilityDate:'2026-09-13',durableObjects:{ZIGI_BUDGET:{className:'RelayBudget',useSQLite:true}},bindings:vars,outboundService:outbound},
  {name:'log-probe',modules:true,script:`export default {fetch(){console.log(${JSON.stringify(PROBE_LINE)});return new Response('ok');}};`,compatibilityDate:'2026-09-13'},
 ],durableObjectsPersist:persist}),resourcePersistencePath:persist,handleStructuredLogs:/** @param {{message:string}} log */log=>{logs.push(String(log.message));}});
 /**
  * @param {string} path
  * @param {{account?:string,token?:string|null,body?:unknown,method?:string,headers?:Record<string,string>}} [options]
  */
 const call=(path,{account=INVITED,token='fixture',body,method,headers={}}={})=>mf.dispatchFetch('https://relay.test'+path,{method:method??(body===undefined?'GET':'POST'),headers:{origin:APP_ORIGIN,...(token===null?{}:{authorization:'Bearer '+fixtureToken(token,account)}),'x-zigoals-account':account,'content-type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 /** The fixture clock of the budget object. @param {number} now */
 const clock=async now=>(await call('/v1/fixture',{body:{now}})).json();
 const probe=async()=>{const worker=await mf.getWorker('log-probe');await (await worker.fetch('https://probe.test/')).text();};
 return {mf,call,clock,probe,upstream,logs,dispose:()=>mf.dispose()};
}
