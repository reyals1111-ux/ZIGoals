import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {emptyWorkouts, type Workouts} from './schema';
import {agendaPlanned, clearAway, emptyPlanned, missedThisWeek, mondayOf, moveWorkout, PLANNED_KEY, planStates, planWorkout, plannedRecordSchema, realign, removePlanned, restorePlanned, runName, setAway, undoRealign, focusAfterRemove, type PlanDraft, type PlannedRecord} from './planned';
import {agendaExtras} from '../../components/agenda/agenda-extras';
import {plannedWorkoutItems} from '../timeline/workout-source';

/** Session AV lane 2, round 4 (health; Runna, LEDGER #330): plan, move and realign workouts. */
const TODAY = '2026-11-19', NOW = '2026-11-16T08:00:00.000Z'; // a Thursday; the week began on Monday 16 Nov
const draft = (over: Partial<PlanDraft>): PlanDraft => ({kind: 'other', name: 'Fictional session', date: TODAY, time: '', ...over});
function plan(...drafts: Partial<PlanDraft>[]): PlannedRecord {
  return drafts.reduce((r, d, i) => { const out = planWorkout(r, draft(d), `plan-${i}`, NOW); if (!out.ok) throw new Error(out.issue.message); return out.value; }, emptyPlanned());
}
const finishedOn = (...dates: string[]): Workouts => ({...emptyWorkouts(), workouts: dates.map((d, i) => ({id: `w-${i}`, name: 'Done', date: d, type: 'strength', startedAt: `${d}T07:00:00.000Z`, endedAt: `${d}T08:00:00.000Z`, exercises: []}))} as unknown as Workouts);

