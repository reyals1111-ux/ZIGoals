import {test,expect} from 'vitest';
import {recordMarketTelemetry,readMarketTelemetry} from './market-telemetry';
import type {AtomicMarketStorage} from './durable-market-account';
const store=()=>{const rows=new Map<string,unknown>();return {rows,get:async<T>(key:string)=>structuredClone(rows.get(key)) as T|undefined,put:async(key:string,value:unknown)=>{rows.set(key,structuredClone(value));},delete:async(key:string)=>rows.delete(key),transaction:async<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>=>fn(store())};};
const policy={enabled:true as const,build:'abcdef1234',retentionHours:2};
test('bounded telemetry retains only aggregate allowlisted labels, time buckets and configured build identity',async()=>{
 const s=store();await recordMarketTelemetry(s,policy,{action:'acquire',workClass:'quote',status:'CACHE_HIT'},1000);
 await recordMarketTelemetry(s,policy,{action:'dispatch',workClass:'history',priority:'interactive',ok:true,cost:3,waitMs:120},1000);
 await recordMarketTelemetry(s,policy,{action:'settle',workClass:'history',ok:true,outcome:'failure',category:'THROTTLED',durationMs:900},2000);
 const result=await readMarketTelemetry(s,policy,2000);expect(result).toMatchObject({enabled:true,build:policy.build,buckets:[{counts:{'cache.hit':1,'dispatch.attempts':1,'dispatch.credits':3,'wait.100-999ms':1,'outcome.THROTTLED':1,'duration.100-999ms':1}}]});
 await recordMarketTelemetry(s,policy,{action:'acquire',workClass:'https://secret.test?email=private',reason:'Bearer secret',status:'wallet-private'} as never,2000);
 expect(JSON.stringify(s.rows.get('telemetry'))).not.toMatch(/secret|private|wallet|https/);expect(JSON.stringify(result)).not.toMatch(/id|url|token|quantity|pair/i);
 await recordMarketTelemetry(s,policy,{action:'acquire',workClass:'quote',status:'OWNER'},7200000);
 const current=await readMarketTelemetry(s,policy,7200000);if(!current.enabled)throw Error('Expected enabled telemetry');expect(current.buckets.map(b=>b.hour)).toEqual([2]);
 expect(await readMarketTelemetry(s,{...policy,build:'nextbuild'},7200000)).toMatchObject({buckets:[]});
 expect(await readMarketTelemetry(s,undefined,7200000)).toEqual({enabled:false});expect(s.rows.has('telemetry')).toBe(false);
});
test('replays do not duplicate charged units or provider outcomes; denied admissions are sanitized',async()=>{
 const s=store();await recordMarketTelemetry(s,policy,{action:'dispatch',workClass:'quote',ok:true,cost:3},0);await recordMarketTelemetry(s,policy,{action:'dispatch',workClass:'quote',ok:true,replay:true,cost:3},0);
 await recordMarketTelemetry(s,policy,{action:'settle',workClass:'quote',ok:true,replay:true,outcome:'failure',category:'THROTTLED'},0);await recordMarketTelemetry(s,policy,{action:'reserve',workClass:'quote',ok:false,reason:'MONTHLY_LIMIT'},0);
 const current=await readMarketTelemetry(s,policy,0);if(!current.enabled)throw Error('Expected enabled telemetry');expect(current.buckets[0]?.counts).toMatchObject({'dispatch.attempts':1,'dispatch.credits':3,'admission.MONTHLY_LIMIT':1});expect(current.buckets[0]?.counts['outcome.THROTTLED']).toBeUndefined();
});
