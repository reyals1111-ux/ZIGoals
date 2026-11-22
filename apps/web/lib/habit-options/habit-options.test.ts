import {afterEach, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, habitDay, habitStats, logHabitValue, scheduleLabel, setHabitDayOverlay, setHabitEntryStatus, habitTrends, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {DIFFICULTY_XP, FOCUS_BONUS_XP, optionsOf, readFocusDays, readHabitOptions, withFocusDay, withHabitOptions} from './rule';
import {withFocus} from '../habit-focus';
import {habitExtrasSchema} from '../habits-extras/schema';
import {HABIT_EXTRAS_KEY, GAME_KEY} from '../aa-device-keys';
import {xpSummary, countedXp, xpEvents} from '../game/xp';
import {gameSchema, startAgain, rebirthFrom, emptyGame} from '../game/schema';
import {pendingCelebrations} from '../game/celebrate';
import {createEmptyHealth} from '../health';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';

/** Session AV lane 2 (habits; LEDGER #45, #48, #49, #50, #52, #57): each habit's own options, the focus bonus and rebirth. */
const START = '2026-11-01', TODAY = '2026-11-12';
const at = (day: string) => new Date(`${day}T10:00:00`);
function walk(): {data: HabitData; id: string} {
  const id = '00000000-0000-4000-8000-000000000001';
  const data = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, at(START), id);
  return {data, id};
}
function logDays(data: HabitData, id: string, days: string[]): HabitData {
  let next = data;
  for (const d of days) next = logHabitValue(next, id, d, 1, {}, at(TODAY));
  return habitDataSchema.parse(JSON.parse(JSON.stringify(next)));
}
const overlay = (map: Record<string, {twoDay?: boolean; unloggedSkip?: boolean; whenever?: boolean}>) => setHabitDayOverlay({options: id => map[id], version: () => JSON.stringify(map).length});
afterEach(() => setHabitDayOverlay(null));
const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };

describe('options in the loose habit extras', () => {
  test('set, read, cleared; other fields and later fields kept; odd entries ignored', () => {
    const base = habitExtrasSchema.parse({version: 1, bells: {h1: true}, options: {h1: {later: 'kept'}}});
    const set = withHabitOptions(base, 'h1', {twoDay: true, difficulty: 'hard'});
    expect(optionsOf(set, 'h1')).toEqual({twoDay: true, difficulty: 'hard'});
    expect((set as {options: Record<string, unknown>}).options.h1).toEqual({later: 'kept', twoDay: true, difficulty: 'hard'});
    expect(set.bells).toEqual({h1: true});
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(set)))).toEqual(set);
    // Easy is the default, so it is not stored; whenever drops the two options that need due days.
    expect(optionsOf(withHabitOptions(set, 'h1', {difficulty: 'easy'}), 'h1')).toEqual({twoDay: true});
    expect(optionsOf(withHabitOptions(set, 'h1', {whenever: true, unloggedSkip: true}), 'h1')).toEqual({whenever: true, difficulty: 'hard'});
    const cleared = withHabitOptions(withHabitOptions(base, 'h2', {unloggedSkip: true}), 'h2', {unloggedSkip: false});
    expect(readHabitOptions(cleared)).toEqual({});
    expect(readHabitOptions({options: {h1: {twoDay: 'yes', difficulty: 'epic', whenever: 1}, h2: 'x', '': {twoDay: true}}})).toEqual({});
    expect(readHabitOptions(null)).toEqual({});
  });
  test('keep prunes habits the journal no longer has', () => {
    const two = withHabitOptions(withHabitOptions({version: 1}, 'gone', {twoDay: true}), 'h1', {twoDay: true}, new Set(['h1']));
    expect(Object.keys(readHabitOptions(two))).toEqual(['h1']);
  });
  test('focus days: today\'s pick is kept for its day, cleared with null, at most 400 days', () => {
    const a = withFocus({version: 1} as Record<string, unknown>, 'h1', '2026-11-10');
    const b = withFocus(a, 'h2', '2026-11-11');
    expect(readFocusDays(b)).toEqual({'2026-11-10': 'h1', '2026-11-11': 'h2'});
    expect(readFocusDays(withFocus(b, null, '2026-11-11'))).toEqual({'2026-11-10': 'h1'});
    const many: Record<string, string> = {};
    for (let i = 0, d = '2025-01-01'; i < 420; i++, d = addLocalDays(d, 1)) many[d] = 'h1';
    expect(Object.keys(withFocusDay(many, '2026-12-01', 'h2')!)).toHaveLength(400);
    expect(habitExtrasSchema.safeParse({version: 1, focusDays: many}).success).toBe(false);
  });
});

