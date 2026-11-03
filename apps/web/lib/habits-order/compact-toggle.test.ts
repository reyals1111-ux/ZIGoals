import {describe, expect, test} from 'vitest';
import {compactToggle, compactToggleWords} from './compact-toggle';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData} from '../habits';
import {habitExtrasSchema, emptyHabitExtras} from '../habits-extras/schema';
import {setHabitArea, setTimerBell} from '../habits-extras/store';
import {habitListModeOf, habitOrderOf, withHabitListMode, withHabitOrder} from './extras';

// Session AK (5.7 wiring): one tap in the compact list, and the order and list mode named in the habit extras schema.
const NOW = new Date('2026-10-05T10:00:00.000Z'), THEN = new Date('2026-09-01T10:00:00.000Z');
const READ = '11111111-1111-4111-8111-111111111111', QUIT = '22222222-2222-4222-8222-222222222222', RUN = '33333333-3333-4333-8333-333333333333';
function journal(): HabitData {
  let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
  d = createHabit(d, {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, THEN, READ);
  d = createHabit(d, {title: 'No soda', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 0, type: 'quit'}, THEN, QUIT);
  d = createHabit(d, {title: 'Run', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'duration', unit: 'minutes'}, target: 30}, THEN, RUN);
  return d;
}
describe('compact toggle', () => {
  test('done writes the target and keeps what was there for Undo; not done writes zero', () => {
    let d = logHabitValue(journal(), RUN, '2026-10-04', 10, {note: 'easy'}, NOW);
    const run = d.habits.find(h => h.id === RUN)!;
    expect(compactToggle(run, '2026-10-04', '2026-10-05', true)).toEqual({value: 30, before: 10, note: 'easy', title: 'Run', done: true});
    d = logHabitValue(d, RUN, '2026-10-04', 30, {}, NOW);
    expect(compactToggle(d.habits.find(h => h.id === RUN)!, '2026-10-04', '2026-10-05', false)).toMatchObject({value: 0, before: 30});
    expect(compactToggle(d.habits.find(h => h.id === RUN)!, '2026-10-04', '2026-10-05', true)).toBeNull();
  });
  test('quit habits, skipped and future days, and days before the start do not change here', () => {
    const d = setHabitEntryStatus(journal(), READ, '2026-10-03', 'skipped', '', NOW);
    expect(compactToggle(d.habits.find(h => h.id === QUIT)!, '2026-10-04', '2026-10-05', true)).toBeNull();
    expect(compactToggle(d.habits.find(h => h.id === READ)!, '2026-10-03', '2026-10-05', true)).toBeNull();
    expect(compactToggle(d.habits.find(h => h.id === READ)!, '2026-10-06', '2026-10-05', true)).toBeNull();
    expect(compactToggle(d.habits.find(h => h.id === READ)!, '2026-08-01', '2026-10-05', true)).toBeNull();
    expect(compactToggle(d.habits.find(h => h.id === READ)!, '2026-10-01', '2026-10-05', true)).toMatchObject({value: 1, before: 0});
  });
  test('words', () => {
    expect(compactToggleWords({title: 'Read', done: true}, 'today')).toEqual({message: 'Read: done for today.', undone: 'Read: today is back as it was.'});
    expect(compactToggleWords({title: 'Read', done: false}, 'Sunday 4 October').message).toBe('Read: Sunday 4 October is no longer complete.');
  });
});
describe('order and list mode in the habit extras schema', () => {
  test('named, validated, kept by the store\'s writes and pruned with the journal\'s ids', () => {
    let r = withHabitOrder(emptyHabitExtras(), [RUN, READ, 'gone']);
    r = withHabitListMode(r, 'compact');
    const round = habitExtrasSchema.parse(JSON.parse(JSON.stringify(r)));
    expect(habitOrderOf(round)).toEqual({[RUN]: 0, [READ]: 1, gone: 2});
    expect(habitListModeOf(round)).toBe('compact');
    // A store mutator with the journal's ids prunes the order too.
    const pruned = setTimerBell(round, RUN, true, new Set([RUN, READ]));
    expect(habitOrderOf(pruned)).toEqual({[RUN]: 0, [READ]: 1});
    expect(habitOrderOf(setHabitArea(pruned, READ, 'health'))).toEqual({[RUN]: 0, [READ]: 1});
    expect(habitExtrasSchema.safeParse({version: 1, order: {a: 10_001}}).success).toBe(false);
    expect(habitExtrasSchema.safeParse({version: 1, order: Object.fromEntries(Array.from({length: 401}, (_, i) => [`h${i}`, i]))}).success).toBe(false);
    // A list mode a later build adds reads as the default.
    expect(habitListModeOf(habitExtrasSchema.parse({version: 1, listMode: 'grid'}))).toBe('cards');
  });
});
