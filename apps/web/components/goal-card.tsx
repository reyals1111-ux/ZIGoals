'use client';
import './goal-summary.css';
import Link from 'next/link';
import {useId} from 'react';
import {goalPalette} from './goal-palette';
import Decimal from 'decimal.js';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {LocalGoal} from '../lib/local-ledger';
import {formatGoalAmount,legacyGoalSummary,type GoalSummary} from '../lib/goal-summary';
import {visualTone} from './visual-tone';
import {SceneArt} from './scene-art';
export const displayAmount= formatGoalAmount;
export function GoalProgressRing({name,progressPct,goalId}:{name:string;progressPct:string;goalId?:string}){
 const palette=goalPalette(goalId??name);
 const ringId=useId();const pct=Math.max(0,Math.min(100,Number(progressPct)));
 return <div className="goal-progress-ring" role="progressbar" aria-label={`${name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><svg viewBox="0 0 88 88" aria-hidden="true" focusable="false"><defs><linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette[0]}/><stop offset="1" stopColor={palette[1]}/></linearGradient></defs><circle className="ring-track" cx="44" cy="44" r="38"/><circle style={{stroke:`url(#${ringId})`}} className="ring-value" cx="44" cy="44" r="38" pathLength="100" strokeDasharray={`${pct} 100`} transform="rotate(-90 44 44)"/></svg><strong aria-hidden="true">{new Decimal(progressPct).toFixed(2,Decimal.ROUND_DOWN)}%</strong></div>;
}
export function GoalSummaryCard({summary:g,compact=false}:{summary:GoalSummary;compact?:boolean}){
 return <article className={`goal-card destination-card unified-goal-card${compact?' compact-goal':''}`} data-tone={visualTone(g.id)} data-goal-key={g.key}>
  <div className="goal-card-art"><SceneArt scene={g.scene}/><span>{g.type}</span></div>
  <div className="card-top"><span className="eyebrow">{g.type}</span><span className="badge" data-health={g.status==='closed'?'CLOSED':g.requiresReview?'NEEDS_REVIEW':g.fundingHealth.replaceAll(' ','_')}>{g.status==='closed'?'Closed':g.status==='completed'?'Completed':g.requiresReview?'Needs review':g.fundingHealth}</span></div>
  <h2 className="nebula-number"><Link href={g.href}>{g.name}</Link></h2>
  <p className="goal-value nebula-number">{formatGoalAmount(g.current,g.currency)}<span> / {g.target?formatGoalAmount(g.target,g.currency):'No target saved'}</span></p>
  <div className="goal-progress"><GoalProgressRing goalId={g.id} name={g.name} progressPct={g.progressPct}/><div className="goal-progress-caption"><strong>{g.currency==='milestones'?'Of your journey complete':'Of your goal funded'}</strong><span>{g.targetDate?`Target ${g.targetDate}`:g.remaining?`${formatGoalAmount(g.remaining,g.currency)} remaining`:'Recover your plan'}</span></div></div>
  {g.valuationLabel&&<p className="fine valuation-state">{g.valuationLabel}</p>}
  <div className="card-bottom">{g.metadata.map(m=><div key={m.label}><small>{m.label}</small><strong>{m.value}</strong></div>)}</div>
  <div className="card-footer"><small>{g.source} · {g.status}{g.requiresReview?' · Review needed':''}</small><Link href={g.href} className="text-link">Open Goal →</Link></div>
 </article>;
}
export function GoalCard({goal,plan,compact=false,source='Local simulation'}:{goal:LocalGoal;plan?:GoalMetadata;compact?:boolean;source?:string}){return <GoalSummaryCard summary={legacyGoalSummary(goal,plan,source)} compact={compact}/>;}
