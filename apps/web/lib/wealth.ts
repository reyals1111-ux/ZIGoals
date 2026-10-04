/** Read-only projections of existing Positions and canonical Goal accounting. */
import {ASSET_CLASSES,allocate,allocationBalance,goalProgress,positionSync,snapshotIsStale,type AssetClass,type Platform,type Position,type PrivateGoal} from './positions';
import {isNativeZig,marketQuoteSchema,quoteIsStale,quoteMatchesPosition,quoteValue,type MarketQuote} from './market-quotes';
import {marketRequestKey,nativeZigRequest,uniqueMarketRequests,type MarketAssetRef,type MarketQuoteRequest} from './market-assets';
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
function automaticMarketRef(p:Position):MarketAssetRef|undefined{
 if(p.marketRef&&p.valuationMode==='automatic')return p.marketRef;
 return !p.marketRef&&p.valuationMode!=='manual'&&isNativeZig(p)&&p.providerId==='native-zig'?nativeZigRequest.marketRef:undefined;
}
function deduplicatedRequests(requests:MarketQuoteRequest[]):MarketQuoteRequest[]{return uniqueMarketRequests([...new Map(requests.map(request=>[marketRequestKey(request),request])).values()]);}
/** Build public quote requests without exposing Position IDs, quantities, Goals or allocations. */
export function wealthMarketRequests(s:Platform):MarketQuoteRequest[]{
 const requests:MarketQuoteRequest[]=[];
 for(const p of s.positions.filter(p=>!p.archivedAt)){
  const marketRef=automaticMarketRef(p);if(!marketRef)continue;
  const currencies=new Set<'USD'|'EUR'>([p.quoteCurrency??'USD']);
  for(const allocation of s.allocations.filter(a=>a.positionId===p.id)){
   const goal=s.goals.find(g=>g.id===allocation.goalId);
   if(goal?.type==='VALUE'&&goal.status!=='closed'&&(goal.asset==='USD'||goal.asset==='EUR'))currencies.add(goal.asset);
  }
  for(const currency of currencies)if(marketRef.kind!=='rwa'||currency==='USD')requests.push({marketRef,currency});
 }
 return deduplicatedRequests(requests);
}
/** Quote only public pairs consumed by allocated, open Value Goals on this surface. */
export function goalMarketRequests(s:Platform,goalId?:string):MarketQuoteRequest[]{
 const requests:MarketQuoteRequest[]=[];
 for(const goal of s.goals.filter(goal=>goal.type==='VALUE'&&goal.status!=='closed'&&(!goalId||goal.id===goalId)&&(goal.asset==='USD'||goal.asset==='EUR'))){
  const currency:MarketQuoteRequest['currency']=goal.asset==='USD'?'USD':'EUR';
  for(const allocation of s.allocations.filter(allocation=>allocation.goalId===goal.id)){
   const position=s.positions.find(position=>position.id===allocation.positionId);if(!position||position.valuation?.currency===currency)continue;
   const marketRef=automaticMarketRef(position);if(!marketRef||marketRef.kind==='rwa'&&currency!=='USD')continue;
   requests.push({marketRef,currency});
  }
 }
 return deduplicatedRequests(requests);
}

