/** One presentation contract; private and legacy financial records remain separate. */
import {goalAssetMix,type AssetMix} from './wealth';
import Decimal from 'decimal.js';
import {displayLocale,formatExactNumber,formatMoney,formatPlainDecimal,isMoneyCurrency,moneyMagnitude} from './visual-format';
import {formatUnits} from '@zigoals/chain-config';
import {evaluateGoal} from '@zigoals/goal-engine';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {LocalGoal} from './local-ledger';
import {DemoPriceProvider} from './valuation';
import {goalProgress,type Platform,type PrivateGoal} from './positions';
import type {MarketQuote} from './market-quotes';
import {effectiveContributionPlan,planDay} from './plan-revisions';
import {fundingHealth} from './goal-intelligence';
import {localDate} from './local-date';
/**
 * How far the shown progress can be trusted (Session I, Part 10). 'at-least': some sources have no value yet, so the
 * figures are a lower bound (QA-38); 'unavailable': nothing has a value yet, or the Goal is a simulated-ZIG Goal in
 * EUR or USD, whose value is unknown (QA-37). Absent: exact.
 */
export type ProgressBound='at-least'|'unavailable';
export type GoalSummary={progressBound?:ProgressBound;unvaluedSources?:number;heldAsset?:string;assetMix?:AssetMix[];key:string;id:string;href:string;name:string;type:string;source:string;status:'active'|'completed'|'closed';scene:'horizon'|'mountains'|'home'|'garden'|'aurora';current:string;target?:string;currency:string;progressPct:string;remaining?:string;targetDate?:string;nextContributionDate?:string|null;fundingHealth:string;requiresReview:boolean;valuationLabel?:string;metadata:{label:string;value:string}[]};
/** Money (an ISO currency) always shows its minor digits (Session I, Part 5); quantities (ZIG, BTC, milestones) are unchanged. */
export function formatGoalAmount(value:string,currency:string,locale=displayLocale()){
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return 'Unavailable';
 const decimal=new Decimal(value);if(!decimal.isFinite())return 'Unavailable';
 if(isMoneyCurrency(currency))return formatMoney(value,currency,locale,{display:currency==='USD'||currency==='EUR'?'symbol':'code'});
 const n=decimal.toDecimalPlaces(currency==='ZIG'?6:2,Decimal.ROUND_DOWN).toFixed();
 return `${formatExactNumber(n,locale)} ${currency}`;
}
/**
 * A signed Goal or Wealth amount, written as "-" and its size (QA2-03). `exact` is the unsigned decimal: base units are
 * converted before the sign is added. A loss in money is cut away from zero, so it never reads smaller than it is.
 */
