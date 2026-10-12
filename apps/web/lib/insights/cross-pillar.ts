import {habitDay, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {waterSummary} from '../health-daily';
import {dailySeries} from '../sleep/engine';
import {addLocalDays} from '../local-date';
import {formatNumber} from '../visual-format';
import {FORBIDDEN_INSIGHT_WORDS, stepThreshold} from './engine';

/**
 * Cross-pillar insights (Session AA-Cloud Part 5, S3): the same day seen from two pillars, such as a night's sleep and
 * the habits of the next day. Each pairing compares the days with a condition against the days without it, from the
 * person's own records over the last 90 days, and shows only when each side has at least 14 days. The words say what
 * happened together ("on days after…"), never why: a pairing is not a cause. Below the minimum the pairing says how
 * many days it has so far ("not enough data yet"). Nothing is stored; nothing leaves the device.
 */
export const CROSS_WINDOW_DAYS = 90, CROSS_MIN_PER_SIDE = 14;
export type CrossSide = {days: number; value: number};
export type CrossInsight = {id: string; title: string; sentence: string; withA: CrossSide; withoutA: CrossSide; unit: '%' | 'min'; window: {start: string; end: string}; contrast: number};
export type CrossPending = {id: string; title: string; withA: number; withoutA: number; need: number};
export type CrossResult = {ready: CrossInsight[]; pending: CrossPending[]};

const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const hoursMinutes = (min: number) => { const m = Math.round(min), h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

/** The share of the day's scheduled habits completed (skips left out), or null when none was scheduled. */
export function habitShare(habits: HabitData, date: string, today: string): number | null {
  let scheduled = 0, done = 0;
  for (const habit of habits.habits) {
    const day = habitDay(habit, date, today);
    if (!day.scheduled || day.status === 'skipped') continue;
    scheduled++;
    if (day.status === 'complete') done++;
  }
  return scheduled ? done / scheduled : null;
}

export function crossPillarInsights({habits, health, today, max = 3}: {habits: HabitData; health: HealthData; today: string; max?: number}): CrossResult {
  const window = {start: addLocalDays(today, 1 - CROSS_WINDOW_DAYS), end: today}, list = days(window.start, window.end);
  // Sleep by the day a night ends (the "night before" a day), and the night that follows a day (ends the next day).
  const sleepSeries = health.sleep ? dailySeries(health.sleep, addLocalDays(today, 1), CROSS_WINDOW_DAYS + 1) : [];
  const sleepEnding = new Map(sleepSeries.filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
  const target = health.sleep?.goal?.minutes ?? 420, steps = stepThreshold(health, list);
  const active = (d: string) => health.activity.some(a => a.date === d);
  const ready: CrossInsight[] = [], pending: CrossPending[] = [];
  const pair = (id: string, title: string, sample: {a: boolean; value: number}[], unit: CrossInsight['unit'], sentence: (a: CrossSide, b: CrossSide) => string) => {
    const withA = sample.filter(s => s.a), withoutA = sample.filter(s => !s.a);
    if (withA.length < CROSS_MIN_PER_SIDE || withoutA.length < CROSS_MIN_PER_SIDE) { pending.push({id, title, withA: withA.length, withoutA: withoutA.length, need: CROSS_MIN_PER_SIDE}); return; }
    const a = {days: withA.length, value: mean(withA.map(s => s.value))}, b = {days: withoutA.length, value: mean(withoutA.map(s => s.value))};
    const text = sentence(a, b);
    if (FORBIDDEN_INSIGHT_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text))) throw Error(`An insight sentence used "${text}".`);
    ready.push({id, title, sentence: text, withA: a, withoutA: b, unit, window, contrast: unit === '%' ? Math.abs(a.value - b.value) : Math.abs(a.value - b.value) / 120});
  };
  const goal = hoursMinutes(target);
  pair('sleep-habits', 'Sleep and habits', list.flatMap(d => { const slept = sleepEnding.get(d), share = habitShare(habits, d, today); return slept === undefined || share === null ? [] : [{a: slept >= target, value: share}]; }), '%',
    (a, b) => `On days after a night of at least ${goal} of sleep, you completed ${pct(a.value)} of your scheduled habits; after shorter nights, ${pct(b.value)}.`);
  if (steps) pair('steps-sleep', 'Steps and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return !active(d) || night === undefined ? [] : [{a: dailyHealthSummary(health, d).steps >= steps.value, value: night}]; }), 'min',
    (a, b) => `On days you walked at least ${formatNumber(steps.value)} steps, you slept ${hoursMinutes(a.value)} that night on average; on other days, ${hoursMinutes(b.value)}.`);
  pair('water-habits', 'Water and habits', list.flatMap(d => { const share = habitShare(habits, d, today); return share === null ? [] : [{a: waterSummary(health, d).entries > 0, value: share}]; }), '%',
    (a, b) => `On days you logged water, you completed ${pct(a.value)} of your scheduled habits; on days without, ${pct(b.value)}.`);
  return {ready: ready.sort((x, y) => y.contrast - x.contrast).slice(0, max), pending};
}
