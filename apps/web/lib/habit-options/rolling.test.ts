import {afterEach, describe, expect, test} from 'vitest';
import {optionsOf, readRolling, rollingWords, withHabitOptions} from './rule';
import {createHabit, emptyHabitData, habitDataSchema, habitDay, habitStats, habitTrends, logHabitValue, rollingProgress, scheduleLabel, setHabitDayOverlay, setHabitEntryStatus, type HabitData} from '../habits';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';
import type {ToolSources} from '../ai/tools/env';
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

/** The engine reads the window through the day overlay (installed in the browser by lib/habit-options/install.ts). */
const START = '2026-11-01', at = (day: string) => new Date(`${day}T10:00:00`);
const RUN = '00000000-0000-4000-8000-0000000000ab';
const runHabit = (target = 1): HabitData => createHabit(emptyHabitData(), {title: 'Run', category: 'Health', description: '', notes: '', type: 'build', measurement: target > 1 ? {kind: 'count', unit: 'km'} : {kind: 'boolean'}, schedule: {kind: 'daily'}, target}, at(START), RUN);
const logged = (data: HabitData, days: string[], value = 1) => { let next = data; for (const d of days) next = logHabitValue(next, RUN, d, value, {}, at('2026-11-30')); return habitDataSchema.parse(JSON.parse(JSON.stringify(next))); };
const install = (rolling: unknown) => setHabitDayOverlay({options: id => id === RUN ? {rolling: rolling as never} : undefined, version: () => JSON.stringify(rolling).length});
afterEach(() => setHabitDayOverlay(null));
const day = (d: HabitData, date: string, today: string) => habitDay(d.habits[0]!, date, today);

describe('three times in any five days, in the habit engine', () => {
  const W = {times: 3, days: 5, from: START};
  test('without the window (the server, tests, older builds) every unlogged day is missed, as before', () => {
    const d = logged(runHabit(), ['2026-11-01', '2026-11-03']);
    expect(day(d, '2026-11-02', '2026-11-10').status).toBe('failed');
    expect(scheduleLabel(d.habits[0]!.rules[0]!.schedule, RUN)).toBe('Every day');
  });
  test('a day off is a rest day while the window holds enough; missed when it does not; nothing judged in the first days', () => {
    install(W);
    const d = logged(runHabit(), ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-08']), h = d.habits[0]!, T = '2026-11-12';
    // 3 Nov: the window would begin before 1 Nov: not judged.
    expect(day(d, '2026-11-03', T)).toMatchObject({status: 'not-scheduled', scheduled: false});
    // 5 Nov: 1–5 Nov holds 3 done days: a rest day. 6 Nov: 2–6 Nov holds 2: missed.
    expect(day(d, '2026-11-05', T).status).toBe('not-scheduled');
    expect(day(d, '2026-11-06', T).status).toBe('failed');
    expect(day(d, '2026-11-07', T).status).toBe('failed');
    expect(day(d, '2026-11-08', T).status).toBe('complete');
    expect(scheduleLabel(h.rules[0]!.schedule, RUN)).toBe('3 times in any 5 days');
    // Rest days are neutral; a missed day ends the streak; the trend counts done and missed days only.
    const stats = habitStats(h, T);
    expect(stats.successCount).toBe(4);
    // Missed: 6, 7, 9, 10 and 11 Nov (each window held fewer than 3); 3 and 5 Nov were rest days; today is still open.
    expect(stats.failCount).toBe(5);
    expect([stats.currentStreak, stats.bestStreak]).toEqual([0, 3]);
    expect(day(d, T, T).status).toBe('due');
    expect(habitTrends(h, T).find(t => t.period === 'month')).toMatchObject({success: 4});
  });
  test('today is due only while the window still needs a done day; a skipped or failed day reads as ever', () => {
    install(W);
    let d = logged(runHabit(), ['2026-11-08', '2026-11-09', '2026-11-10']);
    expect(day(d, '2026-11-11', '2026-11-11')).toMatchObject({status: 'not-scheduled', scheduled: true});
    expect(rollingProgress(d.habits[0]!, '2026-11-11')).toEqual({done: 3, times: 3, days: 5});
    expect(day(d, '2026-11-13', '2026-11-13')).toMatchObject({status: 'due', scheduled: true});
    expect(rollingProgress(d.habits[0]!, '2026-11-13')).toEqual({done: 2, times: 3, days: 5});
    d = habitDataSchema.parse(setHabitEntryStatus(d, RUN, '2026-11-12', 'skipped', 'Rest', at('2026-11-13')));
    expect(day(d, '2026-11-12', '2026-11-13').status).toBe('skipped');
    // A done day: complete, and today's window then holds enough.
    d = logged(d, ['2026-11-13']);
    expect(day(d, '2026-11-13', '2026-11-13').status).toBe('complete');
  });
  test('a measured habit counts only days that met the target; part done today is partial', () => {
    install(W);
    const d = logged(logged(runHabit(5), ['2026-11-08', '2026-11-09'], 5), ['2026-11-10'], 2);
    expect(rollingProgress(d.habits[0]!, '2026-11-10')).toEqual({done: 2, times: 3, days: 5});
    expect(day(d, '2026-11-10', '2026-11-10')).toMatchObject({status: 'partial', scheduled: true});
  });
  test('only an every-day build habit, and only from its start date', () => {
    install({times: 2, days: 7, from: '2026-11-06'});
    const d = runHabit();
    expect(day(d, '2026-11-03', '2026-11-10').status).toBe('failed');
    expect(day(d, '2026-11-13', '2026-11-20').status).toBe('failed');
    const weekly = createHabit(emptyHabitData(), {title: 'Run', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'weekdays', days: [1, 3]}, target: 1}, at(START), RUN);
    expect(rollingProgress(weekly.habits[0]!, '2026-11-11')).toBeNull();
    expect(scheduleLabel(weekly.habits[0]!.rules[0]!.schedule, RUN)).toBe('Mon · Wed');
  });
});

describe('NOVA and ZIGi say the rolling windows', () => {
  test('none, then each with its count, in English and Dutch; closed with Habits', () => {
    const s = showcaseAll(), first = s.habits.habits[0]!;
    const src = (x: unknown): ToolSources => ({...s, ak: {...s.ak, habitExtras: x}});
    const text = (q: string, x: unknown, habits = true) => { const env = zigiEnv(src(x)); const r = av2HabitsAnswer(q, habits ? env : {...env, areas: {...env.areas, habits: false}}); return r && 'text' in r ? r.text : ''; };
    expect(text('which habits are 3 times in any 10 days', {version: 1})).toMatch(/^No habit asks for a few times in any few days\./);
    const x = withHabitOptions({version: 1}, first.id, {rolling: {times: 3, days: 10, from: '2026-11-01'}});
    const en = text('which habits are 3 times in any 10 days', x);
    expect(en).toMatch(new RegExp(`^${first.title}: 3 times in any 10 days, \\d+ done in the last 10 days \\((?:enough: today can be a rest day|\\d+ more needed)\\)\\. A day off is a rest day`));
    expect(text('welke gewoontes zijn 3 keer in elke 10 dagen', x)).toMatch(new RegExp(`^${first.title}: 3 keer in elke 10 dagen, \\d+ gedaan in de laatste 10 dagen`));
    expect(text('which habits are 3 times in any 10 days', x, false)).not.toContain(first.title);
  });
});