export type WealthHistory={currency:string;decimals:2;points:{at:string;value:string}[];change:string;changePercent?:string};
/** Reconstruct only complete currency totals from recorded local facts; never backfill a missing Position. */
// Session G, Part 2: Platform records are never changed in place, so derived indexes and results are kept per object
// (and rebuilt if the arrays they read were replaced). Results are identical to computing them afresh.
const eventIndex=new WeakMap<Platform,{events:Platform['assetEvents'];byPosition:Map<string,Platform['assetEvents']>}>();
function eventsOf(s:Platform,positionId:string){
 let index=eventIndex.get(s);
 if(!index||index.events!==s.assetEvents){
  const byPosition=new Map<string,Platform['assetEvents']>();
  for(const event of s.assetEvents){const list=byPosition.get(event.positionId);if(list)list.push(event);else byPosition.set(event.positionId,[event]);}
  for(const list of byPosition.values())list.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  index={events:s.assetEvents,byPosition};eventIndex.set(s,index);
 }
 return index.byPosition.get(positionId)??[];
}
export function positionTrackedAt(s:Platform,position:Position,at:string){const id=position.id;if(position.trackingStartedAt&&Date.parse(position.trackingStartedAt)>Date.parse(at))return false;if(position.archivePeriods)return !position.archivePeriods.some(period=>Date.parse(period.from)<=Date.parse(at)&&(!period.to||Date.parse(period.to)>Date.parse(at)));const events=eventsOf(s,id);const created=events.find(e=>e.kind==='added');if(created&&Date.parse(created.at)>Date.parse(at))return false;const lifecycle=events.filter(e=>Date.parse(e.at)<=Date.parse(at)&&['archived','restored'].includes(e.kind)).at(-1);return lifecycle?lifecycle.kind!=='archived':!position.archivedAt||Date.parse(position.archivedAt)>Date.parse(at);}
const historyCache=new WeakMap<Platform,{positions:Platform['positions'];snapshots:Platform['valuationSnapshots'];events:Platform['assetEvents'];result:WealthHistory[]}>();
export function wealthHistory(s:Platform):WealthHistory[]{
 const cached=historyCache.get(s);
 if(cached&&cached.positions===s.positions&&cached.snapshots===s.valuationSnapshots&&cached.events===s.assetEvents)return cached.result;
 const result=computeWealthHistory(s);historyCache.set(s,{positions:s.positions,snapshots:s.valuationSnapshots,events:s.assetEvents,result});return result;
}
function computeWealthHistory(s:Platform):WealthHistory[]{
 const byId=new Map(s.positions.map(p=>[p.id,p]));
 const currencyOf=(p:Position)=>p.valuation?.currency??(p.valuationMode==='automatic'||p.marketRef||isNativeZig(p)?p.quoteCurrency??'USD':undefined);
 const currencies=[...new Set(s.positions.flatMap(p=>currencyOf(p)?[currencyOf(p)!]:[]))];
 return currencies.flatMap(currency=>{
  const required=s.positions.filter(p=>currencyOf(p)===currency).map(p=>p.id),requiredIds=new Set(required);
  const snapshots=s.valuationSnapshots.filter(v=>v.currency===currency&&requiredIds.has(v.positionId)).sort((a,b)=>Date.parse(a.capturedAt)-Date.parse(b.capturedAt));
  const latest=new Map<string,bigint>(),points:{at:string;value:string}[]=[];
  for(let index=0;index<snapshots.length;){
   const at=snapshots[index]!.capturedAt;
   const simultaneous=new Map<string,typeof snapshots>();
   while(index<snapshots.length&&Date.parse(snapshots[index]!.capturedAt)===Date.parse(at)){const snapshot=snapshots[index++]!;simultaneous.set(snapshot.positionId,[...simultaneous.get(snapshot.positionId)??[],snapshot]);}
   for(const [id,group]of simultaneous){
    const facts=group.map(({id,capturedAt,...value})=>{void id;void capturedAt;return JSON.stringify(value);});
    if(new Set(facts).size!==1){latest.delete(id);continue;} // competing device observations stay unresolved
    const snapshot=group[0]!,value=BigInt(snapshot.value)*100n/10n**BigInt(snapshot.decimals);latest.set(id,value);
   }
   const active=required.filter(id=>positionTrackedAt(s,byId.get(id)!,at));
   if(active.length&&active.every(id=>latest.has(id)))points.push({at,value:active.reduce((total,id)=>total+latest.get(id)!,0n).toString()});
  }
  if(!points.length)return [];
  const first=BigInt(points[0]!.value),last=BigInt(points.at(-1)!.value),change=last-first;
  const hundredths=first===0n?0n:change*10000n/first,absolute=hundredths<0n?-hundredths:hundredths;
  return [{currency,decimals:2 as const,points,change:change.toString(),...(points.length>1&&first!==0n?{changePercent:`${hundredths<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`}:{})}];
 });
}

