import {dailyHealthSummary, formatHealthGrams, formatNutrient, nutritionSummaryText, type HealthData} from '../../health';
import {dailyData, waterSummary} from '../../health-daily';
import {waterText} from '../../health-units';
import {addLocalDays} from '../../local-date';
import {dailySeries} from '../../sleep/engine';
import {formatNumber} from '../../visual-format';
import {healthGroupIn} from '../../vault/w-homes';
import {durationWords, shareOf} from '../widgets/words';

/**
 * Session AL Part 11 (lane L8): the health HUD's figures, read with the Health page's own functions and words — the
 * day's diary summary (lib/health.ts dailyHealthSummary, as Today's health card and the Health page count it), the
 * targets the person set, the water summary and its unit (lib/health-daily.ts, lib/health-units.ts waterText, as the
 * Water card writes it), last night's sleep (lib/sleep/engine.ts, as NOVA's Sleep balance reads it) and the vitals a
 * person brought in from an export or a device. Nothing is recomputed another way.
 *
 * Unknown is not zero: a day with no meal logged has no calorie figure ("No meals logged today"), never "0 kcal"; a meal
 * without calories makes the total unknown and says how much is known; steps with no activity logged are unknown. Water is
 * the one measure that is logged as such, so "0 mL" today is a known zero, as on the Water card. A meter without a target
 * has no share (no bar is lit) and says so.
 */
export type Meter = {
  key: 'kcal' | 'protein' | 'carbs' | 'fat' | 'water' | 'sleep' | 'steps';
  label: string;
  value: number | null;
  target: number | null;
  /** value ÷ target, 0–1 (null without either). */
  share: number | null;
  /** The value as the Health page writes it, or "—". */
  text: string;
  targetText: string | null;
  /** Why a value or its target is missing, in words. */
  note: string | null;
};
export type HeartLine = {kind: 'resting' | 'average'; points: {date: string; bpm: number}[]; latest: number};
export type HealthHud = {kcal: Meter; macros: Meter[]; water: Meter; sleep: Meter; steps: Meter; hearts: {key: Meter['key']; label: string; share: number}[]; heart: HeartLine | null; entries: number};

const meter = (key: Meter['key'], label: string, value: number | null, target: number | null, text: string, targetText: string | null, note: string | null): Meter =>
  ({key, label, value, target, share: value === null ? null : shareOf(value, target), text: value === null ? '—' : text, targetText, note: note ?? (target ? null : 'No target set')});

export function healthHud(data: HealthData, day: string): HealthHud {
  const summary = dailyHealthSummary(data, day), t = data.targets, daily = dailyData(data), unit = daily.preferences.waterUnit;
  const noMeals = summary.entries === 0 ? 'No meals logged today' : null;
  const kcalValue = summary.entries ? summary.nutrients.kcal : null;
  const kcal = meter('kcal', 'Calories', kcalValue, t.kcal, `${formatNutrient(kcalValue ?? 0)} kcal`, t.kcal ? `${formatNumber(t.kcal)} kcal` : null,
    noMeals ?? (kcalValue === null ? nutritionSummaryText(summary, 'kcal', 'kcal') : null));
  const macros = ([['protein', 'Protein', 'proteinMg'], ['carbs', 'Carbs', 'carbsMg'], ['fat', 'Fat', 'fatMg']] as const).map(([key, label, field]) => {
    const value = summary.entries ? summary.nutrients[field] : null, target = t[field];
    return meter(key, label, value, target, `${formatHealthGrams(value)} g`, target ? `${formatHealthGrams(target)} g` : null,
      noMeals ?? (value === null ? nutritionSummaryText(summary, field, 'g', 1000) : null));
  });
  const w = waterSummary(data, day);
  const water = meter('water', 'Water', w.millilitres, w.targetMl, waterText(w.millilitres, unit), w.targetMl ? waterText(w.targetMl, unit) : null, w.entries ? null : 'No water logged yet today');
  const sleep = data.sleep, slept = sleep ? dailySeries(sleep, day, 1)[0]?.asleep ?? null : null, goal = sleep?.goal?.minutes ?? null;
  const sleepMeter = meter('sleep', 'Sleep', slept, goal, durationWords(slept ?? 0), goal ? durationWords(goal) : null, slept === null ? 'No night logged for last night' : null);
  const activity = data.activity.filter(a => a.date === day);
  const steps = meter('steps', 'Steps', activity.length ? summary.steps : null, t.steps, formatNumber(summary.steps), t.steps ? formatNumber(t.steps) : null, activity.length ? null : 'No steps logged today');
  const hearts = [kcal, macros[0]!, water, sleepMeter, steps].filter(m => m.share !== null).map(m => ({key: m.key, label: m.label, share: m.share!}));
  return {kcal, macros, water, sleep: sleepMeter, steps, hearts, heart: heartLine(data, day), entries: summary.entries};
}

/**
 * A heart-rate line only from real values a person brought in (resting heart rate first; else the day's average), over
 * the 14 days to `day`, one value a day (the first source in name order on a day with several). At least two days, or null.
 */
export function heartLine(data: HealthData, day: string, days = 14): HeartLine | null {
  const from = addLocalDays(day, -(days - 1));
  const rows = (healthGroupIn(data, 'vitals')?.days ?? []).filter(d => d.date >= from && d.date <= day).sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));
  for (const kind of ['resting', 'average'] as const) {
    const byDay = new Map<string, number>();
    for (const d of rows) { const v = kind === 'resting' ? d.restingHr : d.hrAvg; if (v !== undefined && !byDay.has(d.date)) byDay.set(d.date, v); }
    if (byDay.size >= 2) { const points = [...byDay].map(([date, bpm]) => ({date, bpm})); return {kind, points, latest: points.at(-1)!.bpm}; }
  }
  return null;
}
