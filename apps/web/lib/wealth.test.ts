import {expect,it} from 'vitest';
import {manualSourcePosition} from './manual-source';
import {emptyPlatform,privateGoalSchema,goalProgress,allocate,deletePrivateGoal} from './positions';
import {automaticSourcePosition} from '../components/platform/asset-search';
import type {MarketCatalogAsset,MarketAssetRef} from './market-assets';
import type {MarketQuote} from './market-quotes';
const goal=privateGoalSchema.parse({id:'81',name:'Mixed wealth',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'10000000',notes:'',createdAt:'2026-09-19T00:00:00Z',milestones:[]});
it('preserves explicit manual asset classes for composition',()=>{
 expect(manualSourcePosition({category:'Stablecoins',name:'Example coin',symbol:'USDQ',quantity:'40000',currency:'USD',value:'40000'})).toHaveProperty('assetClass','Stablecoins');
});
it('property defaults to one share and requires explicit value',()=>{
 const p=manualSourcePosition({category:'Property',name:'Fictional home',quantity:'',currency:'EUR',value:'350000'});
 expect(p).toMatchObject({sourceType:'MANUAL',assetClass:'Property',quantity:'1000000000000000000',valuation:{value:'35000000',currency:'EUR'}});
});
import {createAllocatedGoal,goalAssetMix,ringSegments,wealthOverview,assetClassOf,goalMarketRequests,wealthHistory,wealthMarketRequests} from './wealth';
const sources=()=>[
 manualSourcePosition({category:'Crypto',name:'Fictional crypto',symbol:'BTC',quantity:'1',currency:'USD',value:'25000'},'crypto'),
 manualSourcePosition({category:'Stablecoins',name:'Fictional stablecoin',symbol:'USDC',quantity:'40000',currency:'USD',value:'40000'},'stable'),
 manualSourcePosition({category:'Precious metals',name:'Fictional gold',quantity:'100',currency:'USD',value:'10000'},'gold'),
 manualSourcePosition({category:'Cash',name:'Fictional cash',quantity:'5000',currency:'USD'},'cash')];
