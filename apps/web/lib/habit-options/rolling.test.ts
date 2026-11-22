import {describe, expect, test} from 'vitest';
import {optionsOf, readRolling, rollingWords, withHabitOptions} from './rule';
import {habitExtrasSchema} from '../habits-extras/schema';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';

/** Session AV lane 2 (habits; LEDGER #185, Loop's "x times in y days"): the rolling window in a habit's options. */
const ID = '00000000-0000-4000-8000-0000000000aa';
describe('the rolling window, kept in the habit options', () => {
  test('set, read, cleared; whenever, the two-day rule and "unlogged is skipped" give way to it, and it to whenever', () => {
    let x: object = withHabitOptions({version: 1, calm: {visual: 'sea'}}, ID, {twoDay: true, unloggedSkip: true, difficulty: 'hard'});
    x = withHabitOptions(x, ID, {rolling: {times: 3, days: 10, from: '2026-11-01'}});
    expect(habitExtrasSchema.parse(x)).toEqual(x);
    expect(optionsOf(x, ID)).toEqual({difficulty: 'hard', rolling: {times: 3, days: 10, from: '2026-11-01'}});
    expect((x as {calm: unknown}).calm).toEqual({visual: 'sea'});
    expect(optionsOf(withHabitOptions(x, ID, {whenever: true}), ID)).toEqual({difficulty: 'hard', whenever: true});
    expect(optionsOf(withHabitOptions(withHabitOptions(x, ID, {whenever: true}), ID, {rolling: {times: 2, days: 7, from: '2026-11-05'}}), ID)).toEqual({difficulty: 'hard', rolling: {times: 2, days: 7, from: '2026-11-05'}});
    expect(optionsOf(withHabitOptions(x, ID, {rolling: null}), ID)).toEqual({difficulty: 'hard'});
    expect(() => withHabitOptions(x, ID, {rolling: {times: 10, days: 10, from: '2026-11-01'}})).toThrow('Choose a number of times below the days');
  });
  test('odd values are read as no window, never an unreadable record; a later field is kept', () => {
    for (const raw of [{times: 0, days: 5, from: '2026-11-01'}, {times: 5, days: 5, from: '2026-11-01'}, {times: 2, days: 91, from: '2026-11-01'}, {times: 2.5, days: 9, from: '2026-11-01'}, {times: 2, days: 9, from: 'soon'}, 'x', null]) expect(readRolling(raw)).toBeNull();
    expect(optionsOf({options: {[ID]: {rolling: {times: 2, days: 9, from: '2026-11-01', later: 1}}}}, ID)).toEqual({rolling: {times: 2, days: 9, from: '2026-11-01'}});
    expect(optionsOf({options: {[ID]: {whenever: true, rolling: {times: 2, days: 9, from: '2026-11-01'}}}}, ID)).toEqual({whenever: true});
    const kept = withHabitOptions({version: 1, options: {[ID]: {rolling: {times: 2, days: 9, from: '2026-11-01'}, future: 'x'}}}, ID, {difficulty: 'medium'});
    expect(kept.options[ID]).toEqual({rolling: {times: 2, days: 9, from: '2026-11-01'}, future: 'x', difficulty: 'medium'});
  });
  test('words, English and Dutch', () => {
    expect(rollingWords({times: 3, days: 10})).toBe('3 times in any 10 days');
    expect(rollingWords({times: 1, days: 2})).toBe('1 time in any 2 days');
    expect(rollingWords({times: 3, days: 10}, 'nl')).toBe('3 keer in elke 10 dagen');
  });
  test('export → erase → restore keeps it', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(withHabitOptions({version: 1}, ID, {rolling: {times: 3, days: 10, from: '2026-11-01'}})));
    const {sections} = exportRecordSections(storage, {health: false});
    forgetAaDeviceRecords(storage);
    expect(m.has(HABIT_EXTRAS_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === HABIT_EXTRAS_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    expect(optionsOf(JSON.parse(m.get(HABIT_EXTRAS_KEY)!), ID).rolling).toEqual({times: 3, days: 10, from: '2026-11-01'});
  });
});
