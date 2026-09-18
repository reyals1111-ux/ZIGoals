'use client';
import Link from 'next/link';
import { localDate } from '../../lib/local-date';
import { usePlatform } from './use-platform';
import { amount } from './common';
import { goalProgress } from '../../lib/positions';
export function PlatformToday(){
 const store=usePlatform();
 const goal=store.data.goals.find(g=>g.status==='active');const progress=goal?goalProgress(store.data,goal.id):undefined;
 return <section className="panel platform-workspace"><div className="section-heading"><h2>Your wealth, your goals</h2><Link href="/app/goals" className="text-link">Goals →</Link></div>{goal&&progress?<div><h3><Link href={`/app/goals/tracked/${goal.id}`}>{goal.name}</Link></h3><p><strong className="nebula-text">{progress.progressPct}%</strong> · {amount(progress.current,goal.decimals)} / {amount(progress.target,goal.decimals)} {goal.type==='PROJECT'?'milestones':goal.asset}</p>{goal.plan?.active&&<p>{goal.plan.nextDate<localDate()?'Overdue planned contribution':'Next planned contribution'}: {amount(goal.plan.amount,goal.plan.decimals)} {goal.plan.asset} · {goal.plan.nextDate}</p>}{goal.milestones.find(m=>!m.done)&&<p>Next milestone: {goal.milestones.find(m=>!m.done)!.title}</p>}{progress.requiresReview&&<p className="notice">Your Goal allocations need review.</p>}<Link className="text-link" href={`/app/goals/tracked/${goal.id}`}>{progress.breakdown.length?'Review your next step':'Link wealth to this Goal'} →</Link></div>:<Link href="/app/goals/new" className="text-link">Plan a goal →</Link>}<p className="fine">Observed snapshots and manual values are separate from plans. Habit completion never adds financial progress.</p></section>;
}