const fixture=()=>{const positions=sources();return createAllocatedGoal({...emptyPlatform(),positions},goal,positions.map(p=>({positionId:p.id,quantity:p.quantity})));};
it('creates all four allocations and counts $80k toward $100k',()=>{const s=fixture();expect(s.allocations).toHaveLength(4);expect(goalProgress(s,'81')).toMatchObject({current:'8000000',progressPct:'80.00',remaining:'2000000'});});
it('mix and ring sum to canonical progress, including rounding and overfunding',()=>{for(const target of ['10000000','9999999','100']){const s=fixture(),g={...goal,target};s.goals=[g];const mix=goalAssetMix(s,g),progress=goalProgress(s,g.id);expect(mix.reduce((n,m)=>n+m.percent,0)).toBeCloseTo(Number(progress.progressPct),8);expect(ringSegments(mix,progress.progressPct).reduce((n,m)=>n+m.size,0)).toBeCloseTo(Math.min(100,Number(progress.progressPct)),8);}});
it('quantity goals retain native quantities regardless of valuation',()=>{const p=sources()[0]!;const g={...goal,type:'QUANTITY' as const,asset:p.asset,denom:p.denom,decimals:p.decimals,target:'2000000000000000000'};const s=createAllocatedGoal({...emptyPlatform(),positions:[p]},g,[{positionId:p.id,quantity:p.quantity}]);expect(goalProgress(s,g.id).progressPct).toBe('50.00');expect(goalAssetMix(s,g)).toEqual([]);});
it('includes unallocated Positions; release and deletion preserve wealth',()=>{let s=fixture();s=allocate(s,'81','crypto','0');let w=wealthOverview(s);expect(w.rows).toHaveLength(4);expect(w.subtotals[0]).toMatchObject({value:8000000n,allocated:5500000n,unallocated:2500000n});s=deletePrivateGoal(s,'81');w=wealthOverview(s);expect(w.rows).toHaveLength(4);expect(w.subtotals[0]).toMatchObject({value:8000000n,allocated:0n,unallocated:8000000n});});
it('separates currencies and never assumes stablecoin or missing prices',()=>{const positions=[...sources(),manualSourcePosition({category:'Property',name:'Home',quantity:'',currency:'EUR',value:'350000'},'home'),manualSourcePosition({category:'Stablecoins',name:'Unknown coin',symbol:'USDQ',quantity:'900',currency:'USD'},'unknown')];const w=wealthOverview({...emptyPlatform(),positions});expect(w.incomplete).toBe(true);expect(w.subtotals.map(x=>[x.currency,x.value])).toEqual([['USD',8000000n],['EUR',35000000n]]);expect(w.rows.at(-1)?.value).toBeUndefined();});
it('loads old metadata safely and rejects invalid multi-allocation atomically',()=>{const s=fixture();const p={...s.positions[0]!};delete p.assetClass;expect(assetClassOf(p)).toBe('Crypto');p.provenance='Old manual observation';expect(assetClassOf(p)).toBe('Custom');const raw={...emptyPlatform(),positions:s.positions};expect(()=>createAllocatedGoal(raw,goal,[{positionId:'crypto',quantity:'1'},{positionId:'missing',quantity:'1'}])).toThrow();expect(raw.goals).toEqual([]);expect(raw.allocations).toEqual([]);});
it('keeps stale observation and verified valuation warnings even with fresh prices',()=>{
 const p={...sources()[0]!,sourceType:'NATIVE_STAKING' as const,verification:'VERIFIED_READ_ONLY' as const,sync:'CURRENT' as const,observedAt:'2026-01-01T00:00:00Z'};
 const now=Date.parse('2026-09-19T00:00:00Z');expect(wealthOverview({...emptyPlatform(),positions:[p]},now).rows[0]?.stale).toBe(true);
 const v={...p,observedAt:new Date(now).toISOString(),valuation:{...p.valuation!,source:'VERIFIED' as const,observedAt:'2026-01-01T00:00:00Z'}};expect(wealthOverview({...emptyPlatform(),positions:[v]},now).rows[0]?.stale).toBe(true);
});
it('preserves asset class when an older Position editor omits the optional field',async()=>{
 const {saveManualPosition}=await import('./positions');const s=fixture();const p={...s.positions[1]!,provenance:'Explicit user entry; not synchronized or chain-verified'};delete p.assetClass;
 expect(saveManualPosition(s,p).positions.find(p=>p.id==='stable')?.assetClass).toBe('Stablecoins');
});

const catalog=(id:string,symbol:string,kind:'coin'|'rwa'='coin'):MarketCatalogAsset=>({ref:kind==='coin'?{provider:'coingecko',kind,id}:{provider:'coingecko',kind,id,assetType:id.includes('gold')?'commodity':'stock'},name:`${symbol} market identity`,symbol});
const quote=(ref:MarketAssetRef,currency:'USD'|'EUR',price:string,priceDecimals:number,at='2026-09-20T10:00:00.000Z'):MarketQuote=>({base:{network:`coingecko-${ref.kind}`,denom:ref.id,decimals:0},marketRef:ref,currency,price,priceDecimals,source:ref.kind==='rwa'?'CoinGecko tokenized RWA reference':'CoinGecko',providerAssetId:ref.id,observedAt:at,fetchedAt:at,verification:'VERIFIED'});

it('values several explicit market identities by currency while manual totals keep precedence',()=>{
 const btc=automaticSourcePosition({asset:catalog('bitcoin','BTC'),assetClass:'Crypto',quantity:'0.5',currency:'USD'},'auto-btc');
 const eth=automaticSourcePosition({asset:catalog('ethereum','ETH'),assetClass:'Crypto',quantity:'2',currency:'EUR'},'auto-eth');
 const unknown=automaticSourcePosition({asset:catalog('unknown-dollar','USDQ'),assetClass:'Stablecoins',quantity:'900',currency:'USD'},'unknown-stable');
 const manual={...automaticSourcePosition({asset:catalog('wrapped-bitcoin','WBTC'),assetClass:'Crypto',quantity:'1',currency:'USD'},'manual-wins'),valuation:{value:'2500000',currency:'USD',decimals:2,source:'MANUAL' as const,observedAt:'2026-09-20T10:00:00.000Z'}};
 const now=Date.parse('2026-09-20T10:05:00.000Z');
 const quotes=[quote(btc.marketRef!,'USD','6000000',2),quote(eth.marketRef!,'EUR','250000',2),quote(manual.marketRef!,'USD','6000000',2)];
 const overview=wealthOverview({...emptyPlatform(),positions:[btc,eth,unknown,manual]},now,quotes);
 expect(overview.subtotals).toEqual([
  {currency:'USD',value:5500000n,allocated:0n,unallocated:5500000n},
  {currency:'EUR',value:500000n,allocated:0n,unallocated:500000n},
 ]);
 expect(overview.incomplete).toBe(true);
 expect(overview.rows.find(row=>row.position.id==='manual-wins')).toMatchObject({value:2500000n,source:'Manual value',valuationState:'manual'});
 expect(overview.rows.find(row=>row.position.id==='auto-btc')).toMatchObject({value:3000000n,source:'CoinGecko',valuationState:'fresh'});
 expect(overview.rows.find(row=>row.position.id==='unknown-stable')?.value).toBeUndefined();
});

