/** Test entrypoint only. No production import, binding, flag or public control path.
 * Counts what each request costs the unchanged production account: Durable Object requests by action, and
 * storage reads, writes and deletes, including every write a transaction commits. */
import {MarketAccount,QuoteService} from '../../workers/market-coordinator/worker';
import type {AtomicMarketStorage} from '../../apps/web/lib/server/durable-market-account';
export {QuoteService};
const fixtureWorker={fetch(){return new Response(null,{status:404});}};
export default fixtureWorker;
type Counts={requests:number;actions:Record<string,number>;reads:number;writes:number;deletes:number};
const empty=():Counts=>({requests:0,actions:{},reads:0,writes:0,deletes:0});
type ListedStorage=AtomicMarketStorage&{list?:()=>Promise<Map<string,unknown>>};
export class CountingAccount {
 private counts=empty();
 private account:MarketAccount;
 constructor(private state:{storage:ListedStorage},env:ConstructorParameters<typeof MarketAccount>[1]){
  // A rolled-back transaction writes nothing, so its operations count only once it commits.
  const counted=(storage:AtomicMarketStorage,into:()=>Counts):AtomicMarketStorage=>({
   get:key=>{into().reads++;return storage.get(key);},
   put:(key,value)=>{into().writes++;return storage.put(key,value);},
   delete:key=>{into().deletes++;return storage.delete(key);},
   transaction:async fn=>{const local=empty(),result=await storage.transaction(tx=>fn(counted(tx,()=>local)));this.counts.reads+=local.reads;this.counts.writes+=local.writes;this.counts.deletes+=local.deletes;return result;},
  });
  this.account=new MarketAccount({storage:counted(state.storage,()=>this.counts)},env);
 }
 async fetch(request:Request){
  const path=new URL(request.url).pathname;
  if(path==='/test/counts'){const counts=this.counts;this.counts=empty();return Response.json(counts);}
  // Every stored row, for scans that prove what is never stored. Values only leave through this test route.
  if(path==='/test/rows')return Response.json(Object.fromEntries(await this.state.storage.list?.()??new Map()));
  this.counts.requests++;
  try{const action=String((await request.clone().json() as {action?:unknown}).action);this.counts.actions[action]=(this.counts.actions[action]??0)+1;}catch{/* counted as a request only */}
  return this.account.fetch(request);
 }
}
