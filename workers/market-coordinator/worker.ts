import {DurableMarketAccount,marketPolicyWindowEnd,type AtomicMarketStorage} from '../../apps/web/lib/server/durable-market-account';
import {WorkerEntrypoint} from 'cloudflare:workers';
import {durableCatalog,durableHistory,durableInsights,parseDurableMarketBody} from '../../apps/web/lib/server/market-durable-data';
import {boundedQuoteText} from '../../apps/web/lib/market-quotes';
import {CATALOG_FRESH_MS} from '../../apps/web/lib/market-assets';
import {dispatchDurableQuotes} from '../../apps/web/lib/server/durable-quote-dispatch';
import {MARKET_CLIENT_GROUP} from '../../apps/web/lib/server/market-client-address';
import {MarketIsolateCache} from '../../apps/web/lib/server/market-isolate-cache';
import {sweepClientRows} from '../../apps/web/lib/server/market-client-limits';
/** Commands that carry provider evidence (up to 16 MB); every other command body is at most 64 KB. */
const evidenceCommands=['publish-data','complete'];
/** Internal durable account; the default Worker endpoint does not expose commands. */
/** The real storage has alarms; test wrappers around it may not, and then no sweep is armed. */
type AccountStorage=AtomicMarketStorage&{getAlarm?():Promise<number|null>;setAlarm?(time:number):Promise<void>};
/** Idle retention (Session S): at most every 6 hours on the real clock while client rows remain. */
const SWEEP_MS=6*3600000;
export class MarketAccount {
 private account:DurableMarketAccount;private storage:AccountStorage;private clock:()=>number;private sweepMs:number;private armed=false;
 constructor(state:{storage:AccountStorage},env:{MARKET_POLICY?:string;LOCAL_TEST_NOW?:string;ISOLATED_FIXTURE?:string;LOCAL_SWEEP_MS?:string}){
  this.storage=state.storage;this.clock=()=>env.ISOLATED_FIXTURE==='true'?Number(env.LOCAL_TEST_NOW):Date.now();
  const local=Number(env.LOCAL_SWEEP_MS);this.sweepMs=env.ISOLATED_FIXTURE==='true'&&Number.isSafeInteger(local)&&local>0?local:SWEEP_MS;
  this.account=new DurableMarketAccount(state.storage,this.clock,env.MARKET_POLICY);
 }
 /** Day rows and the client key are pruned by commits; this alarm also removes them when the object goes quiet. */
 async alarm(){if(await sweepClientRows(this.storage,this.clock())>0)await this.storage.setAlarm?.(Date.now()+this.sweepMs);}
 /** One storage read per object instance: an alarm is pending whenever the object may hold client rows. */
 private async armSweep(){if(this.armed||!this.storage.getAlarm||!this.storage.setAlarm)return;this.armed=true;if(await this.storage.getAlarm()===null)await this.storage.setAlarm(Date.now()+this.sweepMs);}
 async fetch(request:Request){
  await this.armSweep().catch(()=>{this.armed=false;});
  if(request.method!=='POST')return new Response(null,{status:405});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const chunks:Uint8Array[]=[];let total=0;const limit=request.headers.get('x-market-payload')==='evidence'?16*1024*1024:65536;
  for(;;){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.byteLength;if(total>limit){void reader.cancel().catch(()=>{});return new Response(null,{status:413});}chunks.push(chunk.value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  // Session U Part 2e: QuoteService's label of the calling app; anything but 'friends' is public.
  const caller=request.headers.get('x-market-caller')==='friends'?'friends':'public';
  try{const body=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes),command=JSON.parse(body);if(total>65536&&!evidenceCommands.includes(command?.action))return new Response(null,{status:413});return Response.json(await this.account.apply(command,{caller}),{headers:{'cache-control':'no-store'}});}catch{return Response.json({ok:false,reason:'MALFORMED'},{status:400});}
 }
}
const worker={fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});}};

// parseDurableMarketBody validates these payloads with zod, but its inferred return type
// collapses to {version:1} (subtype reduction of its conditional), so name them here.
type HistoryRequest=Parameters<typeof durableHistory>[0];type QuoteRequests=Parameters<typeof dispatchDurableQuotes>[0];
type QuoteEnv={MARKET_QUOTE_DISPATCH?:string;MARKET_ACCOUNT_ID?:string;MARKET_POLICY?:string;COINGECKO_DEMO_API_KEY?:string;ISOLATED_FIXTURE?:string;LOCAL_TEST_NOW?:string;MARKETS:{idFromName:(name:string)=>unknown;get:(id:unknown)=>{fetch:(request:Request)=>Promise<Response>}}};
/** This isolate's fresh evidence and last complete catalog (Session R1). Off under the fixture clock, whose evidence
 * times are not the isolate's. */
