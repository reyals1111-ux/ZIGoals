import Decimal from 'decimal.js';
import {addLocalDays} from '../local-date';
import {habitDay, habitStats, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {waterSummary} from '../health-daily';
import {dailySeries} from '../sleep/engine';
import type {Platform} from '../positions';
import type {WealthHistory} from '../wealth';
import type {AverageGoal} from '../average-goals/store';
import {averageProgress} from '../average-goals/progress';
import type {GoalExtras} from '../goal-extras/store';
import {formatGoalAmount} from '../goal-summary';
import {formatNumber} from '../visual-format';
import {hoursMinutes} from '../insights/cross-pillar';

/**
 * The Life review (Session AA-Cloud Part 5, S2): a week or a month across the four pillars, from the person's own
 * records, beside the previous period of the same length. It extends the weekly review (lib/weekly-review), never
 * replaces it: the six-step reflection and its words stay where they are. Counts and averages only; a measure with
 * nothing recorded is "not recorded", never zero; money stays in its own currency, never converted.
 */
export type Period = 'week' | 'month';
export type Window = {period: Period; start: string; end: string; prevStart: string; prevEnd: string; key: string};

/** This week (the seven days ending today) or this month so far, and the period before it of the same length. */
export function reviewPeriod(period: Period, today: string): Window {
  if (period === 'week') {
    const start = addLocalDays(today, -6);
    return {period, start, end: today, prevStart: addLocalDays(start, -7), prevEnd: addLocalDays(start, -1), key: `week:${start}`};
  }
  const start = `${today.slice(0, 7)}-01`, length = Number(today.slice(8, 10));
  const prevMonthEnd = addLocalDays(start, -1), prevStart = `${prevMonthEnd.slice(0, 7)}-01`;
  const prevEnd = [addLocalDays(prevStart, length - 1), prevMonthEnd].sort()[0]!;
  return {period, start, end: today, prevStart, prevEnd, key: `month:${today.slice(0, 7)}`};
}

export type Trend = {label: string; now: string | null; before: string | null; detail: string};
export type MoneyChange = {currency: string; start: string | null; end: string | null; change: string | null; note: string};
export type GoalMove = {name: string; href: string; line: string};
export type LifeReview = {
  window: Window;
  highlights: string[];
  wins: string[];
  streaks: {title: string; streak: number; unit: string}[];
  goalsMoved: GoalMove[];
  plans: {name: string; why?: string; ifThen?: string}[];
  health: Trend[];
  money: MoneyChange[];
  counts: {habitCheckIns: number; healthDays: number; contributions: number};
};

const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };
const mean = (v: readonly number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const dayOf = (iso: string) => iso.slice(0, 10);

export function lifeReview({window, habits, health, platform, goals, averages, extras, history, today}: {
  window: Window; habits: HabitData; health: HealthData; platform: Platform;
  goals: readonly {key: string; id: string; name: string; href: string; status: string}[];
  averages: readonly AverageGoal[]; extras: GoalExtras; history: readonly WealthHistory[]; today: string;
}): LifeReview {
  const now = days(window.start, window.end), before = days(window.prevStart, window.prevEnd), inNow = (d: string) => d >= window.start && d <= window.end;

  // Habits: check-ins, perfect habits, streaks.
  let checkIns = 0;
  const perfect: string[] = [];
  for (const habit of habits.habits) {
    const results = now.map(d => habitDay(habit, d, today)).filter(r => r.scheduled && r.status !== 'skipped');
    const done = results.filter(r => r.status === 'complete').length;
    checkIns += done;
    if (results.length >= 3 && done === results.length) perfect.push(habit.title);
  }
  const streaks = habits.habits.map(h => { const s = habitStats(h, window.end); return {title: h.title, streak: s.currentStreak, unit: s.streakUnit as string}; }).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3);

  // Health: sleep, steps, water and meals, now against the period before.
  const series = health.sleep ? dailySeries(health.sleep, window.end, now.length + before.length + 1) : [];
  const sleepIn = (list: readonly string[]) => series.filter(p => p.asleep !== null && list.includes(p.date)).map(p => p.asleep!);
  const stepsIn = (list: readonly string[]) => list.filter(d => health.activity.some(a => a.date === d)).map(d => dailyHealthSummary(health, d).steps);
  const waterDays = (list: readonly string[]) => list.filter(d => waterSummary(health, d).entries > 0).length;
  const mealDays = (list: readonly string[]) => list.filter(d => health.diary.some(e => e.date === d)).length;
  const s1 = sleepIn(now), s0 = sleepIn(before), st1 = stepsIn(now), st0 = stepsIn(before);
  const avg = (v: number[], f: (n: number) => string) => { const m = mean(v); return m === null ? null : f(m); };
  const healthTrends: Trend[] = [
    {label: 'Sleep a night', now: avg(s1, hoursMinutes), before: avg(s0, hoursMinutes), detail: `${s1.length} of ${now.length} nights recorded`},
    {label: 'Steps a day', now: avg(st1, n => formatNumber(Math.round(n))), before: avg(st0, n => formatNumber(Math.round(n))), detail: `${st1.length} of ${now.length} days with activity`},
    {label: 'Days with water', now: waterDays(now) ? `${waterDays(now)} of ${now.length}` : null, before: waterDays(before) ? `${waterDays(before)} of ${before.length}` : null, detail: 'Days with at least one water entry'},
    {label: 'Days with meals', now: mealDays(now) ? `${mealDays(now)} of ${now.length}` : null, before: mealDays(before) ? `${mealDays(before)} of ${before.length}` : null, detail: 'Days with at least one meal logged'},
  ];
  const healthDays = now.filter(d => health.diary.some(e => e.date === d) || health.activity.some(a => a.date === d) || waterSummary(health, d).entries > 0 || sleepIn([d]).length > 0).length;

  // Goals: what was put in, milestones and finishes recorded in the period; average goals met.
  const goalsMoved: GoalMove[] = [], wins: string[] = [];
  let contributionCount = 0;
  for (const goal of platform.goals) {
    const summary = goals.find(g => g.key === `private:${goal.id}`);
    if (!summary) continue;
    const events = platform.contributions.filter(c => c.goalId === goal.id && c.goalScope === 'private' && inNow(dayOf(c.occurredAt)));
    contributionCount += events.length;
    if (events.length) {
      const net = events.reduce((sum, e) => sum.plus(new Decimal(e.quantity).div(new Decimal(10).pow(e.decimals)).times(e.direction === 'IN' ? 1 : -1)), new Decimal(0));
      const asset = events[0]!.asset, same = events.every(e => e.asset === asset);
      goalsMoved.push({name: goal.name, href: summary.href, line: !same ? `${events.length} contributions, in more than one asset` : net.isZero() ? `${events.length} contributions that balance out` : `${net.isNegative() ? '' : '+'}${formatGoalAmount(net.toFixed(), asset)} put in (${events.length} ${events.length === 1 ? 'contribution' : 'contributions'})`});
    }
    for (const h of platform.goalHistory) if (h.goalId === goal.id && h.kind === 'milestone' && inNow(dayOf(h.capturedAt))) goalsMoved.push({name: goal.name, href: summary.href, line: h.label});
  }
  // Finished in the period: a tracked goal's last "completed" step (as the Hall reads it), an average goal's own day.
  for (const goal of platform.goals) {
    const done = goal.status === 'completed' ? [...(goal.lifecycle ?? [])].reverse().find(l => l.kind === 'completed') : undefined;
    if (done && inNow(dayOf(done.at))) wins.push(`Finished ${goal.name}`);
  }
  for (const g of averages) if (g.status === 'completed' && g.completedAt && inNow(dayOf(g.completedAt))) wins.push(`Finished ${g.name}`);
  for (const g of averages) {
    if (g.status !== 'active') continue;
    const p = averageProgress(g, health, window.end);
    if (p.met) wins.push(`${g.name}: on target, ${formatNumber(Math.round(p.average! * 10) / 10)} ${g.unit} on average`);
  }
  for (const title of perfect) wins.push(`${title}: every scheduled day done`);

  // The plans behind the active goals (G4), shown so the review can come back to them.
  const plans = goals.filter(g => g.status === 'active').flatMap(g => { const x = extras.goals[g.key]; return x && (x.why || x.ifThen) ? [{name: g.name, ...(x.why ? {why: x.why} : {}), ...(x.ifThen ? {ifThen: x.ifThen} : {})}] : []; }).slice(0, 4);

  // Money: each currency's recorded total at the start and the end, never converted.
  const money: MoneyChange[] = history.map(h => {
    // History values are in the currency's minor units (cents), as Wealth records them.
    const units = (v: string | undefined) => v === undefined ? null : new Decimal(v).div(new Decimal(10).pow(h.decimals)).toFixed(h.decimals);
    const at = (day: string) => units([...h.points].filter(p => dayOf(p.at) <= day).at(-1)?.value);
    const start = at(addLocalDays(window.start, -1)) ?? units(h.points.find(p => inNow(dayOf(p.at)))?.value), end = at(window.end);
    const change = start !== null && end !== null ? new Decimal(end).minus(start).toFixed(2) : null;
    return {currency: h.currency, start, end, change, note: start === null || end === null ? 'Not enough recorded values in this period' : 'Recorded values, this currency only'};
  });

  const highlights: string[] = [];
  if (checkIns) highlights.push(`${formatNumber(checkIns)} habit ${checkIns === 1 ? 'check-in' : 'check-ins'}`);
  if (streaks[0]) highlights.push(`Longest streak: ${streaks[0].title}, ${formatNumber(streaks[0].streak)} ${streaks[0].unit}`);
  if (goalsMoved[0]) highlights.push(`${goalsMoved[0].name}: ${goalsMoved[0].line}`);
  if (healthTrends[0]!.now) highlights.push(`Sleep: ${healthTrends[0]!.now} a night on average`);
  return {window, highlights: highlights.slice(0, 4), wins, streaks, goalsMoved, plans, health: healthTrends, money, counts: {habitCheckIns: checkIns, healthDays, contributions: contributionCount}};
}
