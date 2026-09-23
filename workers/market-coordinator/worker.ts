import {DurableMarketAccount,type AtomicMarketStorage} from '../../apps/web/lib/server/durable-market-account';
import {WorkerEntrypoint} from 'cloudflare:workers';
import {marketRequestsSchema} from '../../apps/web/lib/market-assets';
import {boundedQuoteText} from '../../apps/web/lib/market-quotes';
import {dispatchDurableQuotes} from '../../apps/web/lib/server/durable-quote-dispatch';
/** Internal-only prototype. No public RPC, credentials, provider I/O or production binding. */
export class MarketAccount {
 private account:DurableMarketAccount;
 constructor(state:{storage:AtomicMarketStorage},env:{MARKET_POLICY?:string;LOCAL_TEST_NOW?:string;ISOLATED_FIXTURE?:string}){
  this.account=new DurableMarketAccount(state.storage,()=>env.ISOLATED_FIXTURE==='true'?Number(env.LOCAL_TEST_NOW):Date.now(),env.MARKET_POLICY);
 }
 async fetch(request:Request){
  if(request.method!=='POST')return new Response(null,{status:405});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const chunks:Uint8Array[]=[];let total=0;
  for(;;){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.byteLength;if(total>65536){void reader.cancel().catch(()=>{});return new Response(null,{status:413});}chunks.push(chunk.value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return Response.json(await this.account.apply(JSON.parse(body)),{headers:{'cache-control':'no-store'}});}catch{return Response.json({ok:false,reason:'MALFORMED'},{status:400});}
 }
}
const worker={fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});}};

type QuoteEnv={MARKET_QUOTE_DISPATCH?:string;MARKET_ACCOUNT_ID?:string;COINGECKO_DEMO_API_KEY?:string;MARKETS:{idFromName:(name:string)=>unknown;get:(id:unknown)=>{fetch:(request:Request)=>Promise<Response>}}};
/** Available only through an explicitly configured named service binding. The default
 * public endpoint above cannot reach provider dispatch or coordinator commands. */
export class QuoteService extends WorkerEntrypoint<QuoteEnv>{
 async fetch(request:Request){
  const headers={'cache-control':'no-store','content-type':'application/json'};
  if(this.env.MARKET_QUOTE_DISPATCH!=='durable-v1'||!this.env.MARKET_ACCOUNT_ID||!/^[a-zA-Z0-9_-]{1,80}$/.test(this.env.MARKET_ACCOUNT_ID))return Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503,headers});
  if(request.method!=='POST'||new URL(request.url).pathname!=='/quotes'||new URL(request.url).search)return new Response(null,{status:404,headers});
  let requests;try{const body=JSON.parse(await boundedQuoteText(new Response(request.body),128*1024));if(!body||body.version!==1||Object.keys(body).sort().join(',')!=='requests,version')throw Error('Version or fields');requests=marketRequestsSchema.parse(body.requests);}catch{return Response.json({error:'INVALID_MARKET_REQUEST'},{status:400,headers});}
  const stub=this.env.MARKETS.get(this.env.MARKETS.idFromName(this.env.MARKET_ACCOUNT_ID));
  const command=async(command:unknown)=>{const response=await stub.fetch(new Request('https://coordinator.internal',{method:'POST',body:JSON.stringify(command)}));if(!response.ok)throw Error('Coordinator unavailable.');return JSON.parse(await boundedQuoteText(response,1024*1024)) as Record<string,unknown>;};
  return Response.json(await dispatchDurableQuotes(requests,{command,key:this.env.COINGECKO_DEMO_API_KEY}),{headers});
 }
}

export default worker;
