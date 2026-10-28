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
export type CrossInsight = {id: string; title: string; sentence: string; withA: CrossSide; withoutA: CrossSide; unit: '%' | 'min' | 'mood'; window: {start: string; end: string}; contrast: number};
export type CrossPending = {id: string; title: string; withA: number; withoutA: number; need: number};
export type CrossResult = {ready: CrossInsight[]; pending: CrossPending[]};

/** A stored time as the device's local date and hour. */
export const deviceTime = (iso: string): {date: string; hour: number} => { const t = new Date(iso); return {date: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, hour: t.getHours()}; };
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

/**
 * Session AI (feature 4, proactive insights across modules): three more pairings over the same rules — food logged after
 * 9 pm and that night's sleep, habits and the evening mood, spending and the evening mood. `spending` is the expense log
 * (its most used currency only; amounts are never converted); `localTime` reads a stored time as the device's local date and hour.
 * Dismissed pairings (`hidden`, the Insights key's 28 days) are left out; at most `max` are shown.
 */
export type CrossExtras = {spending?: {entries: readonly {kind: string; amount: string; currency: string; date: string}[]}; hidden?: ReadonlySet<string>; localTime?: (iso: string) => {date: string; hour: number}};
export const LATE_HOUR = 21;
export function crossPillarInsights({habits, health, today, max = 3, spending, hidden, localTime = deviceTime}: {habits: HabitData; health: HealthData; today: string; max?: number} & CrossExtras): CrossResult {
  const window = {start: addLocalDays(today, 1 - CROSS_WINDOW_DAYS), end: today}, list = days(window.start, window.end);
  // Sleep by the day a night ends (the "night before" a day), and the night that follows a day (ends the next day).
  const sleepSeries = health.sleep ? dailySeries(health.sleep, addLocalDays(today, 1), CROSS_WINDOW_DAYS + 1) : [];
  const sleepEnding = new Map(sleepSeries.filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
  const target = health.sleep?.goal?.minutes ?? 420, steps = stepThreshold(health, list);
  const active = (d: string) => health.activity.some(a => a.date === d);
  const ready: CrossInsight[] = [], pending: CrossPending[] = [];
  const pair = (id: string, title: string, sample: {a: boolean; value: number}[], unit: CrossInsight['unit'], sentence: (a: CrossSide, b: CrossSide) => string, quietWhenEmpty = false) => {
    const withA = sample.filter(s => s.a), withoutA = sample.filter(s => !s.a);
    if (quietWhenEmpty && !sample.length) return; // Session AI: a pairing the person keeps no records for (no moods, no spending) is not listed as collecting
    if (withA.length < CROSS_MIN_PER_SIDE || withoutA.length < CROSS_MIN_PER_SIDE) { pending.push({id, title, withA: withA.length, withoutA: withoutA.length, need: CROSS_MIN_PER_SIDE}); return; }
    const a = {days: withA.length, value: mean(withA.map(s => s.value))}, b = {days: withoutA.length, value: mean(withoutA.map(s => s.value))};
    const text = sentence(a, b);
    if (FORBIDDEN_INSIGHT_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text))) throw Error(`An insight sentence used "${text}".`);
    ready.push({id, title, sentence: text, withA: a, withoutA: b, unit, window, contrast: unit === '%' ? Math.abs(a.value - b.value) : unit === 'mood' ? Math.abs(a.value - b.value) / 4 : Math.abs(a.value - b.value) / 120});
  };
  const goal = hoursMinutes(target);
  pair('sleep-habits', 'Sleep and habits', list.flatMap(d => { const slept = sleepEnding.get(d), share = habitShare(habits, d, today); return slept === undefined || share === null ? [] : [{a: slept >= target, value: share}]; }), '%',
    (a, b) => `On days after a night of at least ${goal} of sleep, you completed ${pct(a.value)} of your scheduled habits; after shorter nights, ${pct(b.value)}.`);
  if (steps) pair('steps-sleep', 'Steps and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return !active(d) || night === undefined ? [] : [{a: dailyHealthSummary(health, d).steps >= steps.value, value: night}]; }), 'min',
    (a, b) => `On days you walked at least ${formatNumber(steps.value)} steps, you slept ${hoursMinutes(a.value)} that night on average; on other days, ${hoursMinutes(b.value)}.`);
  pair('water-habits', 'Water and habits', list.flatMap(d => { const share = habitShare(habits, d, today); return share === null ? [] : [{a: waterSummary(health, d).entries > 0, value: share}]; }), '%',
    (a, b) => `On days you logged water, you completed ${pct(a.value)} of your scheduled habits; on days without, ${pct(b.value)}.`);
  pair('water-sleep', 'Water and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return night === undefined ? [] : [{a: waterSummary(health, d).entries > 0, value: night}]; }), 'min',
    (a, b) => `On days you logged water, you slept ${hoursMinutes(a.value)} that night on average; on days without, ${hoursMinutes(b.value)}.`);
  // Session AI (feature 4): food logged after 9 pm and that night's sleep (days with any food logged; the logging time, not the meal time).
  const late = (d: string) => health.diary.some(e => { const t = localTime(e.createdAt); return e.date === d && t.date === d && t.hour >= LATE_HOUR; });
  pair('late-food-sleep', 'Food after 9 pm and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return night === undefined || !health.diary.some(e => e.date === d) ? [] : [{a: late(d), value: night}]; }), 'min',
    (a, b) => `On days you logged food after 9 pm, you slept ${hoursMinutes(a.value)} that night on average; on other days you logged food, ${hoursMinutes(b.value)}.`, true);
  const moods = (health as {moods?: {days: Record<string, {mood: number}>}}).moods?.days ?? {};
  pair('habits-mood', 'Habits and mood', list.flatMap(d => { const share = habitShare(habits, d, today), mood = moods[d]?.mood; return share === null || mood === undefined ? [] : [{a: share >= 0.5, value: mood}]; }), 'mood',
    (a, b) => `On days you completed at least half of your scheduled habits, your evening mood averaged ${a.value.toFixed(1)} of 5; on other days, ${b.value.toFixed(1)}.`, true);
  const spent = (spending?.entries ?? []).filter(e => e.kind === 'expense' && e.date >= window.start && e.date <= window.end);
  const currency = [...spent.reduce((m, e) => m.set(e.currency, (m.get(e.currency) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1])[0]?.[0];
  if (currency) {
    const totals = new Map<string, number>(); for (const e of spent) if (e.currency === currency) totals.set(e.date, (totals.get(e.date) ?? 0) + Number(e.amount));
    const sorted = [...totals.values()].sort((x, y) => x - y), usual = sorted[Math.ceil(sorted.length / 2) - 1] ?? 0;
    if (usual > 0) pair('spending-mood', 'Spending and mood', list.flatMap(d => { const mood = moods[d]?.mood; return mood === undefined ? [] : [{a: (totals.get(d) ?? 0) > usual, value: mood}]; }), 'mood',
      (a, b) => `On days you spent above your usual ${formatNumber(usual)} ${currency}, your evening mood averaged ${a.value.toFixed(1)} of 5; on other days, ${b.value.toFixed(1)}.`, true);
  }
  return {ready: ready.filter(i => !hidden?.has(i.id)).sort((x, y) => y.contrast - x.contrast).slice(0, max), pending};
}
