import {habitDay, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {waterSummary} from '../health-daily';
import {dailySeries} from '../sleep/engine';
import {addLocalDays} from '../local-date';
import {formatNumber} from '../visual-format';
import {healthGroupIn} from '../vault/w-homes';
import {sessionDay} from '../meditation/stats';
import {FORBIDDEN_INSIGHT_WORDS, stepThreshold} from './engine';

/**
 * Cross-pillar insights (Session AA-Cloud Part 5, S3): the same day seen from two pillars, such as a night's sleep and
 * the habits of the next day. Each pairing compares the days with a condition against the days without it, from the
 * person's own records over the last 90 days, and shows only when each side has at least 14 days. The words say what
 * happened together ("on days after…"), never why: a pairing is not a cause. Below the minimum the pairing says how
 * many days it has so far ("not enough data yet"). Nothing is stored; nothing leaves the device.
 *
 * Session AJ (item 10, D14; docs/research/session-aj/COMPANIONS.md P3): honest confidence. With some fifteen pairings
 * computed, a few clear any single cut-off by chance, so a ready pairing now needs, beyond 14 days a side:
 * - a difference of at least its own meaningful gap (0.4 points on a 1–5 scale, 10 percentage points, 20 minutes), and
 * - the probability of superiority (the share of with/without day pairs where the with-day is higher, ties ½; the
 *   Mann-Whitney U over n₁·n₂, no dependency) at 0.60 or more in the same direction (0.40 or less for a lower side).
 * Such a pairing is an **early sign**. It is **consistent** when each side has 28 days or more and both 45-day halves
 * of the window show the same direction with at least half the gap (7 days a side in each half). A pairing with its 14
 * days but no clear difference is listed as "no clear difference so far" (never on Today). Every "Why?" names the days,
 * the label and one thing that could explain the pairing without one bringing the other.
 */
export const CROSS_WINDOW_DAYS = 90, CROSS_MIN_PER_SIDE = 14, CROSS_CONSISTENT_PER_SIDE = 28, CROSS_HALF_MIN_PER_SIDE = 7;
export type CrossSide = {days: number; value: number};
/** `%` a share 0–1; `min` minutes; `mood` and `energy` an average on the 1–5 scale. */
export type CrossUnit = '%' | 'min' | 'mood' | 'energy';
export type CrossLabel = 'early' | 'consistent';
export type CrossInsight = {id: string; title: string; sentence: string; withA: CrossSide; withoutA: CrossSide; unit: CrossUnit; window: {start: string; end: string}; contrast: number;
  /** Session AJ: the confidence label, the probability of superiority and the thing that could explain the pairing. */
  label: CrossLabel; ps: number; confounder: string};
export type CrossPending = {id: string; title: string; withA: number; withoutA: number; need: number};
/** Session AJ: 14 days a side, but a difference below the pairing's gap or a probability of superiority between 0.40 and 0.60. */
export type CrossUnclear = {id: string; title: string; withA: CrossSide; withoutA: CrossSide; unit: CrossUnit};
export type CrossResult = {ready: CrossInsight[]; pending: CrossPending[]; unclear: CrossUnclear[]};
export const LABEL_WORDS: Readonly<Record<CrossLabel, {label: string; line: string}>> = {
  early: {label: 'Early sign', line: 'Seen across at least 14 days on each side; a few further weeks can change it.'},
  consistent: {label: 'Consistent', line: 'Seen across at least 28 days on each side, and in both halves of the period.'},
};

/** A stored time as the device's local date and hour. */
export const deviceTime = (iso: string): {date: string; hour: number} => { const t = new Date(iso); return {date: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, hour: t.getHours()}; };
const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const hoursMinutes = (min: number) => { const m = Math.round(min), h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

/** The probability of superiority: the share of (with, without) pairs where the with-value is higher, ties counting ½. */
export function probabilityOfSuperiority(withA: readonly number[], withoutA: readonly number[]): number {
  if (!withA.length || !withoutA.length) return 0.5;
  let wins = 0;
  for (const x of withA) for (const y of withoutA) wins += x > y ? 1 : x === y ? 0.5 : 0;
  return wins / (withA.length * withoutA.length);
}
type Sample = {date: string; a: boolean; value: number};
/** The label a ready pairing earns, or null when its difference is not clear (see the file comment). */
export function confidenceOf(sample: readonly Sample[], gap: number, mid: string): {label: CrossLabel | null; ps: number} {
  const withA = sample.filter(s => s.a).map(s => s.value), withoutA = sample.filter(s => !s.a).map(s => s.value);
  const diff = mean(withA) - mean(withoutA), ps = probabilityOfSuperiority(withA, withoutA);
  const clear = Math.abs(diff) >= gap - 1e-9 && (diff > 0 ? ps >= 0.6 : ps <= 0.4);
  if (!clear) return {label: null, ps};
  if (withA.length < CROSS_CONSISTENT_PER_SIDE || withoutA.length < CROSS_CONSISTENT_PER_SIDE) return {label: 'early', ps};
  const half = (inFirst: boolean) => { const part = sample.filter(s => (s.date < mid) === inFirst), w = part.filter(s => s.a).map(s => s.value), o = part.filter(s => !s.a).map(s => s.value); return w.length < CROSS_HALF_MIN_PER_SIDE || o.length < CROSS_HALF_MIN_PER_SIDE ? null : mean(w) - mean(o); };
  const same = (d: number | null) => d !== null && d > 0 === diff > 0 && d !== 0 && Math.abs(d) >= gap / 2 - 1e-9;
  return {label: same(half(true)) && same(half(false)) ? 'consistent' : 'early', ps};
}

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
 * 9 pm and that night's sleep, habits and the day's mood, spending and the day's mood. `spending` is the expense log
 * (its most used currency only; amounts are never converted); `localTime` reads a stored time as the device's local date and hour.
 * Dismissed pairings (`hidden`, the Insights key's 28 days) are left out; at most `max` are shown.
 * Session AJ (item 10): `energy` (the daily check-in, zigoals:energy:v1) and `workouts` (zigoals:workouts:v1) join, for
 * eight more pairings; a pairing whose records the person does not keep is not listed at all.
 */
export type CrossExtras = {spending?: {entries: readonly {kind: string; amount: string; currency: string; date: string}[]}; hidden?: ReadonlySet<string>; localTime?: (iso: string) => {date: string; hour: number};
  energy?: {days: Readonly<Record<string, {energy: number}>>} | null; workouts?: {workouts: readonly {startedAt: string}[]} | null};
export const LATE_HOUR = 21;
const GAP: Readonly<Record<CrossUnit, number>> = {'%': 0.1, min: 20, mood: 0.4, energy: 0.4};
export function crossPillarInsights({habits, health, today, max = 3, spending, hidden, localTime = deviceTime, energy, workouts}: {habits: HabitData; health: HealthData; today: string; max?: number} & CrossExtras): CrossResult {
  const window = {start: addLocalDays(today, 1 - CROSS_WINDOW_DAYS), end: today}, list = days(window.start, window.end), mid = addLocalDays(window.start, CROSS_WINDOW_DAYS / 2);
  // Sleep by the day a night ends (the "night before" a day), and the night that follows a day (ends the next day).
  const sleepSeries = health.sleep ? dailySeries(health.sleep, addLocalDays(today, 1), CROSS_WINDOW_DAYS + 1) : [];
  const sleepEnding = new Map(sleepSeries.filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
  const target = health.sleep?.goal?.minutes ?? 420, steps = stepThreshold(health, list);
  const active = (d: string) => health.activity.some(a => a.date === d);
  const ready: CrossInsight[] = [], pending: CrossPending[] = [], unclear: CrossUnclear[] = [];
  const pair = (id: string, title: string, sample: Sample[], unit: CrossUnit, confounder: string, sentence: (a: CrossSide, b: CrossSide) => string, quietWhenEmpty = false) => {
    const withA = sample.filter(s => s.a), withoutA = sample.filter(s => !s.a);
    if (quietWhenEmpty && !sample.length) return; // Session AI: a pairing the person keeps no records for (no moods, no spending) is not listed as collecting
    if (withA.length < CROSS_MIN_PER_SIDE || withoutA.length < CROSS_MIN_PER_SIDE) { pending.push({id, title, withA: withA.length, withoutA: withoutA.length, need: CROSS_MIN_PER_SIDE}); return; }
    const a = {days: withA.length, value: mean(withA.map(s => s.value))}, b = {days: withoutA.length, value: mean(withoutA.map(s => s.value))};
    const {label, ps} = confidenceOf(sample, GAP[unit], mid);
    if (!label) { unclear.push({id, title, withA: a, withoutA: b, unit}); return; }
    const text = sentence(a, b);
    if (FORBIDDEN_INSIGHT_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text))) throw Error(`An insight sentence used "${text}".`);
    const contrast = unit === '%' ? Math.abs(a.value - b.value) : unit === 'mood' || unit === 'energy' ? Math.abs(a.value - b.value) / 4 : Math.abs(a.value - b.value) / 120;
    ready.push({id, title, sentence: text, withA: a, withoutA: b, unit, window, contrast, label, ps, confounder});
  };
  const goal = hoursMinutes(target), scale = (v: number) => v.toFixed(1);
  pair('sleep-habits', 'Sleep and habits', list.flatMap(d => { const slept = sleepEnding.get(d), share = habitShare(habits, d, today); return slept === undefined || share === null ? [] : [{date: d, a: slept >= target, value: share}]; }), '%',
    'a busy stretch can shorten nights and leave less room for habits at the same time',
    (a, b) => `On days after a night of at least ${goal} of sleep, you completed ${pct(a.value)} of your scheduled habits; after shorter nights, ${pct(b.value)}.`);
  if (steps) pair('steps-sleep', 'Steps and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return !active(d) || night === undefined ? [] : [{date: d, a: dailyHealthSummary(health, d).steps >= steps.value, value: night}]; }), 'min',
    'days off can bring both longer walks and longer nights',
    (a, b) => `On days you walked at least ${formatNumber(steps.value)} steps, you slept ${hoursMinutes(a.value)} that night on average; on other days, ${hoursMinutes(b.value)}.`);
  pair('water-habits', 'Water and habits', list.flatMap(d => { const share = habitShare(habits, d, today); return share === null ? [] : [{date: d, a: waterSummary(health, d).entries > 0, value: share}]; }), '%',
    'days you remember to log water may be days you log everything',
    (a, b) => `On days you logged water, you completed ${pct(a.value)} of your scheduled habits; on days without, ${pct(b.value)}.`);
  pair('water-sleep', 'Water and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return night === undefined ? [] : [{date: d, a: waterSummary(health, d).entries > 0, value: night}]; }), 'min',
    'days you log water may also be calmer, more regular days',
    (a, b) => `On days you logged water, you slept ${hoursMinutes(a.value)} that night on average; on days without, ${hoursMinutes(b.value)}.`);
  // Session AI (feature 4): food logged after 9 pm and that night's sleep (days with any food logged; the logging time, not the meal time).
  const late = (d: string) => health.diary.some(e => { const t = localTime(e.createdAt); return e.date === d && t.date === d && t.hour >= LATE_HOUR; });
  const foodLogged = (d: string) => health.diary.some(e => e.date === d);
  pair('late-food-sleep', 'Food after 9 pm and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return night === undefined || !foodLogged(d) ? [] : [{date: d, a: late(d), value: night}]; }), 'min',
    'the time you log food is not always the time you ate',
    (a, b) => `On days you logged food after 9 pm, you slept ${hoursMinutes(a.value)} that night on average; on other days you logged food, ${hoursMinutes(b.value)}.`, true);
  // Session AJ: the morning check-in can now set the day's mood, so the sentences say "your mood that day" (was "evening mood").
  const moods = (health as {moods?: {days: Record<string, {mood: number}>}}).moods?.days ?? {};
  pair('habits-mood', 'Habits and mood', list.flatMap(d => { const share = habitShare(habits, d, today), mood = moods[d]?.mood; return share === null || mood === undefined ? [] : [{date: d, a: share >= 0.5, value: mood}]; }), 'mood',
    'a calm day can make both habits and a good mood easier, and a hard one both harder',
    (a, b) => `On days you completed at least half of your scheduled habits, your mood that day averaged ${scale(a.value)} of 5; on other days, ${scale(b.value)}.`, true);
  const spent = (spending?.entries ?? []).filter(e => e.kind === 'expense' && e.date >= window.start && e.date <= window.end);
  const currency = [...spent.reduce((m, e) => m.set(e.currency, (m.get(e.currency) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1])[0]?.[0];
  const totals = new Map<string, number>(); for (const e of spent) if (e.currency === currency) totals.set(e.date, (totals.get(e.date) ?? 0) + Number(e.amount));
  const sortedTotals = [...totals.values()].sort((x, y) => x - y), usual = sortedTotals[Math.ceil(sortedTotals.length / 2) - 1] ?? 0;
  if (currency && usual > 0) pair('spending-mood', 'Spending and mood', list.flatMap(d => { const mood = moods[d]?.mood; return mood === undefined ? [] : [{date: d, a: (totals.get(d) ?? 0) > usual, value: mood}]; }), 'mood',
    'paydays, weekends and plans with others can shape both',
    (a, b) => `On days you spent above your usual ${formatNumber(usual)} ${currency}, your mood that day averaged ${scale(a.value)} of 5; on other days, ${scale(b.value)}.`, true);

  // ---- Session AJ (item 10; COMPANIONS.md P3): eight more pairings, each only for records the person keeps ----
  const energyOn = (d: string) => energy?.days[d]?.energy;
  const workoutDays = new Set((workouts?.workouts ?? []).map(w => localTime(w.startedAt).date));
  const meditationDays = new Set((healthGroupIn(health, 'meditation')?.sessions ?? []).filter(s => s.seconds >= 60).map(s => sessionDay(s)));
  pair('sleep-energy', 'Sleep and energy', list.flatMap(d => { const slept = sleepEnding.get(d), e = energyOn(d); return slept === undefined || e === undefined ? [] : [{date: d, a: slept >= target, value: e}]; }), 'energy',
    'a busy week can shorten nights and lower energy at the same time',
    (a, b) => `After nights of at least ${goal} of sleep, your morning energy averaged ${scale(a.value)} of 5; after shorter nights, ${scale(b.value)}.`, true);
  if (workoutDays.size) pair('workout-sleep', 'Workouts and sleep', list.flatMap(d => { const night = sleepEnding.get(addLocalDays(d, 1)); return night === undefined ? [] : [{date: d, a: workoutDays.has(d), value: night}]; }), 'min',
    'workout days may also be days with an earlier or later evening',
    (a, b) => `On days with a workout, you slept ${hoursMinutes(a.value)} that night on average; on other days, ${hoursMinutes(b.value)}.`, true);
  if (workoutDays.size) pair('workout-energy', 'Workouts and next-day energy', list.flatMap(d => { const e = energyOn(addLocalDays(d, 1)); return e === undefined || addLocalDays(d, 1) > today ? [] : [{date: d, a: workoutDays.has(d), value: e}]; }), 'energy',
    'you may plan workouts on days you already expect to go well',
    (a, b) => `The day after a workout, your energy averaged ${scale(a.value)} of 5; after other days, ${scale(b.value)}.`, true);
  if (steps) pair('steps-mood', 'Steps and mood', list.flatMap(d => { const mood = moods[d]?.mood; return !active(d) || mood === undefined ? [] : [{date: d, a: dailyHealthSummary(health, d).steps >= steps.value, value: mood}]; }), 'mood',
    'weather and free time can shape both steps and mood',
    (a, b) => `On days you walked at least ${formatNumber(steps.value)} steps, your mood that day averaged ${scale(a.value)} of 5; on other days, ${scale(b.value)}.`, true);
  pair('late-food-energy', 'Food after 9 pm and next-morning energy', list.flatMap(d => { const e = energyOn(addLocalDays(d, 1)); return e === undefined || !foodLogged(d) || addLocalDays(d, 1) > today ? [] : [{date: d, a: late(d), value: e}]; }), 'energy',
    'the time you log food is not always the time you ate',
    (a, b) => `After days you logged food after 9 pm, your next-morning energy averaged ${scale(a.value)} of 5; after other days you logged food, ${scale(b.value)}.`, true);
  if (currency && usual > 0) pair('sleep-spending', 'Sleep and spending', list.flatMap(d => { const slept = sleepEnding.get(d); return slept === undefined ? [] : [{date: d, a: slept < target, value: (totals.get(d) ?? 0) > usual ? 1 : 0}]; }), '%',
    'weekends and paydays can shift both sleep and spending',
    (a, b) => `After shorter nights, you spent above your usual ${formatNumber(usual)} ${currency} on ${pct(a.value)} of days; after nights at your goal, on ${pct(b.value)}.`, true);
  if (meditationDays.size) pair('meditation-mood', 'Meditation and mood', list.flatMap(d => { const mood = moods[d]?.mood; return mood === undefined ? [] : [{date: d, a: meditationDays.has(d), value: mood}]; }), 'mood',
    'you may meditate on calmer days, or on harder ones',
    (a, b) => `On days you meditated, your mood that day averaged ${scale(a.value)} of 5; on other days, ${scale(b.value)}.`, true);
  pair('energy-habits', 'Energy and habits', list.flatMap(d => { const e = energyOn(d), share = habitShare(habits, d, today); return e === undefined || share === null ? [] : [{date: d, a: e >= 4, value: share}]; }), '%',
    'the same busy day can lower both',
    (a, b) => `On days you started with energy of 4 or 5, you completed ${pct(a.value)} of your scheduled habits; on other days, ${pct(b.value)}.`, true);

  const order = (x: CrossInsight, y: CrossInsight) => (x.label === y.label ? 0 : x.label === 'consistent' ? -1 : 1) || y.contrast - x.contrast;
  return {ready: ready.filter(i => !hidden?.has(i.id)).sort(order).slice(0, max), pending, unclear: unclear.filter(i => !hidden?.has(i.id))};
}

/** Session AJ (item 10): the "Why?" text of a ready pairing: the days, the label, its line, and what else could explain it. */
export function whyText(i: CrossInsight): string {
  return `From your own records, ${i.window.start} to ${i.window.end}: ${i.withA.days} days with and ${i.withoutA.days} days without, paired by date. Label: ${LABEL_WORDS[i.label].label}. ${LABEL_WORDS[i.label].line} Days that go together are not proof that one brings the other; ${i.confounder}; it is not advice, and only you decide what to do with it.`;
}
