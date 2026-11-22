import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {routines, startRunAtOpen} from './engine';
import {isRoutineHead, reminderHref} from './reminder-href';
import {dueReminders} from '../reminders/due';
import {buildPlan, type PlanInput} from '../notify/plan';
import {emptyNotifyPrefs} from '../notify/prefs';

/** Session AV lane 2 (habits; LEDGER #181, #182): a routine's reminder opens its player at the first step still open. */
const AT = new Date('2026-09-01T06:00:00.000Z'), DAY = '2026-09-01';
const A = '00000001-0000-4000-8000-000000000000', B = '00000002-0000-4000-8000-000000000000', C = '00000003-0000-4000-8000-000000000000', L = '00000004-0000-4000-8000-000000000000';
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function stack(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, input('Water'), AT, A);
  d = createHabit(d, input('Stretch', {stackAfterId: A}), AT, B);
  d = createHabit(d, input('Plan', {stackAfterId: B}), AT, C);
  d = createHabit(d, input('Lonely'), AT, L);
  return d;
}
describe('the routine reminder and the first open step', () => {
  test('a run starts at the first step still open; all done, it starts at the first (Play again)', () => {
    let d = stack();
    const r = () => routines(d)[0]!;
    expect(startRunAtOpen(r(), DAY, AT)).toMatchObject({step: 0, done: []});
    d = logHabitValue(d, A, DAY, 1, {}, AT);
    expect(startRunAtOpen(r(), DAY, AT)).toMatchObject({step: 1, done: [A]});
    d = logHabitValue(d, B, DAY, 1, {}, AT);
    expect(startRunAtOpen(r(), DAY, AT)).toMatchObject({step: 2, done: [A, B]});
    d = logHabitValue(d, C, DAY, 1, {}, AT);
    expect(startRunAtOpen(r(), DAY, AT)).toMatchObject({step: 0, done: []});
  });
  test('only a routine’s first habit leads to the player; every other habit to its card', () => {
    const d = stack();
    expect([A, B, C, L].map(id => isRoutineHead(d, id))).toEqual([true, false, false, false]);
    expect(reminderHref(d, A)).toBe(`/app/habits#routine=${A}&open`);
    expect(reminderHref(d, B)).toBe(`/app/habits#habit-${B}`);
    expect(routines(d).map(r => r.headId)).toEqual([A]); // the same head as stacksOf
  });
  test('Today’s reminder card and the notification open the player for a routine’s first habit', () => {
    const d = {...stack(), timeZone: 'UTC'} as HabitData;
    const due = dueReminders({reminders: {version: 1, habits: {[A]: {time: '06:00'}, [L]: {time: '06:00'}}, dismissed: {}} as never, habits: d, now: new Date('2026-09-01T07:00:00.000Z')});
    expect(Object.fromEntries(due.map(x => [x.id, x.href]))).toEqual({[A]: `/app/habits#routine=${A}&open`, [L]: `/app/habits#habit-${L}`});
    const base: PlanInput = {now: Date.UTC(2026, 8, 1, 5, 0), zone: 'UTC', prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '05:00'}, labels: false, habits: [{id: A, time: '07:00', weekdays: 127, doneToday: false, routine: true}, {id: L, time: '07:00', weekdays: 127, doneToday: false}], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: []};
    const items = buildPlan(base).snapshot.items.filter(i => i.kind === 'habit' && i.at === Date.UTC(2026, 8, 1, 7, 0));
    expect(items.map(i => [i.id, i.href])).toEqual([[A, `/app/habits#routine=${encodeURIComponent(A)}&open`], [L, '/app/habits']]);
  });
});
