import {describe, expect, test} from 'vitest';
import {addOwn, countPortion, MAX_OWN_PORTIONS, portionLine, readPortions, removeCounter, setAim, setBuiltIn, weekCount} from './portions';
import {emptyFoodPlus, foodPlusSchema} from './schema';

/** Session AV lane 2, round 6 (r6-body; LEDGER #418): portion counters — none on by default, own aims, never "off track". */
describe('portion counters', () => {
  test('none is on until chosen; built-in and own counters; counts a day, never below 0', () => {
    expect(readPortions(emptyFoodPlus())).toEqual({counters: [], days: {}});
    let f = setBuiltIn(setBuiltIn(emptyFoodPlus(), 'veg', true), 'fish', true);
    f = addOwn(f, ' Nuts ', 'own-nuts0001');
    expect(readPortions(f).counters).toEqual([{id: 'veg'}, {id: 'fish'}, {id: 'own-nuts0001', name: 'Nuts'}]);
    f = countPortion(countPortion(countPortion(f, 'veg', '2026-11-22', 1), 'veg', '2026-11-22', 1), 'fish', '2026-11-20', 1);
    expect(readPortions(f).days).toEqual({'2026-11-22': {veg: 2}, '2026-11-20': {fish: 1}});
    expect(readPortions(countPortion(countPortion(f, 'fish', '2026-11-20', -1), 'fish', '2026-11-20', -1)).days).toEqual({'2026-11-22': {veg: 2}});
    expect(foodPlusSchema.parse(f)).toEqual(f);
  });
  test('turning a built-in counter off keeps its days; removing an own one takes its days', () => {
    let f = countPortion(addOwn(setBuiltIn(emptyFoodPlus(), 'fruit', true), 'Nuts', 'own-nuts0001'), 'fruit', '2026-11-22', 1);
    f = countPortion(f, 'own-nuts0001', '2026-11-22', 1);
    expect(readPortions(setBuiltIn(f, 'fruit', false)).days['2026-11-22']).toEqual({fruit: 1, 'own-nuts0001': 1});
    expect(readPortions(removeCounter(f, 'own-nuts0001')).days['2026-11-22']).toEqual({fruit: 1});
    expect('portions' in removeCounter(setBuiltIn(emptyFoodPlus(), 'fish', true), 'fish')).toBe(false);
  });
  test('an aim a day or a week, with a plain line; never “off track”', () => {
    let f = setAim(setBuiltIn(emptyFoodPlus(), 'veg', true), 'veg', {n: 5, per: 'day'});
    f = countPortion(f, 'veg', '2026-11-22', 1);
    const p = readPortions(f);
    expect(portionLine(p, p.counters[0]!, '2026-11-22')).toBe('1 today · your aim 5 a day');
    expect(portionLine(p, p.counters[0]!, '2026-11-22', 'nl')).toBe('1 vandaag · je doel 5 per dag');
    f = setAim(setBuiltIn(f, 'fish', true), 'fish', {n: 2, per: 'week'});
    f = countPortion(countPortion(f, 'fish', '2026-11-17', 1), 'fish', '2026-11-19', 1);
    const q = readPortions(f), fish = q.counters.find(c => c.id === 'fish')!;
    expect(weekCount(q, 'fish', '2026-11-22')).toBe(2);
    expect(portionLine(q, fish, '2026-11-22')).toBe('0 today · 2 this week · your aim 2 a week · reached');
    for (const day of ['2026-11-16', '2026-11-22', '2026-11-23']) expect(portionLine(q, fish, day)).not.toMatch(/off track|behind|missed|only/i);
    expect(readPortions(setAim(f, 'veg', null)).counters[0]).toEqual({id: 'veg'});
    expect(() => setAim(f, 'veg', {n: 0, per: 'day'})).toThrow('Choose an aim from 1 to 50.');
  });
  test('own counters: a name, no repeat, at most three', () => {
    let f = emptyFoodPlus();
    expect(() => addOwn(f, ' ', 'own-x0000001')).toThrow('Name the counter first.');
    for (let i = 0; i < MAX_OWN_PORTIONS; i++) f = addOwn(f, `Thing ${i}`, `own-thing000${i}`);
    expect(() => addOwn(f, 'One more', 'own-more0001')).toThrow(`Up to ${MAX_OWN_PORTIONS} counters of your own fit. Remove one first.`);
    expect(() => addOwn(setBuiltIn(emptyFoodPlus(), 'fish', true), 'fish', 'own-fish0001')).toThrow('“fish” is counted already.');
  });
});
