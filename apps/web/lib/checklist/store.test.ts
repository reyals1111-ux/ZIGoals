import {describe, expect, test} from 'vitest';
import {emptyChecklist, type Checklist} from './schema';
import {CHECKLIST_LIMIT_MESSAGE, CUSTOM_LABEL_MESSAGE, ChecklistError, DEFAULT_SECTIONS, MAX_HEALTH_ITEMS, MAX_PATH_ITEMS, addCustom, addFavourite, addSection, customToHabit, favouriteKey, findFavourite, isFavourite, moveItem, moveWithinSection, orderedItems, rememberValue, removeFavourite, removeItem, removeSection, sectionOfItem, sectionsOf, toggleFavourite, updateItem, updateSection, type FavouriteRef} from './store';

const AT = new Date('2026-10-18T07:00:00.000Z');
let n = 0;
const opts = (extra: Partial<Parameters<typeof addFavourite>[2]> = {}) => ({id: `ck_${++n}`, at: AT, ...extra});
const habit = (habitId: string): FavouriteRef => ({kind: 'habit', habitId});
const ids = (r: Checklist) => orderedItems(r).map(i => i.id);

describe('favourites', () => {
  test('a star adds once; the same favourite twice is refused quietly; the key names it', () => {
    const r1 = addFavourite(emptyChecklist(), habit('h1'), opts({id: 'a', section: 'morning'}));
    expect(r1.items).toEqual([{id: 'a', kind: 'habit', ref: {habitId: 'h1'}, section: 'morning', addedAt: AT.toISOString()}]);
    expect(addFavourite(r1, habit('h1'), opts())).toBe(r1);
    expect(isFavourite(r1, habit('h1'))).toBe(true);
    expect(favouriteKey({kind: 'goal-step', goalId: '12', milestoneId: 'm1'})).toBe('goal-step:12:m1');
    expect(favouriteKey({kind: 'health', input: 'diary', sourceKind: 'food', sourceId: 'f1'})).toBe('health:diary:food:f1');
    expect(favouriteKey({kind: 'health', input: 'water'})).toBe('health:water');
  });
  test('Health inputs live apart, with their default and unit; timers default to the evening orbit', () => {
    let r = addFavourite(emptyChecklist(), {kind: 'health', input: 'water'}, opts({id: 'w', defaultValue: 500, unit: 'ml'}));
    r = addFavourite(r, {kind: 'health', input: 'sleep'}, opts({id: 's'}));
    r = addFavourite(r, {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: 'vit-d'}, opts({id: 'd', label: 'Vitamin D'}));
    expect(r.items).toEqual([]);
    expect(r.healthItems.map(i => [i.id, i.input, i.section, i.defaultValue ?? null, i.unit ?? null, i.ref ?? null, i.label ?? null])).toEqual([['w', 'water', 'morning', 500, 'ml', null, null], ['s', 'sleep', 'evening', null, null, null, null], ['d', 'diary', 'morning', null, null, {sourceKind: 'food', sourceId: 'vit-d'}, 'Vitamin D']]);
    expect(findFavourite(r, {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: 'vit-d'})?.id).toBe('d');
  });
  test('toggle: on, then off again; removing leaves the rest in order', () => {
    const on = toggleFavourite(emptyChecklist(), habit('h1'), opts({id: 'a'}));
    expect(on.starred).toBe(true);
    const two = addFavourite(on.record, habit('h2'), opts({id: 'b'}));
    const off = toggleFavourite(two, habit('h1'), opts());
    expect(off.starred).toBe(false);
    expect(ids(off.record)).toEqual(['b']);
    expect(off.record.order).toEqual(['b']);
    expect(removeFavourite(off.record, habit('nope'))).toBe(off.record);
    expect(removeItem(off.record, 'nope')).toBe(off.record);
  });
  test('limits say so in plain words and write nothing', () => {
    let r = emptyChecklist();
    for (let i = 0; i < MAX_PATH_ITEMS; i++) r = addFavourite(r, habit(`h${i}`), opts());
    expect(() => addFavourite(r, habit('one-more'), opts())).toThrow(CHECKLIST_LIMIT_MESSAGE);
    expect(() => addCustom(r, {label: 'Piano'}, opts())).toThrow(ChecklistError);
    let h = emptyChecklist();
    for (let i = 0; i < MAX_HEALTH_ITEMS; i++) h = addFavourite(h, {kind: 'health', input: 'meal', meal: `m${i}`}, opts());
    expect(() => addFavourite(h, {kind: 'health', input: 'water'}, opts())).toThrow(CHECKLIST_LIMIT_MESSAGE);
  });
});

