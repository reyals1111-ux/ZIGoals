import {describe, expect, test} from 'vitest';
import {emptyGroceryRecord, groceryRecordSchema, setPantry, setTick, setUseBy} from './schema';
import {byDayWords, pantrySoon} from './use-soon';

/**
 * Session AW (X5, LEDGER #452; TIER 3 stored format, additive): a use-by day per pantry item in the loose grocery record
 * (`useBy`, by the pantry's folded name), and "Use soon" first: within three days, then past their day, said plainly.
 */
const AT = '2026-11-25T08:00:00.000Z', TODAY = '2026-11-25';
describe('stored format: useBy is an optional part of the loose grocery record', () => {
  test('an older record reads as before; pantry values stay timestamps; the older parts survive', () => {
    const old = groceryRecordSchema.parse({version: 1, pantry: {rice: AT}, showFrequent: true});
    const next = setUseBy(old, 'Rice', '2026-11-27', AT);
    expect(next.pantry).toEqual({rice: AT});
    expect(next.useBy).toEqual({rice: '2026-11-27'});
    expect(next.showFrequent).toBe(true);
    expect(setTick(next, '2026-11-23', 'rice|mass', true, AT).useBy).toEqual({rice: '2026-11-27'});
  });
  test('a day this build cannot read drops the map, never the record; an unknown part stays', () => {
    const read = groceryRecordSchema.parse({version: 1, pantry: {rice: AT}, useBy: {rice: 'soon'}, later: 1});
    expect(read.useBy).toBeUndefined();
    expect(read.pantry).toEqual({rice: AT});
    expect((read as Record<string, unknown>).later).toBe(1);
  });
  test('a day on an item not at home puts it in the pantry; putting it back on the list takes the day off', () => {
    const r = setUseBy(emptyGroceryRecord(), 'Greek Yoghurt', '2026-11-26', AT);
    expect(r.pantry).toEqual({'greek yoghurt': AT});
    expect(setUseBy(r, 'greek yoghurt', null, AT).useBy).toBeUndefined();
    const back = setPantry(r, 'Greek yoghurt', false, AT);
    expect(back.pantry).toEqual({});
    expect(back.useBy).toBeUndefined();
    expect(() => setUseBy(r, 'x', 'tomorrow', AT)).toThrow('Choose a use-by day.');
    expect(() => setUseBy(r, '  ', '2026-11-26', AT)).toThrow();
  });
});

describe('#452 use soon first', () => {
  test('within three days soonest first, then past their day; an item without a day is never listed', () => {
    let r = setPantry(emptyGroceryRecord(), 'Flour', true, AT);
    for (const [name, day] of [['Spinach', '2026-11-23'], ['Milk', '2026-11-25'], ['Eggs', '2026-11-28'], ['Cheese', '2026-11-29'], ['Fish', '2026-11-24']] as const) r = setUseBy(r, name, day, AT);
    const {soon, past, later} = pantrySoon(r, TODAY);
    expect(soon.map(i => [i.name, i.days])).toEqual([['milk', 0], ['eggs', 3]]);
    expect(past.map(i => [i.name, i.days])).toEqual([['fish', -1], ['spinach', -2]]);
    expect(later.map(i => i.name)).toEqual(['cheese']);
    expect(byDayWords(soon[0]!, TODAY)).toBe('use today');
    expect(byDayWords({day: '2026-11-26', days: 1}, TODAY)).toBe('use by tomorrow');
    expect(byDayWords(soon[1]!, TODAY)).toBe('use by Nov 28 (in 3 days)');
    expect(byDayWords(past[0]!, TODAY)).toBe('past its use-by day, yesterday');
    expect(byDayWords(past[1]!, TODAY)).toBe('past its use-by day, 2 days ago');
  });
});
