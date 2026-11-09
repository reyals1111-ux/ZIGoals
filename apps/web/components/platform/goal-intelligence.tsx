'use client';
import {useMemo,useState} from 'react';
import {isOwnUnitGoal} from '../../lib/goals/goal-units';
import {useDeviceZone} from '../use-device-zone';
import {GoalTimeline} from './goal-timeline';
import {ActionIntent} from '../action-intent';
import {useShowcase} from '../showcase-controls';
import {useChainChoice} from '../chain/use-chain-choice';
import {reverseContribution,contributionTotals,fundingHealth,goalTimeline,contributionEvidenceSeries,historyOnlyNet} from '../../lib/goal-intelligence';
import type {Platform,PrivateGoal} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import {formatSignedGoalAmount,valuationBound} from '../../lib/goal-summary';
import {amount,shownAmount} from './common';
import {EvidenceChart,type EvidenceSeries} from './evidence-chart';
import {GlassBar} from '../progress/glass-progress';
import './intelligence.css';
import {ContributionFlow} from './contribution-flow';
import {ProgressRing,MetricCard} from './financial-ui';
import {effectiveContributionPlan,planDay,planZone} from '../../lib/plan-revisions';
import {goalProgress} from '../../lib/positions';
import {amountWithUnit} from '../../lib/asset-unit';
import { formatDate } from '../../lib/visual-format';
import { localDate } from '../../lib/local-date';
import {ShowcaseTag} from '../ui/showcase-tag';
import {plainErrorMessage} from '../../lib/plain-error';
/**
 * Session AK (7.6): "Fill in" from the contribution rhythm opens this goal with `?contribute=1&amount=<base units>`.
 * The amount is read once (whole base units only, as lib/allocation/autopilot.ts writes it) and taken off the URL, so
 * a reload or Back never fills it again. It only fills the form; the person still previews and confirms.
 */
