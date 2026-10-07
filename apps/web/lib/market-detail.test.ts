import {describe,expect,test} from 'vitest';
import {DETAIL_NOT_PROVIDED,DETAIL_UNAVAILABLE,amountText,detailAnswerFor,detailIsStale,marketDetailUrl,parseMarketDetails,verifiedDetailAnswer,verifiedMarketDetail} from './market-detail';
import {createMarketDetailCache} from './market-detail-cache';
import {fetchPublicMarketDetails} from './market-detail-client';
import {marketRequestKey} from './market-assets';

// Session W Part 15: coins' market details from CoinGecko's /coins/markets (docs read 2026-10-07), exact lexemes only.
const NOW=Date.parse('2026-10-07T10:00:00.000Z');
const coin=(id:string,currency:'USD'|'EUR'='USD')=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency});
const ROW='{"id":"bitcoin","last_updated":"2026-10-07T09:59:30.000Z","price_change_percentage_1h_in_currency":-0.123456789,"price_change_percentage_24h_in_currency":2.5,"price_change_percentage_24h":2.4,"price_change_percentage_7d_in_currency":-7.25,"market_cap":1312345678901.25,"total_volume":2.5e10,"circulating_supply":19750000,"total_supply":21000000.0,"max_supply":21000000}';

describe('parseMarketDetails',()=>{
 test('reads the 1h, 24h and 7d change and every size figure as exact digits',()=>{
  const [detail]=parseMarketDetails(`[${ROW}]`,[coin('bitcoin')],NOW);
  expect(detail).toEqual({...coin('bitcoin'),source:'CoinGecko',change1h:'-0.123456789',change24h:'2.5',change7d:'-7.25',marketCap:{value:'131234567890125',decimals:2},volume24h:{value:'25000000000',decimals:0},circulatingSupply:{value:'19750000',decimals:0},totalSupply:{value:'21000000',decimals:0},maxSupply:{value:'21000000',decimals:0},observedAt:'2026-10-07T09:59:30.000Z',fetchedAt:'2026-10-07T10:00:00.000Z'});
  expect(amountText(detail!.marketCap!)).toBe('1312345678901.25');
 });
 test('a missing figure and a 0 (CoinGecko has none) are both not provided, never zero',()=>{
  const [detail]=parseMarketDetails('[{"id":"tiny","last_updated":"2026-10-07T09:59:30.000Z","market_cap":0,"total_volume":0.0,"circulating_supply":null,"max_supply":0e0,"price_change_percentage_24h":1}]',[coin('tiny')],NOW);
  expect(detail).toMatchObject({change1h:null,change24h:'1',change7d:null,marketCap:null,volume24h:null,circulatingSupply:null,totalSupply:null,maxSupply:null});
 });
 test('without the provider\'s time nothing is shown',()=>{
  const [detail]=parseMarketDetails('[{"id":"bitcoin","last_updated":null,"market_cap":5,"price_change_percentage_1h_in_currency":3}]',[coin('bitcoin')],NOW);
  expect(detail).toMatchObject({observedAt:null,change1h:null,marketCap:null});
 });
 test('one answer serves the pair it was asked for, in that currency',()=>{
  expect(parseMarketDetails(`[${ROW}]`,[coin('bitcoin','EUR')],NOW).map(marketRequestKey)).toEqual(['coingecko:coin:bitcoin:EUR']);
 });
 test.each([
  ['a figure that is not a number','[{"id":"bitcoin","last_updated":"2026-10-07T09:59:30.000Z","market_cap":"1000"}]'],
  ['a negative supply','[{"id":"bitcoin","last_updated":"2026-10-07T09:59:30.000Z","circulating_supply":-1}]'],
  ['a change below -100 %','[{"id":"bitcoin","last_updated":"2026-10-07T09:59:30.000Z","price_change_percentage_1h_in_currency":-101}]'],
  ['a coin nobody asked for','[{"id":"ethereum","last_updated":"2026-10-07T09:59:30.000Z"}]'],
  ['a repeated coin',`[${ROW},${ROW}]`],
  ['an object instead of rows','{"id":"bitcoin"}'],
 ])('refuses %s',(_label,text)=>{expect(()=>parseMarketDetails(text,[coin('bitcoin')],NOW)).toThrow();});
 test('a tokenized RWA is never read here',()=>{
  expect(()=>parseMarketDetails('[{"id":"tsla","last_updated":"2026-10-07T09:59:30.000Z"}]',[{marketRef:{provider:'coingecko',kind:'rwa',id:'tsla',assetType:'stock'},currency:'USD'}],NOW)).toThrow('Unexpected detail identity.');
 });
});

test('the provider address: one currency, the coins, no sparkline, 1h/24h/7d, full precision',()=>{
 expect(marketDetailUrl('EUR',['bitcoin','ethereum','bitcoin']).href).toBe('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=bitcoin%2Cethereum&per_page=250&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d&precision=full');
 expect(()=>marketDetailUrl('USD',[])).toThrow();
 expect(()=>marketDetailUrl('USD',Array.from({length:251},(_,i)=>`c${i}`))).toThrow();
});

