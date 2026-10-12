import type {GoalSummary} from './goal-summary';
import type {ContributionEvent} from './positions';
import type {Habit} from './habits';
import {habitDay} from './habits';
import type {HealthData} from './health';
import type {HealthGoal} from './health-goals/schema';
import {healthGoalProgress} from './health-goals/progress';
import {averageKey, averageProgress, type AverageGoal} from './average-goals/store';
import {areasOf, type GoalExtras} from './goal-extras/store';
import {dailyData} from './health-daily';

/**
 * G2, the balance wheel (Session AA-Cloud Part 2): for each life area, this month's activity (records made in the month:
 * contributions, habit check-ins, Health entries) and progress (the average share of its active goals and habits that
 * have a known value). An item with an unknown value adds to "items" but not to "progress"; an area with nothing known
 * has progress null ("no data yet"), never zero. Defaults when a person chose no area: money goals → Wealth, Health
 * goals and the sleep, steps and water averages → Health, habits → Habits & Mind; a project goal without an area is
 * counted under "No area yet" and not drawn.
 */
export type BalanceItem = {area: string | undefined; share: number | null; activity: number};
export type AreaBalance = {id: string; label: string; color: string; items: number; progress: number | null; activity: number};

export function balanceOf(extras: GoalExtras, items: readonly BalanceItem[]): {areas: AreaBalance[]; unassigned: number} {
  const areas = areasOf(extras).map(a => ({id: a.id, label: a.label, color: a.color, items: 0, progress: null as number | null, activity: 0, shares: [] as number[]}));
  let unassigned = 0;
  for (const item of items) {
    const area = areas.find(a => a.id === item.area);
    if (!area) { unassigned++; continue; }
    area.items++; area.activity += item.activity;
    if (item.share !== null && Number.isFinite(item.share)) area.shares.push(Math.min(1, Math.max(0, item.share)));
  }
  return {areas: areas.map(({shares, ...a}) => ({...a, progress: shares.length ? shares.reduce((x, y) => x + y, 0) / shares.length : null})), unassigned};
}

const monthOf = (today: string) => today.slice(0, 7);
const inMonth = (day: string, today: string) => day.slice(0, 7) === monthOf(today) && day <= today;

/** A goal's balance item: its area (chosen, or the default), its share and this month's contributions. */
export function goalItem(goal: GoalSummary, extras: GoalExtras, contributions: readonly ContributionEvent[], today: string): BalanceItem {
  const chosen = extras.goals[goal.key]?.area;
  const area = chosen ?? (goal.type === 'PROJECT' ? undefined : 'wealth');
  const share = goal.progressBound === 'unavailable' ? null : Number(goal.progressPct) / 100;
  const id = goal.key.startsWith('private:') ? goal.key.slice(8) : null;
  const activity = id ? contributions.filter(c => c.goalScope === 'private' && c.goalId === id && inMonth(c.occurredAt.slice(0, 10), today)).length : 0;
  return {area, share: Number.isFinite(share as number) ? share : null, activity};
}
/** A habit's item: done days over scheduled days this month (up to today), and this month's logged entries. Its area
 * comes from Session AA-Local's habit record when it has one (`areas`, lib/goal-extras/areas.ts `habitAreasFrom`). */
export function habitItem(habit: Habit, extras: GoalExtras, today: string, areas: Readonly<Record<string, string>> = {}): BalanceItem {
  let scheduled = 0, done = 0;
  const first = `${monthOf(today)}-01`;
  for (let d = first; d <= today; d = new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
    const day = habitDay(habit, d, today);
    if (!day.scheduled) continue;
    scheduled++;
    if (day.status === 'complete') done++;
  }
  const activity = habit.entries.filter(e => inMonth(e.date, today) && e.disposition === 'logged' && e.count > 0).length;
  return {area: areas[habit.id] ?? extras.habitAreas?.[habit.id] ?? 'mind', share: scheduled ? done / scheduled : null, activity};
}
/** Health's items: each active Health goal (its percent when known) and the month's Health entries counted once. */
export function healthItems(goals: readonly HealthGoal[], health: HealthData, extras: GoalExtras, today: string): BalanceItem[] {
  const entries = health.diary.filter(d => inMonth(d.date, today)).length + health.activity.filter(a => inMonth(a.date, today)).length + health.weights.filter(w => inMonth(w.date, today)).length + dailyData(health).water.filter(w => inMonth(w.date, today)).length;
  const items: BalanceItem[] = goals.filter(g => g.status === 'active').map(g => {
    const p = healthGoalProgress(g, health, today);
    return {area: extras.goals[`health:${g.id}`]?.area ?? 'health', share: p.kind === 'value' && p.percent !== null ? p.percent / 100 : null, activity: 0};
  });
  if (entries) items.push({area: 'health', share: null, activity: entries});
  return items;
}
/** An average goal's item: how close its rolling average is, in the area chosen or Health for sleep, steps and water. */
export function averageItem(goal: AverageGoal, health: HealthData | undefined, extras: GoalExtras, today: string): BalanceItem {
  const p = averageProgress(goal, health, today);
  return {area: extras.goals[averageKey(goal.id)]?.area ?? (goal.metric === 'custom' ? undefined : 'health'), share: p.share, activity: goal.entries.filter(e => inMonth(e.day, today)).length};
}
