import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MARKET_CLIENT_GROUP} from '../../apps/web/lib/server/market-client-address.ts';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');

// Session S Part 3 (FIX_PLAN C3, Q-WRK-03): the food Worker caches unknown barcodes for 1 h and gives each client a share
// (3 provider lookups per rolling minute, 120 per UTC day) inside the global 1-per-12-s slot. Real Worker in Miniflare
// with SQLite storage; the provider is a local fake; the fixture clock moves by restarting on the same storage. A
// test-only wrapper adds one route that lists the stored rows; the production class is unchanged.
const wrapper=(await build({stdin:{contents:"import worker,{FoodBudget as Base} from './worker.mjs';export default worker;export class FoodBudget extends Base{async fetch(request){if(new URL(request.url).pathname==='/test/rows')return Response.json(Object.fromEntries(await this.state.storage.list()));return super.fetch(request);}}",resolveDir:new URL('../../workers/food-lookup/',import.meta.url).pathname,loader:'js'},bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
const T0=Date.UTC(2026,9,4,9,0,0);
function food({missing=[]}={}){
 const calls=[];let persist;
 const at=async time=>{
  persist??=await mkdtemp(join(tmpdir(),'run11-food-client-'));
  const mf=new Miniflare({...convertV4MiniflareOptions({modules:true,script:wrapper,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/0.1.0 (alpha-contact@example.invalid)',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time)},outboundService:async request=>{const code=new URL(request.url).pathname.split('/').at(-1);calls.push(code);return missing.includes(code)?new Response('{}',{status:404}):Response.json({code,product:{product_name:'Fixture '+code}});}}),resourcePersistencePath:persist});
  const lookup=async(code,client)=>{const response=await mf.dispatchFetch('https://food.test/lookup?code='+code,{headers:client?{'x-food-client':client}:{}});return {status:response.status,body:await response.json()};};
  const rows=async()=>{const ns=await mf.getDurableObjectNamespace('FOOD_BUDGET');return (await ns.get(ns.idFromName('shared-provider-budget-v1')).fetch('https://internal/test/rows')).json();};
  return {mf,lookup,rows};
 };
 return {calls,at};
}
async function step(f,time,fn){const run=await f.at(time);try{return await fn(run);}finally{await run.mf.dispose();}}

test('the client format matches the app\'s address groups exactly',async()=>{
 const source=(await import('node:fs')).readFileSync(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
 const group=new RegExp(/const CLIENT_GROUP=\/(.+)\/;/.exec(source)[1]);
 for(const value of ['v4:192.0.2.7','v6:2001:0db8:1234::/48'])expect([group.test(value),MARKET_CLIENT_GROUP.test(value)]).toEqual([true,true]);
 for(const value of ['192.0.2.7','v6:2001:db8::/48','v4:192.0.2.7 ','x'])expect([group.test(value),MARKET_CLIENT_GROUP.test(value)]).toEqual([false,false]);
});

test('an unknown barcode uses one provider slot until its 1 h negative cache expires',async()=>{
 const f=food({missing:['00000000']});
 await step(f,T0,async run=>expect(await run.lookup('00000000','v4:192.0.2.7')).toEqual({status:404,body:{error:'NOT_FOUND'}}));
 for(const offset of [13000,600000,3540000])await step(f,T0+offset,async run=>expect((await run.lookup('00000000','v4:192.0.2.8')).status).toBe(404));
 expect(f.calls).toEqual(['00000000']);
 await step(f,T0+3600000+13000,async run=>expect((await run.lookup('00000000','v4:192.0.2.8')).status).toBe(404));
 expect(f.calls).toEqual(['00000000','00000000']);
},60000);

test('one person can scan three products in a row; a fourth in the same minute waits without taking the shared slot',async()=>{
 const f=food(),me='v4:192.0.2.7',friend='v6:2001:0db8:1234::/48';
 for(const [n,code] of ['11111111','22222222','33333333'].entries())await step(f,T0+n*13000,async run=>expect((await run.lookup(code,me)).status).toBe(200));
 await step(f,T0+39000,async run=>{
  const refused=await run.lookup('44444444',me);expect(refused.status).toBe(429);expect(refused.body).toEqual({error:'TRY_LATER',retryAfter:21});
  // The refusal did not take the slot: another person is served at once.
  expect((await run.lookup('55555555',friend)).status).toBe(200);
  // Cache hits never count against the share.
  expect((await run.lookup('11111111',me)).status).toBe(200);
 });
 await step(f,T0+61000,async run=>expect((await run.lookup('44444444',me)).status).toBe(200));
 expect(f.calls).toEqual(['11111111','22222222','33333333','55555555','44444444']);
},60000);

test('a client gets 120 provider lookups per UTC day',async()=>{
 const f=food(),me='v4:192.0.2.7';
 // 120 lookups, three a minute 13 s apart; the restarts move the fixture clock.
 for(let n=0;n<121;n++){
  const answer=await step(f,T0+Math.floor(n/3)*60000+(n%3)*13000,r=>r.lookup(String(10000000+n),me));
  expect(answer.status,`lookup ${n}`).toBe(n<120?200:429);
 }
 expect(f.calls).toHaveLength(120);
},180000);

test('no address or group is stored; the key changes every UTC day and day rows are gone after about 48 hours',async()=>{
 const f=food(),me='v4:192.0.2.7';
 const day0=await step(f,T0,async run=>{await run.lookup('11111111',me);return run.rows();});
 const text=JSON.stringify(day0);
 expect(text).not.toContain('192.0.2.7');expect(text).not.toContain('v4:');
 expect(Object.keys(day0).filter(k=>k.startsWith('food-day:'))).toEqual(['food-day:2026-10-04']);
 expect(Object.keys(day0['food-day:2026-10-04'].buckets)[0]).toMatch(/^b[0-9a-f]{3}$/);
 const day1=await step(f,T0+86400000,async run=>{await run.lookup('22222222',me);return run.rows();});
 expect(day1['food-client-key'].key).not.toBe(day0['food-client-key'].key);expect(day1['food-client-key'].day).toBe('2026-10-05');
 const day2=await step(f,T0+2*86400000,async run=>{await run.lookup('33333333',me);return run.rows();});
 expect(Object.keys(day2).filter(k=>k.startsWith('food-day:')).sort()).toEqual(['food-day:2026-10-05','food-day:2026-10-06']);
 expect(day2['food-days']).toEqual(['2026-10-05','2026-10-06']);
},60000);

test('a malformed client value is refused before any slot',async()=>{
 const f=food();
 await step(f,T0,async run=>{expect(await run.lookup('11111111','192.0.2.7')).toEqual({status:400,body:{error:'INVALID_CLIENT'}});expect((await run.lookup('11111111')).status).toBe(200);});
 expect(f.calls).toEqual(['11111111']);
},30000);
