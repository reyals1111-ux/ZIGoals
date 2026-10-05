import {test,expect,vi,afterEach} from 'vitest';
import {DurableMarketAccount,marketPolicies,marketPolicyAt,marketPolicyWindowEnds,type AtomicMarketStorage} from './durable-market-account';
// Session U follow-up F2 ([TIER 3] (market Worker)): MARKET_POLICY may carry the current billing window and the next one,
// installed in advance. The coordinator serves from the window that covers now and fails closed outside both; the daily
// row budget and the public cold-work cap are per UTC day, so they run on across the boundary. One policy alone behaves
// exactly as before.
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.rows.set(key,structuredClone(value));}
 async delete(key:string){return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{const tx=new Storage();tx.rows=structuredClone(this.rows);const result=await fn(tx);this.rows=tx.rows;return result;}
}
afterEach(()=>{vi.restoreAllMocks();});
const boundary=Date.parse('2026-10-31T16:00:00Z'),startA=Date.parse('2026-10-01T16:00:00Z'),endB=Date.parse('2026-11-30T16:00:00Z');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const base={policy,quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64,dailyRowBudget:1000,publicColdWorks:3};
const windowA={...base,month:{id:'period-2026-10-01',start:startA,end:boundary}};
const windowB={...base,month:{id:'period-2026-10-31',start:boundary,end:endB}};
const two=(a:object=windowA,b:object=windowB)=>JSON.stringify({windows:[a,b]});
const quote=(id:string)=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const request=(ids:string[],client:string)=>({action:'acquire-many',works:ids.map(quote),groups:[{charge:'quote',members:ids.map((_,i)=>i)}],client});
type Reply={ok?:boolean;reason?:string;results?:{ok?:boolean;status?:string;reason?:string}[];rowsToday?:number;publicWorksToday?:number;currentPeriodCredits?:number};
const statuses=(reply:unknown)=>(reply as Reply).results!.map(r=>r.status??r.reason);
/** Deterministic ids and keys, so two runs can be compared row for row. */
function deterministic(){let n=0;vi.spyOn(crypto,'randomUUID').mockImplementation(()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}` as `${string}-${string}-${string}-${string}-${string}`);vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint8Array)=>{array.fill(7);return array;}) as unknown as typeof crypto.getRandomValues);}

test('the two-window shape: each window a whole valid policy, exact windows, back to back, different labels',()=>{
 expect(marketPolicies(two())).toHaveLength(2);
 expect(marketPolicies(JSON.stringify(windowA))).toEqual([windowA]);
 for(const raw of [
  two(windowA,{...windowB,month:{...windowB.month,start:boundary+1}}),                  // a gap at the boundary
  two(windowA,{...windowB,month:{...windowB.month,start:boundary-1}}),                  // an overlap
  two(windowA,{...windowB,month:{...windowB.month,id:windowA.month.id}}),               // the same label
  two(windowB,windowA),                                                                 // the wrong order
  two(windowA,{...base,calendar:{timeZone:'UTC',confirmed:true}}),                      // a calendar month has no end to hand over
  two({...windowA,dailyRowBudget:10},windowB),                                          // a window that configSchema refuses
  JSON.stringify({windows:[windowA]}),JSON.stringify({windows:[windowA,windowB,windowB]}),JSON.stringify({windows:[windowA,windowB],note:'x'}),
  JSON.stringify([windowA,windowB]),'not json',undefined,
 ])expect(marketPolicies(raw)).toBeNull();
});

test('the next window serves from its start, the boundary included; outside both, the period check refuses',async()=>{
 const configs=marketPolicies(two())!;
 expect(marketPolicyAt(configs,boundary-1).month!.id).toBe('period-2026-10-01');
 expect(marketPolicyAt(configs,boundary).month!.id).toBe('period-2026-10-31');
 let now=boundary-60000;const account=new DurableMarketAccount(new Storage(),()=>now,two());
 expect(await account.apply({action:'inspect'})).toMatchObject({ok:true});
 now=boundary;expect(await account.apply({action:'inspect'})).toMatchObject({ok:true});
 now=endB-1;expect(await account.apply({action:'inspect'})).toMatchObject({ok:true});
 now=endB;expect(await account.apply({action:'inspect'})).toEqual({ok:false,reason:'CLOCK_OR_PERIOD'});
 expect(await new DurableMarketAccount(new Storage(),()=>startA-1,two()).apply({action:'inspect'})).toEqual({ok:false,reason:'CLOCK_OR_PERIOD'});
 for(const raw of [two(windowA,{...windowB,month:{...windowB.month,start:boundary+1}}),'not json'])expect(await new DurableMarketAccount(new Storage(),()=>boundary,raw).apply({action:'inspect'})).toEqual({ok:false,reason:'POLICY_UNAVAILABLE'});
});

test('the day\'s rows and public new works run on across the boundary: no fresh budget at 16:00 UTC',async()=>{
 let now=boundary-3600000;const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,two());
 expect(statuses(await account.apply(request(['coin-a','coin-b','coin-c'],'v4:192.0.2.1')))).toEqual(['OWNER','OWNER','OWNER']);
 const before=await account.apply({action:'inspect'}) as Reply;
 expect(before).toMatchObject({publicWorksToday:3});expect(before.rowsToday).toBeGreaterThan(0);
 now=boundary;
 const after=await account.apply({action:'inspect'}) as Reply;
 // Same UTC day, same counters; the provider's billing month starts again, as it does at CoinGecko.
 expect(after).toMatchObject({rowsToday:before.rowsToday,publicWorksToday:3,currentPeriodCredits:0});
 // The public cold-work cap (3) was spent before the boundary, so it stays spent after it.
 expect(statuses(await account.apply(request(['coin-d'],'v4:192.0.2.2')))).toEqual(['DAILY_LIMIT']);
 // The next UTC day starts a new count, as every day does.
 now=Date.parse('2026-11-01T00:00:01Z');
 expect(statuses(await account.apply(request(['coin-d'],'v4:192.0.2.2')))).toEqual(['OWNER']);
});

test('the automatic hand-over is the manual switch at the boundary, row for row',async()=>{
 const steps=[[boundary-7200000,['coin-a','coin-b'],'v4:192.0.2.1'],[boundary-1,['coin-c'],'v4:192.0.2.2'],[boundary,['coin-a','coin-d'],'v4:192.0.2.3'],[boundary+60000,['coin-e'],'v4:192.0.2.4']] as const;
 const run=async(policyAt:(now:number)=>string)=>{
  deterministic();const storage=new Storage(),replies=[];
  for(const [now,ids,client] of steps){const account=new DurableMarketAccount(storage,()=>now,policyAt(now));replies.push(await account.apply(request([...ids],client)),await account.apply({action:'inspect'}));}
  vi.restoreAllMocks();
  return {replies,rows:[...storage.rows.entries()].sort(([a],[b])=>a.localeCompare(b))};
 };
 const automatic=await run(()=>two()),manual=await run(now=>JSON.stringify(now<boundary?windowA:windowB));
 expect(automatic).toEqual(manual);
});

test('one policy alone is read exactly as before; a pair serves its first window exactly as that window alone would',async()=>{
 const calendar=JSON.stringify({...base,calendar:{timeZone:'UTC',confirmed:true}});
 expect(marketPolicyWindowEnds(calendar,boundary-1)).toEqual({policyWindowEnd:Date.parse('2026-11-01T00:00:00Z'),nextPolicyWindowEnd:null});
 expect(statuses(await new DurableMarketAccount(new Storage(),()=>boundary-1,calendar).apply(request(['coin-a'],'v4:192.0.2.1')))).toEqual(['OWNER']);
 expect(marketPolicyWindowEnds(JSON.stringify(windowA),boundary-1)).toEqual({policyWindowEnd:boundary,nextPolicyWindowEnd:null});
 const run=async(raw:string)=>{
  deterministic();const storage=new Storage(),account=new DurableMarketAccount(storage,()=>boundary-1,raw);
  const replies=[await account.apply(request(['coin-a','coin-b'],'v4:192.0.2.1')),await account.apply({action:'inspect'})];vi.restoreAllMocks();
  return {replies,rows:[...storage.rows.entries()].sort(([a],[b])=>a.localeCompare(b))};
 };
 expect(await run(two())).toEqual(await run(JSON.stringify(windowA)));
});

test('/status ends: the serving window and, until it starts, the next one',()=>{
 expect(marketPolicyWindowEnds(two(),boundary-1)).toEqual({policyWindowEnd:boundary,nextPolicyWindowEnd:endB});
 expect(marketPolicyWindowEnds(two(),boundary)).toEqual({policyWindowEnd:endB,nextPolicyWindowEnd:null});
 expect(marketPolicyWindowEnds(two(),endB+1)).toEqual({policyWindowEnd:endB,nextPolicyWindowEnd:null});
 expect(marketPolicyWindowEnds('{}',boundary)).toEqual({policyWindowEnd:null,nextPolicyWindowEnd:null});
});
