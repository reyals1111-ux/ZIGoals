import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDay, type HabitData, type HabitInput} from '../habits';
import {advanceRun, finishSummary, liveRun, routineOf, routines, routineSteps, runFinished, startRun, stepElapsedMinutes} from './engine';
import {createRoutineFromTemplate, ROUTINE_TEMPLATES, templateInput} from './templates';
import {ROUTINE_RUN, emptyRoutineRun} from './run-schema';
import {readDeviceRecord} from '../device-record';

const AT = new Date('2026-09-01T06:00:00.000Z');
const ids = (() => { let n = 0; return () => `${String(++n).padStart(8, '0')}-0000-4000-8000-000000000000`; })();
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function stack(): HabitData {
  let d = emptyHabitData();
  const a = ids(), b = ids(), c = ids();
  d = createHabit(d, input('Water'), AT, a);
  d = createHabit(d, input('Stretch', {measurement: {kind: 'duration', unit: 'minutes'}, target: 5, stackAfterId: a}), AT, b);
  d = createHabit(d, input('Plan', {stackAfterId: b}), AT, c);
  d = createHabit(d, input('Lonely'), AT, ids());
  return d;
}
describe('routines (H5)', () => {
  test('a stack of two or more is a routine; steps know their order, duration and status; a run advances and finishes', () => {
    const d = stack(), list = routines(d);
    expect(list).toHaveLength(1); expect(list[0]!.title).toBe('Water → Plan') /* Session AH (HA4, N-134): named by its first and last steps */; expect(list[0]!.habits.map(h => h.title)).toEqual(['Water', 'Stretch', 'Plan']);
    const r = routineOf(d, list[0]!.headId)!;
    let run = startRun(r.headId, '2026-09-10', new Date('2026-09-10T07:00:00Z'));
    let steps = routineSteps(r, run, '2026-09-10');
    expect(steps.map(s => s.status)).toEqual(['current', 'pending', 'pending']); expect(steps[1]!.duration).toBe(true); expect(steps[1]!.minutes).toBe(5);
    run = advanceRun(run, r.habits[0]!.id, 'done', new Date('2026-09-10T07:01:00Z'));
    run = advanceRun(run, r.habits[1]!.id, 'skipped', new Date('2026-09-10T07:02:00Z'));
    steps = routineSteps(r, run, '2026-09-10'); expect(steps.map(s => s.status)).toEqual(['done', 'skipped', 'current']);
    expect(stepElapsedMinutes(run, new Date('2026-09-10T07:05:30Z'))).toBeCloseTo(3.5);
    expect(runFinished(r, run)).toBe(false);
    run = advanceRun(run, r.habits[2]!.id, 'done', new Date('2026-09-10T07:08:00Z'));
    expect(runFinished(r, run)).toBe(true);
    const f = finishSummary(r, run, '2026-09-10');
    expect(f).toMatchObject({done: 2, total: 3, skipped: 1, minutes: 8}); expect(f.stillDue).toEqual(['Water', 'Stretch', 'Plan']); // the player logs through the journal, not the run
  });
  test('a run from another day or of a vanished stack is stale; the store reads loosely', () => {
    const d = stack(), head = routines(d)[0]!.headId;
    const run = startRun(head, '2026-09-09', AT);
    expect(liveRun({version: 1, run}, d, '2026-09-10')).toBeNull();
    expect(liveRun({version: 1, run: {...run, day: '2026-09-10'}}, d, '2026-09-10')).not.toBeNull();
    expect(liveRun({version: 1, run: {...run, day: '2026-09-10', headId: 'gone'}}, d, '2026-09-10')).toBeNull();
    const m = new Map<string, string>(); const s = {getItem: (k: string) => m.get(k) ?? null} as Pick<Storage, 'getItem'>;
    expect(readDeviceRecord(s, ROUTINE_RUN)).toEqual({data: emptyRoutineRun(), unreadable: false});
    m.set(ROUTINE_RUN.key, JSON.stringify({version: 1, run: {...run, extra: true}})); expect(readDeviceRecord(s, ROUTINE_RUN).unreadable).toBe(false);
  });
  test('templates create a chain through createHabit, reuse an active habit with the same title, and never create twice', () => {
    const morning = ROUTINE_TEMPLATES.find(t => t.id === 'morning')!;
    expect(templateInput(morning.steps[1]!).measurement).toEqual({kind: 'duration', unit: 'minutes'}); expect(templateInput(morning.steps[0]!).measurement).toEqual({kind: 'boolean'});
    let d = emptyHabitData(); d = createHabit(d, input('Meditate', {measurement: {kind: 'duration', unit: 'minutes'}, target: 10}), AT, ids());
    const made = createRoutineFromTemplate(d, morning, AT, ids);
    expect(made.created).toHaveLength(3); expect(made.reused).toHaveLength(1);
    const r = routineOf(made.data, made.headId)!;
    expect(r.habits.map(h => h.title)).toEqual(['Glass of water', 'Stretch', 'Meditate', 'Plan the day']);
    expect(habitDay(r.habits[0]!, '2026-09-10', '2026-09-10').scheduled).toBe(true);
    const again = createRoutineFromTemplate(made.data, morning, AT, ids);
    expect(again.created).toHaveLength(0); expect(again.data.habits).toHaveLength(made.data.habits.length);
    for (const t of ROUTINE_TEMPLATES) expect(t.steps.length).toBeGreaterThanOrEqual(3);
  });
});

test('Session AH (HA4): a step reuses a habit you already have under another usual name, and the routine keeps its template name', async () => {
  const {createHabit: make, emptyHabitData: empty} = await import('../habits');
  const {createRoutineFromTemplate: create, previewRoutineTemplate, ROUTINE_TEMPLATES: all} = await import('./templates');
  const {routineOf: of} = await import('./engine');
  const at = new Date('2026-09-10T08:00:00Z'); let n = 0; const next = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  const d = make(empty(), {title: 'Drink water', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, at, next());
  const morning = all.find(t => t.id === 'morning')!;
  expect(previewRoutineTemplate(d, morning)).toEqual({create: ['Stretch', 'Meditate', 'Plan the day'], reuse: ['Drink water']});
  const made = create(d, morning, at, next);
  expect(made.data.habits.filter(h => /water/i.test(h.title)).map(h => h.title)).toEqual(['Drink water']);
  expect(of(made.data, made.headId)!.title).toBe('Morning routine');
});