describe('the engine reads the options (overlay installed in the browser)', () => {
  test('two-day rule (opt-in): one missed day keeps the streak, two in a row end it; off, unchanged', () => {
    const {data, id} = walk();
    const done = days(START, '2026-11-05').concat(['2026-11-07', '2026-11-08', '2026-11-11', '2026-11-12']); // missed 6, then 9 and 10
    const h = logDays(data, id, done).habits[0]!;
    expect(habitStats(h, TODAY).currentStreak).toBe(2);
    overlay({[id]: {twoDay: true}});
    const s = habitStats(h, TODAY);
    expect(s.currentStreak).toBe(2); // 9 and 10 missed in a row end it
    expect(s.bestStreak).toBe(7); // 1–5, miss 6, 7–8 kept going
    expect(s.failCount).toBe(3);
  });
  test('unlogged as skipped: a past day left open is skipped (neutral), today stays due', () => {
    const {data, id} = walk();
    const h = logDays(data, id, ['2026-11-10']).habits[0]!;
    expect(habitDay(h, '2026-11-11', TODAY).status).toBe('failed');
    overlay({[id]: {unloggedSkip: true}});
    expect(habitDay(h, '2026-11-11', TODAY).status).toBe('skipped');
    expect(habitDay(h, TODAY, TODAY).status).toBe('due');
    expect(habitStats(h, TODAY).currentStreak).toBe(1);
    // A day the person marked failed stays failed.
    const marked = setHabitEntryStatus(logDays(data, id, []), id, '2026-11-11', 'failed', '', at(TODAY)).habits[0]!;
    expect(habitDay(marked, '2026-11-11', TODAY).status).toBe('failed');
  });
  test('whenever: never due or missed, logged any day, labelled "Whenever"', () => {
    const {data, id} = walk();
    overlay({[id]: {whenever: true}});
    const h = logDays(data, id, ['2026-11-03', '2026-11-09']).habits[0]!;
    expect(habitDay(h, '2026-11-05', TODAY)).toMatchObject({status: 'not-scheduled', scheduled: false});
    expect(habitDay(h, TODAY, TODAY)).toMatchObject({status: 'not-scheduled', scheduled: true});
    expect(habitDay(h, '2026-11-09', TODAY).status).toBe('complete');
    const s = habitStats(h, TODAY);
    expect(s.failCount).toBe(0);
    expect(s.weeklyScheduled).toBe(1); // the 9th (Monday) done; today open is no work
    expect(habitTrends(h, TODAY).find(t => t.period === 'month')).toMatchObject({success: 2, total: 2});
    expect(scheduleLabel({kind: 'daily'}, id)).toBe('Whenever');
    const today = logHabitValue(logDays(data, id, []), id, TODAY, 1, {}, at(TODAY)).habits[0]!;
    expect(habitDay(today, TODAY, TODAY).status).toBe('complete');
  });
});

describe('XP: difficulty, the focus bonus and rebirth', () => {
  const stores = (habits: HabitData, extras: unknown, rebirth: string | null = null) => ({habits, health: createEmptyHealth(), habitExtras: extras, rebirthFrom: rebirth});
  test('a hard habit earns 20 a done day; the focus day adds 5; without extras every done day earns 10', () => {
    const {data, id} = walk();
    const h = logDays(data, id, ['2026-11-10', '2026-11-11']);
    expect(xpSummary(stores(h, null), TODAY).total).toBe(20);
    const extras = withFocus(withHabitOptions({version: 1}, id, {difficulty: 'hard'}), id, '2026-11-10');
    const xp = xpSummary(stores(h, withFocus(extras, null, TODAY)), TODAY);
    expect(xp.total).toBe(2 * DIFFICULTY_XP.hard + FOCUS_BONUS_XP);
    expect(xp.events.map(e => e.id)).toContain(`habit-focus:${id}:2026-11-10`);
  });
  test('rebirth: the level counts from its day; the records and earlier XP stay', () => {
    const {data, id} = walk();
    const h = logDays(data, id, days(START, TODAY));
    const all = xpSummary(stores(h, null), TODAY);
    expect(all.total).toBe(120);
    const after = xpSummary(stores(h, null, '2026-11-11'), TODAY);
    expect(after.total).toBe(20);
    expect(after.level.level).toBe(1);
    expect(countedXp(xpEvents(stores(h, null), TODAY), '2026-11-11')).toBe(20);
    const g = startAgain(gameSchema.parse({...emptyGame(), enabled: true, levelSeen: 3, badgesSeen: {'first-step': START}}), '2026-11-11');
    expect(g).toMatchObject({levelSeen: 1, rebirth: {from: '2026-11-11', times: 1}, badgesSeen: {'first-step': START}});
    expect(rebirthFrom(startAgain(g, TODAY))).toBe(TODAY);
    expect(startAgain(g, TODAY).rebirth!.times).toBe(2);
    expect(gameSchema.parse({...g, rebirth: {from: 'soon'}}).rebirth).toBeUndefined(); // an odd value reads as none
    // Each level celebrates once more after a rebirth (its own id).
    const many = logDays(data, id, days(START, TODAY));
    const due = pendingCelebrations({...stores(many, withHabitOptions({version: 1}, id, {difficulty: 'hard'}), START)}, {...g, rebirth: {from: START, times: 1}}, {'level:2': START}, TODAY);
    expect(due.find(c => c.kind === 'level')?.id).toBe('level:2:rebirth-1');
  });
});

describe('export → erase → restore keeps the options, focus days and rebirth', () => {
  const memory = () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    return {m, storage};
  };
  test('both records come back exactly', () => {
    const extras = withFocus(withHabitOptions({version: 1}, 'h1', {twoDay: true, unloggedSkip: true, difficulty: 'medium'}), 'h1', TODAY);
    const game = startAgain(gameSchema.parse({version: 1, enabled: true}), TODAY);
    const here = memory();
    here.storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(extras));
    here.storage.setItem(GAME_KEY, JSON.stringify(game));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    forgetAaDeviceRecords(here.storage);
    expect(here.m.has(HABIT_EXTRAS_KEY)).toBe(false);
    expect(here.m.has(GAME_KEY)).toBe(false);
    for (const key of [HABIT_EXTRAS_KEY, GAME_KEY]) {
      const part = DEVICE_PARTS.find(p => p.key === key)!, section = sectionOf(part)!;
      restoreRecordSection(here.storage, section, sections[section]!);
    }
    expect(JSON.parse(here.m.get(HABIT_EXTRAS_KEY)!)).toEqual(extras);
    expect(JSON.parse(here.m.get(GAME_KEY)!)).toEqual(game);
  });
});