describe('planned workouts (LEDGER #330)', () => {
  test('plans a routine, a run with its distance and effort, or your own; says which field to fix', () => {
    const r = plan({kind: 'routine', refId: 'tpl-1', name: 'Upper body', date: '2026-11-20', time: '07:30'}, {kind: 'run', name: '', distanceKm: '5', effort: 'easy', date: '2026-11-21', minutes: '35'});
    expect(r.items.map(i => [i.name, i.date, i.time, i.kind])).toEqual([['Upper body', '2026-11-20', '07:30', 'routine'], ['Easy 5 km run', '2026-11-21', undefined, 'run']]);
    expect(r.items[1]).toMatchObject({distanceKm: 5, effort: 'easy', minutes: 35});
    expect(runName(10.5, 'fast')).toBe('Fast 10.5 km run');
    const issue = (d: Partial<PlanDraft>) => { const out = planWorkout(emptyPlanned(), draft(d), 'x', NOW); return out.ok ? null : out.issue.field; };
    expect(issue({date: 'soon'})).toBe('date');
    expect(issue({time: '7'})).toBe('time');
    expect(issue({kind: 'routine', refId: undefined})).toBe('what');
    expect(issue({kind: 'run', distanceKm: '0'})).toBe('distance');
    expect(issue({name: ' '})).toBe('name');
    expect(issue({minutes: '2'})).toBe('minutes');
  });
  test('moves to another day, removes and comes back with Undo', () => {
    const r = plan({date: '2026-11-20'}), moved = moveWorkout(r, 'plan-0', '2026-11-22');
    expect(moved.items[0]!.date).toBe('2026-11-22');
    expect(() => moveWorkout(r, 'gone', '2026-11-22')).toThrow('no longer here');
    const gone = removePlanned(moved, 'plan-0');
    expect(gone.items).toEqual([]);
    expect(restorePlanned(gone, moved.items[0]!).items).toEqual(moved.items);
  });
  test('done once a workout is logged that day (one each), missed when the day passed, set aside while away', () => {
    const r = plan({date: '2026-11-16', time: '07:00'}, {date: '2026-11-16', time: '18:00'}, {date: '2026-11-17'}, {date: '2026-11-25'});
    const s = planStates(setAway(r, '2026-11-24', '2026-11-26'), finishedOn('2026-11-16'), TODAY);
    expect([...s.values()]).toEqual(['done', 'missed', 'missed', 'aside']);
    expect(mondayOf(TODAY)).toBe('2026-11-16');
    expect(missedThisWeek(r, finishedOn('2026-11-16'), TODAY).map(i => i.id)).toEqual(['plan-1', 'plan-2']);
  });
  test('"I missed some": the missed ones move on in order from today, later ones only when reached, away days skipped', () => {
    const r = plan({name: 'A', date: '2026-11-16'}, {name: 'B', date: '2026-11-17'}, {name: 'C', date: '2026-11-20'}, {name: 'D', date: '2026-11-26'});
    const out = realign(r, null, TODAY);
    expect(out.value.items.map(i => [i.name, i.date])).toEqual([['A', '2026-11-19'], ['B', '2026-11-20'], ['C', '2026-11-21'], ['D', '2026-11-26']]);
    expect(out.moved).toBe(3);
    const away = realign(setAway(r, '2026-11-20', '2026-11-22'), null, TODAY);
    // C falls inside the away days, so it stays set aside where it is; B skips them.
    expect(away.value.items.map(i => [i.name, i.date])).toEqual([['A', '2026-11-19'], ['C', '2026-11-20'], ['B', '2026-11-23'], ['D', '2026-11-26']]);
    expect(realign(plan({date: '2026-11-20'}), null, TODAY)).toMatchObject({moved: 0});
    expect(clearAway(setAway(r, TODAY, '2026-11-22')).away).toBeUndefined();
    expect(() => setAway(r, TODAY, '2026-11-01')).toThrow();
  });
  // Session AV lane 2 (review B4E-1): only what the moved chain reaches moves; two workouts on one day stay together.
  test('"I missed some" moves only what must move, and counts exactly', () => {
    const today = '2026-11-18'; // Wednesday
    const r = plan({name: 'Missed', date: '2026-11-16'}, {name: 'Fri AM', date: '2026-11-20', time: '07:00'}, {name: 'Fri PM', date: '2026-11-20', time: '18:00'}, {name: 'Dec AM', date: '2026-12-01', time: '07:00'}, {name: 'Dec PM', date: '2026-12-01', time: '18:00'});
    const out = realign(r, null, today);
    expect(out.value.items.map(i => [i.name, i.date])).toEqual([['Missed', '2026-11-18'], ['Fri AM', '2026-11-20'], ['Fri PM', '2026-11-20'], ['Dec AM', '2026-12-01'], ['Dec PM', '2026-12-01']]);
    expect(out.moved).toBe(1);
    expect(out.moves).toEqual([{id: 'plan-0', from: '2026-11-16', to: '2026-11-18'}]);
    // A workout on the day the chain fills moves on one day, and only that one.
    const reach = realign(plan({name: 'Missed', date: '2026-11-16'}, {name: 'Today', date: today}, {name: 'Tomorrow', date: '2026-11-19'}, {name: 'Sat', date: '2026-11-21'}), null, today);
    expect(reach.value.items.map(i => [i.name, i.date])).toEqual([['Missed', '2026-11-18'], ['Today', '2026-11-19'], ['Tomorrow', '2026-11-20'], ['Sat', '2026-11-21']]);
    expect(reach.moved).toBe(3);
  });
  // Session AV lane 2 (review B4E-2): Undo is the inverse of the realign's own moves, never a stale copy of the plan.
  test('Undo of "I missed some" puts back only what it moved, keeping what changed since', () => {
    const r = plan({name: 'A', date: '2026-11-16'}, {name: 'B', date: '2026-11-17'}, {name: 'C', date: '2026-11-20'});
    const out = realign(r, null, TODAY);
    const later = planWorkout(moveWorkout(out.value, 'plan-1', '2026-11-28'), draft({name: 'New one', date: '2026-11-22'}), 'plan-new', NOW);
    if (!later.ok) throw new Error('fixture');
    const back = undoRealign(removePlanned(later.value, 'plan-2'), out.moves);
    // A goes back; B was moved again since and stays where the person put it; C was removed and stays removed; the new one stays.
    expect(back.items.map(i => [i.name, i.date])).toEqual([['A', '2026-11-16'], ['New one', '2026-11-22'], ['B', '2026-11-28']]);
    expect(undoRealign(out.value, out.moves).items.map(i => i.date)).toEqual(r.items.map(i => i.date));
  });
  // Session AV lane 2 (review B4E-12): after Remove, focus goes on to the next planned workout, never to the document.
  test('focus after Remove: the next one, else the one before, else the plan form', () => {
    expect(focusAfterRemove(['a', 'b', 'c'], 'b')).toBe('c');
    expect(focusAfterRemove(['a', 'b', 'c'], 'c')).toBe('b');
    expect(focusAfterRemove(['a'], 'a')).toBeNull();
    expect(focusAfterRemove(['a', 'b'], 'gone')).toBe('a');
  });
  test('the Agenda and the Day Timeline draw the ones still to do or missed', () => {
    const r = plan({name: 'Missed one', date: '2026-11-17'}, {name: 'Upper body', date: '2026-11-20', time: '07:30', minutes: '45'}, {name: 'Done one', date: '2026-11-18'});
    expect(agendaPlanned(r, finishedOn('2026-11-18'), TODAY).map(p => p.title)).toEqual(['Missed one', 'Upper body']);
    const extras = agendaExtras({platform: null, showcase: false, day: TODAY, planned: r, workouts: finishedOn('2026-11-18')});
    expect(extras.plannedWorkouts.find(p => p.title === 'Upper body')).toMatchObject({date: '2026-11-20', time: '07:30', minutes: 45});
    expect(agendaExtras({platform: null, showcase: false, day: TODAY}).plannedWorkouts).toEqual([]);
    expect(plannedWorkoutItems(false, '2026-11-20', TODAY, {planned: r, workouts: null})).toMatchObject([{title: 'Upper body', time: '07:30', label: 'Planned workout', pillar: 'health'}]);
  });
  test('an unreadable item is dropped and the others kept', () => {
    const r = plan({date: '2026-11-20'});
    expect(plannedRecordSchema.parse({...r, items: [...r.items, {id: 'bad id', date: 'x'}], later: {kept: true}})).toMatchObject({items: r.items, later: {kept: true}});
    expect(plannedRecordSchema.parse({version: 1, items: r.items, away: {from: '2026-11-22', to: '2026-11-20'}}).away).toBeUndefined();
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(PLANNED_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the plan', () => {
    const value = setAway(plan({date: '2026-11-20', time: '07:30'}), '2026-11-24', '2026-11-26');
    const collected = collectEverything({[PLANNED_KEY]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === PLANNED_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
});
