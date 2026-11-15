import {afterEach, describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {emptyHabitData} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {crossPillarInsights, symptomPairKey, whyText} from '../insights/cross-pillar';
import {emptyMoods} from '../moods/schema';
import {MAX_SYMPTOM_DAYS, MAX_SYMPTOM_ITEMS, SYMPTOMS, SYMPTOMS_KEY, emptySymptoms, symptomsSchema, type Symptoms} from './schema';
import {addItem, itemCounts, levelOn, mostAnswered, removeItem, setLevel} from './symptoms';

// Session AP (feature 2): the symptom and factor tracker. Fictional names and days.
const TODAY = '2026-11-14', AT = '2026-11-14T08:00:00.000Z';
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const memory = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)}; };

describe('the symptoms record', () => {
  test('its own key, strict, empty when missing; unreadable bytes read as empty', () => {
    expect(SYMPTOMS.key).toBe('zigoals:symptoms:v1');
    expect(readDeviceRecord(memory(), SYMPTOMS)).toEqual({data: emptySymptoms(), unreadable: false});
    expect(readDeviceRecord(memory({[SYMPTOMS_KEY]: '{"version":1,"items":[],"days":{"2026-11-01":{"ghost":2}}}'}), SYMPTOMS).unreadable).toBe(true);
    expect(symptomsSchema.safeParse({version: 1, items: [], days: {}, extra: true}).success).toBe(false);
  });
  test('levels are 0 to 3 only', () => {
    const r = addItem(emptySymptoms(), 'Headache', 'symptom', AT);
    expect(() => setLevel(r, TODAY, 'headache', 4)).toThrow();
    expect(() => setLevel(r, TODAY, 'headache', 1.5)).toThrow();
    expect(levelOn(setLevel(r, TODAY, 'headache', 0), TODAY, 'headache')).toBe(0);
  });
});

describe('items and levels', () => {
  test('names are cleaned and kept once; at most 40 items, each name up to 40 characters', () => {
    let r = addItem(emptySymptoms(), '  Stiff   back ', 'symptom', AT);
    expect(r.items[0]).toMatchObject({id: 'stiff-back', name: 'Stiff back', kind: 'symptom'});
    expect(() => addItem(r, 'stiff BACK', 'symptom', AT)).toThrow(/already in your list/);
    expect(() => addItem(r, 'x'.repeat(41), 'factor', AT)).toThrow(/up to 40 characters/);
    expect(() => addItem(r, '   ', 'factor', AT)).toThrow(/Give it a name/);
    for (let i = 1; i < MAX_SYMPTOM_ITEMS; i++) r = addItem(r, `Item ${i}`, 'factor', AT);
    expect(() => addItem(r, 'One more', 'factor', AT)).toThrow(/up to 40 things/);
  });
  test('a level can be cleared (no answer is not "none"); removing an item removes its levels', () => {
    let r = addItem(addItem(emptySymptoms(), 'Pollen', 'factor', AT), 'Headache', 'symptom', AT);
    r = setLevel(setLevel(r, TODAY, 'pollen', 2), TODAY, 'headache', 0);
    expect(r.days[TODAY]).toEqual({pollen: 2, headache: 0});
    r = setLevel(r, TODAY, 'headache', null);
    expect(levelOn(r, TODAY, 'headache')).toBeUndefined();
    r = removeItem(r, 'pollen');
    expect(r).toEqual({...r, items: [expect.objectContaining({id: 'headache'})], days: {}});
    expect(() => setLevel(r, TODAY, 'pollen', 1)).toThrow(/no longer in your list/);
  });
  test('about three years of days: the oldest day drops past the cap', () => {
    let r = addItem(emptySymptoms(), 'Pollen', 'factor', AT);
    const days: Symptoms['days'] = {};
    for (let i = 0; i < MAX_SYMPTOM_DAYS; i++) days[addLocalDays(TODAY, -i - 1)] = {pollen: 1};
    r = symptomsSchema.parse({...r, days});
    r = setLevel(r, TODAY, 'pollen', 3);
    expect(Object.keys(r.days)).toHaveLength(MAX_SYMPTOM_DAYS);
    expect(r.days[addLocalDays(TODAY, -MAX_SYMPTOM_DAYS)]).toBeUndefined();
    expect(r.days[TODAY]).toEqual({pollen: 3});
  });
  test('counts: answered, noted (1–3) and strong (3) over the last 30 days', () => {
    let r = addItem(emptySymptoms(), 'Headache', 'symptom', AT);
    r = setLevel(setLevel(setLevel(setLevel(r, TODAY, 'headache', 3), addLocalDays(TODAY, -1), 'headache', 0), addLocalDays(TODAY, -2), 'headache', 1), addLocalDays(TODAY, -40), 'headache', 2);
    expect(itemCounts(r, TODAY)).toEqual([{id: 'headache', name: 'Headache', answered: 3, noted: 2, strong: 1}]);
    expect(mostAnswered(r, TODAY, 30, 3).map(i => i.id)).toEqual(['headache']);
  });
});

