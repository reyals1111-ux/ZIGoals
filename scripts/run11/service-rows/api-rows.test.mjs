import {describe,test,expect,beforeAll,afterAll} from 'vitest';
import {start} from './harness.mjs';
import {quoteIsStale} from '../../../apps/web/lib/market-quotes';
import {searchMarketAssets} from '../../../apps/web/lib/market-assets';
import {stakingItems} from '../../../apps/web/lib/notify/staking-items';
// Session AP Part 3: the carried "Needs a service" rows (docs/review/session-al/CARRIED.md), API level. The real route
// modules, market coordinator and food Worker run in workerd (./harness.mjs); upstreams answer from ./fixtures only and
// every other host is refused. Each test names the rows whose server facts it checks; README.md says what the browser
// replay must then check on screen.
const coin=(id,currency='USD')=>({marketRef:{provider:'coingecko',kind:'coin',id},currency});
const gold={marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'};
const key=pair=>`${pair.marketRef.provider}:${pair.marketRef.kind}:${pair.marketRef.id}:${pair.currency}`;
let h;
const ask=async(path,init)=>{const r=await fetch(h.origin+path,init);const text=await r.text();let body=null;try{body=JSON.parse(text);}catch{/* not JSON */}return {status:r.status,headers:r.headers,text,body};};
const post=(path,body)=>ask(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const ageMs=at=>Date.now()-Date.parse(at);
const marketCalls=path=>h.calls.filter(c=>c.worker==='market'&&c.path.startsWith(path)).length;
beforeAll(async()=>{h=await start({bundle:null});},120000);
afterAll(async()=>{await h?.stop();});

describe('service rows at API level (sequential by default)',()=>{
 test("TK \"'Current' badge on stale prices\": a quote observed 40 min ago answers VERIFIED_STALE beside a fresh one",async()=>{
  const r=await post('/api/market-quotes',{requests:[coin('bitcoin'),coin('cardano')]});
  expect(r.status).toBe(200);
  const [btc,ada]=r.body.results;
  expect(btc).toMatchObject({status:'VERIFIED_FRESH',failure:null,quote:{price:'9701234',priceDecimals:2,source:'CoinGecko'}});
  expect(ada).toMatchObject({status:'VERIFIED_STALE',quote:{price:'7123',priceDecimals:4}});
  expect(ageMs(btc.quote.observedAt)).toBeLessThan(60000);
  expect(ageMs(ada.quote.observedAt)).toBeGreaterThan(15*60000);
  // The browser judges "Current" with the same rule on the same observedAt.
  expect([quoteIsStale(btc.quote),quoteIsStale(ada.quote)]).toEqual([false,true]);
  expect(r.body).toMatchObject({complete:true,degraded:true,error:'Market prices could not be refreshed. Last verified evidence is retained.'});
 },60000);

 test('D-176 + M10 (data): Wealth and Markets read one reference price per asset; gold is the tokenized RWA reference',async()=>{
  const r=await post('/api/market-quotes',{requests:[gold,coin('bitcoin'),coin('bitcoin','EUR')]});
  expect(r.status).toBe(200);
  const quotes=Object.fromEntries(r.body.quotes.map(q=>[key({marketRef:q.marketRef,currency:q.currency}),q]));
  expect(quotes[key(gold)]).toMatchObject({price:'402115',priceDecimals:2,source:'CoinGecko tokenized RWA reference',currency:'USD'});
  expect(quotes[key(coin('bitcoin','EUR'))]).toMatchObject({price:'9105012',priceDecimals:2,currency:'EUR'});
  expect(r.body.results.map(x=>x.status)).toEqual(['VERIFIED_FRESH','VERIFIED_FRESH','VERIFIED_FRESH']);
 },60000);

 test('TK-6B-06: each 24h change carries its own as-of (observedAt) and staleness',async()=>{
  const r=await post('/api/market-insights',{requests:[coin('bitcoin'),coin('cardano'),gold]});
  expect(r.status).toBe(200);
  const btc=r.body.results[key(coin('bitcoin'))],ada=r.body.results[key(coin('cardano'))],xau=r.body.results[key(gold)];
  expect(btc).toMatchObject({error:null,stale:false,insight:{change24h:'2.4127',source:'CoinGecko',marketBasis:'coin'}});
  expect(ageMs(btc.insight.observedAt)).toBeLessThan(60000);
  expect(ada).toMatchObject({stale:true,insight:{change24h:'-0.8761'}});
  expect(ageMs(ada.insight.observedAt)).toBeGreaterThan(15*60000);
  expect(xau).toMatchObject({stale:false,insight:{change24h:'0.4211',marketBasis:'tokenized',source:'CoinGecko tokenized RWA reference'}});
  expect(btc.insight.sparkline.prices.length).toBe(169);
 },60000);

 test('M10, TK-203: logos are proxied same-origin and answer a PNG; an unrecorded image is a 404 (UI fallback glyph)',async()=>{
  const r=await post('/api/market-insights',{requests:[coin('bitcoin'),gold]});
  const btcLogo=r.body.results[key(coin('bitcoin'))].insight.logoUrl,goldLogo=r.body.results[key(gold)].insight.logoUrl;
  expect(btcLogo).toBe('/api/market-logo?url='+encodeURIComponent('https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400'));
  expect(goldLogo).toMatch(/^\/api\/market-logo\?url=.*Tether_Gold\.png/);
  for(const logo of [btcLogo,goldLogo]){
   const image=await fetch(h.origin+logo);
   expect(image.status).toBe(200);expect(image.headers.get('content-type')).toBe('image/png');expect(image.headers.get('cache-control')).toBe('public, max-age=86400');
   expect([...new Uint8Array(await image.arrayBuffer()).slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  }
  expect((await fetch(h.origin+'/api/market-logo?url='+encodeURIComponent('https://coin-images.coingecko.com/coins/images/999/large/none.png'))).status).toBe(404);
  expect((await fetch(h.origin+'/api/market-logo?url='+encodeURIComponent('https://evil.example/x.png'))).status).toBe(400);
 },60000);

 test('W15, D-079, D-052: the public catalog finds gold, bitcoin, "b" and cardano with the browser\'s own search',async()=>{
  const v1=await ask('/api/market-assets');
  expect(v1.status).toBe(200);expect(v1.body.error).toBeNull();expect(v1.body.assets).toHaveLength(18);
  const first=q=>searchMarketAssets(q,v1.body.assets)[0]?.ref;
  expect(first('gold')).toEqual(gold.marketRef);
  expect(first('bitcoin')).toEqual(coin('bitcoin').marketRef);
  expect(first('b')).toEqual(coin('bitcoin').marketRef);
  expect(first('cardano')).toEqual(coin('cardano').marketRef);
  // The browser asks for the compact catalog (x-zigoals-catalog: 2) and revalidates it with its ETag.
  const v2=await ask('/api/market-assets',{headers:{'x-zigoals-catalog':'2'}});
  expect(v2.status).toBe(200);const etag=v2.headers.get('etag');expect(etag).toBeTruthy();
  expect((await ask('/api/market-assets',{headers:{'x-zigoals-catalog':'2','if-none-match':etag}})).status).toBe(304);
 },60000);

 test('"Unformatted prices" (coin pages): detail and history answer exact decimal strings for the page to format',async()=>{
  const d=await post('/api/market-detail',{requests:[coin('bitcoin')]});
expect(d.status).toBe(200);
  expect(d.body.results[key(coin('bitcoin'))]).toMatchObject({error:null,stale:false,detail:{change1h:'0.1834',change24h:'2.4127',change7d:'-1.0582',marketCap:{value:'1921345678901',decimals:0},circulatingSupply:{value:'19781234',decimals:0},maxSupply:{value:'21000000',decimals:0}}});
  for(const [range,count] of [['1d',25],['30d',721],['1y',366]]){
   const r=await post('/api/market-history',{request:{...coin('bitcoin'),range}});
expect(r.status,range).toBe(200);expect(r.body.error).toBeNull();
   expect(r.body.history.points,range).toHaveLength(count);
   expect(r.body.history.points.at(-1)).toMatchObject({value:'9701234',decimals:2});
  }
 },60000);

 test('C-DVG-69: ZIG ("zignaly") has a year of daily USD history for each claim\'s day',async()=>{
  const r=await post('/api/market-history',{request:{...coin('zignaly'),range:'1y'}});
expect(r.status).toBe(200);expect(r.body.history.points).toHaveLength(366);
  const days=r.body.history.points.map(p=>Date.parse(p.at));
  expect(days.at(-1)-days[0]).toBe(365*86400000);expect(r.body.history.points.at(-1)).toMatchObject({value:'8341',decimals:5});
 },60000);

 test('refusal: history that was never recorded (EUR) is refused upstream and answers unavailable, not invented',async()=>{
  const before=h.refused.length;
  const r=await post('/api/market-history',{request:{...coin('bitcoin','EUR'),range:'7d'}});
  expect(r.status).toBe(503);expect(r.body.history).toBeNull();
  expect(h.refused.slice(before)).toEqual([expect.objectContaining({worker:'market',host:'api.coingecko.com',why:'history not recorded for this coin/currency'})]);
 },60000);

 test('D-262, D-200: prices drift between two loads once the cached quote is re-read',async()=>{
  const pairs=[coin('bitcoin'),coin('ethereum'),coin('zignaly'),coin('bitcoin','EUR')];
  const prices=body=>body.quotes.map(q=>`${q.providerAssetId}:${q.currency}:${q.price}/${q.priceDecimals}`);
  await h.setQuoteVariant(1);
  const reads=marketCalls('/api/v3/simple/price');
  const first=await post('/api/market-quotes',{requests:pairs}),again=await post('/api/market-quotes',{requests:pairs});
  expect(prices(first.body)).toEqual(['bitcoin:USD:9701234/2','ethereum:USD:34120815/4','zignaly:USD:8341/5','bitcoin:EUR:9105012/2']);
  expect(prices(again.body)).toEqual(prices(first.body));
  // One read per currency set; the second load is served from the coordinator, so nothing moves within its freshness.
  expect(marketCalls('/api/v3/simple/price')-reads).toBe(2);
  await h.setQuoteVariant(2);
  const later=await post('/api/market-quotes',{requests:pairs});
  expect(prices(later.body)).toEqual(['bitcoin:USD:975889/1','ethereum:USD:33985/1','zignaly:USD:8512/5','bitcoin:EUR:9159127/2']);
  expect(later.body.results.every(r=>r.status==='VERIFIED_FRESH')).toBe(true);
  await h.setQuoteVariant(1);
 },90000);

 test('C-DVG-35, MO-007, C-MO-01: barcode 3017620422003 answers Nutella from Open Food Facts; cached on the second ask',async()=>{
  const r=await ask('/api/food-lookup?code=3017620422003');
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({barcode:'3017620422003',name:'Nutella',brand:'nutella, ferrero',basis:'unverified-100g-or-100ml',nutrients:{kcal:539,proteinMg:6300,carbsMg:57500,fatMg:30900},source:'Open Food Facts',apiVersion:'3.4'});
  expect(r.body.nutriscoreGrade).toBeUndefined();
  const offCalls=()=>h.calls.filter(c=>c.worker==='food').length,before=offCalls();
  const graded=await ask('/api/food-lookup?code=3017620422003&grade=1');
  expect(graded.body).toMatchObject({name:'Nutella',nutriscoreGrade:'e'});
  expect(offCalls()).toBe(before);
  expect((await ask('/api/food-lookup?code=3017620')).body).toEqual({error:'INVALID_BARCODE'});
 },60000);

 test('C-BN-01, C-DVG-67, C-BN-05: validators answer commission, uptime, status, jailing and self-bond at one height',async()=>{
  const r=await ask('/api/chain/validators?network=zigchain-1');
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({version:1,status:'ok',network:'zigchain-1',height:'12873456',source:'https://api.zigchain.com',bondedTotal:'69950000000000000000000000'});
  const rows=Object.fromEntries(r.body.validators.map(v=>[v.moniker,v]));
  expect(r.body.validators.map(v=>v.moniker)).toEqual(['Aurora Stake','Beacon Nodes','Cobalt Validator','Delta Labs']);
  expect(rows['Aurora Stake']).toMatchObject({status:'bonded',jailed:false,tombstoned:false,commission:{rate:'0.05',maxRate:'0.2',maxChangeRate:'0.01'},selfBond:'500000000000000000000000',uptime:{window:10000,missed:12,signedShare:'0.9988'}});
  expect(rows['Beacon Nodes']).toMatchObject({commission:{rate:'0.1'},uptime:{missed:450,signedShare:'0.955'}});
  expect(rows['Cobalt Validator']).toMatchObject({status:'unbonding',jailed:true,votingPowerShare:'0',commission:{rate:'0.08'},uptime:{missed:9100}});
  expect(rows['Delta Labs']).toMatchObject({commission:{rate:'0.03'},selfBond:'0',uptime:{missed:0,signedShare:'1'}});
  expect(ageMs(r.body.observedAt)).toBeLessThan(60000);
 },60000);

 test('C-BN-06, BN-081, N-BN-17: a tracked wallet reads stake, rewards, unbonding and a non-bonded validator at one block',async()=>{
  const wallet=h.fixtures.lcd.wallet,r=await ask(`/api/positions?network=MAINNET_READ_ONLY&address=${wallet}`);
  expect(r.status).toBe(200);
  const by=Object.fromEntries(r.body.positions.map(p=>[p.sourceType+':'+(p.validator?.name??''),p]));
  expect(Object.keys(by).sort()).toEqual(['NATIVE_REWARDS:Aurora Stake','NATIVE_REWARDS:Cobalt Validator','NATIVE_STAKING:Aurora Stake','NATIVE_STAKING:Cobalt Validator','NATIVE_UNBONDING:Beacon Nodes','WALLET_LIQUID:']);
  expect(by['WALLET_LIQUID:'].quantity).toBe('42500000000000000000');
  expect(by['NATIVE_STAKING:Aurora Stake']).toMatchObject({quantity:'1500000000000000000000',validator:{status:'BOND_STATUS_BONDED',commission:'0.050000000000000000'}});
  expect(by['NATIVE_STAKING:Cobalt Validator'].validator.status).toBe('BOND_STATUS_UNBONDING');
  expect(by['NATIVE_REWARDS:Aurora Stake'].quantity).toBe('3214567890123456789');
  // N-BN-17: every position carries the block's own time and height (the "updated" time the Staking snapshot shows).
  for(const p of r.body.positions){expect(p.provenance).toBe('https://api.zigchain.com · block 12873456');expect(ageMs(p.observedAt)).toBeLessThan(60000);}
  const exit=Date.parse(by['NATIVE_UNBONDING:Beacon Nodes'].exitDate);expect(exit-Date.now()).toBeGreaterThan(9*86400000);
  // C-BN-06: the device's own alert rule sees the non-bonded validator and the unbonding day.
  const items=stakingItems(r.body.positions,{now:Date.now(),timeZone:'Asia/Tokyo',today:'2026-11-14'});
  expect(items.map(i=>i.kind).sort()).toEqual(['unbonding','validator']);
 },60000);

 test('C-BN-11: the open proposal answers its voting deadline and live tally; a missing number is an empty list',async()=>{
  const r=await ask('/api/chain/proposals?network=zigchain-1');
  expect(r.status).toBe(200);expect(r.body.status).toBe('ok');
  expect(r.body.proposals.map(p=>`${p.id}:${p.state}`)).toEqual(['44:deposit','43:voting','42:rejected','41:passed']);
  const open=r.body.proposals[1];
  expect(open).toMatchObject({title:'Raise the maximum validator set to 125',tallyKind:'live',tally:{yes:'21300000000000000000000000',no:'3100000000000000000000000',abstain:'400000000000000000000000',noWithVeto:'50000000000000000000000'}});
  const left=Date.parse(open.votingEndTime)-Date.now();expect(left).toBeGreaterThan(2*86400000-120000);expect(left).toBeLessThan(2*86400000+60000);
  expect(r.body.params).toMatchObject({votingPeriodSeconds:259200,quorum:'0.334000000000000000'});
  const one=await ask('/api/chain/proposal?network=zigchain-1&id=43');expect(one.body.proposals.map(p=>p.id)).toEqual(['43']);
  const none=await ask('/api/chain/proposal?network=zigchain-1&id=99');expect(none.body).toMatchObject({status:'ok',proposals:[]});
 },60000);

 test('C-BN-12: a validator\'s vote is read from governance; an address that has not voted answers vote: null',async()=>{
  const {aurora}=h.fixtures.lcd.validators;
  const voted=await ask(`/api/chain/vote?network=zigchain-1&proposal=43&voter=${aurora.account}`);
  expect(voted.status).toBe(200);expect(voted.body).toMatchObject({status:'ok',proposalId:'43',vote:{options:[{option:'yes',weight:'1.000000000000000000'}]}});
  const not=await ask(`/api/chain/vote?network=zigchain-1&proposal=43&voter=${h.fixtures.lcd.wallet}`);
  expect(not.body).toMatchObject({status:'ok',proposalId:'43',vote:null});
 },60000);

 test('isolation: only the recorded hosts were asked, each from its own Worker; the only refusal was the deliberate one',()=>{
  expect(h.hosts()).toEqual({app:['api.zigchain.com','coin-images.coingecko.com'],market:['api.coingecko.com'],food:['world.openfoodfacts.org']});
  expect(h.refused.map(r=>`${r.worker} ${r.host} ${r.why}`)).toEqual(['market api.coingecko.com history not recorded for this coin/currency']);
  expect(h.calls.filter(c=>c.worker==='market').every(c=>/^\/api\/v3\/(simple\/price|coins\/markets|rwas\/markets|coins\/list|rwas\/list|coins\/[a-z]+\/market_chart)(\?|$)/.test(c.path))).toBe(true);
 });
});
