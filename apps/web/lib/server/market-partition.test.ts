import {test,expect,vi,afterEach} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {publicRowCap} from './market-client-limits';
// Session U Part 2e: MARKET_POLICY.partition keeps the public Alpha inside its share of the day's rows, so it can never
// spend the acceptance app's ("friends") share. Without it, the caller label changes nothing at all.
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.rows.set(key,structuredClone(value));}
 async delete(key:string){return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{const tx=new Storage();tx.rows=structuredClone(this.rows);const result=await fn(tx);this.rows=tx.rows;return result;}
}
afterEach(()=>{vi.restoreAllMocks();});
const now=Date.parse('2026-10-05T10:00:00Z'),day='market-day:2026-10-05';
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const config=(extra:Record<string,unknown>={})=>JSON.stringify({policy,calendar:{timeZone:'UTC',confirmed:true},quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64,dailyRowBudget:1000,...extra});
const quote=(id:string)=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const request=(ids:string[],client:string)=>({action:'acquire-many',works:ids.map(quote),groups:[{charge:'quote',members:ids.map((_,i)=>i)}],client});
type Reply={ok?:boolean;results?:{ok?:boolean;status?:string;reason?:string}[];rowsToday?:number;publicRowsToday?:number;publicRowBudget?:number};

test('with a partition, the public caller stops at its share while the acceptance app keeps the rest',async()=>{
 const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,config({partition:{publicPercent:10}}));
 expect(publicRowCap(1000,10)).toBe(100);
 // A public commit counts its rows twice: in the day's total and in the public share.
 const first=await account.apply(request(['coin-a','coin-b'],'v4:192.0.2.1'),{caller:'public'}) as Reply;
 expect(first.results!.map(r=>r.status)).toEqual(['OWNER','OWNER']);
 const after=storage.rows.get(day) as {rows:number;publicRows:number};
 expect(after.publicRows).toBe(after.rows);expect(after.rows).toBeGreaterThan(0);
 // A friends commit counts only toward the total.
 await account.apply(request(['coin-c'],'v4:192.0.2.2'),{caller:'friends'});
 const both=storage.rows.get(day) as {rows:number;publicRows:number};
 expect(both.publicRows).toBe(after.publicRows);expect(both.rows).toBeGreaterThan(after.rows);
 expect(await account.apply({action:'inspect'})).toMatchObject({rowsToday:both.rows,publicRowsToday:both.publicRows,publicRowBudget:100,dailyRowBudget:1000});
 // The public share is spent: public cold work is refused without a write; the acceptance app is still admitted.
 storage.rows.set(day,{...both,rows:950,publicRows:100});
 const refused=await account.apply(request(['coin-d'],'v4:192.0.2.3'),{caller:'public'}) as Reply;
 expect(refused.results).toEqual([{ok:false,reason:'DAILY_LIMIT',quote:null}]);
 expect((storage.rows.get(day) as {rows:number}).rows).toBe(950);
 // Unlabelled is public.
 expect((await account.apply(request(['coin-d'],'v4:192.0.2.3')) as Reply).results).toEqual([{ok:false,reason:'DAILY_LIMIT',quote:null}]);
 expect((await account.apply(request(['coin-d'],'v4:192.0.2.4'),{caller:'friends'}) as Reply).results!.map(r=>r.status)).toEqual(['OWNER']);
 // The whole budget is spent: everyone is refused.
 storage.rows.set(day,{...(storage.rows.get(day) as object),rows:1000});
 expect((await account.apply(request(['coin-e'],'v4:192.0.2.5'),{caller:'friends'}) as Reply).results).toEqual([{ok:false,reason:'DAILY_LIMIT',quote:null}]);
});

test('without a partition the label changes nothing but the public cold-work count (Part 2f): otherwise byte-identical storage',async()=>{
 const run=async(caller:'public'|'friends'|undefined)=>{
  let n=0;vi.spyOn(crypto,'randomUUID').mockImplementation(()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}` as `${string}-${string}-${string}-${string}-${string}`);
  vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint8Array)=>{array.fill(7);return array;}) as unknown as typeof crypto.getRandomValues);
  const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,config());
  const replies=[];
  for(const [ids,client] of [[['coin-a','coin-b'],'v4:192.0.2.1'],[['coin-a'],'v4:192.0.2.2'],[['coin-c'],'v4:192.0.2.3']] as const)replies.push(await account.apply(request([...ids],client),caller?{caller}:{}));
  replies.push(await account.apply({action:'inspect'},caller?{caller}:{}));
  vi.restoreAllMocks();
  return {replies,rows:[...storage.rows.entries()].sort(([a],[b])=>a.localeCompare(b))};
 };
 const unlabelled=await run(undefined),pub=await run('public'),friends=await run('friends');
 expect(pub).toEqual(unlabelled);
 // Session U Part 2f: public callers' new works are counted (the cold-work cap); nothing else differs.
 const day=(r:typeof unlabelled)=>r.rows.find(([key])=>key.startsWith('market-day:'))![1] as Record<string,unknown>;
 expect(day(unlabelled).publicWorks).toBe(3);expect(day(friends)).not.toHaveProperty('publicWorks');
 const withoutCount=(r:typeof unlabelled)=>JSON.parse(JSON.stringify(r,(key,value)=>key==='publicWorks'||key==='publicWorksToday'?undefined:value));
 expect(withoutCount(friends)).toEqual(withoutCount(unlabelled));
 expect(JSON.stringify(unlabelled.rows)).not.toContain('publicRows');
 expect(unlabelled.replies.at(-1)).not.toHaveProperty('publicRowsToday');
});

test.each([[9],[91],[50.5],['50']])('partition.publicPercent %s is not a valid policy: every command is refused as POLICY_UNAVAILABLE',async publicPercent=>{
 const account=new DurableMarketAccount(new Storage(),()=>now,config({partition:{publicPercent}}));
 expect(await account.apply({action:'inspect'})).toEqual({ok:false,reason:'POLICY_UNAVAILABLE'});
});
