import {test,expect} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {marketClientGroup} from './market-client-address';
import {clientBucket} from './market-client-limits';
// The batched account protocol (Session R1): one command per phase of a request, writes only on a real change,
// a measured daily row budget, fair per-client shares, and client data that is pseudonymous and short-lived.
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();writes=0;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.writes++;this.rows.set(key,structuredClone(value));}
 async delete(key:string){this.writes++;return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{let release!:()=>void;const previous=this.gate;this.gate=new Promise(r=>{release=r;});await previous;const tx=new Storage();tx.rows=structuredClone(this.rows);try{const result=await fn(tx);this.rows=tx.rows;this.writes+=tx.writes;return result;}finally{release();}}
}
/** The result fields these tests read. */
type Row={ok?:boolean;status?:string;reason?:string;lease?:unknown;follower?:string};
type Attempt={id:string;state:string};
type Reply=Record<string,unknown>&{reason?:string;results:Row[];attempts:Attempt[];followers:Row[];next:Attempt;rowsToday?:number};
const day0=Date.parse('2026-10-03T10:00:00Z');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:40,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:30,monthly:800},concurrent:1,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const quote=(id:string)=>({operation:'quote' as const,pair:{marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const}});
const history=(id:string)=>({operation:'history' as const,pair:{marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const},range:'1d' as const});
const price=(id:string,at:number)=>({base:{network:'coingecko-coin',denom:id,decimals:0},marketRef:quote(id).pair.marketRef,currency:'USD',price:'2',priceDecimals:0,source:'CoinGecko',providerAssetId:id,verification:'VERIFIED',observedAt:new Date(at).toISOString(),fetchedAt:new Date(at).toISOString()});
const chart=(id:string,at:number)=>({...history(id).pair,range:'1d',source:'CoinGecko',fetchedAt:new Date(at).toISOString(),points:[]});
function setup(overrides:Record<string,unknown>={}){
 const storage=new Storage();let now=day0;
 const account=new DurableMarketAccount(storage,()=>now,JSON.stringify({policy,calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,operationCosts:{history:4,insights:5,token:6},leaseMs:20000,maxAttempts:128,maxWorks:64,...overrides}));
 const apply=async(command:Record<string,unknown>)=>account.apply(JSON.parse(JSON.stringify(command))) as Promise<Reply>;
 const counted=async(command:Record<string,unknown>)=>{const before=storage.writes,result=await apply(command);return {result,writes:storage.writes-before};};
 return {storage,account,apply,counted,at:(n:number)=>{now=n;},now:()=>now};
}
/** One cold request in the new protocol: leases, admission and dispatch in one command; settle and publish in one. */
async function coldQuotes(s:ReturnType<typeof setup>,ids:string[],client?:string){
 const works=ids.map(quote),cold=await s.apply({action:'acquire-many',works,groups:[{charge:'quote',members:works.map((_,i)=>i)}],...(client?{client}:{})});
 return {works,cold};
}

test('acquire-many: a cached request writes nothing; a cold one leases, admits and dispatches in one command; a duplicate key is malformed',async()=>{
 const s=setup(),{works,cold}=await coldQuotes(s,['bitcoin','ethereum']);
 expect(cold.results.map(r=>r.status)).toEqual(['OWNER','OWNER']);expect(cold.attempts).toEqual([expect.objectContaining({ok:true,state:'DISPATCHED'})]);
 expect(await s.apply({action:'inspect'})).toMatchObject({dispatched:1,chargedCredits:3});
 const done=await s.counted({action:'complete',id:cold.attempts[0]!.id,outcome:'success',publish:works.map(work=>({work,value:price(work.pair.marketRef.id,s.now())}))});
 expect(done.result).toMatchObject({ok:true,published:[{ok:true},{ok:true}]});expect(done.writes).toBeGreaterThan(0);
 const warm=await s.counted({action:'acquire-many',works,groups:[{charge:'quote',members:[0,1]}]});
 expect(warm.result.results.map(r=>r.status)).toEqual(['CACHE_HIT','CACHE_HIT']);expect(warm.writes).toBe(0);
 expect((await s.apply({action:'acquire-many',works:[works[0],works[0]]})).reason).toBe('MALFORMED');
 expect((await s.apply({action:'acquire-many',works,groups:[{charge:'history',members:[0,1]}]})).reason).toBe('MALFORMED');
 expect((await s.apply({action:'acquire-many',works,groups:[{charge:'quote',members:[0]},{charge:'quote',members:[0,1]}]})).reason).toBe('MALFORMED');
});

