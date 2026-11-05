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
import {effectiveContributionPlan,planDay,planZone} from './plan-revisions';
import {fundingHealth} from './goal-intelligence';
import {localDate} from './local-date';
import { plural } from './plural';
import {isOwnUnitGoal,isUnitWord,unitAmount,unitWord} from './goals/goal-units';
import {goalReached} from './goals/finished';
import {goalValueReason} from './goals/value-reason';
import {releasedByArchive} from './goals/released';
const HUGE=new Decimal('1e18');
/** A legacy amount of 10^18 or more (past every cap), written compactly ("$100,000,000T"); the exact digits stay in the record. */
function hugeAmount(d:Decimal,currency:string,locale:string){
 const n=d.toNumber();
 if(isMoneyCurrency(currency))try{return new Intl.NumberFormat(locale,{style:'currency',currency,notation:'compact',maximumFractionDigits:1}).format(n);}catch{/* below */}
 const text=new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(n);
 return `${text} ${isUnitWord(currency)?unitWord(currency):currency}`;
}
/**
 * How far the shown progress can be trusted (Session I, Part 10). 'at-least': some sources have no value yet, so the
 * figures are a lower bound (QA-38); 'unavailable': nothing has a value yet, or the Goal is a simulated-ZIG Goal in
 * EUR or USD, whose value is unknown (QA-37). Absent: exact.
 */
export type ProgressBound='at-least'|'unavailable';
export type GoalSummary={/** Session AL third pass (MO-160): why no source has a value, when one reason covers them all. */valueReason?:string;/** Session AL third pass (TK-196): archived assets that stopped counting, not yet reviewed. */released?:number;/** Session AL (P-DV-22): true on a closed Goal that reached its target first (lib/goals/finished.ts isFinished). */reached?:boolean;progressBound?:ProgressBound;unvaluedSources?:number;heldAsset?:string;assetMix?:AssetMix[];key:string;id:string;href:string;name:string;type:string;source:string;status:'active'|'completed'|'closed';scene:'horizon'|'mountains'|'home'|'garden'|'aurora';current:string;target?:string;currency:string;progressPct:string;remaining?:string;targetDate?:string;nextContributionDate?:string|null;fundingHealth:string;requiresReview:boolean;valuationLabel?:string;metadata:{label:string;value:string}[]};
/** Money (an ISO currency) always shows its minor digits (Session I, Part 5); quantities (ZIG, BTC, milestones) are unchanged. */
export function formatGoalAmount(value:string,currency:string,locale=displayLocale()){
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return 'Unavailable';
 const decimal=new Decimal(value);if(!decimal.isFinite())return 'Unavailable';
 // Session AL (DV-054/DV-057d/DV-084b/DV-125, D-195): a value saved before the trillion cap (1e20, 1e28) reads short, never
 // as 29 digits that break a card, Today or Activity. New values are refused above a trillion (lib/goals/goal-amount.ts).
 if(decimal.abs().gte(HUGE))return hugeAmount(decimal,currency,locale);
 // Session AL (DV-014): a count Goal's own word reads "20 books" / "1 book", never "20 BOOKS" or a coin symbol.
 if(!isMoneyCurrency(currency)&&isUnitWord(currency))return unitAmount(decimal.toDecimalPlaces(2,Decimal.ROUND_DOWN).toNumber(),currency);
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
 // The plan's day in the plan's own zone (timezone phase 3; UTC until R2 writes a zone), from one place.
 const applicablePlan=effectiveContributionPlan(g,planDay(now,planZone(g)));
 try{if(g.type!=='PROJECT'){const pulse=fundingHealth(data,g.id,now,quotes);funding=pulse.status.replaceAll('_',' ');if(g.status!=='closed')nextContributionDate=pulse.nextDate;}}catch{funding='Review assumptions';}
 const currency=g.type==='PROJECT'?'milestones':g.asset,bound=valuationBound(p);
 const valueReason=bound.bound?goalValueReason(data,g,p.breakdown.filter(b=>b.valuation?.state==='missing').map(b=>b.positionId)):null,released=releasedByArchive(data,g.id).length;
 return {...(valueReason?{valueReason}:{}),...(released?{released}:{}),progressBound:bound.bound,unvaluedSources:bound.unvalued||undefined,assetMix:goalAssetMix(data,g,now,quotes),/* Session AL (P-DV-22): set only for a closed goal that had reached its target (completed goals already say so) */...(g.status==='closed'&&goalReached(g)?{reached:true}:{}),key:`private:${g.id}`,id:g.id,href:`/app/goals/tracked/${g.id}`,name:g.name,type:`${g.type[0]}${g.type.slice(1).toLowerCase()} Goal`,source:g.type==='PROJECT'?'Project':/* Session AL fourth pass (DV-034a, DV-104): a count of books is the person's own count, never wealth */isOwnUnitGoal(g)?'Your own count':p.breakdown.length?'Existing wealth':g.plan?'Future contributions':'Private allocation',status:g.status==='closed'?'closed':!p.requiresReview&&BigInt(p.current)>=BigInt(p.target)?'completed':'active',scene:g.category?sceneFor(g.category):g.type==='PROJECT'?'mountains':g.type==='VALUE'?'home':g.type==='REWARD'?'aurora':'horizon',current:formatUnits(p.current,g.decimals),target:formatUnits(p.target,g.decimals),currency,progressPct:p.progressPct,remaining:formatUnits(p.remaining,g.decimals),targetDate:g.targetDate,nextContributionDate,fundingHealth:funding,requiresReview:p.requiresReview||released>0,valuationLabel:p.missingValuation?'Valuation unavailable':p.staleValuation?'Last verified value · needs refresh':g.type==='VALUE'&&p.manual!=='0'?'Includes manual valuation':undefined,metadata:[{label:g.type==='PROJECT'?'Progress':'Wealth sources',value:g.type==='PROJECT'?(n=>`${n} ${plural(n,'milestone')} done`)(g.milestones.filter(m=>m.done).length):`${p.breakdown.length} ${plural(p.breakdown.length,'Position')}`},{label:'Contribution plan',value:applicablePlan?`${formatGoalAmount(formatUnits(applicablePlan.amount,applicablePlan.decimals),applicablePlan.asset)} / ${applicablePlan.cadence}${applicablePlan.active?'':' · paused'}`:g.planRevisions?.length?'Scheduled for later':'Not set'}]};
}
export function unifiedGoalSummaries(goals:readonly LocalGoal[],metadata:Record<string,GoalMetadata>,data:Platform,quotes:readonly MarketQuote[]=[],now=Date.now(),source='Local simulation'):GoalSummary[]{
 return [...goals.map(g=>legacyGoalSummary(g,metadata[g.id],source,now)),...data.goals.map(g=>privateGoalSummary(data,g,quotes,now))].sort((a,b)=>Number(!!data.goals.find(g=>b.key===`private:${g.id}`)?.pinned)-Number(!!data.goals.find(g=>a.key===`private:${g.id}`)?.pinned));
}
/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-1): the goal page's eyebrow and its funding fact in a
 * person's words while the chain is not chosen (lib/chain-choice.ts): "Savings goal · Your own plan", "Count goal",
 * "Project", and "No saving plan yet" in place of "Funding Wealth · No plan". Once chosen, the summary's own words stand.
 */
