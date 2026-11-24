import type {HealthData} from '../health';
import type {HabitData} from '../habits';
import {habitDay} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';
import {dailySeries} from '../sleep/engine';
import {healthGroupIn} from '../vault/w-homes';
import type {Energy} from '../energy/schema';
import type {Symptoms} from '../symptoms/schema';
import {RECENT_DAYS, YEAR_DAYS, type TrendDirection} from '../health-trends/trends';

/**
 * Session AV lane 2 (habits pillar; LEDGER #66, #67 — Bearable's Trends baselines and customisable graph), from the
 * person's own records only, on view; nothing derived is stored.
 * - feelingTrends: mood (Health's day mood, 1–5), energy (the daily energy, 1–5) and each symptom or factor (its level
 *   0–3 on the days answered) — "your usual" over the last 365 days against the last 90, with the days counted. An
 *   unanswered day is never a zero; a row shows only with enough days on both sides, else how many are still needed.
 * - weeklyMeasures: chosen measures (mood, energy, sleep, steps, a symptom, a habit's days done) as one value per
 *   Monday-to-Sunday week over the same weeks, for small multiples on one shared week axis (never two y-scales).
 */
export type FeelingId = 'mood' | 'energy' | `symptom:${string}`;
export type FeelingTrend = {id: FeelingId; label: string; recent: {days: number; value: number}; usual: {days: number; value: number}; direction: TrendDirection; scale: 3 | 5};
export type FeelingPending = {id: FeelingId; label: string; recentDays: number; yearDays: number; needRecent: number; needYear: number};
export const FEELING_MIN = {recent: 20, year: 60} as const;
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
export type FeelingSources = {health: HealthData; energy?: Energy | null; symptoms?: Symptoms | null; habits?: HabitData | null};
/** Every answered day's value for each feeling measure, the 365 days ending `today`. */
export function feelingDays(src: FeelingSources, today: string): {id: FeelingId; label: string; scale: 3 | 5; days: Map<string, number>}[] {
  const start = addLocalDays(today, 1 - YEAR_DAYS), inside = (d: string) => d >= start && d <= today;
  const moods = new Map<string, number>(), energy = new Map<string, number>();
  for (const [d, m] of Object.entries(healthGroupIn(src.health, 'moods')?.days ?? {})) if (inside(d)) moods.set(d, m.mood);
  for (const [d, e] of Object.entries(src.energy?.days ?? {})) if (inside(d)) energy.set(d, e.energy);
  const out: {id: FeelingId; label: string; scale: 3 | 5; days: Map<string, number>}[] = [{id: 'mood', label: 'Mood', scale: 5, days: moods}, {id: 'energy', label: 'Energy', scale: 5, days: energy}];
  for (const item of src.symptoms?.items ?? []) {
    const days = new Map<string, number>();
    for (const [d, levels] of Object.entries(src.symptoms!.days)) if (inside(d) && levels[item.id] !== undefined) days.set(d, levels[item.id]!);
    out.push({id: `symptom:${item.id}`, label: item.name, scale: 3, days});
  }
  return out;
}
/** "Your usual" (365 days) against the last 90 days, for mood, energy and every symptom or factor answered at all. */
export function feelingTrends(src: FeelingSources, today: string): {ready: FeelingTrend[]; pending: FeelingPending[]} {
  const recentStart = addLocalDays(today, 1 - RECENT_DAYS), ready: FeelingTrend[] = [], pending: FeelingPending[] = [];
  for (const f of feelingDays(src, today)) {
    const all = [...f.days.values()], recent = [...f.days].filter(([d]) => d >= recentStart).map(([, v]) => v);
    if (!all.length) continue;
    if (recent.length < FEELING_MIN.recent || all.length < FEELING_MIN.year) { pending.push({id: f.id, label: f.label, recentDays: recent.length, yearDays: all.length, needRecent: FEELING_MIN.recent, needYear: FEELING_MIN.year}); continue; }
    const r = mean(recent), u = mean(all), diff = r - u, same = f.scale === 5 ? 0.25 : 0.2;
    ready.push({id: f.id, label: f.label, recent: {days: recent.length, value: r}, usual: {days: all.length, value: u}, direction: Math.abs(diff) < same ? 'same' : diff > 0 ? 'up' : 'down', scale: f.scale});
  }
  return {ready, pending};
}
export type MeasureId = 'mood' | 'energy' | 'sleep' | 'steps' | `symptom:${string}` | `habit:${string}`;
export type MeasureOption = {id: MeasureId; label: string; unit: string};
/** What the graph can show: the four base measures, each symptom or factor, each habit (its share of due days done). */
export function measureOptions(src: FeelingSources): MeasureOption[] {
  return [{id: 'mood', label: 'Mood', unit: 'of 5'}, {id: 'energy', label: 'Energy', unit: 'of 5'}, {id: 'sleep', label: 'Sleep', unit: 'h a night'}, {id: 'steps', label: 'Steps', unit: 'a day'},
    ...(src.symptoms?.items ?? []).map(i => ({id: `symptom:${i.id}` as MeasureId, label: i.name, unit: 'of 3'})),
    ...(src.habits?.habits ?? []).map(h => ({id: `habit:${h.id}` as MeasureId, label: h.title, unit: '% of due days'}))];
}
export const weekOf = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
/** One value per week (oldest first) for `id` over the `weeks` weeks ending with `today`'s week; null for a week with no record. */
export function weeklyMeasure(src: FeelingSources, id: MeasureId, today: string, weeks = 12): {week: string; value: number | null; days: number}[] {
  const first = addLocalDays(weekOf(today), -7 * (weeks - 1)), from = first;
  const perDay = new Map<string, number>();
  if (id === 'mood' || id === 'energy' || id.startsWith('symptom:')) { const f = feelingDays(src, today).find(x => x.id === id); for (const [d, v] of f?.days ?? []) if (d >= from) perDay.set(d, v); }
  else if (id === 'sleep') { if (src.health.sleep) for (const p of dailySeries(src.health.sleep, today, weeks * 7)) if (p.asleep !== null && p.asleep > 0 && p.date >= from) perDay.set(p.date, p.asleep / 60); }
  else if (id === 'steps') { for (const a of src.health.activity) if (a.date >= from && a.date <= today && a.steps > 0) perDay.set(a.date, (perDay.get(a.date) ?? 0) + a.steps); }
  const habit = id.startsWith('habit:') ? src.habits?.habits.find(h => h.id === id.slice(6)) : undefined;
  return Array.from({length: weeks}, (_, i) => {
    const week = addLocalDays(first, 7 * i);
    if (habit) {
      let due = 0, done = 0;
      for (let k = 0; k < 7; k++) { const d = addLocalDays(week, k); if (d > today) break; const s = habitDay(habit, d, today); if (!s.scheduled || s.status === 'skipped' || s.status === 'not-scheduled') continue; if (d === today && s.status !== 'complete') continue; due++; if (s.status === 'complete') done++; }
      return {week, value: due ? Math.round(done / due * 100) : null, days: due};
    }
    const vals: number[] = [];
    for (let k = 0; k < 7; k++) { const v = perDay.get(addLocalDays(week, k)); if (v !== undefined) vals.push(v); }
    return {week, value: vals.length ? mean(vals) : null, days: vals.length};
  });
}
