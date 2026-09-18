import {expect,it} from 'vitest';
import {manualSourcePosition} from './manual-source';
import {emptyPlatform,privateGoalSchema,goalProgress,allocate,deletePrivateGoal} from './positions';
const goal=privateGoalSchema.parse({id:'81',name:'Mixed wealth',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'10000000',notes:'',createdAt:'2026-09-19T00:00:00Z',milestones:[]});
it('preserves explicit manual asset classes for composition',()=>{
 expect(manualSourcePosition({category:'Stablecoins',name:'Example coin',symbol:'USDQ',quantity:'40000',currency:'USD',value:'40000'})).toHaveProperty('assetClass','Stablecoins');
});
it('property defaults to one share and requires explicit value',()=>{
 const p=manualSourcePosition({category:'Property',name:'Fictional home',quantity:'',currency:'EUR',value:'350000'});
 expect(p).toMatchObject({sourceType:'MANUAL',assetClass:'Property',quantity:'1000000000000000000',valuation:{value:'35000000',currency:'EUR'}});
});
import {createAllocatedGoal,goalAssetMix,ringSegments,wealthOverview,assetClassOf} from './wealth';
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
