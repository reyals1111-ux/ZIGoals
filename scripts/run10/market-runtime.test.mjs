import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {build}=require('esbuild');
const now=Date.parse('2026-09-23T12:00:00Z');
const policy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:1,monthly:10},optionalCeiling:{minute:5,monthly:50},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000};
const work=id=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const quote=id=>({base:{network:'coingecko-coin',denom:id,decimals:0},marketRef:work(id).pair.marketRef,currency:'USD',price:'1234567890123456789',priceDecimals:12,source:'CoinGecko',providerAssetId:id,verification:'VERIFIED',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString()});
test('real Workers coordinator persists dispatch, public cache, fences and replay tombstones across restart',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run10-market-'));const built=await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 async function runtime(clock=now){return new Miniflare({...convertV4MiniflareOptions({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},durableObjectsPersist:persist,bindings:{ISOLATED_FIXTURE:'true',MARKET_POLICY:JSON.stringify({policy,month:{id:'fixture-month',start:now-1000,end:now+100000},quoteCost:3,leaseMs:1000,maxAttempts:16,maxWorks:8}),LOCAL_TEST_NOW:String(clock)},outboundService:()=>{throw Error('Provider network forbidden');}}),resourcePersistencePath:persist});}
 let mf=await runtime();async function call(body){const ns=await mf.getDurableObjectNamespace('MARKETS');return (await ns.get(ns.idFromName('only-configured-account')).fetch('https://internal.test',{method:'POST',body:JSON.stringify(body)})).json();}
 async function enqueue(id){const acquired=await call({action:'acquire',work:work(id)});expect(acquired.status).toBe('OWNER');return call({action:'enqueue',priority:'interactive',kind:'request',associations:[{work:work(id),lease:acquired.lease}]});}
 try{
  expect((await mf.dispatchFetch('https://public.test')).status).toBe(404);
  const namespace=await mf.getDurableObjectNamespace('MARKETS'),rawStub=namespace.get(namespace.idFromName('only-configured-account'));
  expect((await rawStub.fetch('https://internal.test',{method:'POST',body:new Uint8Array([255])})).status).toBe(400);expect((await rawStub.fetch('https://internal.test',{method:'POST',body:'x'.repeat(65537)})).status).toBe(413);
  expect(await call({action:'acquire',work:{...work('bitcoin'),wallet:'private'}})).toMatchObject({ok:false,reason:'MALFORMED'});
  const a=await enqueue('bitcoin'),b=await enqueue('ethereum');expect(a.ok).toBe(true);expect(b.ok).toBe(true);
  expect(await call({action:'reserve',id:a.id})).toMatchObject({ok:true});expect(await call({action:'reserve',id:b.id})).toMatchObject({ok:true});
  const owners=await Promise.all([call({action:'own',id:a.id}),call({action:'own',id:b.id})]);expect(owners.filter(x=>x.ok)).toHaveLength(1);
  const selected=owners[0].ok?a:b,asset=owners[0].ok?'bitcoin':'ethereum';expect(await call({action:'dispatch',id:selected.id})).toMatchObject({ok:true});
  await mf.dispose();mf=await runtime();
  expect(await call({action:'cancel',id:selected.id})).toMatchObject({ok:false,reason:'INVALID_TRANSITION'});
  expect(await call({action:'inspect'})).toMatchObject({dispatched:1,chargedCredits:3,attempts:2});
  expect(await call({action:'publish',id:selected.id,work:work(asset),quote:{...quote(asset),providerAssetId:'forged'}})).toMatchObject({ok:false,reason:'MALFORMED'});
  expect(await call({action:'settle',id:selected.id,outcome:'success'})).toMatchObject({ok:true});expect(await call({action:'settle',id:selected.id,outcome:'success'})).toMatchObject({ok:false});
  expect(await call({action:'publish',id:selected.id,work:work(asset),quote:quote(asset)})).toMatchObject({ok:true});
  expect(await call({action:'acquire',work:work(asset)})).toMatchObject({status:'CACHE_HIT',quote:quote(asset)});
  const old=selected.id===a.id?b:a;expect(await call({action:'own',id:old.id})).toMatchObject({ok:true});expect(await call({action:'dispatch',id:old.id})).toMatchObject({ok:true});
  for(let i=0;i<20;i++)expect(await call({action:'acquire',work:work(asset)})).toMatchObject({status:'CACHE_HIT'});
  await mf.dispose();mf=await runtime(now+1001);
  expect(await call({action:'acquire',work:work(asset)})).toMatchObject({status:'CACHE_HIT',quote:quote(asset)});
  const other=asset==='bitcoin'?'ethereum':'bitcoin';expect(await call({action:'acquire',work:work(other)})).toMatchObject({status:'OWNER'});
  expect(await call({action:'publish',id:old.id,work:work(other),quote:quote(other)})).toMatchObject({ok:false,reason:'FENCED'});expect(await call({action:'cancel',id:old.id})).toMatchObject({ok:false});
  expect(await call({action:'inspect'})).toMatchObject({chargedCredits:6,attempts:2,dispatched:1});
 }finally{await mf.dispose();}
},30000);