export function goalEyebrow(goal:Pick<PrivateGoal,'type'>,summary:Pick<GoalSummary,'type'|'source'>,chain:boolean):string{
 if(chain)return `${summary.type} · ${summary.source}`;
 const kind=goal.type==='VALUE'?'Savings goal':goal.type==='PROJECT'?'Project':goal.type==='REWARD'?'Rewards goal':'Count goal';
 if(goal.type==='PROJECT')return kind;
 // Session AL fourth pass (DV-034a, DV-104, NB-243): a count goal counts units, so no money words ("Money you have").
 if(goal.type==='QUANTITY')return `${kind} · ${summary.source==='Your own count'?'Your own count':summary.source==='Existing wealth'?'What you hold':summary.source==='Future contributions'?'Adding by plan':'Your own plan'}`;
 const source=summary.source==='Existing wealth'?'Money you have':summary.source==='Future contributions'?'Saving plan':'Your own plan';
 return `${kind} · ${source}`;
}
/** The funding fact's label and value (FR-1): plain words until the chain is chosen. */
export function fundingFact(summary:Pick<GoalSummary,'requiresReview'|'status'|'fundingHealth'>,chain:boolean,type?:PrivateGoal['type']):{label:string;value:string}{
 const value=summary.requiresReview?'Needs review':summary.status==='completed'?'Completed':summary.fundingHealth;
 if(chain)return {label:'Funding Wealth',value};
 // DV-034a, DV-104 (fourth pass): a count goal's plan adds units, not savings.
 if(type==='QUANTITY')return {label:'Plan',value:/^no plan$/i.test(value)?'No plan yet':value[0]!.toUpperCase()+value.slice(1).toLowerCase()};
 return {label:'Saving plan',value:/^no plan$/i.test(value)?'No saving plan yet':value[0]!.toUpperCase()+value.slice(1).toLowerCase()};
}
