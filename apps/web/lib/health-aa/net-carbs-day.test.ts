import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {netCarbsOfDay, netCarbsWords} from './net-carbs-day';
import {av2FoodAnswer} from '../ai/local-answers/av2-food';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {emptyFoodPlus} from '../food-plus/schema';

/**
 * Review b2b #4 (LEDGER #88): one rule for a day's net carbs, used by the Carbs tile (health-app.tsx), Targets → Macro
 * mode (macro-mode-panel.tsx) and NOVA/ZIGi (av2-food.ts): fiber off only when every entry carries it, the sugar
 * alcohols set per food always off, and the words say what was taken off.
 */
const DAY = '2026-11-17', at = '2026-11-17T08:00:00.000Z';
const entry = (id: string, carbsMg: number, fiberMg?: number, quantityMilli = 1000) => ({
  id: `health_entry-${id}`, sourceId: `health_food-${id}`, sourceKind: 'food' as const, date: DAY, meal: 'Lunch' as const, quantityMilli, createdAt: at, updatedAt: at,
  snapshot: {name: `Fictional ${id}`, servingGrams: 100, nutrients: {kcal: 200, proteinMg: 1000, carbsMg, fatMg: 1000, ...(fiberMg === undefined ? {} : {fiberMg})}},
});

describe('a day\'s net carbs, one rule (review b2b #4)', () => {
  test('the review\'s day: 40 g carbs, 10 g fiber on every entry, 10 g sugar alcohols set → 20 g, both named', () => {
    const diary = [entry('fict-001', 30_000, 6000), entry('fict-002', 10_000, 4000), {...entry('fict-003', 5000, 0), date: '2026-11-16'}];
    const n = netCarbsOfDay(diary, DAY, {'health_food-fict-001': 10_000});
    expect(n).toEqual({grams: 20, net: true, fiberKnownOf: 2, entries: 2, sugarAlcoholMg: 10_000});
    expect(netCarbsWords(n)).toEqual({minus: ['fiber', '10 g sugar alcohols'], how: 'carbs minus fiber and 10 g sugar alcohols', after: 'after fiber and 10 g sugar alcohols', fiberNote: null});
    expect(netCarbsWords(n, 'nl')).toEqual({minus: ['vezels', '10 g suikeralcoholen'], how: 'koolhydraten min vezels en 10 g suikeralcoholen', after: 'na vezels en 10 g suikeralcoholen', fiberNote: null});
  });
  test('sugar alcohols scale with the servings eaten; a recipe entry carries none', () => {
    const n = netCarbsOfDay([entry('fict-001', 30_000, 5000, 1500), {...entry('fict-002', 10_000, 0), sourceKind: 'recipe' as const}], DAY, {'health_food-fict-001': 2000, 'health_food-fict-002': 9000});
    expect(n.sugarAlcoholMg).toBe(3000);
    expect(n.grams).toBe(Math.round((45_000 + 10_000 - 7500 - 3000) / 1000));
  });
  test('fiber missing on one entry: fiber is not taken off and the words say so; the sugar alcohols still are', () => {
    const n = netCarbsOfDay([entry('fict-001', 30_000, 6000), entry('fict-002', 10_000)], DAY, {'health_food-fict-002': 4000});
    expect(n).toMatchObject({grams: 36, net: false, fiberKnownOf: 1, entries: 2, sugarAlcoholMg: 4000});
    const w = netCarbsWords(n);
    expect(w.how).toBe('carbs minus 4 g sugar alcohols');
    expect(w.after).toBe('after 4 g sugar alcohols');
    expect(w.fiberNote).toBe('Fiber is not taken off: 1 of 2 entries carry it.');
    expect(netCarbsWords(n, 'nl').fiberNote).toBe('Vezels zijn er niet af gehaald: 1 van 2 items hebben ze.');
  });
  test('nothing taken off: plain carbs, said as such; no carbs at all: unknown, never 0; an empty day has no note', () => {
    const plain = netCarbsOfDay([entry('fict-001', 30_000)], DAY, {});
    expect(plain).toMatchObject({grams: 30, net: false, sugarAlcoholMg: 0});
    expect(netCarbsWords(plain)).toMatchObject({minus: [], how: 'plain carbs', after: null, fiberNote: 'Fiber is not taken off: 0 of 1 entries carry it.'});
    expect(netCarbsWords(plain, 'nl').how).toBe('gewone koolhydraten');
    const none = netCarbsOfDay([{...entry('fict-001', 0), snapshot: {...entry('fict-001', 0).snapshot, nutrients: {kcal: 100, proteinMg: null, carbsMg: null, fatMg: null}}}], DAY, {'health_food-fict-001': 5000});
    expect(none).toMatchObject({grams: null, sugarAlcoholMg: 0});
    expect(netCarbsWords(none).fiberNote).toBeNull();
    expect(netCarbsWords(netCarbsOfDay([], DAY, {}))).toEqual({minus: [], how: 'plain carbs', after: null, fiberNote: null});
  });
  test('NOVA/ZIGi say the same figure and words as the function, in English and Dutch', () => {
    const s = showcaseAll(), today = s.health!.diary.filter(e => e.date === DAY), first = today.find(e => e.sourceKind === 'food')!;
    const food = {...emptyFoodPlus(), sugarAlcohols: {[first.sourceId]: 5000}}, n = netCarbsOfDay(s.health!.diary, DAY, food.sugarAlcohols);
    const text = (q: string) => { const r = av2FoodAnswer(q, zigiEnv(s), {food}); return r && 'text' in r ? r.text : ''; };
    expect(text('what are my net carbs today')).toContain(`Net carbs today: ${n.grams} g (${netCarbsWords(n).how}).`);
    expect(text('hoeveel netto koolhydraten heb ik vandaag')).toContain(`${n.grams} g (${netCarbsWords(n, 'nl').how}).`);
  });
  test('the Carbs tile and Targets → Macro mode read the one rule, with the sugar alcohols set per food', () => {
    const app = readFileSync(new URL('../../components/health/health-app.tsx', import.meta.url), 'utf8');
    const panel = readFileSync(new URL('../../components/health/macro-mode-panel.tsx', import.meta.url), 'utf8');
    expect(app).toContain('netCarbsOfDay(data.diary, date, day.sugarAlcohols)');
    expect(app).not.toContain('g after fiber<');
    expect(panel).toContain('netCarbsOfDay(data.diary, date, sugarAlcohols)');
    expect(panel).toContain('useDayTargets(data.targets, date)');
  });
});