export function takeAmountParam():string|undefined{
 if(typeof window==='undefined')return undefined;
 const current=new URL(window.location.href),raw=current.searchParams.get('amount');
 if(raw===null)return undefined;
 current.searchParams.delete('amount');
 const state={...window.history.state};delete state.__NA;delete state._N;
 window.history.replaceState(state,'',`${current.pathname}${current.search}${current.hash}`);
 return /^[1-9]\d{0,77}$/.test(raw)?raw:undefined;
}
const display=(value:string,goal:PrivateGoal)=>formatSignedGoalAmount(value.startsWith('-'),amount(value.replace(/^-/,''),goal.decimals),goal.asset);
export function GoalIntelligence({data,goal,quotes,now,update,disabled=false}:{data:Platform;goal:PrivateGoal;quotes:readonly MarketQuote[];now:number;update:(fn:(s:Platform)=>Platform)=>Promise<void>;disabled?:boolean}){
 // Session AL (DV-007a, COPY_AUDIT §4): "Funding Wealth" only once the chain is chosen; before, the plain "Your saving plan".
 // Fourth pass (DV-034a, DV-104): a count goal's panel is "Your plan" (books are not savings).
 const chainChosen=useChainChoice().chosen,fundingTitle=isOwnUnitGoal(goal)?'Your plan':/* Session AL final pass (N-NB-23): a rewards goal is not funded from wealth */goal.type==='REWARD'?'Your rewards':chainChosen?'Funding Wealth':'Your saving plan';
 const showcase=useShowcase(),device=useDeviceZone();
 const [entry,setEntry]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[due,setDue]=useState<{date:string;amount:string}>();
 const totals=contributionTotals(data,goal.id,now),timeline=useMemo(()=>goalTimeline(data,goal.id),[data,goal.id]);
 const contributionSeries=useMemo(()=>contributionEvidenceSeries(data,goal.id,now),[data,goal.id,now]);
 const health=goal.type==='PROJECT'?null:fundingHealth(data,goal.id,now,quotes);
 const money=(value:string)=>display(value,goal);
 const nextPlan=effectiveContributionPlan(goal,health?.nextDate??new Date(now).toISOString().slice(0,10)),unknownPrior=goal.planRevisions?.[0]?.priorHistory==='unknown';
 const records=data.contributions.filter(e=>e.goalId===goal.id&&e.goalScope==='private');
 // Session AL (DV-008a/DV-037/DV-050c, P-DV-26): history-only records are part of the contribution story but never of
 // progress, so the panel says how much of "Actual contributed" is history only (the hero can read 0 while this reads 3).
 const historyOnly=historyOnlyNet(data,goal);
 const points=data.goalHistory.filter(h=>h.goalId===goal.id&&h.kind==='valuation');
 const series:EvidenceSeries[]=[
  {label:/* fifth pass (DV-034a, DV-104, MO-120) */isOwnUnitGoal(goal)?'Counted':'Counted wealth',color:'#6bded5',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.current}]:[])},
  {label:'Actual contributions',kind:'cumulative',color:'#8da7ff',points:contributionSeries.actual},
  {label:'Plan at observation',color:'#e1b97a',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.planned}]:[])},
 ];
 const incomeSeries:EvidenceSeries[]=[{label:'Recorded income',kind:'cumulative',color:'#bca1f8',points:contributionSeries.income}];
 // Session AL fourth pass (DV-034a, DV-104, MO-120): a count goal of the person's own unit is said in counts, not wealth.
 const counts=isOwnUnitGoal(goal);
 const canEdit=!disabled&&!goal.locked&&goal.status!=='closed'&&!busy;
 async function reverse(id:string){setBusy(true);setError('');setMessage('');try{await update(s=>reverseContribution(s,id,crypto.randomUUID(),new Date().toISOString(),'Explicit user reversal'));setMessage('History reversal recorded. The original entry is retained; asset balances and allocations are unchanged, so progress stays the same until you release the allocation.');}catch(e){setError(plainErrorMessage(e, 'Could not reverse contribution.'));}finally{setBusy(false);}}
 // QA-38: with sources that have no value yet, these figures are a lower bound (or unavailable when none has one).
 const bound=valuationBound(goalProgress(data,goal.id,now,quotes)).bound;
 const max=health?[BigInt(health.actual),BigInt(health.plannedThroughToday),1n].reduce((a,b)=>a>b?a:b):1n;
 const share=(value:string)=>Number((BigInt(value)>0n?BigInt(value):0n)*10000n/max)/10000;
 return <div className="goal-intelligence"><ActionIntent param="contribute" value="1" ready={canEdit} onAction={()=>{setEntry(true);const asked=takeAmountParam();setDue(asked?{date:planDay(now,health?.planZone??planZone(goal)),amount:asked}:health&&BigInt(health.dueToday)>0n?{date:planDay(now,health.planZone),amount:health.dueToday}:undefined);}}/>
  {health&&<section className="intelligence-panel" aria-label={`${fundingTitle} overview`}>
   <div className="funding-wealth-hero"><div><p className="eyebrow">WHERE YOU ARE. WHAT COMES NEXT.</p><h2>{fundingTitle}</h2><div className="funding-status-line"><span className="intelligence-status" data-status={health.status}>{goal.type==='REWARD'&&health.status==='NO_PLAN'?'Counting rewards':health.status==='NO_PLAN'?'No plan':health.status==='REVIEW'?'Needs review':health.status==='COMPLETED'?'Complete':health.status.replaceAll('_',' ').toLowerCase()}</span><p>{goal.type==='REWARD'&&health.status!=='COMPLETED'?/* Session AL final pass (N-NB-23): what a rewards goal tracks, said where its status is */'This goal counts the unclaimed staking rewards you allocate to it. It grows as they arrive; no plan is needed.':health.status==='COMPLETED'?'Your goal is fully funded.':health.status==='NO_PLAN'?/* DV-007b (fourth pass): lower-case goal mid-sentence */(isOwnUnitGoal(goal)?'Add what you count, or give it a rhythm with a plan.':'Give your goal a contribution rhythm.'):health.overdue?'Your recorded contributions are behind your plan.':BigInt(health.dueToday)>0n?`${money(health.dueToday)} is due today.`:health.status==='BEHIND'?/* Session AL (G-021, P-DVR-13): nothing is late; the plan as set falls short (it read "Behind" on day zero with no reason) */`Nothing is late: your plan, as set, ${BigInt(health.shortfall)>0n?`leaves ${money(health.shortfall)} short`:'finishes after the target date'}. Raise the amount or move the date.`:'Your wealth and contribution pace, together.'}</p></div><div className="intelligence-actions">{/* Session AH (GO4, N-166): a Reward Goal grows with the rewards it counts; funding it from a reserve is not a contribution, so it says so instead of offering a button that would refuse */}{goal.type==='REWARD'?<p className="fine">Claim or keep your rewards in Staking; funding from elsewhere does not count here.</p>:<button className="primary" disabled={!canEdit} onClick={()=>{setEntry(true);setDue(undefined);setError('');}}>Fund Goal</button>}{goal.type!=='REWARD'&&<a className="text-link" href="#contribution-plan">{goal.plan?'Review contribution plan':'Create contribution plan'} →</a>}</div></div>{/* Session AL fifth pass (DV-007a, X3-19): a count goal's hero already says "3 books of 20 books · 17 remaining"; said once */}{!counts&&<div className="funding-wealth-progress"><ProgressRing percent={Number(goalProgress(data,goal.id,now,quotes).progressPct)} size={148} bound={bound}/><div><strong>{bound==='unavailable'?'Value unavailable':`${bound==='at-least'?'At least ':''}${money(health.current)}`}</strong><p>of {money(health.target)}</p><span>{bound==='unavailable'?'Remaining unknown':<>{bound==='at-least'&&'At most '}{money(health.remaining)} remaining</>}</span></div></div>}</div>
   <div className="funding-preview-metrics"><MetricCard label="Target date" value={goal.targetDate?formatDate(goal.targetDate):'No date set'}/><MetricCard label="Next contribution" value={health.nextDate?formatDate(health.nextDate):'No plan scheduled'} detail={nextPlan?`${shownAmount(nextPlan.amount,nextPlan.decimals)} ${nextPlan.asset} · ${nextPlan.cadence}`:'Choose an amount and rhythm that works for you'}/><MetricCard label="Latest contribution" value={health.latest?formatDate(localDate(new Date(health.latest.occurredAt))):'No contribution yet'} detail={health.latest?amountWithUnit(data,shownAmount(health.latest.quantity,health.latest.decimals),health.latest.asset,health.latest.positionId):'New funding will appear here'}/></div>
   <h3 className="funding-subtitle">Your contribution pace</h3>
   <dl className="intelligence-metrics"><div><dt>Actual contributed</dt><dd>{money(health.actual)}</dd><dd className="dd-note"><small>{BigInt(historyOnly)!==0n?`Includes ${money(historyOnly)} recorded as history only, which never changes progress`:'Explicit records, net of reversals'}</small></dd></div><div><dt>Planned through today</dt><dd>{money(health.plannedThroughToday)}</dd><dd className="dd-note"><small>{goal.planRevisions?.length?'Retained revisions · not payment receipts':'Current plan · not a payment receipt'}{BigInt(health.dueToday)>0n&&<> · {money(health.dueToday)} due today counts once the day ends{device&&health.planZone!==device?` in ${health.planZone}`:''}</>}</small></dd></div><div><dt>Contribution variance</dt><dd>{unknownPrior?'Unavailable':`${BigInt(health.variance)>0n?'+':''}${money(health.variance)}`}</dd><dd className="dd-note"><small>{unknownPrior?'Earlier plan terms were not retained':health.overdue?'Behind the recorded plan':'Compared with planned contributions'}</small></dd></div></dl>
   <div className="pace-comparison"><span>Actual</span><GlassBar identity="pace" className="pace-track" fillClassName="pace-fill" value={share(health.actual)}/><strong>{money(health.actual)}</strong></div><div className="pace-comparison"><span>Planned</span><GlassBar identity="pace" className="pace-track" fillClassName="pace-fill planned" value={share(health.plannedThroughToday)}/><strong>{money(health.plannedThroughToday)}</strong></div>
   <dl className="intelligence-metrics">{/* DV-007a (fourth pass): a count goal's hero already says what is counted and what is left */}{!counts&&<div><dt>Still to fund</dt><dd>{money(health.remaining)}</dd><dd className="dd-note"><small>From counted wealth of {money(health.current)}</small></dd></div>}<div><dt>Required per remaining date</dt><dd>{health.requiredRecurring===null?'Set a plan':money(health.requiredRecurring)}</dd><dd className="dd-note"><small>{health.nextDate?`Next planned date · ${formatDate(health.nextDate)}`:'No upcoming contribution scheduled'}</small></dd></div><div><dt>{/* Session AL fourth pass (PR-024, B-114): the plan's own date, said as the plan's; a reached goal projects nothing */}With your plan</dt><dd>{BigInt(health.remaining)===0n?'Already reached':health.completionDate?`About ${formatDate(health.completionDate)}`:(goal.plan?'Beyond current plan':'No plan yet')}</dd><dd className="dd-note"><small>{BigInt(health.remaining)===0n?'Nothing left to plan for':'If every planned payment is made · no return assumed · the pace forecast is from what you recorded'}</small></dd></div></dl>
   <p className="fine">Planned future {money(health.plannedFuture)} · Shortfall {money(health.shortfall)} · Surplus {money(health.surplus)}</p>
   {health.warnings.map(w=><p key={w} className="history-note">{w}</p>)}
   {/* DV-034a, DV-104 (fourth pass): a count of books has no market */}<p className="fine">{counts?'Only what you add counts here; nothing moves on its own.':'Market movement can change wealth. It cannot satisfy a missed contribution.'} Unmatched actual records remain separate from scheduled payments.</p>
   <div className="intelligence-actions"><button className="primary" disabled={!canEdit} onClick={()=>{setEntry(!entry);setDue(undefined);setError('');}}>Record contribution</button><a className="secondary" href="#contribution-plan">Review plan</a>{totals.latest&&<span className="fine">Latest actual · {formatDate(totals.latest.occurredAt)}</span>}</div>
  </section>}
  {message&&<p role="status" className="fine">{message}</p>}{error&&<p role="alert" className="notice">{error}</p>}
  {entry&&<ContributionFlow data={data} goal={goal} quotes={quotes} update={update} due={due} onClose={()=>{setEntry(false);setDue(undefined);}} onSaved={text=>{setEntry(false);setDue(undefined);setMessage(text);}}/>}
  <div className="intelligence-subgrid">{/* Session AL fourth pass (DV-018, DV-040c, NB-174, G-017): a project has no wealth chart; its timeline tells it */}{goal.type!=='PROJECT'&&<section className="panel" aria-label="Goal progress evidence"><p className="eyebrow">PROGRESS, EXPLAINED</p><h2>{/* Session AL fifth pass (DV-034a, DV-104, MO-120, DV-015): a count of books is no wealth */counts?'Your count over time':<>Wealth &amp; contribution history</>}</h2><p className="fine">{showcase?<><ShowcaseTag/>{counts?'Fictional counts illustrate this view.':'Fictional wealth observations and contributions illustrate this view.'}</>:counts?'What you counted and what you added, over time.':'Wealth observations and contribution records tell different parts of your story.'}</p>{/* Session AL (P-DVR-18): the scale reaches the target (base units, as the points); a project's "1" is no amount */}<EvidenceChart series={series} decimals={goal.decimals} currency={goal.asset} label={counts?'What you counted and what you added':'Counted wealth and actual contribution evidence'} ceiling={goal.target} ceilingLabel="Target"/>{totals.unvaluedCount>0&&<p className="notice">Some recorded events have no compatible event-time value and are excluded from the contribution total.</p>}</section>}
  <GoalTimeline key={goal.id} events={timeline} records={records} decimals={goal.decimals} canEdit={canEdit} reverse={reverse} goal={goal}/></div>
  {(goal.type==='REWARD'||BigInt(totals.rewardIncome)!==0n)&&<section className="intelligence-panel" aria-label="Reward and income evidence"><p className="eyebrow">INCOME, WITH EVIDENCE</p><h2>Rewards &amp; income</h2><div className="income-summary"><div><p>Currently unclaimed, allocated to this goal</p><strong>{goal.type==='REWARD'&&health?money(health.current):'See native rewards on Staking'}</strong><p>A current balance observation, not cumulative income.</p></div><div><p>Recorded claimed / distributed income</p><strong>{money(totals.rewardIncome)}</strong><p>Dated records, net of explicit reversals.</p></div></div><EvidenceChart series={incomeSeries} decimals={goal.decimals} currency={goal.asset} label="Recorded reward and income history"/><p className="fine">No APY or annualized run-rate is assumed. Future APR scenarios remain separate.</p></section>}
 </div>;
}
