import {test,expect,vi,afterEach} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {cancelQuota,clientBucket,clientKeyRow,dayRow,utcDay} from './market-client-limits';
import {POST} from '../../app/api/market-quotes/cancel/route';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn()}));
afterEach(()=>{vi.restoreAllMocks();});
// Session S Part 8a: new cancellation fences (`cancel-followers`) are committed rows, so on the public Alpha they are bounded
// like other public work: refused with no write once the day's row budget is spent, and limited per day in all and per
// client bucket. Replays and the removal of matching live followers are never refused. The real account authority runs
// in process; nothing leaves it.
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();writes=0;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.writes++;this.rows.set(key,structuredClone(value));}
 async delete(key:string){this.writes++;this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{let release!:()=>void;const previous=this.gate;this.gate=new Promise(r=>{release=r;});await previous;const tx=new Storage();tx.rows=structuredClone(this.rows);try{const result=await fn(tx);this.rows=tx.rows;this.writes+=tx.writes;return result;}finally{release();}}
}
const policy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:1,monthly:10},optionalCeiling:{minute:5,monthly:50},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000};
const NOW=Date.UTC(2026,9,4,12);
const work=(id:string)=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
// A row budget of 1,024 (the policy minimum is 1,000) gives a fence quota of 16 a day, and 2 per client bucket.
function setup(dailyRowBudget=1024){const storage=new Storage();return {storage,account:new DurableMarketAccount(storage,()=>NOW,JSON.stringify({policy,month:{id:'synthetic',start:NOW-1000,end:NOW+86400000},quoteCost:3,leaseMs:10000,maxAttempts:16,maxWorks:8,dailyRowBudget}))};}
const cancel=(cancelToken:string,client?:string)=>({action:'cancel-followers',cancelToken,...(client?{client}:{})});
const snapshot=(storage:Storage)=>JSON.stringify([...storage.rows]);

test('the quota derives from the row budget: a 64th in all, an eighth of that per client bucket, at least 1',()=>{
 expect(cancelQuota(20000)).toEqual({total:312,client:39});expect(cancelQuota(1024)).toEqual({total:16,client:2});expect(cancelQuota(1)).toEqual({total:1,client:1});
});

test('one client bucket gets its daily share of new fences; replays and other clients still succeed; a refusal writes nothing',async()=>{
 const {account,storage}=setup(),first=crypto.randomUUID();
 // A fixed daily key, so the two groups below are known to fall in different buckets.
 const key='ab'.repeat(32);storage.rows.set(clientKeyRow,{day:utcDay(NOW),key});
 expect(await clientBucket(key,'v4:192.0.2.1')).not.toBe(await clientBucket(key,'v4:198.51.100.2'));
 expect(await account.apply(cancel(first,'v4:192.0.2.1'))).toEqual({ok:true});
 expect(await account.apply(cancel(crypto.randomUUID(),'v4:192.0.2.1'))).toEqual({ok:true});
 const before=snapshot(storage),writes=storage.writes;
 expect(await account.apply(cancel(crypto.randomUUID(),'v4:192.0.2.1'))).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
 expect(snapshot(storage)).toBe(before);expect(storage.writes).toBe(writes);
 // A replay of an existing fence is answered without a new row.
 expect(await account.apply(cancel(first,'v4:192.0.2.1'))).toEqual({ok:true});expect(snapshot(storage)).toBe(before);
 expect(await account.apply(cancel(crypto.randomUUID(),'v4:198.51.100.2'))).toEqual({ok:true});
 const day=storage.rows.get(dayRow(utcDay(NOW))) as {cancels:{n:number;buckets:Record<string,number>}};
 expect(day.cancels.n).toBe(3);expect(Object.values(day.cancels.buckets).sort()).toEqual([1,2]);
 // Only keyed buckets are stored, never an address or group.
 expect(JSON.stringify([...storage.rows])).not.toMatch(/192\.0\.2|198\.51\.100|v4:/);
 expect(Object.keys(day.cancels.buckets).every(b=>/^b[0-9a-f]{3}$/.test(b))).toBe(true);
});

