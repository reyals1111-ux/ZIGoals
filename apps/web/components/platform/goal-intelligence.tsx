'use client';
import {useState,type FormEvent} from 'react';
import {parseUnits} from '@zigoals/chain-config';
import {appendContribution,reverseContribution,contributionTotals,fundingHealth,goalTimeline} from '../../lib/goal-intelligence';
import type {Platform,PrivateGoal} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import {formatGoalAmount} from '../../lib/goal-summary';
import {localDate} from '../../lib/local-date';
import {amount} from './common';
import {EvidenceChart,type EvidenceSeries} from './evidence-chart';
import './intelligence.css';
const display=(value:string,goal:PrivateGoal)=>`${value.startsWith('-')?'-':''}${formatGoalAmount(amount(value.replace(/^-/,''),goal.decimals),goal.asset)}`;
export function GoalIntelligence({data,goal,quotes,now,update,disabled=false}:{data:Platform;goal:PrivateGoal;quotes:readonly MarketQuote[];now:number;update:(fn:(s:Platform)=>Platform)=>Promise<void>;disabled?:boolean}){
 const [entry,setEntry]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const totals=contributionTotals(data,goal.id,now),timeline=goalTimeline(data,goal.id);
 const health=goal.type==='PROJECT'?null:fundingHealth(data,goal.id,now,quotes);
 const money=(value:string)=>display(value,goal);
 const records=data.contributions.filter(e=>e.goalId===goal.id&&e.goalScope==='private');
 const points=data.goalHistory.filter(h=>h.goalId===goal.id&&h.kind==='valuation');
 const series:EvidenceSeries[]=[
  {label:'Counted wealth',color:'#6bded5',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.current}]:[])},
  {label:'Actual contributions',color:'#8da7ff',points:[...new Set(records.filter(e=>e.provenance!=='REWARD_INCOME'&&Date.parse(e.occurredAt)<=now).map(e=>e.occurredAt))].sort().map(at=>({at,value:contributionTotals(data,goal.id,Date.parse(at)).net}))},
  {label:'Plan at observation',color:'#e1b97a',points:points.flatMap(p=>p.kind==='valuation'&&p.asset===goal.asset&&p.decimals===goal.decimals?[{at:p.capturedAt,value:p.planned}]:[])},
 ];
 const incomeSeries:EvidenceSeries[]=[{label:'Recorded income',color:'#bca1f8',points:[...new Set(records.filter(e=>e.provenance==='REWARD_INCOME'&&Date.parse(e.occurredAt)<=now).map(e=>e.occurredAt))].sort().map(at=>({at,value:contributionTotals(data,goal.id,Date.parse(at)).rewardIncome}))}];
 const canEdit=!disabled&&!goal.locked&&goal.status!=='closed'&&!busy;
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('');
  try{
   const date=String(form.get('date')),today=localDate();if(date>today)throw Error('Actual events cannot be recorded in the future.');
   const occurredAt=date===today?new Date().toISOString():new Date(`${date}T12:00:00`).toISOString();
   const quantity=parseUnits(String(form.get('quantity')),goal.decimals).toString();
   const kind=String(form.get('kind')),id=crypto.randomUUID(),expected=JSON.stringify(goal);
   await update(s=>{const latest=s.goals.find(g=>g.id===goal.id);if(JSON.stringify(latest)!==expected)throw Error('Goal changed. Reload this form before recording.');return appendContribution(s,{id,goalId:goal.id,goalScope:'private',positionId:String(form.get('position'))||undefined,direction:kind==='withdrawal'?'OUT':'IN',quantity,asset:goal.asset,decimals:goal.decimals,occurredAt,provenance:kind==='income'?'REWARD_INCOME':'MANUAL_ATTRIBUTION',note:String(form.get('note'))||undefined});});
   setEntry(false);setMessage('Actual history recorded. Position balances and allocations are unchanged.');
  }catch(e){setError(e instanceof Error?e.message:'Could not record contribution.');}finally{setBusy(false);}
 }
 async function reverse(id:string){setBusy(true);setError('');try{await update(s=>reverseContribution(s,id,crypto.randomUUID(),new Date().toISOString(),'Explicit user reversal'));setMessage('Reversal recorded. The original event remains in your history.');}catch(e){setError(e instanceof Error?e.message:'Could not reverse contribution.');}finally{setBusy(false);}}
 const max=health?[BigInt(health.actual),BigInt(health.plannedThroughToday),1n].reduce((a,b)=>a>b?a:b):1n;
 const width=(value:string)=>`${Number((BigInt(value)>0n?BigInt(value):0n)*10000n/max)/100}%`;
 return <div className="goal-intelligence">
  {health&&<section className="intelligence-panel" aria-label="Funding Health V3">
   <div className="intelligence-heading"><div><p className="eyebrow">YOUR GOAL, WITH PERSPECTIVE</p><h2>Funding Health</h2><p className="fine">Your contribution pace · a zero-return baseline</p></div><span className="intelligence-status" data-status={health.status}>{health.status.replaceAll('_',' ')}</span></div>
   <dl className="intelligence-metrics"><div><dt>Actual contributed</dt><dd>{money(health.actual)}</dd><small>Explicit records, net of reversals</small></div><div><dt>Planned through today</dt><dd>{money(health.plannedThroughToday)}</dd><small>Current plan · not a payment receipt</small></div><div><dt>Contribution variance</dt><dd>{BigInt(health.variance)>0n?'+':''}{money(health.variance)}</dd><small>{health.overdue?'Behind the recorded plan':'Compared with planned contributions'}</small></div></dl>
   <div className="pace-comparison"><span>Actual</span><div className="pace-track"><span className="pace-fill" style={{width:width(health.actual)}}/></div><strong>{money(health.actual)}</strong></div><div className="pace-comparison"><span>Planned</span><div className="pace-track"><span className="pace-fill planned" style={{width:width(health.plannedThroughToday)}}/></div><strong>{money(health.plannedThroughToday)}</strong></div>
   <dl className="intelligence-metrics"><div><dt>Still to fund</dt><dd>{money(health.remaining)}</dd><small>From counted wealth of {money(health.current)}</small></div><div><dt>Required per remaining date</dt><dd>{health.requiredRecurring===null?'Set a plan':money(health.requiredRecurring)}</dd><small>{health.nextDate?`Next planned date · ${health.nextDate}`:'No upcoming contribution scheduled'}</small></div><div><dt>Projected completion</dt><dd>{health.completionDate??'Beyond plan'}</dd><small>No future investment return assumed</small></div></dl>
   <p className="fine">Planned future {money(health.plannedFuture)} · Shortfall {money(health.shortfall)} · Surplus {money(health.surplus)}</p>
   {health.warnings.map(w=><p key={w} className="history-note">{w}</p>)}
   <p className="fine">Market movement can change wealth. It cannot satisfy a missed contribution. Unmatched actual records remain separate from scheduled payments.</p>
   <div className="intelligence-actions"><button className="primary" disabled={!canEdit} onClick={()=>{setEntry(!entry);setError('');}}>Record contribution</button><a className="secondary" href="#contribution-plan">Review plan</a>{totals.latest&&<span className="fine">Latest actual · {new Date(totals.latest.occurredAt).toLocaleDateString()}</span>}</div>
  </section>}
  {message&&<p role="status" className="fine">{message}</p>}{error&&<p role="alert" className="notice">{error}</p>}
  {entry&&<section className="contribution-entry" aria-label="Record actual history"><h3>Record an actual event</h3><p className="fine">Attribute funds or income you know occurred. This records history only; it does not change a Position or move money.</p><form onSubmit={save}>
   <label className="field">Event type<select name="kind"><option value="contribution">Contribution</option><option value="withdrawal">Withdrawal</option><option value="income">Claimed / distributed income</option></select></label>
   <label className="field">Actual amount<input name="quantity" inputMode="decimal" required placeholder={`Amount in ${goal.asset}`}/></label>
   <label className="field">Event date<input name="date" type="date" required defaultValue={localDate()} max={localDate()}/></label>
   <label className="field">Associated Position (optional)<select name="position"><option value="">No Position association</option>{data.positions.filter(p=>data.allocations.some(a=>a.goalId===goal.id&&a.positionId===p.id)).map(p=><option key={p.id} value={p.id}>{p.providerId} · {p.asset}</option>)}</select></label>
   <label className="field entry-wide">Record note (optional)<textarea name="note" maxLength={500}/></label><p className="fine entry-wide">Recorded in {goal.asset}. Use a verified event-time value when attributing a different asset. Do not use today’s market price for an earlier contribution.</p>
   <div className="intelligence-actions entry-wide"><button className="primary" disabled={!canEdit}>Save actual contribution</button><button type="button" className="secondary" onClick={()=>setEntry(false)}>Cancel</button></div>
  </form></section>}
  <div className="intelligence-subgrid"><section className="panel" aria-label="Goal progress evidence"><p className="eyebrow">PROGRESS, EXPLAINED</p><h2>Wealth &amp; contribution history</h2><p className="fine">Wealth observations and contribution records tell different parts of your story.</p><EvidenceChart series={series} decimals={goal.decimals} currency={goal.asset} label="Counted wealth and actual contribution evidence"/>{totals.unvaluedCount>0&&<p className="notice">Some recorded events have no compatible event-time value and are excluded from the contribution total.</p>}</section>
  <section className="panel" aria-label="Goal timeline"><p className="eyebrow">YOUR JOURNEY</p><h2>Goal timeline</h2><ol className="intelligence-timeline">{timeline.slice(0,12).map(event=>{const record=records.find(r=>`contribution:${r.id}`===event.id);return <li key={event.id}><div><strong>{event.kind==='contribution'?'Contribution recorded':event.kind==='reversal'?'Contribution reversed':event.label}</strong>{event.quantity&&<p>{amount(event.quantity,event.decimals??goal.decimals)} {event.asset}</p>}<time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time><br/><small>{event.provenance.replaceAll('_',' ').toLowerCase()}</small>{record&&!record.reversesId&&!records.some(r=>r.reversesId===record.id)&&<div><button className="quiet" disabled={!canEdit} onClick={()=>void reverse(record.id)}>Reverse contribution</button></div>}</div></li>;})}</ol>{!timeline.length&&<p className="fine">Recorded contributions, plan changes and observations will appear here.</p>}{timeline.length>12&&<p className="fine">Showing the latest 12 events. Complete financial history is retained in your backup.</p>}</section></div>
  {(goal.type==='REWARD'||BigInt(totals.rewardIncome)!==0n)&&<section className="intelligence-panel" aria-label="Reward and income evidence"><p className="eyebrow">INCOME, WITH EVIDENCE</p><h2>Rewards &amp; income</h2><div className="income-summary"><div><p>Currently unclaimed, allocated to this Goal</p><strong>{goal.type==='REWARD'&&health?money(health.current):'See native rewards in Positions'}</strong><p>A current balance observation, not cumulative income.</p></div><div><p>Recorded claimed / distributed income</p><strong>{money(totals.rewardIncome)}</strong><p>Dated records, net of explicit reversals.</p></div></div><EvidenceChart series={incomeSeries} decimals={goal.decimals} currency={goal.asset} label="Recorded reward and income history"/><p className="fine">No APY or annualized run-rate is assumed. Future APR scenarios remain separate.</p></section>}
 </div>;
}