export function formatSignedGoalAmount(negative:boolean,exact:string,currency:string,locale=displayLocale()){
 return `${negative?'-':''}${formatGoalAmount(negative?moneyMagnitude('-'+exact,currency):exact,currency,locale)}`;
}
/** QA-38: Goal progress with sources that have no value yet is a lower bound; with no source valued, it is unavailable. */
export function valuationBound(p:{breakdown:readonly {valuation?:{state:string}}[]}):{bound?:ProgressBound;unvalued:number}{
 const unvalued=p.breakdown.filter(b=>b.valuation?.state==='missing').length;
 return unvalued?{bound:unvalued===p.breakdown.length?'unavailable':'at-least',unvalued}:{unvalued:0};
}
/** "45%", "At least 45%" or "Unavailable", as the ring and "% funded" say it. */
export function progressText(pct:string,bound?:ProgressBound){const n=formatPlainDecimal(/^\d+(\.\d+)?$/.test(pct)?new Decimal(pct).toFixed():pct);return bound==='unavailable'?'Unavailable':bound==='at-least'?`At least ${n}%`:`${n}%`;}
const sceneFor=(category?:string):GoalSummary['scene']=>category==='Travel'?'mountains':category==='First Home'?'home':'garden';
export function legacyGoalSummary(goal:LocalGoal,plan?:GoalMetadata,source='Local simulation',now=Date.now()):GoalSummary{
 const currency=plan?.currency??'ZIG',value=DemoPriceProvider.value(goal.position_units,currency);
 // QA-37: a plan in EUR or USD holds simulated ZIG, which has no price. It shows the ZIG held; its value, progress and
 // what remains are unknown, never a 1:1 conversion.
 if(plan&&value===null){
  const held=DemoPriceProvider.value(goal.position_units,'ZIG')!;
  return {key:`legacy:${goal.id}`,id:goal.id,href:`/app/goals/${goal.id}`,name:plan.name,type:plan.category,source,status:goal.status==='closed'?'closed':'active',scene:sceneFor(plan.category),current:held,heldAsset:'ZIG',target:plan.targetValue,currency,progressPct:'0',progressBound:'unavailable',targetDate:plan.targetDate,fundingHealth:'Value unknown',requiresReview:false,valuationLabel:`Value in ${currency}: unknown — simulated ZIG has no price`,metadata:[{label:'Monthly plan',value:formatGoalAmount(plan.monthlyContribution,currency)},{label:'Required monthly',value:'Unknown — no price'}]};
 }
 const current=value??DemoPriceProvider.value(goal.position_units,'ZIG')!;
 let result:ReturnType<typeof evaluateGoal>|undefined;
 try{if(plan)result=evaluateGoal({targetValue:plan.targetValue,currentValue:current,currentDate:localDate(new Date(now)),targetDate:plan.targetDate,plannedMonthlyContribution:plan.monthlyContribution,annualReturnAssumption:'0'});}catch{/* Preserve access when a saved plan needs recovery. */}
 const status=goal.status==='closed'?'closed':plan&&new Decimal(current).gte(plan.targetValue)?'completed':'active';
 return {key:`legacy:${goal.id}`,id:goal.id,href:`/app/goals/${goal.id}`,name:plan?.name??`Goal #${goal.id}`,type:plan?.category??'Private Goal',source,status,scene:sceneFor(plan?.category),current,target:plan?.targetValue,currency,progressPct:result?.progressPct??'0',remaining:plan?Decimal.max(0,new Decimal(plan.targetValue).minus(current)).toFixed():undefined,targetDate:plan?.targetDate,fundingHealth:result?.fundingHealth.replaceAll('_',' ')??'Recover plan',requiresReview:!result,metadata:plan?[{label:'Monthly plan',value:formatGoalAmount(plan.monthlyContribution,currency)},{label:result?.requiredContributionTiming==='immediate'?'Required now':'Required monthly',value:result?formatGoalAmount(result.fundingRequiredContribution,currency):'Review plan'}]:[]};
}
export function privateGoalSummary(data:Platform,g:PrivateGoal,quotes:readonly MarketQuote[]=[],now=Date.now()):GoalSummary{
 const p=goalProgress(data,g.id,now,quotes);let funding='No plan',nextContributionDate:string|null=null;
 // The plan's day through the time helpers, zone UTC (Session P, 1.5): the same date as before, from one place.
 const applicablePlan=effectiveContributionPlan(g,planDay(now));
 try{if(g.type!=='PROJECT'){const pulse=fundingHealth(data,g.id,now,quotes);funding=pulse.status.replaceAll('_',' ');if(g.status!=='closed')nextContributionDate=pulse.nextDate;}}catch{funding='Review assumptions';}
 const currency=g.type==='PROJECT'?'milestones':g.asset,bound=valuationBound(p);
 return {progressBound:bound.bound,unvaluedSources:bound.unvalued||undefined,assetMix:goalAssetMix(data,g,now,quotes),key:`private:${g.id}`,id:g.id,href:`/app/goals/tracked/${g.id}`,name:g.name,type:`${g.type[0]}${g.type.slice(1).toLowerCase()} Goal`,source:g.type==='PROJECT'?'Project':p.breakdown.length?'Existing wealth':g.plan?'Future contributions':'Private allocation',status:g.status==='closed'?'closed':!p.requiresReview&&BigInt(p.current)>=BigInt(p.target)?'completed':'active',scene:g.category?sceneFor(g.category):g.type==='PROJECT'?'mountains':g.type==='VALUE'?'home':g.type==='REWARD'?'aurora':'horizon',current:formatUnits(p.current,g.decimals),target:formatUnits(p.target,g.decimals),currency,progressPct:p.progressPct,remaining:formatUnits(p.remaining,g.decimals),targetDate:g.targetDate,nextContributionDate,fundingHealth:funding,requiresReview:p.requiresReview,valuationLabel:p.missingValuation?'Valuation unavailable':p.staleValuation?'Last verified value · needs refresh':g.type==='VALUE'&&p.manual!=='0'?'Includes manual valuation':undefined,metadata:[{label:g.type==='PROJECT'?'Progress':'Wealth sources',value:g.type==='PROJECT'?`${g.milestones.filter(m=>m.done).length} milestones done`:`${p.breakdown.length} Positions`},{label:'Contribution plan',value:applicablePlan?`${formatGoalAmount(formatUnits(applicablePlan.amount,applicablePlan.decimals),applicablePlan.asset)} / ${applicablePlan.cadence}${applicablePlan.active?'':' · paused'}`:g.planRevisions?.length?'Scheduled for later':'Not set'}]};
}
export function unifiedGoalSummaries(goals:readonly LocalGoal[],metadata:Record<string,GoalMetadata>,data:Platform,quotes:readonly MarketQuote[]=[],now=Date.now(),source='Local simulation'):GoalSummary[]{
 return [...goals.map(g=>legacyGoalSummary(g,metadata[g.id],source,now)),...data.goals.map(g=>privateGoalSummary(data,g,quotes,now))].sort((a,b)=>Number(!!data.goals.find(g=>b.key===`private:${g.id}`)?.pinned)-Number(!!data.goals.find(g=>a.key===`private:${g.id}`)?.pinned));
}
