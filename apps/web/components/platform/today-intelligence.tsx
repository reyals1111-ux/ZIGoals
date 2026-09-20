'use client';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {wealthMarketRequests,wealthOverview} from '../../lib/wealth';
import {fundingHealth} from '../../lib/goal-intelligence';
import {goalProgress} from '../../lib/positions';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {ProgressRing,MetricCard} from './financial-ui';
import {useEvidenceNow} from './use-evidence-now';
import {Watchlist} from './watchlist';
import {useHabits} from '../habits/use-habits';
import {habitDay} from '../../lib/habits';
import {useHealth} from '../health/use-health';
import {dailyHealthSummary} from '../../lib/health';
import {useLocalToday} from '../use-local-today';
import './intelligence.css';
import './wealth-product.css';
export function TodayIntelligence(){
 const store=usePlatform(),market=useMarketQuotes(wealthMarketRequests(store.data)),habits=useHabits(),healthStore=useHealth(),today=useLocalToday();const now=useEvidenceNow(store.data,market.now),wealth=wealthOverview(store.data,now,market.quotes);
 const goal=[...store.data.goals].filter(g=>g.status!=='closed'&&g.type!=='PROJECT').sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||Number(a.status==='completed')-Number(b.status==='completed'))[0];
 if(!store.loaded||store.error)return null;
 const pulse=goal?fundingHealth(store.data,goal.id,now,market.quotes):undefined,money=(n:string)=>goal?formatGoalAmount(amount(n.replace(/^-/,'')||'0',goal.decimals),goal.asset):'';
 const due=habits.data.habits.filter(h=>habitDay(h,today,today).scheduled),done=due.filter(h=>habitDay(h,today,today).status==='complete').length,nutrition=dailyHealthSummary(healthStore.data,today),attention=wealth.rows.filter(r=>r.stale||r.value===undefined||r.balance.deficit!=='0').length;
 const status=pulse?.status==='NO_PLAN'?'No plan':pulse?.status==='REVIEW'?'Needs review':pulse?.status==='COMPLETED'?'Complete':pulse?.status.replaceAll('_',' ').toLowerCase();
 const action=pulse?.status==='REVIEW'?'Review wealth sources':!goal?.plan?.active?'Create contribution plan':pulse?.overdue?'Review overdue contribution':'Fund Goal';const href=goal?`/app/goals/tracked/${goal.id}${pulse?.status==='REVIEW'?'#allocate':!goal.plan?.active?'#contribution-plan':'#funding-wealth'}`:'/app/goals/new';
 return <div className="today-pulse-stack">{goal&&pulse&&<section className="intelligence-panel today-intelligence" aria-label="Today financial intelligence"><div className="intelligence-heading"><div><p className="eyebrow">WHAT MATTERS TODAY</p><h2><Link href={`/app/goals/tracked/${goal.id}`}>{goal.name}</Link></h2><p>{goal.type==='VALUE'?'Value Goal':'Quantity Goal'} · Funding Wealth</p></div><span className="intelligence-status" data-status={pulse.status}>{status}</span></div><div className="today-goal-pulse"><ProgressRing percent={Number(goalProgress(store.data,goal.id,now,market.quotes).progressPct)} size={120}/><div><strong>{money(pulse.current)} <span>of {money(pulse.target)}</span></strong><p>{money(pulse.remaining)} remaining{goal.targetDate?` · Target ${goal.targetDate}`:''}</p><div className="today-pace-track"><span style={{width:goal.plan&&BigInt(pulse.plannedThroughToday)>0n?`${Math.min(100,Math.max(0,Number(BigInt(pulse.actual)*10000n/BigInt(pulse.plannedThroughToday))/100))}%`:'0%'}}/></div><p className="fine">{goal.plan?`${money(pulse.actual)} contributed · ${money(pulse.plannedThroughToday)} planned through today`:'No contribution plan yet. Set a rhythm to measure your pace.'}</p></div></div><div className="today-contribution-dates"><span>Next contribution<strong>{pulse.nextDate??'Not scheduled'}{goal.plan&&pulse.nextDate?` · ${amount(goal.plan.amount,goal.plan.decimals)} ${goal.plan.asset}`:''}</strong></span><span>Latest contribution<strong>{pulse.latest?`${amount(pulse.latest.quantity,pulse.latest.decimals)} ${pulse.latest.asset} · ${new Date(pulse.latest.occurredAt).toLocaleDateString()}`:'Nothing recorded yet'}</strong></span></div><div className="intelligence-actions"><Link className="primary" href={href}>{action} →</Link><Link className="text-link" href={`/app/goals/tracked/${goal.id}#funding-wealth`}>Open Goal intelligence →</Link></div></section>}
 <section className="life-wealth-snapshot" aria-label="Life and Wealth snapshot"><Link href="/app/goals"><MetricCard label="Goals" value={store.data.goals.filter(g=>g.status==='active').length} detail="Your active destinations"/></Link><Link href="/app/habits"><MetricCard label="Habits today" value={`${done} / ${due.length}`} detail={due.length?'Completed today':'No habits due today'}/></Link><Link href="/app/health"><MetricCard label="Health today" value={nutrition.entries?`${nutrition.nutrients.kcal} kcal`:'Your daily journal'} detail={nutrition.entries?`${nutrition.entries} food entries`:'Log a meal or movement'}/></Link><Link href="/app/wealth"><MetricCard label="Tracked Wealth" value={wealth.subtotals.length?wealth.subtotals.map(s=><span key={s.currency}>{formatGoalAmount(amount(s.value.toString(),2),s.currency)} </span>):'Add your first asset'} detail={attention?`${attention} assets need attention`:`${wealth.rows.length} assets tracked`}/></Link></section><Watchlist compact/></div>;
}
