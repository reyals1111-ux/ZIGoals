/** Read-only projections of existing Positions and canonical Goal accounting. */
import {ASSET_CLASSES,allocate,allocationBalance,goalProgress,positionSync,snapshotIsStale,type AssetClass,type Platform,type Position,type PrivateGoal} from './positions';
import {marketQuoteSchema,quoteIsStale,quoteValue,sameAsset,type MarketQuote} from './market-quotes';
export const ASSET_COLORS:Record<AssetClass,string>={Crypto:'#38d9f5',Stablecoins:'#70e1c3',Stocks:'#8c9cff','Precious Metals':'#ecc779',Property:'#ce92ff',Cash:'#80baff',Custom:'#ee8fce'};
export function assetClassOf(p:Position):AssetClass{
 if(p.sourceType!=='MANUAL'&&p.asset==='ZIG')return 'Crypto';
 if(p.assetClass)return p.assetClass;
 // Older manual-source records carry an explicit category in their provenance.
 const old=ASSET_CLASSES.find(c=>p.provenance.toLowerCase().startsWith(`manual ${c.toLowerCase()};`));
 return old??(p.asset==='ZIG'?'Crypto':'Custom');
}
export type IntendedAllocation={positionId:string;quantity:string};
export function createAllocatedGoal(s:Platform,goal:PrivateGoal,selected:readonly IntendedAllocation[]):Platform{
 if(s.goals.some(g=>g.id===goal.id))throw Error('Goal already exists.');
 if(new Set(selected.map(a=>a.positionId)).size!==selected.length)throw Error('Choose each Position once.');
 return selected.reduce((next,a)=>allocate(next,goal.id,a.positionId,a.quantity),{...s,goals:[...s.goals,goal]});
}
export type AssetMix={assetClass:AssetClass;value:string;percent:number;color:string};
export function goalAssetMix(s:Platform,g:PrivateGoal,now=Date.now(),quotes:readonly MarketQuote[]=[]):AssetMix[]{
 if(g.type!=='VALUE')return [];
 const progress=goalProgress(s,g.id,now,quotes),totals=new Map<AssetClass,bigint>();
 for(const b of progress.breakdown){const p=s.positions.find(p=>p.id===b.positionId)!;const c=assetClassOf(p);totals.set(c,(totals.get(c)??0n)+BigInt(b.counted));}
 // Distribute canonical hundredths, so displayed percentages sum exactly to progress.
 let accumulated=0n,previous=0n;
 return ASSET_CLASSES.filter(c=>totals.has(c)).map(c=>{const value=totals.get(c)!;accumulated+=value;const end=accumulated*10000n/BigInt(progress.target);const percent=Number(end-previous)/100;previous=end;return {assetClass:c,value:value.toString(),percent,color:ASSET_COLORS[c]};});
}
export function ringSegments(mix:readonly AssetMix[],progressPct:string){
 const total=mix.reduce((n,m)=>n+m.percent,0),filled=Math.max(0,Math.min(100,Number(progressPct)));let offset=0;
 return mix.filter(m=>m.percent>0).map(m=>{const size=total?m.percent/total*filled:0;const segment={...m,size,offset};offset+=size;return segment;});
}
export function wealthOverview(s:Platform,now=Date.now(),quotes:readonly MarketQuote[]=[]){
 const rows=s.positions.map(p=>{
  const balance=allocationBalance(s,p.id),observed=BigInt(p.quantity),allocated=BigInt(balance.allocated)>observed?observed:BigInt(balance.allocated);
  const matching=quotes.filter(q=>marketQuoteSchema.safeParse(q).success&&sameAsset(p,q.base)&&q.currency==='USD'&&Date.parse(q.observedAt)<=now+60000).sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))[0];
  const currency=p.valuation?.currency??(matching?'USD':undefined);
  const value=p.valuation?BigInt(p.valuation.value)*100n/10n**BigInt(p.valuation.decimals):matching?BigInt(quoteValue(p.quantity,p.decimals,matching,2)):undefined;
  const allocatedValue=value===undefined?undefined:observed?value*allocated/observed:0n;
  return {position:p,assetClass:assetClassOf(p),balance,currency,value,allocatedValue,unallocatedValue:value===undefined?undefined:value-allocatedValue!,stale:['STALE','ERROR'].includes(positionSync(p,now))||(p.valuation?.source==='VERIFIED'&&snapshotIsStale(p.valuation.observedAt,now))||(!!matching&&!p.valuation&&quoteIsStale(matching,now))};
 });
 const summarize=(items:typeof rows)=>{
  const currencies=[...new Set(items.flatMap(r=>r.currency?[r.currency]:[]))];
  const subtotals=currencies.map(currency=>{const members=items.filter(r=>r.currency===currency&&r.value!==undefined);return {currency,value:members.reduce((n,r)=>n+r.value!,0n),allocated:members.reduce((n,r)=>n+r.allocatedValue!,0n),unallocated:members.reduce((n,r)=>n+r.unallocatedValue!,0n)};});
  return {subtotals,incomplete:items.some(r=>r.value===undefined)||currencies.length>1};
 };
 return {rows,...summarize(rows),categories:ASSET_CLASSES.map(assetClass=>{const items=rows.filter(r=>r.assetClass===assetClass);return {assetClass,items,...summarize(items)};})};
}
