'use client';
import Link from 'next/link';
import {useUnifiedGoals} from '../use-unified-goals';
import {GoalSummaryCard} from '../goal-card';
/** Compatibility entry point: the same collection used on Today and Goals. */
export function PlatformToday(){const store=useUnifiedGoals();return <section className="panel"><div className="section-heading"><h2>Your goals</h2><Link href="/app/goals" className="text-link">View all Goals →</Link></div><div className="today-goals-grid">{store.goals.filter(g=>g.status==='active').map(g=><GoalSummaryCard key={g.key} summary={g} compact/>)}</div></section>;}
