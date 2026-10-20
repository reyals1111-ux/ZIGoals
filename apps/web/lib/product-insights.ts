import {formatUnits} from '@zigoals/chain-config';
import {fundingHealth} from './goal-intelligence';
import {wealthOverview,ASSET_COLORS,WEALTH_CLASSES} from './wealth';
import type {Platform,Position} from './positions';
import {verifiedMarketQuote,quoteMatchesPosition,type MarketQuote} from './market-quotes';
import {marketRefKey,type MarketAssetRef} from './market-assets';
import {formatPlainDecimal} from './visual-format';
export function referencePriceLabel(quote:MarketQuote){const value=formatPlainDecimal(formatUnits(quote.price,quote.priceDecimals));return `${quote.currency==='USD'?'$':quote.currency==='EUR'?'€':''}${value}${['USD','EUR'].includes(quote.currency)?'':` ${quote.currency}`}`;}
/** Reference prices are independent public evidence, never derived from a holding total. */
export function referenceQuote(ref:MarketAssetRef,currency:string,quotes:readonly MarketQuote[],now=Date.now()):MarketQuote|undefined{
 return quotes.flatMap(raw=>{try{const quote=verifiedMarketQuote(raw,now);if(quote.currency!==currency)return [];const matches=quote.marketRef?marketRefKey(quote.marketRef)===marketRefKey(ref)&&(ref.kind!=='rwa'||quote.marketRef.kind==='rwa'&&ref.assetType===quote.marketRef.assetType):ref.kind==='coin'&&ref.id==='zignaly'&&quote.providerAssetId==='zignaly';return matches?[quote]:[];}catch{return [];}}).sort((a,b)=>Date.parse(b.observedAt??b.fetchedAt!)-Date.parse(a.observedAt??a.fetchedAt!))[0];
}
export function holdingUnitQuote(position:Position,quotes:readonly MarketQuote[],now=Date.now()):MarketQuote|undefined{
 if(position.marketRef)return referenceQuote(position.marketRef,position.quoteCurrency??'USD',quotes,now);
 if(position.providerId!=='native-zig')return undefined;
 return quotes.flatMap(raw=>{try{const quote=verifiedMarketQuote(raw,now);return quote.currency===(position.quoteCurrency??'USD')&&quoteMatchesPosition({...position,valuationMode:undefined},quote)?[quote]:[];}catch{return [];}}).sort((a,b)=>Date.parse(b.observedAt??b.fetchedAt!)-Date.parse(a.observedAt??a.fetchedAt!))[0];
}
/** A part of a total in basis points (hundredths of a percent), to the nearest one. */
const nearestBasisPoints=(part:bigint,total:bigint)=>total>0n?Number((part*20000n+total)/(2n*total)):0;
/**
 * Session AF Gate C (design critique 1): each class's share of a total to the nearest hundredth of a percent, adding up to
 * exactly 100 % (the largest remainders take the last basis points). Each is the holding's own figure when a class holds
 * one valued holding, so the composition, the allocation bar and the top holdings never read 4.99 % and 4.98 % for the same
 * money (the earlier running sum had carried its rounding into the next class).
 */