type OverviewInputs={s:Platform;positions:Platform['positions'];allocations:Platform['allocations'];snapshots:Platform['valuationSnapshots'];events:Platform['assetEvents'];now:number;quotes:readonly MarketQuote[]};
let lastOverview:{inputs:OverviewInputs;result:ReturnType<typeof computeWealthOverview>}|undefined;
/** Today shows several summaries of the same records in one render; the latest result is reused for the same inputs. */
export function wealthOverview(s:Platform,now=Date.now(),quotes:readonly MarketQuote[]=[]){
 const inputs:OverviewInputs={s,positions:s.positions,allocations:s.allocations,snapshots:s.valuationSnapshots,events:s.assetEvents,now,quotes};
 const last=lastOverview?.inputs;
 if(last&&(Object.keys(inputs) as (keyof OverviewInputs)[]).every(key=>last[key]===inputs[key]))return lastOverview!.result;
 const result=computeWealthOverview(s,now,quotes);lastOverview={inputs,result};return result;
}
function computeWealthOverview(s:Platform,now:number,quotes:readonly MarketQuote[]){
 const validQuotes=quotes.filter(q=>marketQuoteSchema.safeParse(q).success);
 const rows=s.positions.filter(p=>!p.archivedAt).map(p=>{
  const balance=allocationBalance(s,p.id),observed=BigInt(p.quantity),allocated=BigInt(balance.allocated)>observed?observed:BigInt(balance.allocated);
  const requestedCurrency=p.quoteCurrency??'USD';
  const matching=validQuotes.filter(q=>quoteMatchesPosition(p,q)&&q.currency===requestedCurrency&&Date.parse(q.observedAt??q.fetchedAt??'')<=now+60000).sort((a,b)=>Date.parse(b.observedAt??b.fetchedAt??'')-Date.parse(a.observedAt??a.fetchedAt??''))[0];
  const currency=p.valuation?.currency??matching?.currency??(p.valuationMode==='automatic'?requestedCurrency:undefined);
  const value=p.valuation?BigInt(p.valuation.value)*100n/10n**BigInt(p.valuation.decimals):matching?BigInt(quoteValue(p.quantity,p.decimals,matching,2)):undefined;
  const allocatedValue=value===undefined?undefined:observed?value*allocated/observed:0n;
  const valuationState=p.valuation?.source==='MANUAL'?'manual':p.valuation?snapshotIsStale(p.valuation.observedAt,now)?'stale':'fresh':matching?quoteIsStale(matching,now)?'stale':'fresh':'missing';
  return {position:p,assetClass:assetClassOf(p),balance,currency,value,allocatedValue,unallocatedValue:value===undefined?undefined:value-allocatedValue!,valuationState,source:p.valuation?.source==='MANUAL'?'Manual value':p.valuation?'Verified Position value':matching?.source,valuedAt:p.valuation?.observedAt??matching?.observedAt??matching?.fetchedAt,stale:['STALE','ERROR'].includes(positionSync(p,now))||valuationState==='stale'};
 });
 const summarize=(items:typeof rows)=>{
  const currencies=[...new Set(items.flatMap(r=>r.currency&&r.value!==undefined?[r.currency]:[]))];
  const subtotals=currencies.map(currency=>{const members=items.filter(r=>r.currency===currency&&r.value!==undefined);return {currency,value:members.reduce((n,r)=>n+r.value!,0n),allocated:members.reduce((n,r)=>n+r.allocatedValue!,0n),unallocated:members.reduce((n,r)=>n+r.unallocatedValue!,0n)};});
  return {subtotals,incomplete:items.some(r=>r.value===undefined)||currencies.length>1};
 };
 return {rows,...summarize(rows),history:wealthHistory(s),categories:ASSET_CLASSES.map(assetClass=>{const items=rows.filter(r=>r.assetClass===assetClass);return {assetClass,items,...summarize(items)};})};
}
