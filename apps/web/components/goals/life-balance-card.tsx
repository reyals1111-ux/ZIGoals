'use client';
import type {LayoutAttrs} from '../layout-edit';
import Link from 'next/link';
import {useMemo} from 'react';
import {habitAreasFrom} from '../../lib/goal-extras/areas';
import {getAppStorage} from '../../lib/showcase-storage';
import {averageItem, balanceOf, goalItem, habitItem, healthItems} from '../../lib/life-balance';
import {useUnifiedGoals} from '../use-unified-goals';
import {usePlatform} from '../platform/use-platform';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useHealthGoals} from '../health-goals/use-health-goals';
import {useLocalToday} from '../use-local-today';
import {SectionHeading} from '../ui/section-heading';
import {BalanceLegend, BalanceWheel} from './balance-wheel';
import {useAverageGoals, useGoalExtras} from './use-goal-extras';
import {formatMonth} from './format';
import './goals.css';

/** The balance across every area, from every store the device has; areas only change by the person's choice. */
export function useLifeBalance() {
  const unified = useUnifiedGoals(), platform = usePlatform(), habits = useHabits(), health = useHealth(), healthGoals = useHealthGoals(), averages = useAverageGoals(), extras = useGoalExtras(), today = useLocalToday();
  const ready = unified.loaded && habits.loaded && health.loaded && healthGoals.loaded && averages.loaded && extras.loaded;
  const result = useMemo(() => {
    if (!ready) return null;
    let habitAreas: Record<string, string> = {};
    try { habitAreas = habitAreasFrom(getAppStorage()); } catch { /* locked: habits count under Habits & Mind */ }
    const x = extras.data, items = [
      ...unified.goals.filter(g => g.status === 'active').map(g => goalItem(g, x, platform.data.contributions ?? [], today)),
      ...(habits.error ? [] : habits.data.habits.filter(h => h.rules.at(-1)?.state === 'active').map(h => habitItem(h, x, today, habitAreas))),
      ...(health.error || healthGoals.unreadable ? [] : healthItems(healthGoals.data.goals, health.data, x, today)),
      ...(averages.unreadable ? [] : averages.data.goals.filter(g => g.status === 'active').map(g => averageItem(g, health.error ? undefined : health.data, x, today))),
    ];
    return balanceOf(x, items);
  }, [ready, unified.goals, platform.data, habits.data, habits.error, health.data, health.error, healthGoals.data, healthGoals.unreadable, averages.data, averages.unreadable, extras.data, today]);
  return {ready, result, today};
}

/** G2's card: the wheel, its legend and what has no area yet. On Goals, and as a Today widget (`compact`). */
export function LifeBalanceCard({compact = false, ...layout}: LayoutAttrs & {compact?: boolean}) {
  const {ready, result, today} = useLifeBalance();
  return <section className={`panel life-balance-card${compact ? ' is-compact' : ''}`} aria-labelledby="life-balance-title" {...layout}>
    <SectionHeading id="life-balance-title" eyebrow={`Your life areas · ${formatMonth(today)}`} title="Life balance" lede={compact ? undefined : 'How each part of your life moved this month, from your own goals, habits and Health records.'} action={compact ? <Link className="text-link" href="/app/goals#life-balance-title">Open →</Link> : undefined} />
    {!ready || !result ? <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : !result.areas.some(a => a.items || a.activity) ? <div className="aa-empty"><h3>Your wheel fills as you go.</h3><p>Each goal, habit and Health record adds to its life area: Health, Habits &amp; Mind, Wealth, Relationships, Career, Learning and Fun.</p><Link className="primary" href="/app/goals/templates">Start from a template</Link></div> : <>
      <div className="life-balance-body">
        <BalanceWheel areas={result.areas} size={compact ? 168 : 232} />
        <BalanceLegend areas={result.areas} />
      </div>
      {result.unassigned > 0 && <p className="fine">{result.unassigned} {result.unassigned === 1 ? 'goal has' : 'goals have'} no life area yet. Choose one on the goal’s page.</p>}
      <p className="fine">Progress is the average of what is known; an area with nothing known says so and is never counted as zero.</p>
    </>}
  </section>;
}
