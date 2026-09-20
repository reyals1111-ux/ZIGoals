/** One presentation contract; private and legacy financial records remain separate. */
import {goalAssetMix,type AssetMix} from './wealth';
import Decimal from 'decimal.js';
import {formatUnits} from '@zigoals/chain-config';
import {evaluateGoal} from '@zigoals/goal-engine';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {LocalGoal} from './local-ledger';
import {DemoPriceProvider} from './valuation';
import {goalProgress,type Platform,type PrivateGoal} from './positions';
import type {MarketQuote} from './market-quotes';
import {fundingHealth} from './goal-intelligence';
import {localDate} from './local-date';
export type GoalSummary={assetMix?:AssetMix[];key:string;id:string;href:string;name:string;type:string;source:string;status:'active'|'completed'|'closed';scene:'horizon'|'mountains'|'home'|'garden'|'aurora';current:string;target?:string;currency:string;progressPct:string;remaining?:string;targetDate?:string;fundingHealth:string;requiresReview:boolean;valuationLabel?:string;metadata:{label:string;value:string}[]};
export function formatGoalAmount(value:string,currency:string){
 const n=new Decimal(value).toDecimalPlaces(currency==='ZIG'?6:2,Decimal.ROUND_DOWN).toFixed();
 return `${currency==='USD'?'$':currency==='EUR'?'€':''}${n}${currency==='USD'||currency==='EUR'?'':` ${currency}`}`;
}
const sceneFor=(category?:string):GoalSummary['scene']=>category==='Travel'?'mountains':category==='First Home'?'home':'garden';
export function legacyGoalSummary(goal:LocalGoal,plan?:GoalMetadata,source='Local simulation',now=Date.now()):GoalSummary{
 const currency=plan?.currency??'ZIG',current=DemoPriceProvider.value(goal.position_units,currency);
 let result:ReturnType<typeof evaluateGoal>|undefined;
 try{if(plan)result=evaluateGoal({targetValue:plan.targetValue,currentValue:current,currentDate:localDate(new Date(now)),targetDate:plan.targetDate,plannedMonthlyContribution:plan.monthlyContribution,annualReturnAssumption:'0'});}catch{/* Preserve access when a saved plan needs recovery. */}
 const status=goal.status==='closed'?'closed':plan&&new Decimal(current).gte(plan.targetValue)?'completed':'active';
 return {key:`legacy:${goal.id}`,id:goal.id,href:`/app/goals/${goal.id}`,name:plan?.name??`Goal #${goal.id}`,type:plan?.category??'Private Goal',source,status,scene:sceneFor(plan?.category),current,target:plan?.targetValue,currency,progressPct:result?.progressPct??'0',remaining:plan?Decimal.max(0,new Decimal(plan.targetValue).minus(current)).toFixed():undefined,targetDate:plan?.targetDate,fundingHealth:result?.fundingHealth.replaceAll('_',' ')??'Recover plan',requiresReview:!result,valuationLabel:plan&&currency!=='ZIG'?'Demo valuation':undefined,metadata:plan?[{label:'Monthly plan',value:formatGoalAmount(plan.monthlyContribution,currency)},{label:result?.requiredContributionTiming==='immediate'?'Required now':'Required monthly',value:result?formatGoalAmount(result.fundingRequiredContribution,currency):'Review plan'}]:[]};
}
export function privateGoalSummary(data:Platform,g:PrivateGoal,quotes:readonly MarketQuote[]=[],now=Date.now()):GoalSummary{
 const p=goalProgress(data,g.id,now,quotes);let funding='No plan';
 try{if(g.type!=='PROJECT')funding=fundingHealth(data,g.id,now,quotes).status.replaceAll('_',' ');}catch{funding='Review assumptions';}
 const currency=g.type==='PROJECT'?'milestones':g.asset;
 return {assetMix:goalAssetMix(data,g,now,quotes),key:`private:${g.id}`,id:g.id,href:`/app/goals/tracked/${g.id}`,name:g.name,type:`${g.type[0]}${g.type.slice(1).toLowerCase()} Goal`,source:g.type==='PROJECT'?'Project':p.breakdown.length?'Existing wealth':g.plan?'Future contributions':'Private allocation',status:g.status==='closed'?'closed':!p.requiresReview&&BigInt(p.current)>=BigInt(p.target)?'completed':'active',scene:g.category?sceneFor(g.category):g.type==='PROJECT'?'mountains':g.type==='VALUE'?'home':g.type==='REWARD'?'aurora':'horizon',current:formatUnits(p.current,g.decimals),target:formatUnits(p.target,g.decimals),currency,progressPct:p.progressPct,remaining:formatUnits(p.remaining,g.decimals),targetDate:g.targetDate,fundingHealth:funding,requiresReview:p.requiresReview,valuationLabel:p.missingValuation?'Valuation unavailable':p.staleValuation?'Last verified value · needs refresh':g.type==='VALUE'&&p.manual!=='0'?'Includes manual valuation':undefined,metadata:[{label:g.type==='PROJECT'?'Progress':'Wealth sources',value:g.type==='PROJECT'?`${g.milestones.filter(m=>m.done).length} milestones done`:`${p.breakdown.length} Positions`},{label:'Contribution plan',value:g.plan?`${formatGoalAmount(formatUnits(g.plan.amount,g.plan.decimals),g.plan.asset)} / ${g.plan.cadence}`:'Not set'}]};
}
export function unifiedGoalSummaries(goals:readonly LocalGoal[],metadata:Record<string,GoalMetadata>,data:Platform,quotes:readonly MarketQuote[]=[],now=Date.now(),source='Local simulation'):GoalSummary[]{
 return [...goals.map(g=>legacyGoalSummary(g,metadata[g.id],source,now)),...data.goals.map(g=>privateGoalSummary(data,g,quotes,now))].sort((a,b)=>Number(!!data.goals.find(g=>b.key===`private:${g.id}`)?.pinned)-Number(!!data.goals.find(g=>a.key===`private:${g.id}`)?.pinned));
}
