import {DurableMarketAccount,type AtomicMarketStorage} from '../../apps/web/lib/server/durable-market-account';
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

export default worker;
