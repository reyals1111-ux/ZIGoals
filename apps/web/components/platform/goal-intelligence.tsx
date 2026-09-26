'use client';
import {useMemo,useState} from 'react';
import {GoalTimeline} from './goal-timeline';
import {ActionIntent} from '../action-intent';
import {useShowcase} from '../showcase-controls';
import {reverseContribution,contributionTotals,fundingHealth,goalTimeline,contributionEvidenceSeries} from '../../lib/goal-intelligence';
import type {Platform,PrivateGoal} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {EvidenceChart,type EvidenceSeries} from './evidence-chart';
import './intelligence.css';
import {ContributionFlow} from './contribution-flow';
import {ProgressRing,MetricCard} from './financial-ui';
import {effectiveContributionPlan} from '../../lib/plan-revisions';
import {goalProgress} from '../../lib/positions';
const display=(value:string,goal:PrivateGoal)=>`${value.startsWith('-')?'-':''}${formatGoalAmount(amount(value.replace(/^-/,''),goal.decimals),goal.asset)}`;
export function GoalIntelligence({data,goal,quotes,now,update,disabled=false}:{data:Platform;goal:PrivateGoal;quotes:readonly MarketQuote[];now:number;update:(fn:(s:Platform)=>Platform)=>Promise<void>;disabled?:boolean}){
 const showcase=useShowcase();
 const [entry,setEntry]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const totals=contributionTotals(data,goal.id,now),timeline=useMemo(()=>goalTimeline(data,goal.id),[data,goal.id]);
 const contributionSeries=useMemo(()=>contributionEvidenceSeries(data,goal.id,now),[data,goal.id,now]);
 const health=goal.type==='PROJECT'?null:fundingHealth(data,goal.id,now,quotes);
 const money=(value:string)=>display(value,goal);
 const nextPlan=effectiveContributionPlan(goal,health?.nextDate??new Date(now).toISOString().slice(0,10)),unknownPrior=goal.planRevisions?.[0]?.priorHistory==='unknown';
 const records=data.contributions.filter(e=>e.goalId===goal.id&&e.goalScope==='private');
 const points=data.goalHistory.filter(h=>h.goalId===goal.id&&h.kind==='valuation');
 const series:EvidenceSeries[]=[
  {label:'Counted wealth',color:'#6bded5',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.current}]:[])},
  {label:'Actual contributions',kind:'cumulative',color:'#8da7ff',points:contributionSeries.actual},
  {label:'Plan at observation',color:'#e1b97a',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.planned}]:[])},
 ];
 const incomeSeries:EvidenceSeries[]=[{label:'Recorded income',kind:'cumulative',color:'#bca1f8',points:contributionSeries.income}];
 const canEdit=!disabled&&!goal.locked&&goal.status!=='closed'&&!busy;
 async function reverse(id:string){setBusy(true);setError('');try{await update(s=>reverseContribution(s,id,crypto.randomUUID(),new Date().toISOString(),'Explicit user reversal'));setMessage('History reversal recorded. The original entry is retained; asset balances and allocations are unchanged.');}catch(e){setError(e instanceof Error?e.message:'Could not reverse contribution.');}finally{setBusy(false);}}
 const max=health?[BigInt(health.actual),BigInt(health.plannedThroughToday),1n].reduce((a,b)=>a>b?a:b):1n;
 const width=(value:string)=>`${Number((BigInt(value)>0n?BigInt(value):0n)*10000n/max)/100}%`;
 return <div className="goal-intelligence"><ActionIntent param="contribute" value="1" ready={canEdit} onAction={()=>setEntry(true)}/>
  {health&&<section className="intelligence-panel" aria-label="Funding Wealth overview">
   <div className="funding-wealth-hero"><div><p className="eyebrow">WHERE YOU ARE. WHAT COMES NEXT.</p><h2>Funding Wealth</h2><div className="funding-status-line"><span className="intelligence-status" data-status={health.status}>{health.status==='NO_PLAN'?'No plan':health.status==='REVIEW'?'Needs review':health.status==='COMPLETED'?'Complete':health.status.replaceAll('_',' ').toLowerCase()}</span><p>{health.status==='COMPLETED'?'Your Goal is fully funded.':health.status==='NO_PLAN'?'Give your Goal a contribution rhythm.':health.overdue?'Your recorded contributions are behind your plan.':'Your wealth and contribution pace, together.'}</p></div><div className="intelligence-actions"><button className="primary" disabled={!canEdit} onClick={()=>{setEntry(true);setError('');}}>Fund Goal</button><a className="text-link" href="#contribution-plan">{goal.plan?'Review contribution plan':'Create contribution plan'} →</a></div></div><div className="funding-wealth-progress"><ProgressRing percent={Number(goalProgress(data,goal.id,now,quotes).progressPct)} size={148}/><div><strong>{money(health.current)}</strong><p>of {money(health.target)}</p><span>{money(health.remaining)} remaining</span></div></div></div>
   <div className="funding-preview-metrics"><MetricCard label="Target date" value={goal.targetDate??'No date set'}/><MetricCard label="Next contribution" value={health.nextDate??'No plan scheduled'} detail={nextPlan?`${amount(nextPlan.amount,nextPlan.decimals)} ${nextPlan.asset} · ${nextPlan.cadence}`:'Choose an amount and rhythm that works for you'}/><MetricCard label="Latest contribution" value={health.latest?new Date(health.latest.occurredAt).toLocaleDateString():'No contribution yet'} detail={health.latest?`${amount(health.latest.quantity,health.latest.decimals)} ${health.latest.asset}`:'New funding will appear here'}/></div>
   <h3 className="funding-subtitle">Your contribution pace</h3>
   <dl className="intelligence-metrics"><div><dt>Actual contributed</dt><dd>{money(health.actual)}</dd><small>Explicit records, net of reversals</small></div><div><dt>Planned through today</dt><dd>{money(health.plannedThroughToday)}</dd><small>{goal.planRevisions?.length?'Retained revisions · not payment receipts':'Current plan · not a payment receipt'}</small></div><div><dt>Contribution variance</dt><dd>{unknownPrior?'Unavailable':`${BigInt(health.variance)>0n?'+':''}${money(health.variance)}`}</dd><small>{unknownPrior?'Earlier plan terms were not retained':health.overdue?'Behind the recorded plan':'Compared with planned contributions'}</small></div></dl>
   <div className="pace-comparison"><span>Actual</span><div className="pace-track"><span className="pace-fill" style={{width:width(health.actual)}}/></div><strong>{money(health.actual)}</strong></div><div className="pace-comparison"><span>Planned</span><div className="pace-track"><span className="pace-fill planned" style={{width:width(health.plannedThroughToday)}}/></div><strong>{money(health.plannedThroughToday)}</strong></div>
   <dl className="intelligence-metrics"><div><dt>Still to fund</dt><dd>{money(health.remaining)}</dd><small>From counted wealth of {money(health.current)}</small></div><div><dt>Required per remaining date</dt><dd>{health.requiredRecurring===null?'Set a plan':money(health.requiredRecurring)}</dd><small>{health.nextDate?`Next planned date · ${health.nextDate}`:'No upcoming contribution scheduled'}</small></div><div><dt>Projected completion</dt><dd>{health.completionDate??(goal.plan?'Beyond current plan':'No plan yet')}</dd><small>No future investment return assumed</small></div></dl>
   <p className="fine">Planned future {money(health.plannedFuture)} · Shortfall {money(health.shortfall)} · Surplus {money(health.surplus)}</p>
   {health.warnings.map(w=><p key={w} className="history-note">{w}</p>)}
   <p className="fine">Market movement can change wealth. It cannot satisfy a missed contribution. Unmatched actual records remain separate from scheduled payments.</p>
   <div className="intelligence-actions"><button className="primary" disabled={!canEdit} onClick={()=>{setEntry(!entry);setError('');}}>Record contribution</button><a className="secondary" href="#contribution-plan">Review plan</a>{totals.latest&&<span className="fine">Latest actual · {new Date(totals.latest.occurredAt).toLocaleDateString()}</span>}</div>
  </section>}
  {message&&<p role="status" className="fine">{message}</p>}{error&&<p role="alert" className="notice">{error}</p>}
  {entry&&<ContributionFlow data={data} goal={goal} quotes={quotes} update={update} onClose={()=>setEntry(false)} onSaved={text=>{setEntry(false);setMessage(text);}}/>}
  <div className="intelligence-subgrid"><section className="panel" aria-label="Goal progress evidence"><p className="eyebrow">PROGRESS, EXPLAINED</p><h2>Wealth &amp; contribution history</h2><p className="fine">{showcase?'SHOWCASE DATA · fictional wealth observations and contributions illustrate this view.':'Wealth observations and contribution records tell different parts of your story.'}</p><EvidenceChart series={series} decimals={goal.decimals} currency={goal.asset} label="Counted wealth and actual contribution evidence"/>{totals.unvaluedCount>0&&<p className="notice">Some recorded events have no compatible event-time value and are excluded from the contribution total.</p>}</section>
  <GoalTimeline key={goal.id} events={timeline} records={records} decimals={goal.decimals} canEdit={canEdit} reverse={reverse}/></div>
  {(goal.type==='REWARD'||BigInt(totals.rewardIncome)!==0n)&&<section className="intelligence-panel" aria-label="Reward and income evidence"><p className="eyebrow">INCOME, WITH EVIDENCE</p><h2>Rewards &amp; income</h2><div className="income-summary"><div><p>Currently unclaimed, allocated to this Goal</p><strong>{goal.type==='REWARD'&&health?money(health.current):'See native rewards in Positions'}</strong><p>A current balance observation, not cumulative income.</p></div><div><p>Recorded claimed / distributed income</p><strong>{money(totals.rewardIncome)}</strong><p>Dated records, net of explicit reversals.</p></div></div><EvidenceChart series={incomeSeries} decimals={goal.decimals} currency={goal.asset} label="Recorded reward and income history"/><p className="fine">No APY or annualized run-rate is assumed. Future APR scenarios remain separate.</p></section>}
 </div>;
}