test('a queued attempt polls with admit and writes nothing until it can move; complete starts the next group in the same transaction',async()=>{
 const s=setup(),busy=await coldQuotes(s,['bitcoin']);expect(busy.cold.attempts[0]!.state).toBe('DISPATCHED');
 const works=[history('ethereum'),history('solana')],queued=await s.apply({action:'acquire-many',works,groups:[{charge:'history',members:[0]},{charge:'history',members:[1]}]});
 expect(queued.attempts).toEqual([expect.objectContaining({state:'RESERVED',reason:'CONCURRENT_LIMIT'})]);
 const poll=await s.counted({action:'admit',id:queued.attempts[0]!.id});expect(poll.result).toMatchObject({ok:false,reason:'CONCURRENT_LIMIT'});expect(poll.writes).toBe(0);
 await s.apply({action:'complete',id:busy.cold.attempts[0]!.id,outcome:'success',publish:[{work:busy.works[0],value:price('bitcoin',s.now())}]});
 expect(await s.apply({action:'admit',id:queued.attempts[0]!.id})).toMatchObject({ok:true,state:'DISPATCHED'});
 const leases=queued.results.map(r=>r.lease);
 const finished=await s.apply({action:'complete',id:queued.attempts[0]!.id,outcome:'success',publish:[{work:works[0],value:chart('ethereum',s.now())}],next:{charge:'history',associations:[{work:works[1],lease:leases[1]}]}});
 expect(finished).toMatchObject({ok:true,published:[{ok:true}],next:{ok:true,state:'DISPATCHED'}});
 expect(await s.apply({action:'inspect'})).toMatchObject({dispatched:1,chargedCredits:3+4+4});
});

test('a failed ZIG price read starts its token fallback in the same complete, once',async()=>{
 const s=setup(),{works,cold}=await coldQuotes(s,['zignaly']);
 const failed=await s.apply({action:'complete',id:cold.attempts[0]!.id,outcome:'failure',category:'UPSTREAM_5XX',publish:[],fallback:true});
 expect(failed).toMatchObject({ok:true,next:{ok:true,state:'DISPATCHED'}});
 expect(await s.apply({action:'complete',id:cold.attempts[0]!.id,outcome:'failure',category:'UPSTREAM_5XX',publish:[],fallback:true})).toMatchObject({settled:{ok:true,replay:true},next:{ok:false,reason:'DUPLICATE_OPERATION'}});
 const zig={base:{network:'zigchain-1',denom:'uzig',decimals:6},marketRef:works[0]!.pair.marketRef,currency:'USD',price:'2',priceDecimals:0,source:'CoinGecko',providerAssetId:'zignaly',verification:'VERIFIED',observedAt:new Date(s.now()).toISOString(),fetchedAt:new Date(s.now()).toISOString()};
 expect(await s.apply({action:'complete',id:failed.next.id,outcome:'success',publish:[{work:works[0],value:zig}]})).toMatchObject({ok:true,published:[{ok:true}]});
 expect(await s.apply({action:'inspect'})).toMatchObject({chargedCredits:3+6,dispatched:0});
});

test('followers register with acquire-many, wait without writing, and see a publication made before their last poll',async()=>{
 const s=setup(),{works,cold}=await coldQuotes(s,['bitcoin']);
 const follower=await s.apply({action:'acquire-many',works,follow:{waitMs:1000}});expect(follower.results[0]).toMatchObject({status:'WAITING',follower:expect.any(String)});
 expect(await s.apply({action:'inspect'})).toMatchObject({followers:1});
 const id=follower.results[0]!.follower,waiting=await s.counted({action:'poll-many',followers:[{id,work:works[0]}]});
 expect(waiting.result.followers[0]).toMatchObject({status:'WAITING'});expect(waiting.writes).toBe(0);
 s.at(day0+900);await s.apply({action:'complete',id:cold.attempts[0]!.id,outcome:'success',publish:[{work:works[0],value:price('bitcoin',day0+900)}]});
 // The last poll lands after the registration's deadline: the publication still wins.
 s.at(day0+1000);const last=await s.apply({action:'poll-many',followers:[{id,work:works[0]}]});
 expect(last.followers[0]).toMatchObject({ok:true,status:'CACHE_HIT',quote:{price:'2'}});expect(await s.apply({action:'inspect'})).toMatchObject({followers:0});
 const cancelled=await coldQuotes(s,['ethereum']),token='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const waiter=await s.apply({action:'acquire-many',works:cancelled.works,follow:{waitMs:1000,cancelToken:token}});
 await s.apply({action:'cancel-followers',cancelToken:token});
 expect((await s.apply({action:'poll-many',followers:[{id:waiter.results[0]!.follower,work:cancelled.works[0]}],cancelToken:token})).followers[0]).toMatchObject({reason:'WAITER_CANCELLED'});
 expect(await s.apply({action:'acquire-many',works:cancelled.works,follow:{waitMs:1000,cancelToken:token}})).toMatchObject({results:[{reason:'WAITER_CANCELLED'}]});
 const left=await s.apply({action:'acquire-many',works:cancelled.works,follow:{waitMs:1000}});expect(await s.apply({action:'forget-many',ids:[left.results[0]!.follower]})).toMatchObject({ok:true});
 expect(await s.apply({action:'inspect'})).toMatchObject({followers:0});
});

