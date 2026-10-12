import type {HealthData} from '../health';
import {dailySeries} from '../sleep/engine';
import {waterSummary} from '../health-daily';
import {addDays, type AverageGoal, type AverageMetric} from './store';

/** G8's averages (Session AA-Cloud Part 2), apart from the store so a list of the goals loads no Health engine. */
/** Health's value for one day of a measure, or null when nothing was recorded that day (never zero for "nothing"). */
export function healthValues(health: HealthData | undefined, metric: AverageMetric, today: string, days: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!health || metric === 'custom') return out;
  if (metric === 'sleep-hours') {
    if (!health.sleep) return out;
    for (const p of dailySeries(health.sleep, today, days)) if (p.asleep !== null) out.set(p.date, Math.round(p.asleep / 6) / 10);
    return out;
  }
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (metric === 'steps') {
      const on = health.activity.filter(a => a.date === d);
      if (on.length) out.set(d, on.reduce((n, a) => n + a.steps, 0));
    } else {
      const w = waterSummary(health, d);
      if (w.entries) out.set(d, Math.round(w.millilitres));
    }
  }
  return out;
}

export type AverageProgress = {average: number | null; days: number; windowDays: number; met: boolean | null; share: number | null; series: {day: string; value: number | null}[]; source: 'health' | 'manual' | 'both'};
/**
 * The rolling average over the goal's window ending today: the person's own entry for a day wins over Health's value;
 * days with neither are left out. `met` compares the average with the target in the goal's direction; `share` is how
 * close the average is (capped at 1), for the ring. Null while no day in the window has a value.
 */
export function averageProgress(goal: AverageGoal, health: HealthData | undefined, today: string): AverageProgress {
  const fromHealth = healthValues(health, goal.metric, today, goal.windowDays);
  const own = new Map(goal.entries.map(e => [e.day, e.value]));
  const series = Array.from({length: goal.windowDays}, (_, i) => {
    const d = addDays(today, i + 1 - goal.windowDays);
    return {day: d, value: own.get(d) ?? fromHealth.get(d) ?? null};
  });
  const values = series.map(s => s.value).filter((v): v is number => v !== null);
  const usedOwn = series.some(s => own.has(s.day)), usedHealth = series.some(s => !own.has(s.day) && fromHealth.has(s.day));
  const source = usedOwn && usedHealth ? 'both' : usedHealth ? 'health' : 'manual';
  if (!values.length) return {average: null, days: 0, windowDays: goal.windowDays, met: null, share: null, series, source};
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const met = goal.direction === 'at-least' ? average >= goal.target : average <= goal.target;
  const share = goal.direction === 'at-least' ? Math.min(1, average / goal.target) : average <= goal.target ? 1 : Math.max(0, goal.target / average);
  return {average, days: values.length, windowDays: goal.windowDays, met, share, series, source};
}
