import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema} from '../health';
import {addLocalDays} from '../local-date';
import {compare, factorOptions, gapOf, outcomeLabel, outcomeOptions, outcomeText, type CompareSources} from './engine';

/**
 * Session AV lane 2 (food, LEDGER #92, #98; Bearable's symptoms against doses, Cronometer's custom charts): Compare reads
 * the food diary's calories and protein, the weight, each symptom's level, and the supplements and medication log; the
 * rules are Compare's own (14 days a side, a meaningful gap), and unknown is never "without".
 */
const TODAY = '2026-11-22';
const days = (n: number) => Array.from({length: n}, (_, i) => addLocalDays(TODAY, -(n - i)));
function sources(): CompareSources {
  const d = days(40);
  const symptoms = {items: [{id: 'nausea', name: 'Fictional nausea', kind: 'symptom'}], days: Object.fromEntries(d.map((date, i) => [date, {nausea: i % 2 ? 2 : 0}]))};
  const supplements = {items: [{id: 'supp_fictional-dose', name: 'Fictional dose', kind: 'medication'}], log: d.map((date, i) => ({itemId: 'supp_fictional-dose', date, status: i % 2 ? 'skipped' : 'taken'}))};
  const diary = d.map((date, i) => ({id: `health_diary-cmp-${String(i).padStart(3, '0')}`, sourceId: 'health_food-cmp-001', sourceKind: 'food' as const, snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: {kcal: i % 2 ? 2600 : 1800, proteinMg: 90_000, carbsMg: null, fatMg: null}}, date, meal: 'Lunch' as const, quantityMilli: 1000, createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`}));
  const weights = d.filter((_, i) => i % 3 === 0).map((date, i) => ({id: `health_weight-cmp-${String(i).padStart(3, '0')}`, date, grams: 74_000 - i * 50, createdAt: `${date}T07:00:00.000Z`, updatedAt: `${date}T07:00:00.000Z`}));
  return {health: healthSchema.parse({...createEmptyHealth(), diary, weights}), symptoms, supplements};
}
describe('Compare with food, weight, symptoms and doses', () => {
  it('offers the dose and the symptom as factors, and calories, protein, weight and the symptom as outcomes', () => {
    const src = sources();
    expect(factorOptions(src, TODAY).map(f => [f.id, f.group])).toEqual([['dose:supp_fictional-dose', 'Supplements and medication'], ['symptom:nausea', 'Symptoms and factors']]);
    expect(outcomeOptions(src).map(o => o.id)).toEqual(['kcal', 'protein', 'weight', 'symptom:nausea']);
    expect([outcomeLabel('symptom:nausea', src), outcomeLabel('kcal'), gapOf('protein'), gapOf('symptom:nausea')]).toEqual(['Fictional nausea (0–3)', 'Calories logged', 10, 0.5]);
    expect([outcomeText('kcal', 2100.4), outcomeText('protein', 88.6), outcomeText('weight', 73.42), outcomeText('symptom:nausea', 1.25)]).toEqual(['2,100 kcal', '89 g', '73.4 kg', '1.3 of 3']);
  });
  it('the symptom level against dose days: lower on days the dose was taken (GLP-1 support, LEDGER #92)', () => {
    const r = compare(sources(), 'dose:supp_fictional-dose', 'symptom:nausea', 'same', TODAY)!;
    expect([r.withDays, r.withoutDays, r.state]).toEqual([20, 20, 'ready']);
    expect([r.withValue, r.withoutValue]).toEqual([0, 2]);
    expect(r.sentence).toBe('On days you took “Fictional dose”, your “Fictional nausea” level that day averaged 0.0 of 3; on other days, 2.0 of 3.');
    expect(r.confounder).toContain('dose');
  });
  it('blood pressure and a lab value from "Your numbers" as outcomes (LEDGER #98)', () => {
    const d = days(40), src = sources();
    const numbers = {entries: [...d.map((date, i) => ({date, kind: 'bp', systolic: i % 2 ? 132 : 122})), ...d.map((date, i) => ({date, kind: 'lab', name: 'Fictional Glucose', value: i % 2 ? 6.2 : 5.1, unit: 'mmol/L'}))]};
    const s = {...src, numbers};
    const ids = outcomeOptions(s).map(o => o.id);
    expect(ids).toEqual(expect.arrayContaining(['bp', 'lab:fictional glucose']));
    expect(outcomeLabel('lab:fictional glucose', s)).toBe('Fictional Glucose (mmol/L)');
    expect(gapOf('lab:fictional glucose', s)).toBeCloseTo(((6.2 + 5.1) / 2) * 0.05, 5);
    const bp = compare(s, 'dose:supp_fictional-dose', 'bp', 'same', TODAY)!;
    expect([bp.withValue, bp.withoutValue, bp.state]).toEqual([122, 132, 'ready']);
    expect(bp.sentence).toContain('your upper blood pressure that day averaged 122 mmHg');
    const lab = compare(s, 'dose:supp_fictional-dose', 'lab:fictional glucose', 'same', TODAY)!;
    expect(lab.sentence).toContain('your Fictional Glucose (mmol/L) that day averaged 5.1');
  });
  it('calories logged against a symptom; a day with nothing logged is unknown, never without', () => {
    const src = sources();
    const r = compare(src, 'symptom:nausea', 'kcal', 'same', TODAY)!;
    expect([r.withValue, r.withoutValue]).toEqual([2600, 1800]);
    const sparse = {...src, health: {...src.health!, diary: src.health!.diary.slice(0, 10)}};
    const s = compare(sparse, 'symptom:nausea', 'kcal', 'same', TODAY)!;
    expect(s.withDays + s.withoutDays).toBe(10);
    expect(s.state).toBe('pending');
  });
});
