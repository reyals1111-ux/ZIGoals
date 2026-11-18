import {dailyHealthSummary, type HealthData} from '../../../health';
import {formatNumber} from '../../../visual-format';
import {clamp01} from '../../holo/geometry';
import type {AxWords} from './health-trend';

/**
 * Session AS (ADR-042 Part 2, family: gauges): today's food against the person's own targets — calories, protein,
 * carbohydrates and fat, each as an arc that fills toward its target (Health's own day summary, lib/health.ts
 * `dailyHealthSummary`, and the targets the person set). A nutrient without a target shows its amount only; a nutrient
 * that no entry of today states is unknown, never zero; over a target is said in words, never judged.
 */
export type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat';
export type NutrientGauge = {
  key: NutrientKey; label: string;
  /** Today's amount in kcal or grams; null: no entry of today states it. */
  amount: number | null; figure: string; unit: string;
  target: number | null; targetText: string | null;
  /** The share of the target, 0–1 (a day over its target is a full arc, said as over in words); null without a target or an amount. */
  share: number | null; over: boolean;
  /** Some of today's entries do not state this nutrient: the amount is what is known. */
  partial: boolean;
  words: string;
};
export type GaugesView = {
  /** Food entries today, and whether the diary holds anything at all. */
  entries: number; any: boolean;
  gauges: NutrientGauge[]; words: AxWords;
};
const SPEC: readonly {key: NutrientKey; label: string; field: 'kcal' | 'proteinMg' | 'carbsMg' | 'fatMg'; unit: string; scale: number}[] = [
  {key: 'kcal', label: 'Calories', field: 'kcal', unit: 'kcal', scale: 1}, {key: 'protein', label: 'Protein', field: 'proteinMg', unit: 'g', scale: 1000},
  {key: 'carbs', label: 'Carbs', field: 'carbsMg', unit: 'g', scale: 1000}, {key: 'fat', label: 'Fat', field: 'fatMg', unit: 'g', scale: 1000},
];
export function nutritionGauges(health: HealthData, today: string): GaugesView {
  const s = dailyHealthSummary(health, today);
  const gauges = SPEC.map(({key, label, field, unit, scale}): NutrientGauge => {
    const raw = s.entries ? s.knownNutrients[field] : null, amount = raw === null ? null : Math.round(raw / scale), cover = s.coverage[field];
    const goal = health.targets[field], target = goal === null ? null : Math.round(goal / scale), text = (n: number) => `${formatNumber(n)} ${unit}`;
    const partial = amount !== null && cover.known < cover.total, over = amount !== null && target !== null && amount > target;
    const words = amount === null ? `Not stated by today’s entries${target !== null ? `; your target is ${text(target)}` : ''}`
      : `${text(amount)}${target !== null ? ` of your ${text(target)}${over ? `, ${text(amount - target)} over` : ''}` : ', no target set'}${partial ? `, known from ${cover.known} of ${cover.total} entries` : ''}`;
    return {key, label, amount, figure: amount === null ? '—' : formatNumber(amount), unit, target, targetText: target === null ? null : text(target), share: amount !== null && target ? clamp01(amount / target) : null, over, partial, words};
  });
  const kcal = gauges[0]!, rest = gauges.slice(1).filter(g => g.amount !== null);
  return {entries: s.entries, any: health.diary.length > 0, gauges, words: {
    figure: kcal.figure, unit: 'kcal', label: kcal.amount === null ? 'calories today · not stated' : kcal.targetText ? `eaten today · of your ${kcal.targetText}` : 'eaten today · no calorie target',
    note: rest.map(g => `${g.label} ${g.figure} ${g.unit}`).join(' · '),
    asOf: `today · ${formatNumber(s.entries)} ${s.entries === 1 ? 'entry' : 'entries'}`, caption: 'Today’s food against your targets', rows: gauges.map(g => [g.label, g.words] as const),
  }};
}