describe('verified details',()=>{
 const [detail]=parseMarketDetails(`[${ROW}]`,[coin('bitcoin')],NOW);
 test('identity, time and shape are checked again',()=>{
  expect(()=>verifiedMarketDetail(detail,coin('ethereum'),NOW)).toThrow('Invalid detail identity.');
  expect(()=>verifiedMarketDetail({...detail,fetchedAt:'2026-10-07T11:00:00.000Z'},coin('bitcoin'),NOW)).toThrow('Invalid detail timestamp.');
  expect(()=>verifiedMarketDetail({...detail,observedAt:null},coin('bitcoin'),NOW)).toThrow('Details require provider time.');
  expect(()=>verifiedMarketDetail({...detail,price:'1'},coin('bitcoin'),NOW)).toThrow();
 });
 test('stale after 15 minutes',()=>{
  expect(detailIsStale(detail!,NOW+14*60000)).toBe(false);expect(detailIsStale(detail!,NOW+15*60000)).toBe(true);
 });
 test('an answer must name every pair once; unknown wording becomes "unavailable"; "not provided" stays',()=>{
  const btc=marketRequestKey(coin('bitcoin')),eth=marketRequestKey(coin('ethereum'));
  const answer=verifiedDetailAnswer({results:{[btc]:{detail,error:null,stale:false},[eth]:{detail:null,error:'Something odd',stale:true}},error:DETAIL_NOT_PROVIDED},[coin('bitcoin'),coin('ethereum')],NOW);
  expect(answer).toEqual({results:{[btc]:{detail,error:null,stale:false},[eth]:{detail:null,error:DETAIL_UNAVAILABLE,stale:true}},error:DETAIL_NOT_PROVIDED});
  expect(()=>verifiedDetailAnswer({results:{[btc]:{detail,error:null,stale:false}},error:null},[coin('bitcoin'),coin('ethereum')],NOW)).toThrow('Incomplete detail results.');
  expect(()=>verifiedDetailAnswer({results:{[eth]:{detail,error:null,stale:false}},error:null},[coin('ethereum')],NOW)).toThrow('Invalid detail identity.');
  expect(detailAnswerFor([coin('bitcoin')],DETAIL_NOT_PROVIDED)).toEqual({results:{[btc]:{detail:null,error:DETAIL_NOT_PROVIDED,stale:true}},error:DETAIL_NOT_PROVIDED});
 });
});

describe('the browser\'s cache and client',()=>{
 const [detail]=parseMarketDetails(`[${ROW}]`,[coin('bitcoin')],NOW);
 const btc=marketRequestKey(coin('bitcoin'));
 test('asks once while fresh, again after 15 minutes or on a refresh past the one-minute gate; an older observation never replaces a newer one',async()=>{
  let now=NOW;const asked:string[][]=[];let answer=detail!;
  const cache=createMarketDetailCache(async requests=>{asked.push(requests.map(marketRequestKey));return {results:{[btc]:{detail:answer,error:null,stale:false}},error:null};},()=>now);
  await cache.refresh([coin('bitcoin')]);await cache.refresh([coin('bitcoin')]);
  expect(asked).toEqual([[btc]]);expect(cache.getSnapshot().results[btc]).toEqual({detail,error:null,stale:false});
  now+=30000;await cache.refresh([coin('bitcoin')],true);expect(asked).toHaveLength(1);
  now+=31000;answer={...detail!,observedAt:'2026-10-07T09:00:00.000Z',change1h:'9'};await cache.refresh([coin('bitcoin')],true);
  expect(asked).toHaveLength(2);expect(cache.getSnapshot().results[btc]!.detail!.change1h).toBe('-0.123456789');
  now=NOW+16*60000;answer={...detail!,observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),change1h:'1'};await cache.refresh([coin('bitcoin')]);
  expect(asked).toHaveLength(3);expect(cache.getSnapshot().results[btc]!.detail!.change1h).toBe('1');
 });
 test('a failed load says unavailable and keeps what was known',async()=>{
  let fail=false,now=NOW;const cache=createMarketDetailCache(async()=>{if(fail)throw Error('offline');return {results:{[btc]:{detail:detail!,error:null,stale:false}},error:null};},()=>now);
  await cache.refresh([coin('bitcoin')]);fail=true;now+=61000;await cache.refresh([coin('bitcoin')],true);
  expect(cache.getSnapshot().results[btc]).toMatchObject({detail,error:DETAIL_UNAVAILABLE});
 });
 test('the client sends public identities only, 32 pairs per request, and turns a bad answer into "unavailable" for its batch',async()=>{
  const bodies:unknown[]=[],inits:RequestInit[]=[];
  const fetcher=(async(url:string,init:RequestInit)=>{inits.push(init);const body=JSON.parse(String(init.body));bodies.push(body);
   if(bodies.length===2)return new Response('{"oops":true}',{status:200,headers:{'content-type':'application/json'}});
   return Response.json({results:Object.fromEntries(body.requests.map((r:ReturnType<typeof coin>)=>[marketRequestKey(r),{detail:null,error:DETAIL_NOT_PROVIDED,stale:true}])),error:DETAIL_NOT_PROVIDED});}) as unknown as typeof fetch;
  const pairs=Array.from({length:40},(_,i)=>coin(`c-${i}`));
  const answer=await fetchPublicMarketDetails(pairs,false,fetcher,NOW);
  expect(bodies.map(b=>(b as {requests:unknown[]}).requests.length)).toEqual([32,8]);
  expect(bodies[0]).toEqual({requests:pairs.slice(0,32),refresh:false});
  expect(inits[0]).toMatchObject({method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'});
  expect(answer.results[marketRequestKey(pairs[0]!)]!.error).toBe(DETAIL_NOT_PROVIDED);
  expect(answer.results[marketRequestKey(pairs[39]!)]!.error).toBe(DETAIL_UNAVAILABLE);
  expect(answer.error).toBe(DETAIL_UNAVAILABLE);
 });
});