describe('custom items, edits and the stepper memory', () => {
  test('a custom item has its own words and colour; empty or long names are refused', () => {
    const r = addCustom(emptyChecklist(), {label: '  Play piano 15 minutes ', colour: 'gold', section: 'evening'}, {id: 'c', at: AT});
    expect(r.items[0]).toEqual({id: 'c', kind: 'custom', label: 'Play piano 15 minutes', colour: 'gold', section: 'evening', addedAt: AT.toISOString()});
    expect(() => addCustom(r, {label: '  '}, {id: 'x', at: AT})).toThrow(CUSTOM_LABEL_MESSAGE);
    expect(() => addCustom(r, {label: 'x'.repeat(61)}, {id: 'x', at: AT})).toThrow(CUSTOM_LABEL_MESSAGE);
    expect(addCustom(r, {label: 'Stretch', colour: 'chartreuse', section: 'nowhere'}, {id: 'y', at: AT}).items[1]).toMatchObject({colour: 'gold', section: 'anytime'});
  });
  test('"Make this a habit" turns the custom item into that habit’s favourite in the same place', () => {
    let r = addCustom(emptyChecklist(), {label: 'Piano'}, {id: 'c', at: AT});
    r = addFavourite(r, habit('h2'), opts({id: 'b'}));
    const made = customToHabit(r, 'c', 'h-piano');
    expect(ids(made)).toEqual(['c', 'b']);
    expect(made.items[0]).toMatchObject({id: 'c', kind: 'habit', ref: {habitId: 'h-piano'}, label: 'Piano'});
    expect(customToHabit(r, 'c', 'h2').items.map(i => i.id)).toEqual(['b']); // already a favourite: the custom item goes
  });
  test('edits: label, colour, orbit and default; the last value is remembered', () => {
    let r = addFavourite(emptyChecklist(), {kind: 'health', input: 'water'}, opts({id: 'w', defaultValue: 250}));
    r = updateItem(r, 'w', {colour: 'teal', section: 'afternoon', defaultValue: 500});
    expect(r.healthItems[0]).toMatchObject({colour: 'teal', section: 'afternoon', defaultValue: 500});
    r = updateItem(r, 'w', {colour: null, defaultValue: null});
    expect(r.healthItems[0]).not.toHaveProperty('colour'); expect(r.healthItems[0]).not.toHaveProperty('defaultValue');
    const remembered = rememberValue(r, 'w', 750);
    expect(remembered.healthItems[0]?.lastValue).toBe(750);
    expect(rememberValue(remembered, 'w', 750)).toBe(remembered);
    expect(rememberValue(remembered, 'w', Number.NaN)).toBe(remembered);
    expect(() => updateItem(r, 'gone', {label: 'x'})).toThrow(ChecklistError);
  });
});

describe('order and orbits', () => {
  const three = () => ['a', 'b', 'c'].reduce((r, id, i) => addFavourite(r, habit(id), {id, at: new Date(AT.getTime() + i), section: i < 2 ? 'morning' : 'evening'}), emptyChecklist());
  test('drag moves anywhere; Move up / Move down stays within the orbit', () => {
    expect(ids(moveItem(three(), 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(moveItem(three(), 'a', 99))).toEqual(['b', 'c', 'a']);
    expect(ids(moveWithinSection(three(), 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(moveWithinSection(three(), 'c', -1)).toEqual(three()); // first of its orbit: nothing to swap with
  });
  test('items missing from the order follow it by when they were added; an unknown orbit falls back', () => {
    const r: Checklist = {...three(), order: ['c']};
    expect(ids(r)).toEqual(['c', 'a', 'b']);
    const item = {...r.items[0]!, section: 'deleted-elsewhere'};
    expect(sectionOfItem(r, item)).toBe('anytime');
  });
  test('orbits: the defaults, rename and recolour, add, remove (its items move to the last one), limits', () => {
    expect(sectionsOf(emptyChecklist()).map(s => s.id)).toEqual(DEFAULT_SECTIONS.map(s => s.id));
    let r = updateSection(three(), 'morning', {label: 'Sunrise', colour: 'gold'});
    expect(sectionsOf(r)[0]).toEqual({id: 'morning', label: 'Sunrise', colour: 'gold'});
    r = addSection(r, {label: 'Gym'}, 'gym');
    expect(sectionsOf(r).at(-1)).toEqual({id: 'gym', label: 'Gym', colour: 'teal'});
    r = removeSection(r, 'evening');
    expect(r.items.find(i => i.id === 'c')?.section).toBe('gym');
    expect(() => updateSection(r, 'morning', {label: ''})).toThrow(ChecklistError);
    let full = emptyChecklist();
    for (let i = sectionsOf(full).length; i < 12; i++) full = addSection(full, {label: `O${i}`}, `o${i}`);
    expect(() => addSection(full, {label: 'Thirteen'}, 'x')).toThrow('up to 12 orbits');
  });
});
