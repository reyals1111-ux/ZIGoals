/** Test entrypoint only. No production import, binding, flag or public control path. */
import {MarketAccount,QuoteService as ProductionQuoteService} from '../../workers/market-coordinator/worker';
import type {AtomicMarketStorage} from '../../apps/web/lib/server/durable-market-account';
export class QuoteService extends ProductionQuoteService {
 async fetch(request:Request){
  // This serial fixture gives the unmodified dispatcher the same clock as the DO.
  const previous=Date.now;Date.now=()=>Number((this.env as unknown as {LOCAL_TEST_NOW:string}).LOCAL_TEST_NOW);
  try{return await super.fetch(request);}finally{Date.now=previous;}
 }
}
const fixtureWorker={fetch(){return new Response(null,{status:404});}};
export default fixtureWorker;
type Plan={action:string;point:'after-write'|'after-commit';target:'budget'|'receipt'|'work'};
export class FaultAccount {
 constructor(private state:{storage:AtomicMarketStorage},private env:ConstructorParameters<typeof MarketAccount>[1]){}
 async fetch(request:Request){
  const storage=this.state.storage,path=new URL(request.url).pathname;
  if(path==='/test/arm'){await storage.put('test-plan',await request.json());return Response.json({ok:true});}
  if(path==='/test/report')return Response.json(await storage.get('test-report')??null);
  if(path==='/test/snapshot'){
   const {id}=await request.json() as {id:string};
   return Response.json({budget:await storage.get('budget'),receipt:await storage.get(`attempt:${id}`),works:await Promise.all(((await storage.get<string[]>('work-index'))??[]).map(async key=>[key,await storage.get(`work:${key}`)]))});
  }
  const command=await request.clone().json() as {action:string;id:string};
  const plan=await storage.get<Plan>('test-plan');
  if(!plan||plan.action!==command.action)return new MarketAccount(this.state,this.env).fetch(request);
  await storage.delete('test-plan'); // Claim once outside the transaction being interrupted.
  let hit=false;
  const matches=(key:string,value:unknown)=>{
   const status=({reserve:'RESERVED',own:'OWNED',dispatch:'DISPATCHED',settle:'SETTLED'} as Record<string,string>)[command.action];
   return plan.target==='budget'?key==='budget'&&(value as {reservations:Record<string,{status:string}>}).reservations[command.id]?.status===status:
    plan.target==='receipt'?key===`attempt:${command.id}`&&(value as {outcome?:string}).outcome!==undefined:key.startsWith('work:')&&(value as {evidence?:unknown}).evidence!==undefined;
  };
  const wrapped:AtomicMarketStorage={
   get:key=>storage.get(key),put:(key,value)=>storage.put(key,value),delete:key=>storage.delete(key),
   transaction:fn=>storage.transaction(async tx=>fn({...tx,get:key=>tx.get(key),delete:key=>tx.delete(key),transaction:fn=>tx.transaction(fn),put:async(key,value)=>{
    await tx.put(key,value);
    if(matches(key,value)){hit=true;if(plan.point==='after-write')throw Error('Synthetic interruption before transaction commit');}
   }})).then(result=>{if(hit&&plan.point==='after-commit')throw Error('Synthetic acknowledgement loss after transaction commit');return result;}),
  };
  const response=await new MarketAccount({storage:wrapped},this.env).fetch(request);
  await storage.put('test-report',{...plan,hit,action:command.action,id:command.id});
  return response;
 }
}
