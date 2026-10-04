'use client';
import Link from 'next/link';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import {healthGoalLine, healthGoalProgress} from '../../lib/health-goals/progress';
import type {HealthGoals} from '../../lib/health-goals/schema';
import {isShowcase} from '../../lib/showcase-storage';
import {useHealthToday} from '../health/use-health-today';
import './health-goals.css';

/** Today's "Health goals" card (G3, in the "For you" area): up to three active goals, one line each. Rendered only when there is something to show. */
export function HealthGoalsCard({goals, health}: {goals: HealthGoals; health: HealthData}) {
  const today = useHealthToday(dailyData(health).preferences.timezone);
  const active = goals.goals.filter(g => g.status === 'active').slice(0, 3);
  if (!active.length) return null;
  return <section className="panel for-you-card health-goals-card" aria-labelledby="health-goals-card-title">
    <p className="eyebrow">Health goals</p><h2 id="health-goals-card-title">From your Health journal.</h2>
    <ul className="health-goal-list compact">{active.map(goal => <li key={goal.id} className="health-goal-row"><div className="health-goal-row-copy"><strong>{goal.name}</strong><span className="health-goal-line">{healthGoalLine(goal, healthGoalProgress(goal, health, today))}{isShowcase() && goal.id.startsWith('92000000-') ? ' · Showcase example' : ''}</span></div></li>)}</ul>
    <Link className="text-link" href="/app/goals#goals-health">All health goals →</Link>
  </section>;
}
