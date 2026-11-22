import {describe, expect, it} from 'vitest';
import {createEmptyHealth, diarySchema, healthSchema, type HealthData, type HealthDiaryEntry} from '../health';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {dailyData} from '../health-daily';
import {copyMealFromDayBefore, repeatDayBefore} from '../health-quick/quick';
import {FOOD_PLUS, FOOD_PLUS_KEY, emptyFoodPlus, foodPlusSchema, type FoodPlus} from './schema';
import {NO_EXTRA_MEALS, defaultChoice, diarySections, extraMealsOf, isExtraChoice, sectionOf, storedMealOf} from './extra-meals-lite';
import {carriedTags, copySection, saveMealFromEntries, setExtraSlot, tagEach, tagEntries, writeExtraTags} from './extra-meals';

/** Session AV lane 2 (food, LEDGER #197; Lose It!'s extra meals): two extra diary meals kept beside the strict diary. */
const DAY = '2026-11-23', PREV = '2026-11-22';
const entry = (id: string, date: string, meal: HealthDiaryEntry['meal'], name = `Fictional ${id.slice(-3)}`): HealthDiaryEntry => ({id, sourceId: 'health_food-fict-001', sourceKind: 'food', snapshot: {name, servingGrams: 100, nutrients: {kcal: 150, proteinMg: 4000, carbsMg: 20_000, fatMg: 5000}}, date, meal, quantityMilli: 1000, createdAt: `${date}T15:00:00.000Z`, updatedAt: `${date}T15:00:00.000Z`});
const health = (diary: HealthDiaryEntry[]): HealthData => healthSchema.parse({...createEmptyHealth(), diary});
const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }} as unknown as Storage}; };
const named = (r: FoodPlus, key: 'extra1' | 'extra2', name: string, extra: Partial<{time: string; kcal: string; after: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'}> = {}) => {
  const out = setExtraSlot(r, key, {name, time: extra.time ?? '', kcal: extra.kcal ?? '', after: extra.after ?? (key === 'extra1' ? 'Lunch' : 'Snacks')});
  if (!out.ok) throw Error(out.issue.message);
  return out.value;
};
const text = (r: FoodPlus) => JSON.stringify(r);

describe('the stored part (TIER 3 stored formats: additive, loose)', () => {
  it('a slot or tag this build cannot read is left out alone, never the whole record; the strict diary is unchanged', () => {
    const parsed = foodPlusSchema.parse({version: 1, times: {'health_diary-t-001': '07:15'}, extraMeals: {slots: {extra1: {name: 'Afternoon snack', time: 'teatime', after: 'Elevenses'}}, entries: {'health_diary-t-001': 'extra1'}, future: 1}});
    expect(parsed.times).toEqual({'health_diary-t-001': '07:15'});
    expect(parsed.extraMeals?.slots?.extra1).toEqual({name: 'Afternoon snack'});
    expect(parsed.extraMeals?.entries).toEqual({'health_diary-t-001': 'extra1'});
    expect(foodPlusSchema.parse({version: 1, extraMeals: {slots: {extra1: {name: ''}}, entries: {'health_diary-t-001': 'extra1'}}}).extraMeals?.slots).toBeUndefined();
    expect(foodPlusSchema.parse({version: 1, extraMeals: 'later'}).extraMeals).toBeUndefined();
    // The strict diary still refuses a fifth meal, so nothing here ever writes one.
    expect(diarySchema.safeParse({...entry('health_diary-t-001', DAY, 'Snacks'), meal: 'Afternoon snack'}).success).toBe(false);
  });
  it('export → erase → restore keeps the slots and the tags (the record travels as its JSON text)', () => {
    const {m, storage} = memory();
    updateDeviceRecord(storage, FOOD_PLUS, r => tagEntries(named(named(r, 'extra1', 'Afternoon snack', {time: '15:30', kcal: '200'}), 'extra2', 'Second breakfast', {after: 'Breakfast'}), ['health_diary-t-001'], 'extra1'));
    const exported = m.get(FOOD_PLUS_KEY)!;
    m.delete(FOOD_PLUS_KEY);
    expect(readDeviceRecord(storage, FOOD_PLUS)).toEqual({data: emptyFoodPlus(), unreadable: false});
    m.set(FOOD_PLUS_KEY, exported);
    const back = readDeviceRecord(storage, FOOD_PLUS);
    expect(back.unreadable).toBe(false);
    expect(back.data.extraMeals).toEqual({slots: {extra1: {name: 'Afternoon snack', after: 'Lunch', time: '15:30', kcal: 200}, extra2: {name: 'Second breakfast', after: 'Breakfast'}}, entries: {'health_diary-t-001': 'extra1'}});
    expect(extraMealsOf(exported).slots.map(s => s.name)).toEqual(['Afternoon snack', 'Second breakfast']);
  });
});

describe('naming the extra meals', () => {
  it('a name turns a slot on; blank takes it off and keeps the tags; time and target need a name; the words are checked', () => {
    let r = named(emptyFoodPlus(), 'extra1', '  Afternoon   snack ', {time: '15:30', kcal: '180'});
    expect(r.extraMeals?.slots?.extra1).toEqual({name: 'Afternoon snack', after: 'Lunch', time: '15:30', kcal: 180});
    r = tagEntries(r, ['health_diary-t-001'], 'extra1');
    r = named(r, 'extra1', '');
    expect(r.extraMeals?.slots).toBeUndefined();
    expect(r.extraMeals?.entries).toEqual({'health_diary-t-001': 'extra1'});
    const fail = (input: Partial<{name: string; time: string; kcal: string}>) => { const out = setExtraSlot(emptyFoodPlus(), 'extra2', {name: input.name ?? 'Late snack', time: input.time ?? '', kcal: input.kcal ?? '', after: 'Snacks'}); return out.ok ? null : out.issue; };
    expect(fail({name: 'x'.repeat(25)})?.field).toBe('name');
    expect(fail({name: '​'})?.message).toMatch(/letters or numbers/);
    expect(fail({name: '', time: '21:00'})?.message).toMatch(/name first/);
    expect(fail({time: '25:00'})?.field).toBe('time');
    expect(fail({kcal: '0'})?.field).toBe('kcal');
    expect(fail({kcal: '10001'})?.field).toBe('kcal');
    expect(fail({kcal: '1,200'})).toBeNull();
  });
  it('the light reader: only named slots, in order; a slot shows after its meal; tags only of known slots', () => {
    const r = tagEntries(named(named(emptyFoodPlus(), 'extra2', 'Late snack'), 'extra1', 'Second breakfast', {after: 'Breakfast', time: '10:30'}), ['health_diary-t-001', 'words_fict-1'], 'extra2');
    const x = extraMealsOf(text(r));
    expect(x.slots.map(s => [s.key, s.name, s.after, s.time])).toEqual([['extra1', 'Second breakfast', 'Breakfast', '10:30'], ['extra2', 'Late snack', 'Snacks', null]]);
    expect(diarySections(x)).toEqual(['Breakfast', 'extra1', 'Lunch', 'Dinner', 'Snacks', 'extra2']);
    expect(diarySections(NO_EXTRA_MEALS)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
    expect(x.tags).toEqual({'health_diary-t-001': 'extra2', 'words_fict-1': 'extra2'});
    expect(extraMealsOf('{"version":1,"extraMeals":{"slots":{"extra1":{"name":"Snack","after":"Elevenses"}},"entries":{"x":"extra1","health_diary-t-002":"extra9"}}}')).toEqual({slots: [{key: 'extra1', name: 'Snack', time: null, kcal: null, after: 'Lunch'}], tags: {}});
    for (const bad of [null, '', 'not json', '{"version":2,"extraMeals":{}}', '[]']) expect(extraMealsOf(bad)).toEqual(NO_EXTRA_MEALS);
  });
});

describe('where an entry shows, and what is stored', () => {
  it('an extra meal is stored as Snacks; a tagged Snacks entry shows in its extra meal only while the slot has a name', () => {
    expect(storedMealOf('extra1')).toBe('Snacks');
    expect(storedMealOf('Lunch')).toBe('Lunch');
    expect(isExtraChoice('extra2') && !isExtraChoice('Snacks')).toBe(true);
    const r = tagEntries(named(emptyFoodPlus(), 'extra1', 'Afternoon snack'), ['health_diary-t-001', 'health_diary-t-002'], 'extra1');
    const x = extraMealsOf(text(r));
    expect(sectionOf(entry('health_diary-t-001', DAY, 'Snacks'), x)).toBe('extra1');
    expect(sectionOf(entry('health_diary-t-002', DAY, 'Lunch'), x)).toBe('Lunch'); // moved to Lunch elsewhere: Lunch wins
    expect(sectionOf(entry('health_diary-t-003', DAY, 'Snacks'), x)).toBe('Snacks');
    expect(sectionOf(entry('health_diary-t-001', DAY, 'Snacks'), extraMealsOf(text(named(r, 'extra1', ''))))).toBe('Snacks');
  });
  it('tags: put in and taken out; with the live ids, tags of removed entries are dropped; many at once', () => {
    let r = tagEntries(emptyFoodPlus(), ['health_diary-t-001', 'health_diary-t-002'], 'extra1');
    r = tagEntries(r, ['health_diary-t-001'], null);
    expect(r.extraMeals?.entries).toEqual({'health_diary-t-002': 'extra1'});
    r = tagEntries(r, ['health_diary-t-003'], 'extra2', new Set(['health_diary-t-003']));
    expect(r.extraMeals?.entries).toEqual({'health_diary-t-003': 'extra2'});
    expect(tagEntries(r, ['health_diary-t-003'], null).extraMeals).toBeUndefined();
    expect(tagEach(emptyFoodPlus(), {})).toEqual(emptyFoodPlus());
    expect(tagEach(emptyFoodPlus(), {'health_diary-t-009': 'extra2'}).extraMeals?.entries).toEqual({'health_diary-t-009': 'extra2'});
  });
  it('writes through the device record and says when the device would not keep them', () => {
    const {storage} = memory();
    expect(writeExtraTags(r => tagEntries(r, ['health_diary-t-001'], 'extra1'), storage)).toBe(true);
    expect(extraMealsOf(storage.getItem(FOOD_PLUS_KEY)).tags).toEqual({'health_diary-t-001': 'extra1'});
    const full = {getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }};
    expect(writeExtraTags(r => tagEntries(r, ['health_diary-t-001'], 'extra1'), full)).toBe(false);
  });
});

describe('copies keep the extra meal; a one-tap log is never taken for a copy', () => {
  const yesterday = health([entry('health_diary-y-001', PREV, 'Breakfast'), entry('health_diary-y-002', PREV, 'Snacks', 'Fictional apple'), entry('health_diary-y-003', PREV, 'Snacks', 'Fictional yoghurt')]);
  const tags = {'health_diary-y-003': 'extra1'};
  it('Repeat yesterday: the yoghurt copy is in the afternoon snack again, the apple in Snacks', () => {
    const after = repeatDayBefore(yesterday, DAY, 'health_op-repeat-01', `${DAY}T09:00:00.000Z`);
    const carried = carriedTags(yesterday, after, PREV, DAY, tags);
    const copies = after.diary.filter(e => e.date === DAY && e.meal === 'Snacks');
    expect(copies.map(e => e.snapshot.name)).toEqual(['Fictional apple', 'Fictional yoghurt']);
    expect(carried).toEqual({[copies[1]!.id]: 'extra1'});
  });
  it('Copy yesterday’s snacks carries them too; a single new entry that is not a copy is left alone', () => {
    const after = copyMealFromDayBefore(yesterday, DAY, 'Snacks', 'health_op-copy-0001', `${DAY}T09:00:00.000Z`);
    expect(Object.values(carriedTags(yesterday, after, PREV, DAY, tags))).toEqual(['extra1']);
    const one = health([entry('health_diary-y-003', PREV, 'Snacks', 'Fictional yoghurt')]);
    const logged = healthSchema.parse({...one, diary: [...one.diary, entry('health_diary-n-001', DAY, 'Snacks', 'Fictional pear')]});
    expect(carriedTags(one, logged, PREV, DAY, tags)).toEqual({});
  });
});

describe('Save this meal from one section', () => {
  it('saves only the entries the section shows, and keeps the diary as it was', () => {
    const data = health([entry('health_diary-t-001', DAY, 'Snacks', 'Fictional apple'), entry('health_diary-t-002', DAY, 'Snacks', 'Fictional yoghurt')]);
    const next = saveMealFromEntries(data, 'health_meal-fict-0001', 'Afternoon snack', DAY, ['health_diary-t-002'], `${DAY}T16:00:00.000Z`);
    expect(next.diary).toEqual(data.diary);
    const saved = dailyData(next).savedMeals;
    expect(saved).toHaveLength(1);
    expect(saved[0]!.items.map(i => i.snapshot.name)).toEqual(['Fictional yoghurt']);
    expect(() => healthSchema.parse(next)).not.toThrow();
  });
});

describe('the meal a new entry starts on', () => {
  const x = extraMealsOf(text(named(named(emptyFoodPlus(), 'extra1', 'Afternoon snack', {time: '15:30'}), 'extra2', 'Late snack'))), at = (h: number, m = 0) => h * 60 + m;
  it('an extra meal with its own time wins when it is nearer now; one without a time is never chosen', () => {
    expect(defaultChoice('Lunch', null, at(15, 20), x)).toBe('extra1');
    expect(defaultChoice('Lunch', null, at(13, 10), x)).toBe('Lunch');
    expect(defaultChoice('Snacks', null, at(16, 30), x)).toBe('extra1'); // Snacks without a time: within 90 minutes
    expect(defaultChoice('Snacks', null, at(23, 0), x)).toBe('Snacks');
    expect(defaultChoice('Dinner', '18:00', at(16, 0), x)).toBe('extra1');
    expect(defaultChoice('Breakfast', null, at(8, 0), NO_EXTRA_MEALS)).toBe('Breakfast');
  });
});

describe('Copy a meal between Diary sections', () => {
  const data = health([entry('health_diary-t-001', PREV, 'Snacks', 'Fictional apple'), entry('health_diary-t-002', PREV, 'Snacks', 'Fictional yoghurt')]);
  const x = extraMealsOf(text(tagEntries(named(emptyFoodPlus(), 'extra1', 'Afternoon snack'), ['health_diary-t-002'], 'extra1')));
  it('copies only what the section shows, as Snacks entries, and returns the copies for an extra meal', () => {
    const out = copySection(data, x, {date: PREV, choice: 'extra1'}, {date: DAY, choice: 'extra1'}, 'health_op-sect-0001', `${DAY}T09:00:00.000Z`, DAY);
    const copies = out.data.diary.filter(e => e.date === DAY);
    expect(copies.map(e => [e.meal, e.snapshot.name])).toEqual([['Snacks', 'Fictional yoghurt']]);
    expect(out.added).toEqual([copies[0]!.id]);
    // The same operation again adds nothing.
    expect(copySection(out.data, x, {date: PREV, choice: 'extra1'}, {date: DAY, choice: 'extra1'}, 'health_op-sect-0001', `${DAY}T09:00:00.000Z`, DAY).data).toBe(out.data);
  });
  it('Snacks without its extra meal into Lunch; Snacks into the extra meal on the same day is allowed; the same section is not', () => {
    const toLunch = copySection(data, x, {date: PREV, choice: 'Snacks'}, {date: DAY, choice: 'Lunch'}, 'health_op-sect-0002', `${DAY}T09:00:00.000Z`, DAY);
    expect(toLunch.data.diary.filter(e => e.date === DAY).map(e => [e.meal, e.snapshot.name])).toEqual([['Lunch', 'Fictional apple']]);
    expect(toLunch.added).toEqual([]);
    const same = copySection(data, x, {date: PREV, choice: 'Snacks'}, {date: PREV, choice: 'extra1'}, 'health_op-sect-0003', `${DAY}T09:00:00.000Z`, DAY);
    expect(same.added).toHaveLength(1);
    expect(() => copySection(data, x, {date: PREV, choice: 'extra1'}, {date: PREV, choice: 'extra1'}, 'health_op-sect-0004', `${DAY}T09:00:00.000Z`, DAY)).toThrow(/another day or another meal/);
    expect(() => copySection(data, x, {date: DAY, choice: 'extra1'}, {date: PREV, choice: 'Lunch'}, 'health_op-sect-0005', `${DAY}T09:00:00.000Z`, DAY)).toThrow(/Nothing was logged/);
    expect(() => copySection(data, x, {date: PREV, choice: 'extra1'}, {date: '2026-11-30', choice: 'Lunch'}, 'health_op-sect-0006', `${DAY}T09:00:00.000Z`, DAY)).toThrow();
  });
});
