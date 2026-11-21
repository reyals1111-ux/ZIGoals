import {describe, expect, test} from 'vitest';
import {HEALTH_MEALS} from '../health';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {MAX_MEAL_WORDS, MEAL_WORDS, MEAL_WORDS_KEY, MEAL_WORDS_MEALS, addMealWords, emptyMealWords, mealWordsFor, mealWordsSchema, newMealWordsId, removeMealWords, type MealWordsEntry} from './schema';

// Session AU (ADR-044 F-MEAL; TIER 3 (stored format), additive): a meal logged in words alone, in its own device-only key.
const at = (n: number) => new Date(Date.UTC(2026, 10, 1, 0, 0, n)).toISOString();
const entry = (over: Partial<MealWordsEntry> = {}): MealWordsEntry => ({id: 'words_a', date: '2026-11-19', meal: 'Lunch', words: 'Soup and bread', at: at(0), ...over});
const memory = (seed: Record<string, string> = {}) => { const m = new Map(Object.entries(seed)); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

describe('meal words: the record', () => {
  test('its own versioned key; the meals are the diary\'s four', () => {
    expect(MEAL_WORDS_KEY).toBe('zigoals:meal-words:v1');
    expect(MEAL_WORDS.key).toBe(MEAL_WORDS_KEY);
    expect([...MEAL_WORDS_MEALS]).toEqual([...HEALTH_MEALS]);
    expect(MEAL_WORDS.empty()).toEqual({version: 1, entries: []});
  });
  test('loose: a field from a newer build is kept, on the record and on an entry', () => {
    const later = {version: 1, entries: [{...entry(), kcalGuess: 400}], sort: 'newest'};
    expect(mealWordsSchema.parse(later)).toEqual(later);
  });
  test('refuses what this build cannot read: another version, an unknown meal, a bad day, empty, long or multi-line words, a repeated id', () => {
    const bad = [
      {version: 2, entries: []},
      {version: 1, entries: [{...entry(), meal: 'Brunch'}]},
      {version: 1, entries: [{...entry(), date: '2026-13-01'}]},
      {version: 1, entries: [{...entry(), words: '   '}]},
      {version: 1, entries: [{...entry(), words: 'x'.repeat(121)}]},
      {version: 1, entries: [{...entry(), words: 'two\nlines'}]},
      {version: 1, entries: [{...entry(), id: 'has space'}]},
      {version: 1, entries: [{...entry(), at: 'yesterday'}]},
      {version: 1, entries: [entry(), entry()]},
    ];
    for (const value of bad) expect(mealWordsSchema.safeParse(value).success, JSON.stringify(value)).toBe(false);
    expect(mealWordsSchema.parse({version: 1, entries: [entry({words: 'x'.repeat(120)})]}).entries[0]!.words).toHaveLength(120);
  });
  test('the words are trimmed', () => {
    expect(addMealWords(emptyMealWords(), entry({words: '  porridge with a banana  '})).entries[0]!.words).toBe('porridge with a banana');
  });
  test('reads tolerantly and writes only a valid record', () => {
    const s = memory({[MEAL_WORDS_KEY]: '{"version":1,"entries":[{"id":"words_a"}]}'});
    expect(readDeviceRecord(s, MEAL_WORDS)).toEqual({data: emptyMealWords(), unreadable: true});
    expect(s.m.get(MEAL_WORDS_KEY)).toBe('{"version":1,"entries":[{"id":"words_a"}]}');
    const fresh = memory();
    updateDeviceRecord(fresh, MEAL_WORDS, r => addMealWords(r, entry()));
    expect(JSON.parse(fresh.m.get(MEAL_WORDS_KEY)!)).toEqual({version: 1, entries: [entry()]});
    expect(() => updateDeviceRecord(fresh, MEAL_WORDS, r => ({...r, entries: [...r.entries, entry({id: 'words_b', words: ''})]}))).toThrow();
    expect(JSON.parse(fresh.m.get(MEAL_WORDS_KEY)!)).toEqual({version: 1, entries: [entry()]});
  });
});

describe('meal words: add and remove', () => {
  test('add keeps entries oldest first; the same id replaces; an invalid entry throws and changes nothing', () => {
    let r = addMealWords(emptyMealWords(), entry({id: 'words_b', at: at(5), words: 'Pasta'}));
    r = addMealWords(r, entry({id: 'words_a', at: at(1)}));
    expect(r.entries.map(e => e.id)).toEqual(['words_a', 'words_b']);
    r = addMealWords(r, entry({id: 'words_a', at: at(9), words: 'Soup, no bread'}));
    expect(r.entries.map(e => [e.id, e.words])).toEqual([['words_b', 'Pasta'], ['words_a', 'Soup, no bread']]);
    const before = JSON.stringify(r);
    expect(() => addMealWords(r, entry({id: 'words_c', meal: 'Supper' as never}))).toThrow();
    expect(JSON.stringify(r)).toBe(before);
  });
  test(`past ${MAX_MEAL_WORDS} entries the oldest go`, () => {
    const full = {version: 1 as const, entries: Array.from({length: MAX_MEAL_WORDS}, (_, i) => entry({id: `words_${i}`, at: at(i)}))};
    const next = addMealWords(full, entry({id: 'words_new', at: at(MAX_MEAL_WORDS + 1)}));
    expect(next.entries).toHaveLength(MAX_MEAL_WORDS);
    expect(next.entries[0]!.id).toBe('words_1');
    expect(next.entries.at(-1)!.id).toBe('words_new');
    expect(mealWordsSchema.safeParse({...full, entries: [...full.entries, entry({id: 'words_x'})]}).success).toBe(false);
  });
  test('remove takes one entry by id; an unknown id leaves the record as it was', () => {
    const r = addMealWords(addMealWords(emptyMealWords(), entry()), entry({id: 'words_b', at: at(2)}));
    expect(removeMealWords(r, 'words_a').entries.map(e => e.id)).toEqual(['words_b']);
    expect(removeMealWords(r, 'words_zz')).toBe(r);
  });
  test('one day\'s words for one meal', () => {
    let r = addMealWords(emptyMealWords(), entry());
    r = addMealWords(r, entry({id: 'words_b', meal: 'Dinner', at: at(2)}));
    r = addMealWords(r, entry({id: 'words_c', date: '2026-11-18', at: at(3)}));
    expect(mealWordsFor(r, '2026-11-19', 'Lunch').map(e => e.id)).toEqual(['words_a']);
    expect(mealWordsFor(r, '2026-11-19', 'Breakfast')).toEqual([]);
  });
  test('a new id is valid for the record', () => {
    const id = newMealWordsId();
    expect(id).toMatch(/^words_[A-Za-z0-9-]{1,80}$/);
    expect(newMealWordsId(() => 'a b/c')).toBe('words_abc');
  });
});