export function shareBasisPoints(values:readonly bigint[],total:bigint):number[]{
 if(total<=0n)return values.map(()=>0);
 const floors=values.map(v=>v*10000n/total),rest=values.map((v,i)=>({i,r:v*10000n-floors[i]!*total}));
 let missing=10000-floors.reduce((n,f)=>n+Number(f),0);const out=floors.map(Number);
 for(const {i} of [...rest].sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1)){if(missing<=0)break;out[i]!+=1;missing--;}
 return out;
}
export function portfolioComposition(overview:ReturnType<typeof wealthOverview>){
 return overview.subtotals.map(total=>{
  // Session AF Gate C (design critique 1): the classes are Wealth's one class map (an ETF is "ETFs" here as everywhere), in
  // its one order, each in its one colour (lib/wealth.ts).
  const members=overview.rows.filter(r=>r.currency===total.currency&&r.value!==undefined),amounts=new Map<string,{value:bigint;color:string}>();
  for(const label of WEALTH_CLASSES){const value=members.filter(row=>row.wealthClass===label).reduce((n,row)=>n+row.value!,0n);if(members.some(row=>row.wealthClass===label))amounts.set(label,{value,color:ASSET_COLORS[label]});}
  const shares=shareBasisPoints([...amounts.values()].map(s=>s.value),total.value);const segments=[...amounts].map(([label,s],i)=>({label,...s,basisPoints:shares[i]!}));
  const topHoldings=[...members].sort((a,b)=>a.value! === b.value!?a.position.id.localeCompare(b.position.id):a.value! > b.value!?-1:1).slice(0,5).map(row=>({id:row.position.id,name:row.position.providerId,symbol:row.position.asset,value:row.value!,basisPoints:nearestBasisPoints(row.value!,total.value)}));
  return {currency:total.currency,total:total.value,allocated:total.allocated,available:total.unallocated,allocatedBasisPoints:total.value?Number(total.allocated*10000n/total.value):0,incomplete:overview.rows.some(r=>r.value===undefined),segments,topHoldings};
 });
}
export function fundingAgenda(data:Platform,now:number,quotes:readonly MarketQuote[]){return data.goals.filter(g=>g.status==='active'&&g.type!=='PROJECT'&&g.plan?.active).map(g=>{const f=fundingHealth(data,g.id,now,quotes);return {goalId:g.id,name:g.name,asset:g.plan!.asset,decimals:g.plan!.decimals,amount:g.plan!.amount,cadence:g.plan!.cadence,nextDate:f.nextDate,overdue:f.overdue,variance:f.variance,unit:g.asset,unitDecimals:g.decimals,status:f.status,href:`/app/goals/tracked/${g.id}#funding-wealth`};}).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.nextDate??'9999').localeCompare(b.nextDate??'9999'));}
export type AttentionItem={id:string;kind:'value'|'refresh'|'allocation'|'overdue'|'plan'|'review';title:string;detail:string;action:string;href:string;positionId?:string;goalId?:string};
export function needsAttention(data:Platform,now:number,quotes:readonly MarketQuote[]):AttentionItem[]{
 const items:AttentionItem[]=[];for(const row of wealthOverview(data,now,quotes).rows){const p=row.position,base={id:`asset:${p.id}`,positionId:p.id,href:`/app/wealth/asset/${encodeURIComponent(p.id)}`};if(row.balance.deficit!=='0')items.push({...base,kind:'allocation',title:`Rebalance ${p.providerId}`,detail:'Goal allocations exceed the recorded holding.',action:'Review allocations'});else if(row.value===undefined)items.push({...base,kind:'value',title:`Value ${p.providerId}`,detail:'A price or manual valuation is needed.',action:'Add a valuation'});else if(row.stale)items.push({...base,kind:'refresh',title:`Refresh ${p.providerId}`,detail:'The last recorded evidence needs another look.',action:'Review asset'});}
 for(const g of data.goals.filter(g=>g.status==='active'&&g.type!=='PROJECT')){const f=fundingHealth(data,g.id,now,quotes),base={id:`goal:${g.id}`,goalId:g.id,href:`/app/goals/tracked/${g.id}#funding-wealth`};if(f.status==='COMPLETED')continue;if(f.status==='REVIEW')items.push({...base,kind:'review',title:`Review ${g.name}`,detail:'Some funding evidence needs attention.',action:'Review funding'});else if(f.overdue)items.push({...base,kind:'overdue',title:`Catch up on ${g.name}`,detail:'Recorded contributions are below your plan through today.',action:'Record a contribution'});else if(!g.plan?.active)items.push({...base,kind:'plan',title:`Set a rhythm for ${g.name}`,detail:'Add a contribution plan to see your next funding date.',action:'Create a plan'});}
 return items;
}
export type MarketRow={key:string;ref:MarketAssetRef;name:string;symbol:string;positionIds:string[];favourite:boolean;category:string};
export const FEATURED_MARKETS:{ref:MarketAssetRef;name:string;symbol:string}[]=[
 ...[['bitcoin','Bitcoin','BTC'],['ethereum','Ethereum','ETH'],['zignaly','ZIG','ZIG'],['usd-coin','USD Coin','USDC'],['solana','Solana','SOL']].map(([id,name,symbol])=>({ref:{provider:'coingecko' as const,kind:'coin' as const,id:id!},name:name!,symbol:symbol!})),
 ...[['apple','Apple','AAPL','stock'],['nvidia','Nvidia','NVDA','stock'],['gold','Gold','XAU','commodity'],['silver','Silver','XAG','commodity'],['vanguard-s-p-500-etf','Vanguard S&P 500 ETF','VOO','etf']].map(([id,name,symbol,assetType])=>({ref:{provider:'coingecko' as const,kind:'rwa' as const,id:id!,assetType:assetType as 'stock'|'etf'|'commodity'},name:name!,symbol:symbol!})),
];
export function marketCategory(ref:MarketAssetRef,symbol=''){return ref.kind==='rwa'?ref.assetType==='etf'?'ETFs':ref.assetType==='commodity'?'Precious Metals':'Stocks':['USDC','USDT','DAI'].includes(symbol.toUpperCase())?'Stablecoins':'Crypto';}
export function marketUniverse(data:Platform):MarketRow[]{
 const rows=new Map<string,MarketRow>();for(const p of data.positions.filter(p=>!p.archivedAt&&p.marketRef)){const ref=p.marketRef!,key=marketRefKey(ref),previous=rows.get(key);rows.set(key,{key,ref,name:p.providerId,symbol:p.asset,positionIds:[...(previous?.positionIds??[]),p.id],favourite:false,category:marketCategory(ref,p.asset)});}for(const f of data.watchlist){const key=marketRefKey(f.ref),previous=rows.get(key);rows.set(key,{key,ref:f.ref,name:f.name,symbol:f.symbol,positionIds:previous?.positionIds??[],favourite:true,category:marketCategory(f.ref,f.symbol)});}return [...rows.values()];
}
