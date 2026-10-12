'use client';
import {useMemo} from 'react';
import {paceForecast, privateGoalPoints} from '../../lib/goal-forecast';
import {formatGoalAmount} from '../../lib/goal-summary';
import type {ContributionEvent, PrivateGoal} from '../../lib/positions';
import {useLocalToday} from '../use-local-today';
import {GoalForecastCard} from './goal-forecast';

/** G1 for a tracked goal: its own recorded contributions, the value counted now and its target. */
export function GoalForecastPanel({goal, events, current, target, currency}: {goal: PrivateGoal; events: readonly ContributionEvent[]; current: number; target: number; currency: string}) {
  const today = useLocalToday();
  const points = useMemo(() => privateGoalPoints(goal, events, current, today), [goal, events, current, today]);
  const forecast = useMemo(() => paceForecast(points, current, target, today), [points, current, target, today]);
  const unit = (v: number) => formatGoalAmount((Math.round(v * 100) / 100).toFixed(2), currency);
  // Gate C: a goal can be ahead of its plan and still land after its date at the recorded pace; the card says which is which.
  return <GoalForecastCard forecast={forecast} points={points} current={current} target={target} today={today} unit={unit} note={goal.plan?.active ? 'This follows the progress recorded over time; the status above compares what you put in with your contribution plan.' : undefined} />;
}
