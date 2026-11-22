import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {areaWeekRows, habitWeek, readAreaGoals, withAreaGoal} from './week';
import {MONTH_THEMES, THEME_DAYS, themeMonthsReached, themeOf, themeProgress} from '../game/month-theme';
import {badges} from '../game/badges';
import {gameSchema, monthThemeShown, setMonthTheme} from '../game/schema';
import {habitExtrasSchema} from '../habits-extras/schema';
import {createEmptyHealth} from '../health';
import {GAME_KEY, HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';

/** Session AV lane 2 (habits; LEDGER #53, #55): the areas' week with its milestone, and the monthly theme. */
const MON = '2026-11-16', TODAY = '2026-11-18'; // Wednesday
const at = (d: string) => new Date(`${d}T10:00:00`);
const A = '00000000-0000-4000-8000-0000000000a1', B = '00000000-0000-4000-8000-0000000000b2', C = '00000000-0000-4000-8000-0000000000c3';
function three(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Walk', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, at('2026-10-01'), A);
  d = createHabit(d, {title: 'Gym', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'frequency', times: 3, period: 'week'}, target: 1}, at('2026-10-01'), B);
  d = createHabit(d, {title: 'Meditate', category: 'Mind', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, at('2026-10-01'), C);
  return d;
}
const log = (d: HabitData, id: string, days: string[]) => { let n = d; for (const x of days) n = logHabitValue(n, id, x, 1, {}, at(TODAY)); return habitDataSchema.parse(JSON.parse(JSON.stringify(n))); };
const AREAS = [{id: 'health', label: 'Health'}, {id: 'mind', label: 'Habits & Mind'}, {id: 'fun', label: 'Fun'}];
const extras = habitExtrasSchema.parse({version: 1, areas: {[A]: 'health', [B]: 'health', [C]: 'mind'}});

describe('areas this week (LEDGER #53)', () => {
  test('done of due, Monday to Sunday, per area; only areas that hold a habit', () => {
    let d = log(three(), A, ['2026-11-16', '2026-11-17']);
    d = log(d, B, ['2026-11-16']);
    expect(habitWeek(d.habits[0]!, MON, TODAY)).toEqual({done: 2, due: 7});
    expect(habitWeek(d.habits[1]!, MON, TODAY)).toEqual({done: 1, due: 3});
    const rows = areaWeekRows(d.habits, extras, AREAS, TODAY);
    expect(rows.map(r => [r.label, r.done, r.due, r.goal, r.own, r.reached])).toEqual([['Health', 3, 10, 10, false, false], ['Habits & Mind', 0, 7, 7, false, false]]);
  });
  test('an own milestone, reached, and weeks in a row', () => {
    let d = three();
    const days: string[] = [];
    for (let x = '2026-11-02'; x <= TODAY; x = addLocalDays(x, 1)) days.push(x);
    d = log(d, C, days);
    const own = withAreaGoal(extras, 'mind', 3);
    expect(readAreaGoals(own)).toEqual({mind: 3});
    const mind = areaWeekRows(d.habits, own, AREAS, TODAY).find(r => r.id === 'mind')!;
    expect(mind).toMatchObject({done: 3, due: 7, goal: 3, own: true, reached: true, weeksInRow: 3});
    expect(readAreaGoals(withAreaGoal(own, 'mind', null))).toEqual({});
    expect(() => withAreaGoal(own, 'mind', 0)).toThrow(/whole number/);
    expect(readAreaGoals({areaGoals: {a: 2.5, b: 'x', c: 600, d: 4}})).toEqual({d: 4});
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(own)))).toEqual(own);
  });
  test('no area assigned: no rows', () => {
    expect(areaWeekRows(three().habits, {version: 1}, AREAS, TODAY)).toEqual([]);
  });
});

describe('the monthly theme (LEDGER #55)', () => {
  test('twelve themes, each with Dutch words and a built-in area', () => {
    expect(MONTH_THEMES.map(t => t.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const t of MONTH_THEMES) { expect(t.nl.length).toBeGreaterThan(2); expect(t.lineNl.length).toBeGreaterThan(5); expect(['health', 'mind', 'wealth', 'relationships', 'career', 'learning', 'fun']).toContain(t.area); }
    expect(themeOf('2026-11-18').id).toBe('gratitude');
  });
  test('15 days with a check-in in the theme\'s area reach it; any habit counts while none is in it; hidden, no badge', () => {
    const days: string[] = [];
    for (let x = '2026-11-01'; x <= '2026-11-15'; x = addLocalDays(x, 1)) days.push(x);
    const onWalk = log(three(), A, days), onMind = log(three(), C, days);
    expect(themeProgress(onWalk.habits, extras, '2026-11', TODAY)).toMatchObject({days: 0, reached: false, inArea: true}); // November is Mind; Walk is Health
    expect(themeProgress(onMind.habits, extras, '2026-11', TODAY)).toMatchObject({days: THEME_DAYS, reached: true, inArea: true});
    expect(themeProgress(onWalk.habits, {version: 1}, '2026-11', TODAY)).toMatchObject({days: THEME_DAYS, reached: true, inArea: false});
    expect(themeMonthsReached(onMind.habits, extras, TODAY)).toEqual(['2026-11']);
    const stores = (off: boolean) => ({habits: onMind, health: createEmptyHealth(), habitExtras: extras, monthThemeOff: off});
    expect(badges(stores(false), TODAY).find(b => b.id === 'theme-month')?.earned).toBe(true);
    expect(badges(stores(true), TODAY).find(b => b.id === 'theme-month')?.earned).toBe(false);
    expect(badges(stores(true), TODAY, {'theme-month': '2026-11-15'}).find(b => b.id === 'theme-month')?.earned).toBe(true); // kept once earned
  });
  test('the switch: hidden is false, shown removes the field; only with the layer on', () => {
    const g = gameSchema.parse({version: 1, enabled: true});
    expect(monthThemeShown(g)).toBe(true);
    const off = setMonthTheme(g, false);
    expect(off.monthTheme).toBe(false);
    expect(monthThemeShown(off)).toBe(false);
    expect(setMonthTheme(off, true)).toEqual(g);
    expect(monthThemeShown({...g, enabled: false})).toBe(false);
    expect(gameSchema.parse({...g, monthTheme: 'no'}).monthTheme).toBeUndefined();
  });
});

describe('export → erase → restore keeps the milestones and the theme switch', () => {
  test('both come back exactly', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const own = withAreaGoal(extras, 'health', 9), game = setMonthTheme(gameSchema.parse({version: 1, enabled: true}), false);
    storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(own)); storage.setItem(GAME_KEY, JSON.stringify(game));
    const {sections} = exportRecordSections(storage, {health: false});
    forgetAaDeviceRecords(storage);
    for (const key of [HABIT_EXTRAS_KEY, GAME_KEY]) { const section = sectionOf(DEVICE_PARTS.find(p => p.key === key)!)!; restoreRecordSection(storage, section, sections[section]!); }
    expect(JSON.parse(m.get(HABIT_EXTRAS_KEY)!)).toEqual(own);
    expect(JSON.parse(m.get(GAME_KEY)!)).toEqual(game);
  });
});
