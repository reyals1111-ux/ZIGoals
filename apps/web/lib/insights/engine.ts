import {habitDay, habitRuleOn, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {dailyData, waterSummary} from '../health-daily';
import {latestWeightObservation} from '../body-measurements';
import {exerciseData} from '../health-counters';
import {addLocalDays, localWeekday} from '../local-date';
import {formatNumber} from '../visual-format';
import type {HabitHealthLinks} from '../habit-health-links/schema';

export const WINDOW_DAYS = 60, MIN_DAYS = 14, MIN_SIDE = 5, MAX_SHOWN = 2;
/** Words an insight sentence never uses: it observes a pairing in counts and claims nothing (checked by tests and the browser copy guard). */
export const FORBIDDEN_INSIGHT_WORDS = ['because', 'helps', 'leads to', 'improves', 'causes', 'should', 'better', 'more'] as const;
export type InsightSplit = {yes: number; total: number};
export type InsightCard = {
  id: string; sentence: string;
  detail: {window: {start: string; end: string}; sampleDays: number; withA: InsightSplit; withoutA: InsightSplit; threshold?: {source: 'target' | 'usual'; value: number; unit: string}; pairedBy: string};
  contrast: number;
};
const PAIRED_BY = 'calendar date, as each journal recorded it';
const dayList = (from: string, to: string) => { const out: string[] = []; for (let date = from; date <= to; date = addLocalDays(date, 1)) out.push(date); return out; };
/** The step threshold: the person's own target, else the middle of their recorded days (the lower middle of an even count). */
export function stepThreshold(health: HealthData, days: readonly string[]): {source: 'target' | 'usual'; value: number} | null {
  if (health.targets.steps) return {source: 'target', value: health.targets.steps};
  const totals = days.filter(date => health.activity.some(a => a.date === date)).map(date => dailyHealthSummary(health, date).steps).sort((a, b) => a - b);
  if (!totals.length) return null;
  const value = totals[Math.ceil(totals.length / 2) - 1]!;
  return value > 0 ? {source: 'usual', value} : null;
}
function split(sample: readonly {a: boolean; b: boolean}[]): {withA: InsightSplit; withoutA: InsightSplit} | null {
  if (sample.length < MIN_DAYS) return null;
  const withA = {yes: sample.filter(d => d.a && d.b).length, total: sample.filter(d => d.a).length}, withoutA = {yes: sample.filter(d => !d.a && d.b).length, total: sample.filter(d => !d.a).length};
  if (withA.total < MIN_SIDE || withoutA.total < MIN_SIDE) return null;
  return {withA, withoutA};
}
const contrast = ({withA, withoutA}: {withA: InsightSplit; withoutA: InsightSplit}) => Math.abs(withA.yes / withA.total - withoutA.yes / withoutA.total);
const n = (value: number) => formatNumber(value);
/**
 * The pairings in the last 60 days with enough records on each side, as count sentences, ordered by contrast.
 * Days are paired by their stored date strings, whatever zone each journal used. Dismissed cards are left out.
 */
export function insightCards({habits, health, today, links, hidden = new Set<string>()}: {habits: HabitData; health: HealthData; today: string; links?: HabitHealthLinks; hidden?: ReadonlySet<string>}): InsightCard[] {
  const window = {start: addLocalDays(today, -(WINDOW_DAYS - 1)), end: today}, days = dayList(window.start, window.end), cards: InsightCard[] = [];
  const hasActivity = (date: string) => health.activity.some(a => a.date === date), steps = (date: string) => dailyHealthSummary(health, date).steps;
  const water = (date: string) => waterSummary(health, date).entries > 0;
  const weighed = (date: string) => health.weights.some(w => w.date === date) || latestWeightObservation(health, date)?.date === date;
  const threshold = stepThreshold(health, days);
  const push = (id: string, sample: {a: boolean; b: boolean}[], sentence: (s: {withA: InsightSplit; withoutA: InsightSplit}) => string, extra: Partial<InsightCard['detail']> = {}) => {
    const s = split(sample); if (!s) return;
    cards.push({id, sentence: sentence(s), detail: {window, sampleDays: sample.length, ...s, ...extra, pairedBy: PAIRED_BY}, contrast: contrast(s)});
  };
  if (threshold) {
    const t = {source: threshold.source, value: threshold.value, unit: 'steps'}, active = days.filter(hasActivity);
    push('steps-water', active.map(date => ({a: steps(date) >= threshold.value, b: water(date)})), s => `On ${n(s.withA.yes)} of ${n(s.withA.total)} days you walked at least ${n(threshold.value)} steps, you also logged water; on other days ${n(s.withoutA.yes)} of ${n(s.withoutA.total)}.`, {threshold: t});
    // Pair 2: the daily build habit with the largest sample, never one that ticks itself off from steps.
    const candidates = habits.habits.filter(habit => links?.links[habit.id]?.measure !== 'steps').map(habit => {
      const sample = active.filter(date => { const rule = habitRuleOn(habit, date); return rule?.type === 'build' && rule.schedule.kind === 'daily'; }).map(date => ({date, day: habitDay(habit, date, today)})).filter(x => x.day.scheduled && x.day.status !== 'skipped');
      return {habit, sample: sample.map(x => ({a: steps(x.date) >= threshold.value, b: x.day.status === 'complete'}))};
    }).sort((x, y) => y.sample.length - x.sample.length);
    const best = candidates[0];
    if (best && best.sample.length) push(`steps-habit:${best.habit.id}`, best.sample, s => `On ${n(s.withA.yes)} of ${n(s.withA.total)} days you walked at least ${n(threshold.value)} steps, you also completed ${best.habit.title}; on other days ${n(s.withoutA.yes)} of ${n(s.withoutA.total)}.`, {threshold: t});
    push('weight-steps', active.map(date => ({a: weighed(date), b: steps(date) >= threshold.value})), s => `On ${n(s.withA.yes)} of ${n(s.withA.total)} days you recorded your weight, you also walked at least ${n(threshold.value)} steps; on other days ${n(s.withoutA.yes)} of ${n(s.withoutA.total)}.`, {threshold: t});
  }
  // Pair 4: the counter with the most recorded days, on days with any Health record.
  const exercise = exerciseData(health), daily = dailyData(health);
  const anyRecord = (date: string) => health.diary.some(e => e.date === date) || daily.water.some(w => w.date === date) || health.weights.some(w => w.date === date) || hasActivity(date) || exercise.days.some(d => d.date === date);
  const counter = exercise.counters.map(c => ({c, recorded: exercise.days.filter(d => d.counterId === c.id && days.includes(d.date)).length})).sort((x, y) => y.recorded - x.recorded)[0];
  if (counter && counter.recorded) push(`exercise-water:${counter.c.id}`, days.filter(anyRecord).map(date => ({a: (exercise.days.find(d => d.counterId === counter.c.id && d.date === date)?.count ?? 0) > 0, b: water(date)})), s => `On ${n(s.withA.yes)} of ${n(s.withA.total)} days you counted ${counter.c.name}, you also logged water; on other days ${n(s.withoutA.yes)} of ${n(s.withoutA.total)}.`);
  // Pair 5: weekdays against weekends for the habit with the largest sample.
  const weekday = habits.habits.map(habit => ({habit, sample: days.map(date => ({date, day: habitDay(habit, date, today)})).filter(x => x.day.scheduled && x.day.status !== 'skipped').map(x => ({a: localWeekday(x.date) >= 1 && localWeekday(x.date) <= 5, b: x.day.status === 'complete'}))})).sort((x, y) => y.sample.length - x.sample.length)[0];
  if (weekday && weekday.sample.length) push(`habit-weekday:${weekday.habit.id}`, weekday.sample, s => `On ${n(s.withA.yes)} of ${n(s.withA.total)} weekdays you completed ${weekday.habit.title}; at weekends ${n(s.withoutA.yes)} of ${n(s.withoutA.total)}.`);
  const order = cards.map((card, index) => ({card, index}));
  return order.filter(({card}) => !hidden.has(card.id)).sort((x, y) => y.card.contrast - x.card.contrast || x.index - y.index).slice(0, MAX_SHOWN).map(({card}) => card);
}