test('the day\'s rows written are counted, and new cold work stops at the budget while cached prices keep serving',async()=>{
 const s=setup({dailyRowBudget:1000}),{works,cold}=await coldQuotes(s,['bitcoin']);
 await s.apply({action:'complete',id:cold.attempts[0]!.id,outcome:'success',publish:[{work:works[0],value:price('bitcoin',s.now())}]});
 const counted=await s.apply({action:'inspect'});expect(counted.rowsToday).toBe(s.storage.writes);expect(counted.dailyRowBudget).toBe(1000);
 const key='market-day:2026-10-03',row=s.storage.rows.get(key) as {rows:number};s.storage.rows.set(key,{...row,rows:1000});
 const refused=await s.counted({action:'acquire-many',works:[quote('ethereum')],groups:[{charge:'quote',members:[0]}]});
 expect(refused.result.results[0]).toMatchObject({ok:false,reason:'DAILY_LIMIT'});expect(refused.writes).toBe(0);
 expect((await s.apply({action:'acquire-many',works})).results[0]).toMatchObject({status:'CACHE_HIT'});
 expect(await s.apply({action:'enqueue-read',operation:'history'})).toMatchObject({ok:false,reason:'DAILY_LIMIT'});
 s.at(Date.parse('2026-10-04T00:00:01Z'));expect((await s.apply({action:'acquire-many',works:[quote('ethereum')],groups:[{charge:'quote',members:[0]}]})).results[0]).toMatchObject({status:'OWNER'});
});

test('one client\'s share: attempts in flight, works held and credits per day; another address is not affected',async()=>{
 const s=setup({policy:{...policy,concurrent:8,queueLimit:8},maxWorks:8}),a='v4:192.0.2.1',b='v4:198.51.100.7';
 // A fixed key of the day, so the addresses' buckets are known to differ (a random key collides 1 time in 4,096).
 const key={day:'2026-10-03',key:'11'.repeat(32)};s.storage.rows.set('market-client-key',key);
 expect(new Set(await Promise.all([a,b,'v6:2001:0db8:0001::/48','v4:203.0.113.1'].map(group=>clientBucket(key.key,group)))).size).toBe(4);
 // held works: half of maxWorks (4), counted over the request's cold keys.
 const five=['k1','k2','k3','k4','k5'].map(quote);
 const refused=await s.counted({action:'acquire-many',works:five,groups:[{charge:'quote',members:[0,1,2,3,4]}],client:a});
 expect(refused.result.results.every(r=>r.reason==='CLIENT_LIMIT')).toBe(true);expect(refused.writes).toBe(0);
 // attempts in flight: a quarter of queueLimit (2).
 for(const id of ['a1','a2'])expect((await coldQuotes(s,[id],a)).cold.attempts[0]).toMatchObject({state:'DISPATCHED'});
 expect((await coldQuotes(s,['a3'],a)).cold.results[0]).toMatchObject({reason:'CLIENT_LIMIT'});
 expect((await coldQuotes(s,['b1'],b)).cold.attempts[0]).toMatchObject({state:'DISPATCHED'});
 // credits per day: a 31st of the monthly operating credits (93/31 = 3), checked before each attempt.
 const t=setup({policy:{...policy,operating:{minute:40,monthly:93},optionalCeiling:{minute:30,monthly:60}},quoteCost:2}),client='v6:2001:0db8:0001::/48';
 t.storage.rows.set('market-client-key',key);
 const first=await coldQuotes(t,['c1'],client);expect(first.cold.attempts[0]).toMatchObject({state:'DISPATCHED'});
 await t.apply({action:'complete',id:first.cold.attempts[0]!.id,outcome:'success',publish:[{work:first.works[0],value:price('c1',t.now())}]});
 expect((await coldQuotes(t,['c2'],client)).cold.results[0]).toMatchObject({reason:'CLIENT_LIMIT'});
 expect((await coldQuotes(t,['c3'],'v4:203.0.113.1')).cold.attempts[0]).toMatchObject({state:'DISPATCHED'});
});