test('cancels without a client count toward the day\'s total, which bounds every client',async()=>{
 const {account,storage}=setup();
 for(let i=0;i<16;i++)expect(await account.apply(cancel(crypto.randomUUID()))).toEqual({ok:true});
 const before=snapshot(storage);
 expect(await account.apply(cancel(crypto.randomUUID()))).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
 expect(await account.apply(cancel(crypto.randomUUID(),'v4:203.0.113.9'))).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
 expect(snapshot(storage)).toBe(before);expect((storage.rows.get('follower-cancellations') as unknown[])).toHaveLength(16);
});

test('a spent row budget refuses a new fence with no write, but a matching live follower is still removed',async()=>{
 const {account,storage}=setup(20000),token=crypto.randomUUID();
 await account.apply({action:'acquire',work:work('bitcoin')});
 const follower=await account.apply({action:'follow',work:work('bitcoin'),waitMs:1000,cancelToken:token});expect(follower).toMatchObject({ok:true,status:'WAITING'});
 const key=dayRow(utcDay(NOW));storage.rows.set(key,{...(storage.rows.get(key) as object),rows:20000});
 expect(await account.apply(cancel(crypto.randomUUID(),'v4:192.0.2.1'))).toEqual({ok:false,reason:'DAILY_LIMIT'});
 expect(await account.apply(cancel(token,'v4:192.0.2.1'))).toEqual({ok:false,reason:'DAILY_LIMIT'});
 // The follower that carried the token is gone even though no fence was written.
 expect(await account.apply({action:'inspect'})).toMatchObject({followers:0});
 expect((storage.rows.get('follower-cancellations') as unknown[]|undefined)??[]).toEqual([]);
});

test('a malformed client group is refused before anything is read',async()=>{
 const {account,storage}=setup();
 expect(await account.apply(cancel(crypto.randomUUID(),'198.51.100.2'))).toMatchObject({reason:'MALFORMED'});expect(storage.rows.size).toBe(0);
});

function bound(answer:()=>Response){
 const seen:Request[]=[];
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:async(request:Request)=>{seen.push(request);return answer();}}}} as never);
 return seen;
}
const post=(headers:Record<string,string>)=>POST(new Request('https://alpha.test/api/market-quotes/cancel',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({cancelToken:crypto.randomUUID()})}));

test('the cancel route names the client only from cf-connecting-ip; a caller-supplied header is never forwarded',async()=>{
 const seen=bound(()=>Response.json({ok:true}));
 expect((await post({'cf-connecting-ip':'192.0.2.7','x-market-client':'v4:203.0.113.1','x-market-caller':'friends'})).status).toBe(204);
 expect((await post({'x-market-client':'v4:203.0.113.1'})).status).toBe(204);
 expect((await post({'cf-connecting-ip':'127.0.0.1'})).status).toBe(204);
 expect(seen.map(r=>r.headers.get('x-market-client'))).toEqual(['v4:192.0.2.7',null,null]);
 // Session U Part 2e: the app's own caller label from its bindings (this runtime has no PRIVATE_SYNC), never the caller's.
 expect(seen.map(r=>r.headers.get('x-market-caller'))).toEqual(['public','public','public']);
 for(const request of seen)expect([...request.headers.keys()].sort()).toEqual(request.headers.has('x-market-client')?['content-type','x-market-caller','x-market-client']:['content-type','x-market-caller']);
});

test('a refused fence answers 503, as any unavailable cancellation',async()=>{
 bound(()=>Response.json({ok:false,reason:'FOLLOWER_LIMIT'}));
 const response=await post({'cf-connecting-ip':'192.0.2.7'});expect(response.status).toBe(503);expect(await response.text()).toBe('');
});