describe('symptoms in the cross-pillar insights (counts, "goes with", never a cause)', () => {
  /** 40 answered days: "Headache" noted on even days, with a mood of 2 then, and 4 on the days noted none. */
  function fixture(): {health: HealthData; symptoms: Symptoms} {
    let symptoms = addItem(emptySymptoms(), 'Headache', 'symptom', AT);
    const moods = emptyMoods();
    for (let i = 0; i < 40; i++) {
      const d = addLocalDays(TODAY, -i), noted = i % 2 === 0;
      symptoms = setLevel(symptoms, d, 'headache', noted ? 2 : 0);
      moods.days[d] = {mood: noted ? 2 : 4, at: AT};
    }
    return {health: {...createEmptyHealth(), schemaVersion: 4, moods}, symptoms};
  }
  test('a pairing shows with 14 days a side, in counts, and its id does not carry the name', () => {
    process.env.TZ = 'UTC';
    const {health, symptoms} = fixture();
    const {ready} = crossPillarInsights({habits: emptyHabitData(), health, today: TODAY, symptoms});
    const mood = ready.find(i => i.id === `symptom-mood-${symptomPairKey('headache')}`)!;
    expect(mood).toMatchObject({title: 'Headache and mood', withA: {days: 20, value: 2}, withoutA: {days: 20, value: 4}, unit: 'mood'});
    expect(mood.id).not.toContain('headache');
    expect(mood.sentence).toBe('On days you noted Headache, your mood that day averaged 2.0 of 5; on days you noted none, 4.0.');
    expect(whyText(mood)).toMatch(/not proof that one brings the other/);
    for (const w of FORBIDDEN_INSIGHT_WORDS) expect(mood.sentence).not.toMatch(new RegExp(`\\b${w}\\b`, 'i'));
  });
  test('a day without an answer is left out; too few days a side stays "collecting"', () => {
    process.env.TZ = 'UTC';
    const {health} = fixture();
    let few = addItem(emptySymptoms(), 'Headache', 'symptom', AT);
    for (let i = 0; i < 10; i++) few = setLevel(few, addLocalDays(TODAY, -i), 'headache', i % 2 ? 0 : 1);
    const r = crossPillarInsights({habits: emptyHabitData(), health, today: TODAY, symptoms: few});
    expect(r.ready.filter(i => i.id.startsWith('symptom-'))).toEqual([]);
    expect(r.pending.find(p => p.id.startsWith('symptom-mood-'))).toMatchObject({withA: 5, withoutA: 5, need: 14});
  });
  test('a name with an insight-forbidden word is the person\'s own and does not break the card', () => {
    process.env.TZ = 'UTC';
    const {health, symptoms} = fixture();
    const renamed = symptomsSchema.parse({...symptoms, items: [{...symptoms.items[0]!, name: 'Feeling better'}]});
    expect(() => crossPillarInsights({habits: emptyHabitData(), health, today: TODAY, symptoms: renamed})).not.toThrow();
  });
  test('without the record (every ZIGi and NOVA path), no symptom pairing exists', () => {
    process.env.TZ = 'UTC';
    const {health} = fixture();
    const r = crossPillarInsights({habits: emptyHabitData(), health, today: TODAY});
    expect([...r.ready, ...r.pending, ...r.unclear].some(i => i.id.startsWith('symptom-'))).toBe(false);
  });
});
