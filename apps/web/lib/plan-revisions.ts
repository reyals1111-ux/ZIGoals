/** Immutable intention and lifecycle facts; they never create wealth or contributions. */
import {z} from 'zod';
import {contributionSchema,goalProgress,planScenario,platformSchema,rescaleUnits,type ContributionPlan,type ContributionEvent,type PlanRevision,type PrivateGoal,type Platform,type GoalLifecycle} from './positions';
import type {MarketQuote} from './market-quotes';
const day=(now:number)=>new Date(now).toISOString().slice(0,10);
const shift=(date:string,n:number)=>new Date(Date.parse(`${date}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
function terms(plan:ContributionPlan|undefined){if(!plan)return null;const {habitId,...rest}=plan;void habitId;return rest;}
export function planFingerprint(g:PrivateGoal){return JSON.stringify([terms(g.plan),g.target,g.targetDate,g.planRevisions??[]]);}
export function effectiveContributionPlan(g:PrivateGoal,date:string){return g.planRevisions?.length?g.planRevisions.filter(r=>r.effectiveFrom<=date).at(-1)?.terms??undefined:g.plan;}
export function earliestPlanChange(g:PrivateGoal,now=Date.now()){return g.plan||g.planRevisions?.length?[shift(day(now),1),g.planRevisions?.at(-1)?.effectiveFrom??''].sort().at(-1)!:day(now);}
function revision(g:PrivateGoal,effectiveFrom:string,now:number,index:number,priorHistory:'known'|'unknown'):PlanRevision{return {version:1,id:`plan:${g.id}:${now}:${index}`,effectiveFrom,recordedAt:new Date(now).toISOString(),terms:terms(g.plan),target:g.target,targetDate:g.targetDate,asset:g.asset,decimals:g.decimals,priorHistory};}
/** Legacy terms are only evidenced from the day observed; their earlier history is unknown. */
export function capturePlanChanges(before:Platform,after:Platform,now:number):Platform {
 let changed=false;const goals=after.goals.map(g=>{
  const old=before.goals.find(x=>x.id===g.id);
  if(JSON.stringify(old?.planRevisions)!==JSON.stringify(g.planRevisions))return g; // explicit reviewed revision already appended
  if(JSON.stringify(terms(old?.plan))===JSON.stringify(terms(g.plan))&&old?.target===g.target&&old?.targetDate===g.targetDate)return g;
  if(!g.plan&&!old?.plan&&!g.planRevisions?.length)return g;
  const revisions=[...(g.planRevisions??[])];
  if(old&&!revisions.length)revisions.push(revision(old,day(now),now,0,'unknown'));
  revisions.push(revision(g,old?earliestPlanChange(old,now):day(now),now,revisions.length,'known'));
  changed=true;return {...g,planRevisions:revisions};
 });return changed?{...after,goals}:after;
}
export function reviseGoalPlan(s:Platform,goalId:string,plan:ContributionPlan,effectiveFrom:string,now=Date.now(),expected?:string):Platform {
 const g=s.goals.find(g=>g.id===goalId);if(!g||g.status==='closed'||g.locked)throw Error('Choose an unlocked, open Goal.');
 if(expected!==undefined&&expected!==planFingerprint(g))throw Error('The plan changed since you opened it. Reload and review the latest terms.');
 z.iso.date().parse(effectiveFrom);const parsed=contributionSchema.parse(plan);
 if(effectiveFrom<earliestPlanChange(g,now))throw Error('Plan changes must start on a future day, after any retained revisions.');
 if(JSON.stringify(terms(parsed))===JSON.stringify(terms(g.plan)))return s;
 const revisions=[...(g.planRevisions??[])];if(g.plan&&!revisions.length)revisions.push(revision(g,day(now),now,0,'unknown'));
 const next={...g,plan:parsed};revisions.push(revision(next,effectiveFrom,now,revisions.length,'known'));
 return platformSchema.parse({...s,goals:s.goals.map(x=>x.id===g.id?{...next,planRevisions:revisions}:x)});
}
export type PlanInstallment={id:string;revisionId:string;date:string;amount:string;credited:string;remaining:string};
export function revisionInstallments(g:PrivateGoal,from:string,through:string,events:readonly ContributionEvent[]=[],now=Date.now()):PlanInstallment[]{
 z.iso.date().parse(from);z.iso.date().parse(through);const result:PlanInstallment[]=[];
 for(const [i,r] of (g.planRevisions??[]).entries()){
  if(r.asset!==g.asset||r.decimals!==g.decimals)throw Error('Revision unit differs from the current Goal unit.');
  const next=g.planRevisions![i+1],start=from>r.effectiveFrom?from:r.effectiveFrom,end=next&&next.effectiveFrom<=through?shift(next.effectiveFrom,-1):through;
  if(!r.terms||!r.terms.active||start>end)continue;
  const context={...g,asset:r.asset,decimals:r.decimals,target:r.target};
  const dates=planScenario(context,'0',r.terms,end,start).dates;
  const amount=dates.length?planScenario(context,'0',r.terms,dates[0]!,dates[0]!).contributions:'0';
  for(const date of dates){
   const id=`${r.id}:${date}`;
   let credited=0n;
   for(const e of events){
    if(e.goalId!==g.id||e.goalScope!=='private'||e.fundingMode!=='FUND_GOAL'||e.planRevisionId!==r.id||e.installmentId!==id||e.direction!=='IN'||e.reversesId||Date.parse(e.occurredAt)>now||events.some(x=>x.reversesId===e.id&&Date.parse(x.occurredAt)<=now))continue;
    if(e.asset===r.asset)credited+=BigInt(rescaleUnits(e.quantity,e.decimals,r.decimals));
    else if(e.valueAtEvent?.currency===r.asset)credited+=BigInt(rescaleUnits(e.valueAtEvent.value,e.valueAtEvent.decimals,r.decimals));
   }
   result.push({id,revisionId:r.id,date,amount,credited:credited.toString(),remaining:(BigInt(amount)>credited?BigInt(amount)-credited:0n).toString()});
  }
 }return result;
}
export function canceledRevisionInstallments(g:PrivateGoal,through:string,events:readonly ContributionEvent[]=[],now=Date.now()):PlanInstallment[]{
 return (g.planRevisions??[]).flatMap((r,i)=>{const next=g.planRevisions?.[i+1];return next?revisionInstallments({...g,planRevisions:[r]},next.effectiveFrom,through,events,now):[];});
}
export function revisionScenario(g:PrivateGoal,current:string,from:string,through:string,events:readonly ContributionEvent[]=[],now=Date.now()){
 const installments=revisionInstallments(g,from,through,events,now).filter(x=>BigInt(x.remaining)>0n);let contributions=0n,completionDate:string|null=BigInt(current)>=BigInt(g.target)?from:null;
 for(const x of installments){contributions+=BigInt(x.remaining);if(completionDate===null&&BigInt(current)+contributions>=BigInt(g.target))completionDate=x.date;}
 const projected=BigInt(current)+contributions,target=BigInt(g.target);
 return {contributions:contributions.toString(),dates:installments.map(x=>x.date),completionDate,projected:projected.toString(),shortfall:(target>projected?target-projected:0n).toString(),surplus:(projected>target?projected-target:0n).toString(),fundingHealth:BigInt(current)>=target?'COMPLETED':projected>=target?'ON_TRACK':'BEHIND'};
}
/** Completion is an observed milestone per target cycle; current attainment can later fall. */
export function captureGoalLifecycle(before:Platform,after:Platform,now:number,quotes:readonly MarketQuote[]=[]):Platform {
 const evidence=(s:Platform,g:PrivateGoal)=>{const allocations=s.allocations.filter(a=>a.goalId===g.id),ids=new Set(allocations.map(a=>a.positionId));return JSON.stringify({target:g.target,targetDate:g.targetDate,type:g.type,asset:g.asset,decimals:g.decimals,milestones:g.milestones.map(m=>({id:m.id,done:m.done})),allocations,positions:s.positions.filter(p=>ids.has(p.id)).map(p=>({id:p.id,quantity:p.quantity,asset:p.asset,denom:p.denom,decimals:p.decimals,network:p.network,verification:p.verification,sync:p.sync,observedAt:p.observedAt,valuation:p.valuation,archivedAt:p.archivedAt}))});};
 let changed=false;const goals=after.goals.map(g=>{
  const old=before.goals.find(x=>x.id===g.id),events=[...(g.lifecycle??[])];let cycle=events.at(-1)?.cycle??0;
  const add=(kind:GoalLifecycle['kind'],extra:Partial<GoalLifecycle>={})=>{events.push({id:`lifecycle:${g.id}:${now}:${events.length}`,kind,cycle,at:new Date(now).toISOString(),target:g.target,asset:g.asset,decimals:g.decimals,...extra});changed=true;};
  if(old&&(old.target!==g.target||old.targetDate!==g.targetDate)&&JSON.stringify(old.lifecycle)===JSON.stringify(g.lifecycle)){cycle++;add('target_changed');}
  if(old&&old.status!=='closed'&&g.status==='closed'&&JSON.stringify(old.lifecycle)===JSON.stringify(g.lifecycle))add('closed');
  const observed=before===after||!old||evidence(before,old)!==evidence(after,g);
  if(observed&&g.status!=='closed'&&!events.some(e=>e.kind==='completed'&&e.cycle===cycle)){
   const p=goalProgress(after,g.id,now,quotes);
   if(!p.requiresReview&&BigInt(p.current)>=BigInt(p.target))add('completed',{current:p.current,evidence:p.breakdown.map(b=>{const position=after.positions.find(x=>x.id===b.positionId)!;return {positionId:b.positionId,quantity:b.quantity,positionQuantity:position.quantity,quantityDecimals:position.decimals,counted:b.counted,observedAt:position.observedAt,provenance:position.provenance,valuation:position.valuation,quote:b.valuation?.quote};})});
  }
  return events.length!==(g.lifecycle?.length??0)?{...g,lifecycle:events}:g;
 });return changed?{...after,goals}:after;
}
export function reopenGoal(s:Platform,goalId:string,now=Date.now()):Platform {
 const g=s.goals.find(x=>x.id===goalId);if(!g||g.status!=='closed'||g.locked)throw Error('Choose an unlocked, closed Goal.');
 const events=g.lifecycle??[],cycle=(events.at(-1)?.cycle??0)+1;
 const event:GoalLifecycle={id:`lifecycle:${g.id}:${now}:${events.length}`,kind:'reopened',cycle,at:new Date(now).toISOString(),target:g.target,asset:g.asset,decimals:g.decimals};
 return platformSchema.parse({...s,goals:s.goals.map(x=>x.id===g.id?{...x,status:'active',lifecycle:[...events,event]}:x)});
}