it('builds deduplicated public quote requests from explicit identities and open Value Goal currencies only',()=>{
 const btc=automaticSourcePosition({asset:catalog('bitcoin','BTC'),assetClass:'Crypto',quantity:'1',currency:'USD'},'private-btc-position');
 const gold=automaticSourcePosition({asset:catalog('tokenized-gold','GOLD','rwa'),assetClass:'Precious Metals',quantity:'1',currency:'USD'},'private-gold-position');
 const eurGoal=privateGoalSchema.parse({...goal,id:'901',asset:'EUR',denom:'EUR'}),state={...emptyPlatform(),positions:[btc,gold],goals:[eurGoal],allocations:[{goalId:'901',positionId:btc.id,quantity:btc.quantity},{goalId:'901',positionId:gold.id,quantity:gold.quantity}]};
 const requests=wealthMarketRequests(state);
 expect(requests.map(request=>`${request.marketRef.id}:${request.currency}`)).toEqual(['bitcoin:USD','bitcoin:EUR','tokenized-gold:USD']);
 expect(JSON.stringify(requests)).not.toContain('private-');
});

it('starts wealth history only when real snapshots can form a complete currency point',()=>{
 const first=manualSourcePosition({category:'Cash',name:'Cash one',quantity:'100',currency:'USD'},'history-one');
 const second=manualSourcePosition({category:'Cash',name:'Cash two',quantity:'200',currency:'USD'},'history-two');
 const state={...emptyPlatform(),positions:[first,second],valuationSnapshots:[
  {id:'v1',positionId:first.id,quantity:first.quantity,quantityDecimals:18,value:'10000',decimals:2,currency:'USD',source:'MANUAL' as const,capturedAt:'2026-09-18T10:00:00.000Z'},
  {id:'v2',positionId:second.id,quantity:second.quantity,quantityDecimals:18,value:'20000',decimals:2,currency:'USD',source:'MANUAL' as const,capturedAt:'2026-09-19T10:00:00.000Z'},
  {id:'v3',positionId:first.id,quantity:first.quantity,quantityDecimals:18,value:'15000',decimals:2,currency:'USD',source:'MANUAL' as const,capturedAt:'2026-09-20T10:00:00.000Z'},
 ]};
 expect(wealthHistory(state)).toEqual([{currency:'USD',decimals:2,points:[{at:'2026-09-19T10:00:00.000Z',value:'30000'},{at:'2026-09-20T10:00:00.000Z',value:'35000'}],change:'5000',changePercent:'16.66'}]);
 const missing=manualSourcePosition({category:'Cash',name:'Unsnapshotted cash',quantity:'50',currency:'USD'},'history-missing');
 expect(wealthHistory({...state,positions:[...state.positions,missing]})).toEqual([]);
});

it('keeps the sign on sub-one-percent recorded wealth losses',()=>{
 const cash=manualSourcePosition({category:'Cash',name:'Cash',quantity:'100',currency:'USD'},'declining-cash');
 const state={...emptyPlatform(),positions:[cash],valuationSnapshots:[
  {id:'d1',positionId:cash.id,quantity:cash.quantity,quantityDecimals:18,value:'10000',decimals:2,currency:'USD',source:'MANUAL' as const,capturedAt:'2026-09-19T10:00:00.000Z'},
  {id:'d2',positionId:cash.id,quantity:cash.quantity,quantityDecimals:18,value:'9999',decimals:2,currency:'USD',source:'MANUAL' as const,capturedAt:'2026-09-20T10:00:00.000Z'},
 ]};
 expect(wealthHistory(state)[0]).toMatchObject({change:'-1',changePercent:'-0.01'});
});

