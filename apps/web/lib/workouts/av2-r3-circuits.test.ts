import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {workoutsSchema} from './schema';
import {CIRCUITS_KEY, circuitLine, circuitsSchema, circuitWorkout, emptyCircuits, phaseWords, playerControls, positionAt, removeCircuit, restoreCircuit, saveCircuit, timeline, totalSeconds, type CircuitDraft} from './circuits';

/**
 * Session AV lane 2 (health r3; LEDGER #289, Nike Training Club): timed circuits (work, rest, rounds, rest between rounds)
 * from the library's own moves, played on a timeline and logged as a workout with its minutes, never calories; TIER 3
 * (stored format): the new device record `zigoals:workout-circuits:v1`.
 */
const NOW = '2026-11-23T08:00:00.000Z';
const DRAFT: CircuitDraft = {name: 'Fictional legs', moves: ['squat', 'push-up', 'plank'], work: '40', rest: '20', rounds: '2', roundRest: '60'};
const saved = () => { const r = saveCircuit(emptyCircuits(), DRAFT, NOW); if (!r.ok) throw new Error(r.issue.message); return r; };

describe('the record (TIER 3 (stored format))', () => {
  test('reads as written; an unreadable circuit is dropped, the others kept', () => {
    const {value, circuit} = saved();
    expect(circuitsSchema.parse(value)).toEqual(value);
    const r = circuitsSchema.parse({version: 1, circuits: [{...circuit, id: 'circuit-bad', rounds: 99}, circuit, {name: 'x'}]});
    expect(r.circuits).toEqual([circuit]);
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(CIRCUITS_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the circuits', () => {
    const {value} = saved();
    const collected = collectEverything({[CIRCUITS_KEY]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === CIRCUITS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
});

describe('timed circuits (LEDGER #289)', () => {
  test('saves, edits in place, says which field to fix, removes with Undo', () => {
    const {value, circuit} = saved();
    expect(circuit).toMatchObject({name: 'Fictional legs', moves: [{exerciseId: 'squat'}, {exerciseId: 'push-up'}, {exerciseId: 'plank'}], workSeconds: 40, restSeconds: 20, rounds: 2, roundRestSeconds: 60});
    const edited = saveCircuit(value, {...DRAFT, rounds: '3'}, NOW, circuit.id);
    expect(edited.ok && edited.value.circuits).toHaveLength(1);
    expect(edited.ok && edited.circuit.rounds).toBe(3);
    const issue = (over: Partial<CircuitDraft>) => { const r = saveCircuit(emptyCircuits(), {...DRAFT, ...over}, NOW); return r.ok ? null : r.issue.field; };
    expect(issue({name: ' '})).toBe('name');
    expect(issue({moves: []})).toBe('moves');
    expect(issue({moves: ['running']})).toBe('moves');
    expect(issue({work: '3'})).toBe('work');
    expect(issue({rest: '301'})).toBe('rest');
    expect(issue({rounds: '0'})).toBe('rounds');
    const gone = removeCircuit(value, circuit.id);
    expect(restoreCircuit(gone, circuit, 0).circuits).toEqual([circuit]);
  });
  test('the timeline: work, rest after each move, a longer rest between rounds, nothing after the last move', () => {
    const {circuit} = saved(), t = timeline(circuit);
    expect(t.map(p => `${p.kind}:${p.exerciseId}:${p.seconds}`)).toEqual([
      'work:squat:40', 'rest:push-up:20', 'work:push-up:40', 'rest:plank:20', 'work:plank:40', 'round-rest:squat:60',
      'work:squat:40', 'rest:push-up:20', 'work:push-up:40', 'rest:plank:20', 'work:plank:40']);
    expect(totalSeconds(circuit)).toBe(40 * 6 + 20 * 4 + 60);
    expect(circuitLine(circuit)).toBe('3 moves × 2 rounds · 40 s on, 20 s off · 60 s between rounds · about 6 min');
  });
  test('where the player is, the next move named, and what a change says', () => {
    const {circuit} = saved(), t = timeline(circuit);
    expect(positionAt(t, 0)).toMatchObject({index: 0, left: 40, next: {exerciseId: 'push-up'}});
    expect(positionAt(t, 45)).toMatchObject({index: 1, left: 15, phase: {kind: 'rest'}});
    expect(positionAt(t, totalSeconds(circuit))).toBeNull();
    expect(phaseWords(t[0]!, 2, positionAt(t, 0)!.next)).toBe('Squat, 40 seconds, round 1 of 2. Next: Push-up.');
    expect(phaseWords(t[5]!, 2, null)).toBe('Rest between rounds, 60 seconds. Next: Squat.');
  });
  test('logged as a finished workout of timed sets, one per round reached, with its minutes; no calories', () => {
    const {circuit} = saved(), w = workoutsSchema.parse({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90});
    const all = circuitWorkout(w, circuit, {date: '2026-11-23', startedAt: new Date(NOW), playedSeconds: totalSeconds(circuit)});
    expect(all.workout.exercises.map(e => [e.exerciseId, e.measure, e.sets.map(s => s.seconds)])).toEqual([['squat', 'time', [40, 40]], ['push-up', 'time', [40, 40]], ['plank', 'time', [40, 40]]]);
    expect(all.workout.exercises.every(e => e.sets.every(s => s.done))).toBe(true);
    expect(Date.parse(all.workout.endedAt!) - Date.parse(all.workout.startedAt)).toBe(totalSeconds(circuit) * 1000);
    expect(JSON.stringify(all.workout)).not.toMatch(/kcal|calorie/i);
    const part = circuitWorkout(w, circuit, {date: '2026-11-23', startedAt: new Date(NOW), playedSeconds: 70});
    expect(part.workout.exercises.map(e => [e.exerciseId, e.sets.map(s => s.seconds)])).toEqual([['squat', [40]], ['push-up', [10]]]);
    expect(() => circuitWorkout(w, circuit, {date: '2026-11-23', startedAt: new Date(NOW), playedSeconds: 0})).toThrow('at least one move');
  });
  // Session AV lane 2 (review B3B-12): after "Stop and log what I did" there is no Resume or Skip.
  test('the player offers no Resume or Skip once the run is logged or done', () => {
    expect(playerControls({done: false, logged: false, elapsed: 30})).toEqual({pause: true, skip: true, log: true, close: 'Stop without logging'});
    expect(playerControls({done: false, logged: true, elapsed: 30})).toEqual({pause: false, skip: false, log: false, close: 'Close'});
    expect(playerControls({done: true, logged: false, elapsed: 400})).toEqual({pause: false, skip: false, log: true, close: 'Close'});
    expect(playerControls({done: false, logged: false, elapsed: 0}).log).toBe(false);
  });
});
