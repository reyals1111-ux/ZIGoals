'use client';
import './goal-summary.css';
import './platform/run92-gap-fixes.css';
import './platform/wealth.css';
import {type AssetMix} from '../lib/wealth';
import Link from 'next/link';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {LocalGoal} from '../lib/local-ledger';
import {formatGoalAmount,legacyGoalSummary,type GoalSummary} from '../lib/goal-summary';
import {visualTone} from './visual-tone';
import {SceneArt} from './scene-art';
import {ProgressRing} from './platform/financial-ui';
export const displayAmount= formatGoalAmount;
export function GoalProgressRing({name,progressPct,goalId,assetMix=[],complete}:{assetMix?:AssetMix[];name:string;progressPct:string;goalId?:string;complete?:boolean}){
 return <div className="goal-progress-ring"><ProgressRing percent={progressPct} complete={complete} assetMix={assetMix} identity={goalId??name} size={94} label={`${name} progress`}/></div>;
}
export function GoalSummaryCard({summary:g,compact=false}:{summary:GoalSummary;compact?:boolean}){
 return <article className={`goal-card destination-card unified-goal-card${compact?' compact-goal':''}`} data-tone={visualTone(g.id)} data-goal-key={g.key}>
  <div className="goal-card-art"><SceneArt scene={g.scene}/><span>{g.type}</span></div>
  <div className="card-top"><span className="eyebrow">{g.type}</span><span className="badge" data-health={g.status==='closed'?'CLOSED':g.requiresReview?'NEEDS_REVIEW':g.fundingHealth.replaceAll(' ','_')}>{g.status==='closed'?'Closed':g.status==='completed'?'Completed':g.requiresReview?'Needs review':g.fundingHealth}</span></div>
  <h2 className="nebula-number"><Link href={g.href}>{g.name}</Link></h2>
  <p className="goal-value nebula-number">{formatGoalAmount(g.current,g.currency)}<span> / {g.target?formatGoalAmount(g.target,g.currency):'No target saved'}</span></p>
  <div className="goal-progress"><GoalProgressRing goalId={g.id} name={g.name} progressPct={g.progressPct} assetMix={g.assetMix} complete={g.status==='closed'?undefined:g.status==='completed'}/><div className="goal-progress-caption"><strong>{g.assetMix&&g.assetMix.length>1?`${g.assetMix.length} asset classes · `:''}{g.currency==='milestones'?'Of your journey complete':'Of your goal funded'}</strong><span>{g.remaining!==undefined?`${formatGoalAmount(g.remaining,g.currency)} remaining`:'Recover your plan'}</span>{g.targetDate&&<span>Target <time dateTime={g.targetDate}>{g.targetDate}</time></span>}</div></div>
  {g.assetMix&&g.assetMix.length>1&&<p className="goal-mix-legend">{g.assetMix.map(a=><span key={a.assetClass}><i style={{background:a.color}}/>{a.assetClass} {a.percent.toFixed(1)}%</span>)}</p>}
  {g.valuationLabel&&<p className="fine valuation-state">{g.valuationLabel}</p>}
  <div className="card-bottom">{g.metadata.map(m=><div key={m.label}><small>{m.label}</small><strong>{m.value}</strong></div>)}</div>
  {g.nextContributionDate&&<p className="goal-next-contribution"><span>Next contribution</span><time dateTime={g.nextContributionDate}>{g.nextContributionDate}</time></p>}
  <div className="card-footer"><small>{g.source} · {g.status}{g.requiresReview?' · Review needed':''}</small><Link href={g.href} className="text-link">Open Goal →</Link></div>
 </article>;
}
export function GoalCard({goal,plan,compact=false,source='Local simulation'}:{goal:LocalGoal;plan?:GoalMetadata;compact?:boolean;source?:string}){return <GoalSummaryCard summary={legacyGoalSummary(goal,plan,source)} compact={compact}/>;}
