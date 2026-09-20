import {describe,it,expect} from 'vitest';
import {emptyPlatform,platformSchema,goalProgress,privateGoalSchema,allocate} from './positions';
import {manualSourcePosition} from './manual-source';
import {wealthOverview,wealthHistory} from './wealth';
import {fundingHealth,captureValuations} from './goal-intelligence';
import {saveAsset,archiveAsset,addFavourite,removeFavourite,moveFavourite,isCryptoPosition} from './asset-management';
import {previewFunding,fundGoal} from './contribution-funding';
const now=Date.parse('2026-09-20T12:00:00Z');
const goal=privateGoalSchema.parse({id:'91',name:'Phone',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'200000',createdAt:new Date(now).toISOString(),notes:'',milestones:[]});
const cash=(value='20000')=>manualSourcePosition({category:'Cash',name:'USD Cash',quantity:value,currency:'USD'},'cash',new Date(now).toISOString());
const base=()=>({...emptyPlatform(),goals:[goal]});
const btc={ref:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},name:'Bitcoin',symbol:'btc'};
describe('Run 9.1 consumer wealth',()=>{
 it('migrates v2 and v1 into v3 with empty favourites; rejects future versions',()=>{const s=emptyPlatform();const {watchlist,assetEvents,...v2}=s;void watchlist;void assetEvents;expect(platformSchema.parse({...v2,schemaVersion:2}).schemaVersion).toBe(3);const {contributions,valuationSnapshots,goalHistory,...v1}=v2;void contributions;void valuationSnapshots;void goalHistory;expect(platformSchema.parse({...v1,schemaVersion:1}).watchlist).toEqual([]);expect(platformSchema.safeParse({...s,schemaVersion:4}).success).toBe(false);});
 it('favourites never create owned wealth; reorder/remove stay bounded',()=>{let s=addFavourite(base(),btc);s=addFavourite(s,{...btc,ref:{...btc.ref,id:'ethereum'},name:'Ethereum'});s=moveFavourite(s,'coingecko:coin:ethereum',-1);expect(s.watchlist[0]!.ref.id).toBe('ethereum');expect(wealthOverview(s,now).rows).toHaveLength(0);expect(addFavourite(s,btc).watchlist).toHaveLength(2);expect(removeFavourite(s,'coingecko:coin:bitcoin').watchlist).toHaveLength(1);});
 it('cash edits value and quantity; archive rejects dependencies until explicit release and retains position',()=>{let s=saveAsset(base(),cash('500'));s=allocate(s,goal.id,'cash','1000000000000000000');expect(()=>archiveAsset(s,'cash',false,now)).toThrow(/allocat/i);s=archiveAsset(s,'cash',true,now);expect(s.positions[0]!.archivedAt).toBeDefined();expect(s.allocations).toHaveLength(0);expect(wealthOverview(s,now).rows).toHaveLength(0);});
 it('only crypto and stablecoins appear in staking view',()=>{expect(isCryptoPosition(cash())).toBe(false);expect(isCryptoPosition({...cash(),assetClass:'Precious Metals'})).toBe(false);expect(isCryptoPosition({...cash(),assetClass:'Crypto'})).toBe(true);expect(isCryptoPosition({...cash(),assetClass:'Stablecoins'})).toBe(true);});
 it('20,000 USD funds a 2,000 USD Goal once; 18,000 remains available',()=>{const s=base(),input={id:'fund-91',goalId:goal.id,newPosition:cash(),quantity:cash().quantity,occurredAt:new Date(now).toISOString()};const p=previewFunding(s,input,[],now);expect(p.newFunded).toBe('200000');expect(p.surplusValue).toBe('1800000');const next=fundGoal(s,input,[],now);expect(next.contributions).toHaveLength(1);expect(goalProgress(next,goal.id,now).current).toBe('200000');expect(next.goals[0]!.status).toBe('completed');expect(wealthOverview(next,now).subtotals[0]!.value).toBe(2000000n);expect(wealthOverview(next,now).subtotals[0]!.unallocated).toBe(1800000n);expect(fundGoal(next,input,[],now)).toEqual(next);expect(s.positions).toHaveLength(0);});
 it('failed funding leaves input unchanged',()=>{const s=base();expect(()=>fundGoal(s,{id:'bad',goalId:'missing',newPosition:cash(),quantity:cash().quantity,occurredAt:new Date(now).toISOString()},[],now)).toThrow();expect(s).toEqual(base());});
});