test('client data is pseudonymous and short-lived: no address or group is stored, day rows go after about 48 hours, the key changes daily',async()=>{
 const s=setup(),ip='192.0.2.55',group=marketClientGroup(ip)!;expect(group).toBe('v4:192.0.2.55');
 const first=await coldQuotes(s,['bitcoin'],group);await s.apply({action:'complete',id:first.cold.attempts[0]!.id,outcome:'success',publish:[{work:first.works[0],value:price('bitcoin',s.now())}]});
 const follower=await s.apply({action:'acquire-many',works:[quote('ethereum')],groups:[{charge:'quote',members:[0]}],client:group});expect(follower.attempts).toHaveLength(1);
 const waiting=await s.apply({action:'acquire-many',works:[quote('ethereum')],follow:{waitMs:1000},client:group});expect(waiting.results[0]!.follower).toBeTruthy();
 const stored=JSON.stringify([...s.storage.rows]);expect(stored).not.toContain(ip);expect(stored).not.toContain(group);expect(stored).not.toContain('192.0.2');
 const key1=(s.storage.rows.get('market-client-key') as {key:string}).key;expect(key1).toMatch(/^[0-9a-f]{64}$/);
 expect(Object.keys((s.storage.rows.get('market-day:2026-10-03') as {buckets:object}).buckets)).toEqual([expect.stringMatching(/^b[0-9a-f]{3}$/)]);
 // Three days later the first commit deletes the old day rows, and today's key is new.
 s.at(Date.parse('2026-10-04T12:00:00Z'));await coldQuotes(s,['solana'],group);
 s.at(Date.parse('2026-10-06T12:00:00Z'));await coldQuotes(s,['cardano'],group);
 expect([...s.storage.rows.keys()].filter(key=>key.startsWith('market-day:')).sort()).toEqual(['market-day:2026-10-06']);
 expect((s.storage.rows.get('market-client-key') as {day:string;key:string})).toMatchObject({day:'2026-10-06'});expect((s.storage.rows.get('market-client-key') as {key:string}).key).not.toBe(key1);
 expect(JSON.stringify([...s.storage.rows])).not.toContain('192.0.2');
});

test('the app\'s address groups: IPv4 as is, IPv6 by /48, IPv4-mapped as IPv4; loopback and garbage give none',()=>{
 expect(marketClientGroup('203.0.113.9')).toBe('v4:203.0.113.9');
 expect(marketClientGroup('2001:db8:1:2:3:4:5:6')).toBe('v6:2001:0db8:0001::/48');
 expect(marketClientGroup('2001:db8:1::9')).toBe('v6:2001:0db8:0001::/48');
 expect(marketClientGroup('::ffff:203.0.113.9')).toBe('v4:203.0.113.9');
 for(const value of ['127.0.0.1','::1','0.0.0.0','::','not-an-ip','999.1.1.1','1.2.3','',null,undefined])expect(marketClientGroup(value)).toBeNull();
});

test('cache-hit counts wait in memory and reach the aggregate with the next commit',async()=>{
 const s=setup({telemetry:{enabled:true,build:'batch-fixture',retentionHours:2}}),{works,cold}=await coldQuotes(s,['bitcoin']);
 await s.apply({action:'complete',id:cold.attempts[0]!.id,outcome:'success',publish:[{work:works[0],value:price('bitcoin',s.now())}]});
 for(let i=0;i<3;i++)expect((await s.counted({action:'acquire-many',works})).writes).toBe(0);
 expect(await s.apply({action:'inspect-metrics'})).toMatchObject({enabled:true,buckets:[{counts:{'cache.hit':3,'cache.miss':1,'dispatch.attempts':1,'outcome.VERIFIED':1}}]});
});
