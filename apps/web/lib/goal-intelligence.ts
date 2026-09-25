/** Private financial facts and zero-return forecasts. No network or execution dependencies. */
import {contributionEventSchema,platformSchema,localGoalLocked,confirmedLocalObservation,goalProgress,planScenario,rescaleUnits,scenarioHorizon,type ContributionEvent,type Platform,type PrivateGoal,type GoalHistory,type ValuationSnapshot} from './positions';
import {marketQuoteSchema,quoteMatchesPosition,quoteValue,type MarketQuote} from './market-quotes';
import type {z} from 'zod';
import {capturePlanChanges,captureGoalLifecycle,revisionInstallments,effectiveContributionPlan} from './plan-revisions';
export const MAX_VALUATION_SNAPSHOTS=50000;
export const MAX_GOAL_HISTORY=50000;
const max=(a:bigint,b:bigint)=>a>b?a:b;
function timestamp(now:number){if(!Number.isFinite(now))throw Error('Invalid capture time.');return new Date(now).toISOString();}
/** Monetary equivalence only uses the event's contemporaneous evidence, never today's price. */
export function eventValueForGoal(e:ContributionEvent,g:Pick<PrivateGoal,'asset'|'decimals'|'type'>):bigint|null {
 if(e.asset===g.asset)return BigInt(rescaleUnits(e.quantity,e.decimals,g.decimals));
 if(g.type==='VALUE'&&e.valueAtEvent?.currency===g.asset)return BigInt(rescaleUnits(e.valueAtEvent.value,e.valueAtEvent.decimals,g.decimals));
 return null;
}
export function appendContribution(s:Platform,input:z.input<typeof contributionEventSchema>):Platform {
 const e=contributionEventSchema.parse(input),g=s.goals.find(g=>g.id===e.goalId);
 const duplicate=s.contributions.find(old=>old.id===e.id||(!e.reversesId&&e.transactionRef&&old.transactionRef===e.transactionRef&&!old.reversesId&&old.goalId===e.goalId&&old.goalScope===e.goalScope));
 if(duplicate){
  const comparable=(v:ContributionEvent)=>{const {id,...fact}=v;void id;return fact;};
  if(JSON.stringify(comparable(duplicate))===JSON.stringify(comparable(e)))return s;
  throw Error('Contribution identity conflicts with an existing fact.');
 }
 if(e.goalScope==='private'){
  if(!g||g.status==='closed'||g.type==='PROJECT')throw Error('Choose an open financial Goal.');
  if(g.locked)throw Error('Unlock this Goal before editing.');
 }else if(localGoalLocked(s,e.goalId)&&!confirmedLocalObservation(e))throw Error('Unlock this Goal before editing.');
 if(e.positionId&&!s.positions.some(p=>p.id===e.positionId))throw Error('Position unavailable.');
 if(e.provenance==='CHAIN_CONFIRMED'&&!e.transactionRef)throw Error('Confirmed transaction evidence is required.');
 return platformSchema.parse({...s,contributions:[...s.contributions,e]});
}
export function reverseContribution(s:Platform,id:string,reversalId:string,occurredAt:string,note?:string):Platform {
 const e=s.contributions.find(e=>e.id===id);
 if(!e||e.reversesId||s.contributions.some(r=>r.reversesId===id))throw Error('Only an unreversed original contribution can be reversed.');
 return appendContribution(s,{...e,id:reversalId,direction:e.direction==='IN'?'OUT':'IN',transactionRef:undefined,reversesId:id,occurredAt,note});
}
export function contributionTotals(s:Platform,goalId:string,now=Date.now(),scope:'private'|'local'='private',unitContext:Pick<PrivateGoal,'asset'|'decimals'|'type'>={asset:'ZIG',decimals:18,type:'QUANTITY'}) {
 const g=scope==='private'?s.goals.find(g=>g.id===goalId):unitContext;
 const events=s.contributions.filter(e=>e.goalId===goalId&&e.goalScope===scope&&Date.parse(e.occurredAt)<=now);
 let contributed=0n,withdrawn=0n,rewardIncome=0n,unvaluedCount=0;
 for(const e of events){
  const value=g?eventValueForGoal(e,g):null;
  if(value===null){unvaluedCount++;continue;}
  if(e.provenance==='REWARD_INCOME')rewardIncome+=e.direction==='IN'?value:-value;
  else if(e.direction==='IN')contributed+=value;else withdrawn+=value;
 }
 const latest=events.filter(e=>!e.reversesId&&e.provenance!=='REWARD_INCOME'&&e.direction==='IN'&&!events.some(r=>r.reversesId===e.id)).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||b.id.localeCompare(a.id))[0];
 return {contributed:contributed.toString(),withdrawn:withdrawn.toString(),net:(contributed-withdrawn).toString(),rewardIncome:rewardIncome.toString(),latest,unvaluedCount};
}
/** Only explicit funding links consume scheduled installments; history and market changes do not. */
export function scheduledFundingCredits(s:Platform,g:PrivateGoal,now:number):Map<string,bigint>{
 const credits=new Map<string,bigint>();
 for(const e of s.contributions){if(e.goalId!==g.id||e.goalScope!=='private'||e.fundingMode!=='FUND_GOAL'||!e.scheduledDate||e.direction!=='IN'||e.reversesId||Date.parse(e.occurredAt)>now||s.contributions.some(r=>r.reversesId===e.id&&Date.parse(r.occurredAt)<=now))continue;const value=eventValueForGoal(e,g);if(value!==null)credits.set(e.scheduledDate,(credits.get(e.scheduledDate)??0n)+value);}
 return credits;
}
export function fundingHealth(s:Platform,goalId:string,now=Date.now(),quotes:readonly MarketQuote[]=[]) {
 const g=s.goals.find(g=>g.id===goalId);if(!g)throw Error('Goal unavailable.');
 const today=timestamp(now).slice(0,10),tomorrow=timestamp(now+86400000).slice(0,10),horizon=scenarioHorizon(today,g.targetDate);
 const progress=goalProgress(s,goalId,now,quotes),totals=contributionTotals(s,goalId,now);
 let plannedThroughToday='0',plannedFuture='0',dates:string[]=[],nextDate:string|null=null,completionDate:string|null=BigInt(progress.current)>=BigInt(progress.target)&&!progress.requiresReview?today:null,planWarning=false;
 if(g.planRevisions?.length&&g.type!=='PROJECT')try {
  const installments=revisionInstallments(g,g.planRevisions[0]!.effectiveFrom,horizon,s.contributions,now);
  plannedThroughToday=installments.filter(x=>x.date<=today).reduce((n,x)=>n+BigInt(x.amount),0n).toString();
  const future=installments.filter(x=>x.date>today&&BigInt(x.remaining)>0n);
  plannedFuture=future.reduce((n,x)=>n+BigInt(x.remaining),0n).toString();dates=future.map(x=>x.date);
  nextDate=installments.find(x=>x.date>=today&&BigInt(x.remaining)>0n)?.date??null;
  let projected=BigInt(progress.current);for(const x of future){projected+=BigInt(x.remaining);if(completionDate===null&&!progress.requiresReview&&projected>=BigInt(progress.target))completionDate=x.date;}
 }catch{planWarning=true;}
 else if(g.plan&&g.type!=='PROJECT')try {
  const credits=scheduledFundingCredits(s,g,now);
  nextDate=planScenario(g,progress.current,g.plan,horizon,today,credits).dates[0]??null;
  plannedThroughToday=planScenario(g,'0',g.plan,today,g.createdAt.slice(0,10)).contributions;
  const future=planScenario(g,progress.current,g.plan,horizon,tomorrow,credits);plannedFuture=future.contributions;dates=future.dates;if(!progress.requiresReview&&completionDate===null)completionDate=future.completionDate;
 }catch{planWarning=true;}
 const variance=BigInt(totals.net)-BigInt(plannedThroughToday),projected=BigInt(progress.current)+BigInt(plannedFuture),target=BigInt(progress.target);
 const liquidityWarning=s.allocations.some(a=>a.goalId===goalId&&BigInt(a.quantity)>0n&&s.positions.some(p=>p.id===a.positionId&&p.liquidity!=='LIQUID'));
 const warnings=[...(g.planRevisions?.[0]?.priorHistory==='unknown'?['Earlier plan terms are unknown; planned totals start at the first recorded revision. Lifetime actual contributions and this partial plan history cannot establish complete historical pace.']:[]),...(g.planRevisions?.length&&s.contributions.some(e=>e.goalId===g.id&&e.goalScope==='private'&&e.scheduledDate&&!e.installmentId)?['Older date-only funding links are retained as unmatched history; no revision match is assumed.']:[]),...(liquidityWarning?['Some allocated wealth is not liquid.']:[]),...(progress.requiresReview?['Stale, missing or incomplete valuation/quantity evidence needs review.']:[]),...(planWarning?['Plan requires a compatible price assumption.']:[]),...(totals.unvaluedCount?['Some recorded events have no value in this Goal’s unit.']:[])];
 return {current:progress.current,target:progress.target,remaining:progress.remaining,actual:totals.net,rewardIncome:totals.rewardIncome,plannedThroughToday,variance:variance.toString(),plannedFuture,requiredRecurring:dates.length?((BigInt(progress.remaining)+BigInt(dates.length)-1n)/BigInt(dates.length)).toString():null,completionDate,nextDate,overdue:variance<0n,latest:totals.latest,shortfall:max(0n,target-projected).toString(),surplus:max(0n,projected-target).toString(),warnings,status:progress.requiresReview||planWarning||g.planRevisions?.[0]?.priorHistory==='unknown'?'REVIEW':BigInt(progress.current)>=target?'COMPLETED':!effectiveContributionPlan(g,today)?.active&&plannedFuture==='0'?'NO_PLAN':variance<0n?'BEHIND':variance>0n?'AHEAD':projected>=target?'ON_TRACK':'BEHIND',horizon};
}
export type GoalTimelineEvent={id:string;goalId:string;at:string;kind:string;label:string;provenance:string;quantity?:string;asset?:string;decimals?:number};
export function goalTimeline(s:Platform,goalId:string,scope:'private'|'local'='private'):GoalTimelineEvent[] {
 const result:GoalTimelineEvent[]=s.contributions.filter(e=>e.goalId===goalId&&e.goalScope===scope).map(e=>({id:`contribution:${e.id}`,goalId,at:e.occurredAt,kind:e.reversesId?'reversal':e.provenance==='REWARD_INCOME'?'income':e.direction==='IN'?'contribution':'withdrawal',label:e.reversesId?'Contribution correction':e.provenance==='REWARD_INCOME'?'Recorded reward / income':e.direction==='IN'?'Contribution':'Withdrawal',provenance:e.provenance,quantity:e.quantity,asset:e.asset,decimals:e.decimals}));
 if(scope==='private'){
  const goal=s.goals.find(g=>g.id===goalId);
  for(const r of goal?.planRevisions??[])result.push({id:r.id,goalId,at:r.recordedAt,kind:'plan_revision',label:`Plan terms effective ${r.effectiveFrom}${r.priorHistory==='unknown'?' · earlier terms unknown':''}`,provenance:'RETAINED_PLAN_REVISION'});
  for(const e of goal?.lifecycle??[])result.push({id:e.id,goalId,at:e.at,kind:'lifecycle',label:e.kind==='completed'?'Target reached · retained milestone':e.kind==='closed'?'Goal closed':e.kind==='reopened'?'Goal reopened · new cycle':'Target revised · new cycle',provenance:'RETAINED_MILESTONE',quantity:e.current,asset:e.asset,decimals:e.decimals});
  for(const h of s.goalHistory.filter(h=>h.goalId===goalId))result.push(h.kind==='valuation'?{id:h.id,goalId,at:h.capturedAt,kind:'valuation',label:'Counted Goal value snapshot',provenance:h.requiresReview?'INCOMPLETE_EVIDENCE':'PRIVATE_SNAPSHOT',quantity:h.current,asset:h.asset,decimals:h.decimals}:{id:h.id,goalId,at:h.capturedAt,kind:h.kind,label:h.label,provenance:h.provenance});
  const positions=new Set(s.allocations.filter(a=>a.goalId===goalId).map(a=>a.positionId));
  for(const [i,o] of s.snapshots.entries())if(positions.has(o.positionId)){const p=s.positions.find(p=>p.id===o.positionId);if(p)result.push({id:`observation:${o.positionId}:${o.observedAt}:${i}`,goalId,at:o.observedAt,kind:'observation',label:'Position quantity observed',provenance:p.provenance,quantity:o.quantity,asset:p.asset,decimals:p.decimals});}
 }
 return result.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
}
/** Record changed facts once at the private store mutation boundary, not on render. */
export function recordGoalChanges(before:Platform,after:Platform,now=Date.now()):Platform {
 after=captureGoalLifecycle(before,capturePlanChanges(before,after,now),now);
 const capturedAt=timestamp(now),added:GoalHistory[]=[];
 for(const g of after.goals){const old=before.goals.find(x=>x.id===g.id);
  const add=(kind:'allocation'|'plan'|'milestone'|'status',label:string)=>added.push({id:`change:${g.id}:${kind}:${capturedAt}:${before.goalHistory.length+added.length}`,goalId:g.id,kind,capturedAt,label,provenance:'LOCAL_EDIT'});
  if(JSON.stringify(old?.plan)!==JSON.stringify(g.plan))add('plan',!old?.plan?'Contribution plan created':g.plan?.active===false?'Contribution plan paused':'Contribution plan changed');
  if(old&&JSON.stringify(old.milestones)!==JSON.stringify(g.milestones))add('milestone','Goal milestones changed');
  if(old&&old.status!==g.status)add('status',g.status==='completed'?'Goal completed':g.status==='closed'?'Goal closed':'Goal reactivated');
  if(JSON.stringify(before.allocations.filter(a=>a.goalId===g.id))!==JSON.stringify(after.allocations.filter(a=>a.goalId===g.id)))add('allocation','Goal allocation changed');
 }
 return added.length?compactHistory({...after,goalHistory:[...after.goalHistory,...added]}):after;
}
function sameSnapshotEvidence(a:ValuationSnapshot,b:ValuationSnapshot){const evidence=(s:ValuationSnapshot)=>{const {id,capturedAt,...rest}=s;void id;void capturedAt;return rest;};return JSON.stringify(evidence(a))===JSON.stringify(evidence(b));}
/** Refuse additional history at capacity; never prune accepted financial evidence. */
export const MAX_HISTORY_BYTES=16_000_000;
function compactHistory(s:Platform):Platform {
 if(s.valuationSnapshots.length>MAX_VALUATION_SNAPSHOTS||s.goalHistory.length>MAX_GOAL_HISTORY||new TextEncoder().encode(JSON.stringify({valuationSnapshots:s.valuationSnapshots,goalHistory:s.goalHistory})).byteLength>MAX_HISTORY_BYTES)throw Error('Financial history capacity reached. Export your records before continuing; no older history was removed.');
 return s;
}
/** Collection and byte ceilings reject new captures instead of deleting earlier evidence. */
export function captureValuations(s:Platform,quotes:readonly MarketQuote[],now=Date.now()):Platform {
 s=captureGoalLifecycle(s,s,now,quotes);
 const capturedAt=timestamp(now),day=capturedAt.slice(0,10),valuations:ValuationSnapshot[]=[],goals:GoalHistory[]=[];
 const captureDays={...s.historyCaptureDays};
 for(const p of s.positions.filter(p=>!p.archivedAt)){
  const previous=s.valuationSnapshots.filter(v=>v.positionId===p.id).at(-1);
  if(previous?.capturedAt.slice(0,10)===day||captureDays[`position:${p.id}`]===day)continue;
  const v=p.valuation;
  const q=quotes.filter(q=>marketQuoteSchema.safeParse(q).success&&quoteMatchesPosition(p,q)&&q.currency===(p.quoteCurrency??'USD')&&Date.parse(q.observedAt??q.fetchedAt??'')<=now+60000).sort((a,b)=>(b.observedAt??b.fetchedAt??'').localeCompare(a.observedAt??a.fetchedAt??''))[0];
  const base={id:`valuation:${p.id}:${day}`,positionId:p.id,quantity:p.quantity,quantityDecimals:p.decimals,capturedAt};
  const next:ValuationSnapshot|undefined=v?{...base,value:v.value,decimals:v.decimals,currency:v.currency,source:v.source,observedAt:v.observedAt}:q&&p.valuationMode!=='manual'?{...base,value:quoteValue(p.quantity,p.decimals,q,8),decimals:8,currency:q.currency,source:'COINGECKO',marketRef:q.marketRef??{provider:'coingecko',kind:'coin',id:q.providerAssetId},price:q.price,priceDecimals:q.priceDecimals,observedAt:q.observedAt,fetchedAt:q.fetchedAt}:undefined;
  if(next&&(!previous||!sameSnapshotEvidence(previous,next))){valuations.push(next);captureDays[`position:${p.id}`]=day;}
 }
 for(const g of s.goals.filter(g=>g.status!=='closed')){
  const previous=s.goalHistory.filter(h=>h.goalId===g.id&&h.kind==='valuation').at(-1);
  if(previous?.capturedAt.slice(0,10)===day||captureDays[`goal:${g.id}`]===day)continue;
  const p=goalProgress(s,g.id,now,quotes);if(p.missingValuation)continue;
  const health=fundingHealth(s,g.id,now,quotes);
  const next:GoalHistory={id:`goal-value:${g.id}:${day}`,goalId:g.id,kind:'valuation',capturedAt,current:p.current,target:p.target,asset:g.asset,decimals:g.decimals,actualContributed:health.actual,rewardIncome:health.rewardIncome,planned:health.plannedThroughToday,requiresReview:p.requiresReview,evidence:p.breakdown.map(b=>{
   const position=s.positions.find(p=>p.id===b.positionId)!;
   const q=b.valuation?.quote,v=position.valuation;
   const base={id:`goal-evidence:${g.id}:${position.id}:${day}`,positionId:position.id,quantity:position.quantity,quantityDecimals:position.decimals,capturedAt};
   const valuation:ValuationSnapshot|undefined=q?{...base,value:quoteValue(position.quantity,position.decimals,q,g.decimals),decimals:g.decimals,currency:q.currency,source:'COINGECKO',marketRef:q.marketRef??{provider:'coingecko',kind:'coin',id:q.providerAssetId},price:q.price,priceDecimals:q.priceDecimals,observedAt:q.observedAt,fetchedAt:q.fetchedAt}:v&&v.currency===g.asset?{...base,value:v.value,decimals:v.decimals,currency:v.currency,source:v.source,observedAt:v.observedAt}:undefined;
   return {positionId:b.positionId,quantity:b.quantity,counted:b.counted,valuation};
  })};
  const data=(h:GoalHistory)=>JSON.stringify(h,(key,value)=>key==='id'||key==='capturedAt'||key==='valuationSnapshotId'?undefined:value);
  if(!previous||data(previous)!==data(next)){goals.push(next);captureDays[`goal:${g.id}`]=day;}
 }
 if(!valuations.length&&!goals.length)return s;
 const activeKeys=new Set([...s.positions.map(p=>`position:${p.id}`),...s.goals.map(g=>`goal:${g.id}`)]);
 return compactHistory({...s,historyCaptureDays:Object.fromEntries(Object.entries(captureDays).filter(([key])=>activeKeys.has(key))),valuationSnapshots:[...s.valuationSnapshots,...valuations],goalHistory:[...s.goalHistory,...goals]});
}