it('quantity funding preserves the entered unit valuation',()=>{const p=manualSourcePosition({category:'Crypto',name:'BTC',symbol:'BTC',quantity:'1',currency:'USD',value:'100'},'btc',new Date(now).toISOString());const g=privateGoalSchema.parse({...goal,type:'QUANTITY',asset:'BTC',denom:p.denom,decimals:p.decimals,target:(3n*10n**18n).toString()});const s=saveAsset({...base(),goals:[g]},p);const next=fundGoal(s,{id:'more-btc',goalId:g.id,positionId:p.id,quantity:p.quantity,occurredAt:new Date(now).toISOString()},[],now);expect(next.positions[0]!.valuation!.value).toBe('20000');});
it('linked future funding is excluded from future projected contributions',()=>{const g=privateGoalSchema.parse({...goal,plan:{amount:'10000',asset:'USD',decimals:2,cadence:'irregular',nextDate:'2026-09-21',active:true}});const s={...base(),goals:[g]};const p=cash('100');const next=fundGoal(s,{id:'early',goalId:g.id,newPosition:p,quantity:p.quantity,occurredAt:new Date(now).toISOString(),scheduledDate:'2026-09-21'},[],now);const h=fundingHealth(next,g.id,now);expect(h.plannedFuture).toBe('0');expect(h.nextDate).toBe(null);expect(h.plannedThroughToday).toBe('0');});
it('archived holdings leave subsequent wealth totals without rewriting earlier history',()=>{const p=cash('100'),q={...cash('150'),id:'other'};let s=captureValuations({...base(),positions:[p,q]},[],now);s=archiveAsset(s,p.id,false,now+1000);s=captureValuations({...s,positions:s.positions.map(p=>p.id==='other'?{...p,valuation:{...p.valuation!,observedAt:new Date(now+86400000).toISOString()}}:p)},[],now+86400000);const h=wealthHistory(s)[0]!;expect(h.points[0]!.value).toBe('25000');expect(h.points.at(-1)!.value).toBe('15000');expect(s.valuationSnapshots.filter(v=>v.positionId===p.id)).toHaveLength(1);});
it('funding identity rejects changed immutable request details',()=>{const p=cash('100'),input={id:'stable',goalId:goal.id,newPosition:p,quantity:p.quantity,occurredAt:new Date(now).toISOString()};const next=fundGoal(base(),input,[],now);expect(()=>fundGoal(next,{...input,note:'different'},[],now)).toThrow(/identity/);});
it('partial scheduled funding leaves only the remaining installment projected and a reversal restores it',async()=>{const {reverseContribution}=await import('./goal-intelligence');const g=privateGoalSchema.parse({...goal,plan:{amount:'10000',asset:'USD',decimals:2,cadence:'irregular',nextDate:'2026-09-21',active:true}}),p=cash('40');const next=fundGoal({...base(),goals:[g]},{id:'part',goalId:g.id,newPosition:p,quantity:p.quantity,occurredAt:new Date(now).toISOString(),scheduledDate:'2026-09-21'},[],now);expect(fundingHealth(next,g.id,now).plannedFuture).toBe('6000');const reversed=reverseContribution(next,'part','reverse',new Date(now).toISOString());expect(fundingHealth(reversed,g.id,now).plannedFuture).toBe('10000');expect(reversed.positions).toEqual(next.positions);});
it('CoinGecko contribution keeps original price evidence time',async()=>{const {automaticSourcePosition}=await import('../components/platform/asset-search');const p=automaticSourcePosition({asset:btc,assetClass:'Crypto',quantity:'0.01',currency:'USD'},'btc',new Date(now).toISOString());const q={base:{network:'coingecko',denom:'bitcoin',decimals:18},marketRef:btc.ref,currency:'USD' as const,price:'65000',priceDecimals:0,source:'CoinGecko' as const,providerAssetId:'bitcoin',observedAt:new Date(now-600000).toISOString(),fetchedAt:new Date(now).toISOString(),verification:'VERIFIED' as const};const next=fundGoal(base(),{id:'priced',goalId:goal.id,newPosition:p,quantity:p.quantity,occurredAt:new Date(now).toISOString()},[q],now);expect(next.contributions[0]!.valueAtEvent!.observedAt).toBe(q.observedAt);expect(next.contributions[0]!.occurredAt).toBe(new Date(now).toISOString());});
it('funding adds to existing Goal wealth and allocates only the missing amount',()=>{const p=cash('154'),s={...base(),positions:[p],allocations:[{goalId:goal.id,positionId:p.id,quantity:p.quantity}]};const next=fundGoal(s,{id:'existing',goalId:goal.id,positionId:p.id,quantity:cash().quantity,occurredAt:new Date(now).toISOString()},[],now);expect(goalProgress(next,goal.id,now).current).toBe('200000');expect(wealthOverview(next,now).subtotals[0]!.unallocated).toBe(1815400n);});
it('indivisible units cannot claim an impossible capped allocation or surplus',()=>{const p={...cash('1'),id:'share',asset:'SHARE',denom:'manual:SHARE',assetClass:'Stocks' as const,decimals:0,quantity:'1',valuation:{value:'300000',decimals:2,currency:'USD',source:'MANUAL' as const,observedAt:new Date(now).toISOString()}};const s=base();expect(()=>fundGoal(s,{id:'coarse',goalId:goal.id,newPosition:p,quantity:'1',occurredAt:new Date(now).toISOString()},[],now)).toThrow(/precision|split/);expect(s.positions).toHaveLength(0);});
it('presentation event eviction cannot rewrite retained archived-period history',async()=>{const {restoreAsset}=await import('./asset-management');const p=cash('100'),q={...cash('100'),id:'other'};let s=captureValuations({...base(),positions:[p,q]},[],now);s=archiveAsset(s,p.id,false,now+1000);s=captureValuations({...s,positions:s.positions.map(p=>p.id==='other'?{...p,valuation:{...p.valuation!,value:'15000',observedAt:new Date(now+86400000).toISOString()}}:p)},[],now+86400000);s=restoreAsset(s,p.id,now+86400000+1000);const before=wealthHistory(s);for(let i=0;i<241;i++)s=saveAsset(s,{...s.positions[1]!,notes:String(i),observedAt:new Date(now+86400000+2000+i).toISOString()});expect(s.assetEvents.some(e=>e.kind==='archived')).toBe(false);expect(wealthHistory(s)).toEqual(before);expect(before[0]!.points.at(-1)!.value).toBe('15000');});
it('currently archived membership survives 241 edits and a backup round trip',()=>{
 const p=cash('100'),q={...cash('150'),id:'other'},archivedAt=new Date(now+1000).toISOString();
 let s=captureValuations({...base(),positions:[p,q]},[],now);
 s=archiveAsset(s,p.id,false,now+1000);
 const updateOther=(time:number,note:string)=>{const other=s.positions.find(p=>p.id==='other')!;return saveAsset(s,{...other,notes:note,observedAt:new Date(time).toISOString(),valuation:{...other.valuation!,observedAt:new Date(time).toISOString()}});};
 s=updateOther(now+86400000,'Next day');s=captureValuations(s,[],now+86400000);
 const history=wealthHistory(s),snapshots=s.valuationSnapshots;
 for(let i=0;i<241;i++)s=updateOther(now+86400000+1000+i,String(i));
 expect(s.assetEvents.some(e=>e.positionId===p.id)).toBe(false);
 s=platformSchema.parse(JSON.parse(JSON.stringify(s)));
 expect(s.positions.find(x=>x.id===p.id)).toMatchObject({archivedAt,archivePeriods:[{from:archivedAt}]});
 expect(s.valuationSnapshots).toEqual(snapshots);expect(wealthHistory(s)).toEqual(history);
 expect(history[0]!.points.map(p=>p.value)).toEqual(['25000','15000']);
 expect(wealthOverview(s,now+86400000).subtotals[0]!.value).toBe(15000n);
});
it('rejects overlapping, reversed and inconsistent open archive periods on import',()=>{
 const from='2026-09-20T12:00:00.000Z',mid='2026-09-20T12:01:00.000Z',to='2026-09-20T12:02:00.000Z';
 const invalid=[
  {archivePeriods:[{from:mid,to:from}]},
  {archivePeriods:[{from,to},{from:mid,to:'2026-09-20T12:03:00.000Z'}]},
  {archivePeriods:[{from},{from:mid,to}]},
  {archivePeriods:[{from},{from:mid}],archivedAt:mid},
  {archivePeriods:[{from}]},
  {archivePeriods:[],archivedAt:from},
  {archivePeriods:[{from}],archivedAt:mid},
  {archivePeriods:[{from,to}],archivedAt:from},
 ];
 for(const lifecycle of invalid)expect(platformSchema.safeParse({...base(),positions:[{...cash('100'),...lifecycle}]}).success,JSON.stringify(lifecycle)).toBe(false);
 expect(platformSchema.safeParse({...base(),positions:[{...cash('100'),archivePeriods:[{from,to:mid},{from:mid}],archivedAt:mid}]}).success).toBe(true);
});
it('compares archive interval timestamps as instants when ISO precision differs',()=>{
 const archivePeriods=[{from:'2026-09-20T12:00:00Z',to:'2026-09-20T12:00:01.500Z'},{from:'2026-09-20T12:00:01Z',to:'2026-09-20T12:00:02Z'}];
 expect(platformSchema.safeParse({...base(),positions:[{...cash('100'),archivePeriods}]}).success).toBe(false);
});
it('uses equivalent ISO instants for tracking and archive history boundaries',()=>{
 const p={...cash('100'),trackingStartedAt:'2026-09-20T12:00:00Z',archivePeriods:[]},q={...cash('150'),id:'other'};
 let s=captureValuations({...base(),positions:[p,q]},[],now);
 expect(wealthHistory(s)[0]!.points[0]!.value).toBe('25000');
 const archivedAt='2026-09-21T12:00:00Z';
 s=platformSchema.parse({...s,positions:s.positions.map(x=>x.id===p.id?{...x,archivedAt,archivePeriods:[{from:archivedAt}]}:{...x,valuation:{...x.valuation!,observedAt:new Date(now+86400000).toISOString()}})});
 s=captureValuations(s,[],now+86400000);
 expect(wealthHistory(s)[0]!.points.map(point=>point.value)).toEqual(['25000','15000']);
});
