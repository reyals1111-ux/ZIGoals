'use client';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {wealthMarketRequests} from '../../lib/wealth';
import {fundingHealth} from '../../lib/goal-intelligence';
import {goalProgress} from '../../lib/positions';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {ProgressRing} from './financial-ui';
import {FundingAgenda,NeedsAttention} from './product-modules';
import {useEvidenceNow} from './use-evidence-now';
import {Watchlist} from './watchlist';
import './intelligence.css';
import './wealth-product.css';
export function TodayIntelligence(){
 const store=usePlatform(),market=useMarketQuotes(wealthMarketRequests(store.data));const now=useEvidenceNow(store.data,market.now);
 const goal=[...store.data.goals].filter(g=>g.status!=='closed'&&g.type!=='PROJECT').sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||Number(a.status==='completed')-Number(b.status==='completed'))[0];
 if(!store.loaded||store.error)return null;
 const pulse=goal?fundingHealth(store.data,goal.id,now,market.quotes):undefined,money=(n:string)=>goal?`${n.startsWith('-')?'-':''}${formatGoalAmount(amount(n.replace(/^-/,'')||'0',goal.decimals),goal.asset)}`:'';

 const status=pulse?.status==='NO_PLAN'?'No plan':pulse?.status==='REVIEW'?'Needs review':pulse?.status==='COMPLETED'?'Complete':pulse?.status.replaceAll('_',' ').toLowerCase();
 const action=pulse?.status==='REVIEW'?'Review wealth sources':!goal?.plan?.active?'Create contribution plan':pulse?.overdue?'Review overdue contribution':'Fund Goal';const href=goal?`/app/goals/tracked/${goal.id}${pulse?.status==='REVIEW'?'#allocate':!goal.plan?.active?'#contribution-plan':'#funding-wealth'}`:'/app/goals/new';
 return <div className="today-pulse-stack">{goal&&pulse&&<section className="intelligence-panel today-intelligence" aria-label="Today financial intelligence"><div className="intelligence-heading"><div><p className="eyebrow">WHAT MATTERS TODAY</p><h2><Link href={`/app/goals/tracked/${goal.id}`}>{goal.name}</Link></h2><p>{`${goal.type[0]}${goal.type.slice(1).toLowerCase()} Goal`} · Funding Wealth</p></div><span className="intelligence-status" data-status={pulse.status}>{status}</span></div><div className="today-goal-pulse"><ProgressRing percent={Number(goalProgress(store.data,goal.id,now,market.quotes).progressPct)} size={120}/><div><strong>{money(pulse.current)} <span>of {money(pulse.target)}</span></strong><p>{money(pulse.remaining)} remaining{goal.targetDate?` · Target ${goal.targetDate}`:''}</p><div className="today-pace-track"><span style={{width:goal.plan&&BigInt(pulse.plannedThroughToday)>0n?`${Math.min(100,Math.max(0,Number(BigInt(pulse.actual)*10000n/BigInt(pulse.plannedThroughToday))/100))}%`:'0%'}}/></div><p className="fine">{goal.plan?`${money(pulse.actual)} net contributed · ${money(pulse.plannedThroughToday)} planned through today`:'No contribution plan yet. Set a rhythm to measure your pace.'}</p></div></div><div className="today-contribution-dates"><span>Next contribution<strong>{pulse.nextDate??'Not scheduled'}{goal.plan&&pulse.nextDate?` · ${amount(goal.plan.amount,goal.plan.decimals)} ${goal.plan.asset}`:''}</strong></span><span>Latest contribution<strong>{pulse.latest?`${amount(pulse.latest.quantity,pulse.latest.decimals)} ${pulse.latest.asset} · ${new Date(pulse.latest.occurredAt).toLocaleDateString()}`:'Nothing recorded yet'}</strong></span></div><div className="intelligence-actions"><Link className="primary" href={href}>{action} →</Link><Link className="text-link" href={`/app/goals/tracked/${goal.id}#funding-wealth`}>Open Goal intelligence →</Link></div></section>}
 <div className="today-action-modules"><FundingAgenda data={store.data} now={now} quotes={market.quotes}/><NeedsAttention data={store.data} now={now} quotes={market.quotes}/></div><Watchlist compact/></div>;
}
