import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema} from '../health';
import {addLocalDays} from '../local-date';
import {compare, gapOf, isNutrientOutcome, outcomeLabel, outcomeOptions, outcomeText, type CompareSources} from './engine';
import {emptyNutrientExtras, rememberExtras} from '../health-vitamins/extras';

/**
 * Session AV lane 2 (rest, LEDGER #98; Cronometer's custom charts): every nutrient of the nutrient report as a Compare
 * outcome — fibre, sugars, sodium… from the diary, the vitamins and the further nutrients from their records. A day counts
 * only when every entry of that day carries the nutrient; unknown is never "without". FIXTURE data.
 */
const TODAY = '2026-11-22';
const days = (n: number) => Array.from({length: n}, (_, i) => addLocalDays(TODAY, -(n - i)));
function sources(): CompareSources {
  const d = days(40);
  const symptoms = {items: [{id: 'bloat', name: 'Fictional bloating', kind: 'symptom'}], days: Object.fromEntries(d.map((date, i) => [date, {bloat: i % 2 ? 2 : 0}]))};
  const diary = d.map((date, i) => ({id: `health_diary-nut-${String(i).padStart(3, '0')}`, sourceId: 'health_food-nut-0001', sourceKind: 'food' as const, snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: {kcal: 600, proteinMg: 20_000, carbsMg: 80_000, fatMg: null, fiberMg: i % 2 ? 4_000 : 12_000, sodiumMg: 900}}, date, meal: 'Lunch' as const, quantityMilli: 1000, createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`}));
  // A second entry on the first five days without a fibre value: those days' fibre is unknown (never a low total).
  const extra = d.slice(0, 5).map((date, i) => ({...diary[0]!, id: `health_diary-nux-${String(i).padStart(3, '0')}`, date, snapshot: {...diary[0]!.snapshot, nutrients: {kcal: 100, proteinMg: 0, carbsMg: 0, fatMg: 0}}}));
  const extras = rememberExtras(emptyNutrientExtras(), [], 'health_food-nut-0001', {seleniumUg: 30});
  return {health: healthSchema.parse({...createEmptyHealth(), diary: [...diary, ...extra]}), symptoms, nutrientRecords: {extras}};
}

describe('nutrients as Compare outcomes', () => {
  it('offers each nutrient a whole day carries, with its unit; not the ones no day carries in full', () => {
    const src = sources(), ids = outcomeOptions(src).map(o => o.id);
    expect(ids.filter(isNutrientOutcome)).toEqual(['nutrient:carbsMg', 'nutrient:fiberMg', 'nutrient:sodiumMg', 'nutrient:extra:seleniumUg']);
    expect(ids).not.toContain('nutrient:fatMg');
    expect([outcomeLabel('nutrient:fiberMg'), outcomeLabel('nutrient:extra:seleniumUg'), outcomeLabel('nutrient:vitamin:cMg')]).toEqual(['Fiber logged (g)', 'Selenium logged (µg)', 'Vitamin C logged (mg)']);
    expect([outcomeText('nutrient:fiberMg', 7.96), outcomeText('nutrient:sodiumMg', 912.4), outcomeText('nutrient:extra:seleniumUg', 30)]).toEqual(['7.96 g', '912 mg', '30 µg']);
  });
  it('fibre against a symptom: the days with every entry known, a gap of a tenth of its own average', () => {
    const src = sources(), r = compare(src, 'symptom:bloat', 'nutrient:fiberMg', 'same', TODAY)!;
    expect([r.withDays + r.withoutDays, r.withValue, r.withoutValue, r.state]).toEqual([35, 4, 12, 'ready']);
    expect(r.sentence).toBe('On days you had “Fictional bloating”, you logged 4 g of fiber that day on average; on other days, 12 g.');
    expect(gapOf('nutrient:fiberMg', src)).toBeCloseTo(((4 * 18 + 12 * 17) / 35) * 0.1, 5);
  });
  it('the further nutrients from their record; without the record they are not offered', () => {
    const src = sources();
    // 30 µg an entry: 60 on the two "with" days that have two entries (both from that food), so (18 × 30 + 2 × 60) / 20.
    expect(compare(src, 'symptom:bloat', 'nutrient:extra:seleniumUg', 'same', TODAY)!.withValue).toBe(33);
    expect(outcomeOptions({...src, nutrientRecords: null}).map(o => o.id)).not.toContain('nutrient:extra:seleniumUg');
    expect(isNutrientOutcome('nutrient:../x')).toBe(false);
  });
});
