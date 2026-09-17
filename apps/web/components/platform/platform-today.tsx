'use client';
import Link from 'next/link';
import { usePlatform } from './use-platform';
import { amount } from './common';
import { allocationBalance, goalProgress, rescaleUnits } from '../../lib/positions';
export function PlatformToday(){
 const store=usePlatform();const ps=store.data.positions.filter(p=>p.network==='zigchain-1'&&p.providerId==='native-zig');
 const total=ps.reduce((n,p)=>n+BigInt(rescaleUnits(p.quantity,p.decimals,18)),0n).toString();
 const allocated=ps.reduce((n,p)=>n+BigInt(rescaleUnits(allocationBalance(store.data,p.id).allocated,p.decimals,18)),0n).toString();
 const goal=store.data.goals.find(g=>g.status==='active');const progress=goal?goalProgress(store.data,goal.id):undefined;
 return <section className="panel platform-workspace"><div className="section-heading"><h2>Your wealth, your goals</h2><Link href="/app/goals/positions" className="text-link">Your ZIG / Positions →</Link></div><p>{ps.length?`${amount(total)} ZIG observed · ${amount(allocated)} allocated intentions · mainnet snapshots`:'Connect a public address in watch-only mode, or add a manual Position. Your wealth can stay where it is.'}</p>{goal&&progress?<div><h3><Link href={`/app/goals/tracked/${goal.id}`}>{goal.name}</Link></h3><p>{progress.progressPct}% · {amount(progress.current,goal.decimals)} / {amount(progress.target,goal.decimals)} {goal.type==='PROJECT'?'milestones':goal.asset}</p>{goal.plan?.active&&<p>Next planned contribution: {amount(goal.plan.amount,goal.plan.decimals)} {goal.plan.asset} · {goal.plan.nextDate}</p>}{goal.milestones.find(m=>!m.done)&&<p>Next milestone: {goal.milestones.find(m=>!m.done)!.title}</p>}{progress.requiresReview&&<p className="notice">Your Goal allocations need review.</p>}</div>:<Link href="/app/goals/tracked" className="text-link">Create a private tracked goal →</Link>}<p className="fine">Observed snapshots and manual values are separate from plans. Habit completion never adds financial progress.</p></section>;
}
