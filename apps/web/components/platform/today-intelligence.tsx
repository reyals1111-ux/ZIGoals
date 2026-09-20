'use client';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {wealthMarketRequests} from '../../lib/wealth';
import {fundingHealth} from '../../lib/goal-intelligence';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import './intelligence.css';
import {useEvidenceNow} from './use-evidence-now';
export function TodayIntelligence(){
 const store=usePlatform(),market=useMarketQuotes(wealthMarketRequests(store.data));
 const evidenceNow=useEvidenceNow(store.data,market.now);
 const goal=[...store.data.goals].filter(g=>g.status!=='closed'&&g.type!=='PROJECT').sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned))[0];
 if(!store.loaded||store.error||!goal)return null;
 const health=fundingHealth(store.data,goal.id,evidenceNow,market.quotes),money=(n:string)=>formatGoalAmount(amount(n.replace(/^-/,'')||'0',goal.decimals),goal.asset);
 return <section className="intelligence-panel today-intelligence" aria-label="Today financial intelligence"><div className="intelligence-heading"><div><p className="eyebrow">WHAT MATTERS TODAY</p><h2><Link href={`/app/goals/tracked/${goal.id}`}>{goal.name}</Link></h2></div><span className="intelligence-status" data-status={health.status}>{health.status.replaceAll('_',' ')}</span></div><dl className="intelligence-metrics"><div><dt>Remaining</dt><dd>{money(health.remaining)}</dd></div><div><dt>Next planned date</dt><dd>{health.nextDate??'Your own pace'}</dd></div><div><dt>Actual contribution pace</dt><dd>{health.overdue?`${money(health.variance)} behind`:BigInt(health.variance)>0n?`${money(health.variance)} ahead`:'Aligned with plan'}</dd></div></dl><p className="fine">{health.latest?`Latest actual contribution · ${new Date(health.latest.occurredAt).toLocaleDateString()}`:'No actual contribution recorded yet.'} Market growth and Habit completion do not count as contributions.</p><div className="intelligence-actions"><Link className="primary" href={`/app/goals/tracked/${goal.id}`}>{health.overdue?'Review your contribution pace':'Open Goal intelligence'} →</Link><Link className="text-link" href="/app/wealth">View live Wealth →</Link></div></section>;
}