const isolateCache=new MarketIsolateCache();
let catalogText:{text:string;fetchedAt:number}|undefined;
/** Available only through an explicitly configured named service binding. The default
 * public endpoint above cannot reach provider dispatch or coordinator commands. */
export class QuoteService extends WorkerEntrypoint<QuoteEnv>{
 async fetch(request:Request){
  const headers={'cache-control':'no-store','content-type':'application/json'};
  if(this.env.MARKET_QUOTE_DISPATCH!=='durable-v1'||!this.env.MARKET_ACCOUNT_ID||!/^[a-zA-Z0-9_-]{1,80}$/.test(this.env.MARKET_ACCOUNT_ID))return Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503,headers});
  const path=new URL(request.url).pathname;
  if(request.method!=='POST'||!['/quotes','/catalog','/history','/insights','/cancel','/status'].includes(path)||new URL(request.url).search)return new Response(null,{status:404,headers});
  const stub=this.env.MARKETS.get(this.env.MARKETS.idFromName(this.env.MARKET_ACCOUNT_ID));
  // The app's address group for per-client limits. It is passed to the account, which stores only a keyed hash
  // bucket; it is never logged or returned. Checked before every path, cancellation included (Session S).
  const client=request.headers.get('x-market-client')??undefined;
  if(client!==undefined&&!MARKET_CLIENT_GROUP.test(client))return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});
  // Session U Part 2e: the calling app, labelled by the app from its own bindings (never from its caller's request):
  // 'friends' (the acceptance app) or 'public' (the public Alpha). Unlabelled is public; another value is refused.
  const label=request.headers.get('x-market-caller');
  if(label!==null&&label!=='public'&&label!=='friends')return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});
  const caller=label??'public';
  // Session U Part 2d: when this coordinator's MARKET_POLICY period ends, for the deploy summary and the owner's verifier.
  // Read from its own binding only: no account command, no provider read, nothing about usage.
  if(path==='/status'){const end=marketPolicyWindowEnd(this.env.MARKET_POLICY,this.env.ISOLATED_FIXTURE==='true'?Number(this.env.LOCAL_TEST_NOW):Date.now());return Response.json({version:1,policyWindowEnd:end===null?null:new Date(end).toISOString()},{headers});}
  if(path==='/cancel'){
   let token;try{const raw=JSON.parse(await boundedQuoteText(new Response(request.body),256));if(Object.keys(raw).length!==1||typeof raw.cancelToken!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(raw.cancelToken))throw Error();token=raw.cancelToken;}catch{return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});}
   return stub.fetch(new Request('https://coordinator.internal',{method:'POST',headers:{'x-market-caller':caller},body:JSON.stringify({action:'cancel-followers',cancelToken:token,...(client?{client}:{})})}));
  }
  const cancelToken=request.headers.get('x-market-cancel-token')??undefined;
  if(cancelToken&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cancelToken))return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});
  let body;try{const raw=JSON.parse(await boundedQuoteText(new Response(request.body),128*1024));body=parseDurableMarketBody(path,raw);}catch{return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});}
  const cached=this.env.ISOLATED_FIXTURE!=='true';
  if(path==='/catalog'&&cached&&catalogText&&Date.now()-catalogText.fetchedAt<CATALOG_FRESH_MS)return new Response(catalogText.text,{headers});
  const send=async(command:unknown)=>{const action=String((command as {action?:string}).action);const response=await stub.fetch(new Request('https://coordinator.internal',{method:'POST',headers:{'x-market-caller':caller,...(evidenceCommands.includes(action)?{'x-market-payload':'evidence'}:{})},body:JSON.stringify(command)}));if(!response.ok)throw Error('Coordinator unavailable.');return JSON.parse(await boundedQuoteText(response,['acquire','follow','poll','acquire-many','poll-many'].includes(action)?17*1024*1024:1024*1024)) as Record<string,unknown>;};
  const command=cached?isolateCache.wrap(send):send;
  const context={command,key:this.env.COINGECKO_DEMO_API_KEY,signal:request.signal,cancelToken,client};
  const result=path==='/catalog'?await durableCatalog(context):'request' in body?await durableHistory(body.request as HistoryRequest,context):'requests' in body?path==='/quotes'?await dispatchDurableQuotes(body.requests as QuoteRequests,context):await durableInsights(body.requests as QuoteRequests,context):null;
  if(path==='/catalog'&&cached&&result&&'assets' in result&&!result.error&&result.fetchedAt){const text=JSON.stringify(result);if(text.length<=16*1024*1024)catalogText={text,fetchedAt:Date.parse(result.fetchedAt)};return new Response(text,{headers});}
  return Response.json(result,{headers});
 }
}

export default worker;
