import type {HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {dailySeries} from '../sleep/engine';

/**
 * Session AP (owner-approved feature 4): trends — the last 90 days against the last 365 (which hold them), for steps,
 * sleep, weight and resting heart rate, from the person's own records only. A day counts only when something was
 * recorded that day (an unrecorded day is never a zero). A trend shows only with enough days on both sides, and always
 * says how many; the direction is an arrow and words ("Up", "Down", "About the same"), never a colour alone and never a
 * judgement ("better" is not a word here: higher steps and a higher weight are both just "up").
 */
export type TrendId = 'steps' | 'sleep' | 'weight' | 'restingHr';
export type TrendDirection = 'up' | 'down' | 'same';
export type Trend = {id: TrendId; label: string; recent: {days: number; value: number}; year: {days: number; value: number}; direction: TrendDirection; unit: string};
export type TrendPending = {id: TrendId; label: string; recentDays: number; yearDays: number; needRecent: number; needYear: number};
export type Trends = {ready: Trend[]; pending: TrendPending[]};
export const RECENT_DAYS = 90, YEAR_DAYS = 365;
/** Days needed on each side: readings a few times a week for steps, sleep and heart rate; about weekly for weight. */
export const TREND_MIN: Readonly<Record<TrendId, {recent: number; year: number}>> = {steps: {recent: 30, year: 90}, sleep: {recent: 30, year: 90}, restingHr: {recent: 30, year: 90}, weight: {recent: 8, year: 20}};
/** Below this difference the two read "about the same": 5 % of the year's steps, 10 minutes of sleep, 0.5 kg, 2 bpm. */
const SAME = (id: TrendId, year: number) => id === 'steps' ? year * 0.05 : id === 'sleep' ? 10 : id === 'weight' ? 500 : 2;
export const TREND_LABELS: Readonly<Record<TrendId, string>> = {steps: 'Steps a day', sleep: 'Sleep a night', weight: 'Weight', restingHr: 'Resting heart rate'};
const UNITS: Readonly<Record<TrendId, string>> = {steps: 'steps', sleep: 'min', weight: 'g', restingHr: 'bpm'};
export const DIRECTION_WORDS: Readonly<Record<TrendDirection, {arrow: string; words: string}>> = {up: {arrow: '↑', words: 'Up'}, down: {arrow: '↓', words: 'Down'}, same: {arrow: '→', words: 'About the same'}};
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** One value per recorded day for each measure, from `today` back 365 days. */
export function dailyValues(health: HealthData, today: string): Record<TrendId, Map<string, number>> {
  const start = addLocalDays(today, 1 - YEAR_DAYS), inside = (d: string) => d >= start && d <= today;
  const steps = new Map<string, number>();
  for (const a of health.activity) if (inside(a.date) && a.steps > 0) steps.set(a.date, (steps.get(a.date) ?? 0) + a.steps);
  const sleep = new Map<string, number>();
  if (health.sleep) for (const p of dailySeries(health.sleep, today, YEAR_DAYS)) if (p.asleep !== null && p.asleep > 0) sleep.set(p.date, p.asleep);
  const weightDays = new Map<string, number[]>();
  for (const w of health.weights) if (inside(w.date)) weightDays.set(w.date, [...(weightDays.get(w.date) ?? []), w.grams]);
  const hrDays = new Map<string, number[]>();
  for (const v of health.vitals?.days ?? []) if (inside(v.date) && v.restingHr !== undefined) hrDays.set(v.date, [...(hrDays.get(v.date) ?? []), v.restingHr]);
  const avg = (m: Map<string, number[]>) => new Map([...m].map(([d, v]) => [d, mean(v)]));
  return {steps, sleep, weight: avg(weightDays), restingHr: avg(hrDays)};
}

export function healthTrends(health: HealthData, today: string): Trends {
  const values = dailyValues(health, today), recentStart = addLocalDays(today, 1 - RECENT_DAYS);
  const ready: Trend[] = [], pending: TrendPending[] = [];
  for (const id of ['steps', 'sleep', 'weight', 'restingHr'] as const) {
    const all = [...values[id]], recent = all.filter(([d]) => d >= recentStart), need = TREND_MIN[id];
    if (!all.length) continue; // a measure the person does not record is not listed at all
    if (recent.length < need.recent || all.length < need.year) { pending.push({id, label: TREND_LABELS[id], recentDays: recent.length, yearDays: all.length, needRecent: need.recent, needYear: need.year}); continue; }
    const r = mean(recent.map(([, v]) => v)), y = mean(all.map(([, v]) => v)), diff = r - y;
    ready.push({id, label: TREND_LABELS[id], recent: {days: recent.length, value: r}, year: {days: all.length, value: y}, direction: Math.abs(diff) < SAME(id, y) ? 'same' : diff > 0 ? 'up' : 'down', unit: UNITS[id]});
  }
  return {ready, pending};
}