it('retains exact source and timestamp metadata when a last-good quote becomes stale',()=>{
 const gold=automaticSourcePosition({asset:catalog('tokenized-gold','GOLD','rwa'),assetClass:'Precious Metals',quantity:'2',currency:'USD'},'stale-gold');
 const at='2026-09-20T10:00:00.000Z',row=wealthOverview({...emptyPlatform(),positions:[gold]},Date.parse('2026-09-20T10:16:00.000Z'),[quote(gold.marketRef!,'USD','200000',2,at)]).rows[0];
 expect(row).toMatchObject({value:400000n,valuationState:'stale',stale:true,source:'CoinGecko tokenized RWA reference',valuedAt:at});
});

it('deduplicates repeated public identities before applying request bounds',()=>{
 const asset=catalog('bitcoin','BTC'),positions=Array.from({length:501},(_,index)=>automaticSourcePosition({asset,assetClass:'Crypto',quantity:'1',currency:'USD'},`duplicate-${index}`));
 expect(wealthMarketRequests({...emptyPlatform(),positions})).toEqual([{marketRef:asset.ref,currency:'USD'}]);
});

it('does not request market data for quantity-only Goal surfaces',()=>{
 const btc=automaticSourcePosition({asset:catalog('bitcoin','BTC'),assetClass:'Crypto',quantity:'1',currency:'USD'},'quantity-btc');
 const quantityGoal=privateGoalSchema.parse({...goal,id:'910',type:'QUANTITY',asset:'BTC',denom:btc.denom,decimals:btc.decimals,target:btc.quantity});
 const state={...emptyPlatform(),positions:[btc],goals:[quantityGoal],allocations:[{goalId:quantityGoal.id,positionId:btc.id,quantity:btc.quantity}]};
 expect(goalMarketRequests(state)).toEqual([]);
 expect(goalMarketRequests(state,quantityGoal.id)).toEqual([]);
});

it('requests only identities allocated to the selected open Value Goal',()=>{
 const btc=automaticSourcePosition({asset:catalog('bitcoin','BTC'),assetClass:'Crypto',quantity:'1',currency:'USD'},'goal-btc');
 const eth=automaticSourcePosition({asset:catalog('ethereum','ETH'),assetClass:'Crypto',quantity:'2',currency:'EUR'},'goal-eth');
 const gold=automaticSourcePosition({asset:catalog('tokenized-gold','GOLD','rwa'),assetClass:'Precious Metals',quantity:'1',currency:'USD'},'unallocated-gold');
 const usdGoal=privateGoalSchema.parse({...goal,id:'911'}),eurGoal=privateGoalSchema.parse({...goal,id:'912',asset:'EUR',denom:'EUR'});
 const state={...emptyPlatform(),positions:[btc,eth,gold],goals:[usdGoal,eurGoal],allocations:[{goalId:usdGoal.id,positionId:btc.id,quantity:btc.quantity},{goalId:eurGoal.id,positionId:eth.id,quantity:eth.quantity}]};
 expect(goalMarketRequests(state,usdGoal.id)).toEqual([{marketRef:btc.marketRef!,currency:'USD'}]);
 expect(goalMarketRequests(state,eurGoal.id)).toEqual([{marketRef:eth.marketRef!,currency:'EUR'}]);
});

it('deduplicates one public pair shared by several open Value Goals',()=>{
 const btc=automaticSourcePosition({asset:catalog('bitcoin','BTC'),assetClass:'Crypto',quantity:'2',currency:'USD'},'shared-btc');
 const first=privateGoalSchema.parse({...goal,id:'913'}),second=privateGoalSchema.parse({...goal,id:'914'}),closed=privateGoalSchema.parse({...goal,id:'915',status:'closed'});
 const state={...emptyPlatform(),positions:[btc],goals:[first,second,closed],allocations:[{goalId:first.id,positionId:btc.id,quantity:'1'},{goalId:second.id,positionId:btc.id,quantity:'1'}]};
 expect(goalMarketRequests(state)).toEqual([{marketRef:btc.marketRef!,currency:'USD'}]);
 expect(goalMarketRequests(state,closed.id)).toEqual([]);
});
