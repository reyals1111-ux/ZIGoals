import {test,expect,vi} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {dispatchDurableQuotes} from './durable-quote-dispatch';
const now=Date.parse('2026-09-23T12:00:00Z');
const pair=(id:string)=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const});
const policy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:1,monthly:10},optionalCeiling:{minute:5,monthly:50},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:9000};
export const config={policy,month:{id:'fixture',start:now-1000,end:now+100000},quoteCost:3,leaseMs:10000,maxAttempts:16,maxWorks:16};
class Memory implements AtomicMarketStorage{rows=new Map<string,unknown>();async get<T>(k:string){return structuredClone(this.rows.get(k)) as T|undefined;}async put(k:string,v:unknown){this.rows.set(k,structuredClone(v));}async transaction<T>(f:(s:AtomicMarketStorage)=>Promise<T>):Promise<T>{return f(this);}}
function setup(){const account=new DurableMarketAccount(new Memory(),()=>now,JSON.stringify(config));return {account,command:(c:unknown)=>account.apply(c)};}
test('durably marks before actual I/O; independent Bitcoin survives failed ZIG and fresh cache costs nothing',async()=>{
 const {account,command}=setup();const fetcher=vi.fn(async(input:RequestInfo|URL)=>{expect(await account.apply({action:'inspect'})).toMatchObject({dispatched:1});const id=new URL(String(input)).searchParams.get('ids');return id==='bitcoin'?new Response('{"bitcoin":{"usd":1.23456789123456789,"last_updated_at":'+now/1000+'}}',{headers:{'content-type':'application/json'}}):new Response('private body',{status:503});});
 const result=await dispatchDurableQuotes([pair('bitcoin'),pair('zignaly')],{command,key:'fixture-key',fetcher,clock:()=>now});expect(result.quotes[0]?.price).toBe('123456789123456789');expect(result.results.map(r=>r.failure)).toEqual([null,'UPSTREAM_5XX']);expect(result.degraded).toBe(true);expect(JSON.stringify(result)).not.toContain('private body');expect(await command({action:'inspect'})).toMatchObject({chargedCredits:6,dispatched:0});
 await dispatchDurableQuotes([pair('bitcoin')],{command,key:'fixture-key',fetcher,clock:()=>now});expect(fetcher).toHaveBeenCalledTimes(2);
});
test('missing credential, denial and unsupported RWA never dispatch provider I/O',async()=>{
 const {command}=setup(),fetcher=vi.fn();expect((await dispatchDurableQuotes([pair('bitcoin')],{command,fetcher,clock:()=>now})).results[0]?.failure).toBe('AUTHENTICATION');
 const denied=await dispatchDurableQuotes([pair('bitcoin')],{command:async()=>({ok:false,reason:'POLICY_UNAVAILABLE'}),key:'fixture',fetcher,clock:()=>now});expect(denied.results[0]?.failure).toBe('LOCAL_BUDGET');
 const unsupported=await dispatchDurableQuotes([{marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'}],{command,key:'fixture',fetcher,clock:()=>now});expect(unsupported.results[0]?.failure).toBe('UNSUPPORTED');expect(fetcher).not.toHaveBeenCalled();
});
test('unconfirmed dispatch write must not send; unconfirmed settlement must not publish',async()=>{
 const fetcher=vi.fn(async()=>new Response('{"bitcoin":{"usd":1,"last_updated_at":'+now/1000+'}}',{headers:{'content-type':'application/json'}}));
 for(const failed of ['dispatch','settle']){const {command}=setup(),calls:unknown[]=[];const result=await dispatchDurableQuotes([pair('bitcoin')],{command:async c=>{calls.push(c);if((c as {action:string}).action===failed)throw Error('storage disconnected');return command(c);},key:'fixture',fetcher,clock:()=>now});expect(result.quotes).toEqual([]);expect(calls.some(c=>(c as {action:string}).action==='publish')).toBe(false);}
 expect(fetcher).toHaveBeenCalledTimes(1);
});
