import {type Platform,type ValuationSnapshot} from './positions';
import {wealthHistory,positionTrackedAt} from './wealth';
import {activeFinancialEvents,type EvidenceMoney} from './financial-events';
export const CHANGE_LABELS={contributions:'Contributions and withdrawals',corrections:'Quantity corrections',transfers:'Supported transfers',income:'Recorded income',fees:'Recorded fees',valuation:'Supported valuation movement'} as const;
type Kind=keyof typeof CHANGE_LABELS;
export type WealthChangeRecord={id:string;at:string;kind:Kind;value:string;exact:EvidenceMoney;label:string;href:string};
const normalized=(m:Pick<EvidenceMoney,'value'|'decimals'>)=>BigInt(m.value)*10n**BigInt(18-m.decimals);
const cents=(m:Pick<EvidenceMoney,'value'|'decimals'>)=>BigInt(m.value)*100n/10n**BigInt(m.decimals);
/** Explanation of recorded owned-wealth snapshots, not a return or cash balance. */
export function ownedWealthChanges(s:Platform,currency:string,start:string,end:string){
 const series=wealthHistory(s).find(h=>h.currency===currency),opening=series?.points.find(p=>p.at===start),closing=series?.points.find(p=>p.at===end);
 if(!opening||!closing||Date.parse(start)>=Date.parse(end))throw Error('Choose two complete recorded wealth observations in the same currency.');
 const records:WealthChangeRecord[]=[],warnings:string[]=[],inside=(at:string)=>Date.parse(at)>Date.parse(start)&&Date.parse(at)<=Date.parse(end),totals:Record<Kind,bigint>={contributions:0n,corrections:0n,transfers:0n,income:0n,fees:0n,valuation:0n};
 const add=(record:WealthChangeRecord)=>{records.push(record);totals[record.kind]+=BigInt(record.value);};
 const positions=new Map(s.positions.map(p=>[p.id,p])),reversed=new Set(s.contributions.flatMap(e=>e.reversesId?[e.reversesId]:[])),funded=new Set<string>();
 for(const e of s.contributions){if(!inside(e.occurredAt)||e.goalScope!=='private'||e.fundingMode!=='FUND_GOAL'||e.reversesId||reversed.has(e.id)||!e.positionId||!positions.has(e.positionId))continue;
  const p=positions.get(e.positionId)!;if(!positionTrackedAt(s,p,e.occurredAt))continue;const value=e.valueAtEvent?.currency===currency?e.valueAtEvent:p.asset===currency?{value:e.quantity,decimals:e.decimals,currency}:null;
  if(!value){warnings.push('A funding record has no compatible event-time value.');continue;}funded.add(e.id);add({id:e.id,at:e.occurredAt,kind:'contributions',value:(cents(value)*(e.direction==='IN'?1n:-1n)).toString(),exact:value,label:'Goal funding · '+e.asset,href:'/app/goals/tracked/'+encodeURIComponent(e.goalId)+'#goal-event-'+encodeURIComponent('contribution:'+e.id)});
 }
 const events=(s.financialPortfolios??[]).flatMap(p=>activeFinancialEvents(s,p.id)).filter(e=>inside(e.occurredAt)&&e.kind!=='valuation'&&e.kind!=='void');
 for(const e of events){if(e.kind==='void'||e.kind==='valuation')continue;const p=positions.get(e.relatedPositionId??'');if(!p){warnings.push('Statement records without a Position link remain unlinked and excluded.');continue;}if(e.amount.currency!==currency||!positionTrackedAt(s,p,e.occurredAt))continue;
  if(e.relatedContributionId&&funded.has(e.relatedContributionId)){warnings.push('A statement link to an already counted funding record is retained without double-counting.');continue;}
  let kind:Kind,sign=1n;if(e.kind==='external_flow'){kind='contributions';sign=e.direction==='IN'?1n:-1n;}else if(e.kind==='income')kind='income';else if(e.kind==='fee'){kind='fees';sign=-1n;}else if(e.kind==='quantity_correction'&&e.changeDirection){kind='corrections';sign=e.changeDirection==='IN'?1n:-1n;}else if(e.kind==='transfer'&&e.transferGroupId&&e.changeDirection){
   const legs=events.filter(other=>other.kind==='transfer'&&other.transferGroupId===e.transferGroupId&&other.relatedPositionId&&positions.has(other.relatedPositionId)&&positionTrackedAt(s,positions.get(other.relatedPositionId)!,other.occurredAt));
   if(legs.length!==2||legs[0]!.relatedPositionId===legs[1]!.relatedPositionId||legs.some(v=>v.kind!=='transfer'||!v.changeDirection||v.amount.currency!==currency)||legs.reduce((n,v)=>n+(v.kind==='transfer'?normalized(v.amount)*(v.changeDirection==='IN'?1n:-1n):0n),0n)!==0n){warnings.push('An incomplete or incompatible transfer stays unclassified.');continue;}kind='transfers';sign=e.changeDirection==='IN'?1n:-1n;
  }else{warnings.push('A recorded unclassified change or correction without direction remains in the reconciliation gap.');continue;}
  add({id:e.id,at:e.occurredAt,kind,value:(cents(e.amount)*sign).toString(),exact:e.amount,label:e.sourceLabel,href:'#financial-event-'+encodeURIComponent(e.id)});
 }
 const latest=(id:string,at:string):ValuationSnapshot|undefined=>s.valuationSnapshots.filter(v=>v.positionId===id&&v.currency===currency&&Date.parse(v.capturedAt)<=Date.parse(at)).sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)||b.id.localeCompare(a.id))[0];
 for(const p of s.positions){const a=latest(p.id,start),b=latest(p.id,end);if(!a&&!b)continue;if(!a||!b||!positionTrackedAt(s,p,start)||!positionTrackedAt(s,p,end)){warnings.push('Tracking membership changed; adding or archiving an asset is not assumed to be a deposit or withdrawal.');continue;}
  // Only stable quantities with provider price evidence support an attributed
  // valuation movement. Other residuals are not relabelled as return or income.
  if(a.quantity!==b.quantity||a.quantityDecimals!==b.quantityDecimals)continue;
  if(s.valuationSnapshots.some(v=>v.positionId===p.id&&inside(v.capturedAt)&&(v.quantity!==a.quantity||v.quantityDecimals!==a.quantityDecimals))||s.contributions.some(v=>v.positionId===p.id&&v.fundingMode==='FUND_GOAL'&&inside(v.occurredAt))||events.some(v=>v.relatedPositionId===p.id&&['external_flow','transfer','quantity_correction'].includes(v.kind)))continue;
  if(a.marketRef&&b.marketRef&&a.source==='COINGECKO'&&b.source==='COINGECKO'&&a.price&&b.price&&JSON.stringify(a.marketRef)===JSON.stringify(b.marketRef)){
   const value=cents(b)-cents(a);if(value)add({id:b.id,at:b.capturedAt,kind:'valuation',value:value.toString(),exact:{value:(value<0n?-value:value).toString(),decimals:2,currency},label:p.providerId+' · retained price observations',href:'/app/wealth/asset/'+encodeURIComponent(p.id)});
  }
 }
 const change=BigInt(closing.value)-BigInt(opening.value),explained=Object.values(totals).reduce((n,v)=>n+v,0n),gap=change-explained;
 if(gap!==0n)warnings.push('Incomplete quantity, cash-flow or valuation evidence leaves an unexplained difference. This is not an investment return.');
 return {currency,start,end,opening:opening.value,closing:closing.value,change:change.toString(),totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v.toString()])) as Record<Kind,string>,gap:gap.toString(),records:records.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id)),warnings:[...new Set(warnings)]};
}
