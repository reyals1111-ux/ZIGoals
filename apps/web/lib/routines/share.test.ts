import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../habits';
import {routineOf, routines} from './engine';
import {MAX_SHARE_BYTES, createImportedRoutine, exportRoutineStructure, importRoutineStructure, importedSteps, routineShareFileName, routineShareText} from './share';

// Session AK (5.4): a routine's structure out and in: no personal data by default, a strict import.
const AT = new Date('2026-09-01T06:00:00.000Z'), TODAY = '2026-09-10';
const counter = () => { let n = 0; return () => `${String(++n).padStart(8, '0')}-0000-4000-8000-000000000000`; };
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: 'My private reason', notes: 'secret note', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function stack(): HabitData {
  const ids = counter();
  let d = emptyHabitData();
  const a = ids(), b = ids(), c = ids();
  d = createHabit(d, input('Pills for my condition'), AT, a);
  d = createHabit(d, input('Stretch', {measurement: {kind: 'duration', unit: 'minutes'}, target: 5, stackAfterId: a}), AT, b);
  d = createHabit(d, input('Walk the dog', {measurement: {kind: 'duration', unit: 'hours'}, target: 0.5, stackAfterId: b, timeOfDay: 'anytime'}), AT, c);
  return d;
}

describe('export', () => {
  test('default: generic, structure only; no ids, notes, descriptions, categories or names', () => {
    const d = stack(), r = routineOf(d, routines(d)[0]!.headId)!;
    const share = exportRoutineStructure(r, TODAY);
    expect(share).toEqual({kind: 'zigoals-routine', version: 1, steps: [{timeOfDay: 'morning'}, {minutes: 5, timeOfDay: 'morning'}, {minutes: 30}]});
    const text = routineShareText(share);
    for (const word of ['Pills', 'Stretch', 'dog', 'secret', 'private', 'Wellbeing', '0000-4000']) expect(text).not.toContain(word);
    expect(routineShareFileName(share)).toBe('routine.zigoals-routine.json');
  });
  test('with the explicit choice: names included', () => {
    const d = stack(), r = routineOf(d, routines(d)[0]!.headId)!;
    const share = exportRoutineStructure(r, TODAY, {includeNames: true});
    expect(share.title).toBe('Pills for my condition → Walk the dog');
    expect(share.steps.map(s => s.title)).toEqual(['Pills for my condition', 'Stretch', 'Walk the dog']);
    expect(routineShareFileName(share)).toBe('pills-for-my-condition-walk-the-dog.zigoals-routine.json');
  });
});

describe('import', () => {
  test('round trip, then created as new stacked habits with generic names', () => {
    const d = stack(), share = exportRoutineStructure(routineOf(d, routines(d)[0]!.headId)!, TODAY);
    const read = importRoutineStructure(routineShareText(share));
    expect(read).toEqual({ok: true, routine: share});
    expect(importedSteps(share).map(s => [s.title, s.minutes, s.timeOfDay])).toEqual([['Step 1', undefined, 'morning'], ['Step 2', 5, 'morning'], ['Step 3', 30, 'anytime']]);
    const ids = counter();
    const made = createImportedRoutine(emptyHabitData(), share, AT, () => ids().replace(/^0/, 'a'));
    expect(made.created).toHaveLength(3);
    const r = routineOf(made.data, made.headId)!;
    expect(r.habits.map(h => h.title)).toEqual(['Step 1', 'Step 2', 'Step 3']);
    expect(r.habits[1]!.rules[0]!.measurement).toEqual({kind: 'duration', unit: 'minutes'});
  });
  test('strict: not JSON, another kind, a newer version, unknown fields, too many steps, too large, hidden characters', () => {
    expect(importRoutineStructure('nope')).toEqual({ok: false, error: 'This is not a routine file.'});
    expect(importRoutineStructure('{"kind":"other"}')).toEqual({ok: false, error: 'This is not a routine file.'});
    expect(importRoutineStructure('{"kind":"zigoals-routine","version":2,"steps":[{}]}').ok).toBe(false);
    expect(importRoutineStructure('{"kind":"zigoals-routine","version":2,"steps":[{}]}')).toMatchObject({error: /newer ZIGoals/});
    expect(importRoutineStructure('{"kind":"zigoals-routine","version":1,"steps":[{"title":"A","notes":"x"}]}').ok).toBe(false);
    expect(importRoutineStructure('{"kind":"zigoals-routine","version":1,"steps":[]}').ok).toBe(false);
    expect(importRoutineStructure(JSON.stringify({kind: 'zigoals-routine', version: 1, steps: Array.from({length: 21}, () => ({}))})).ok).toBe(false);
    expect(importRoutineStructure(JSON.stringify({kind: 'zigoals-routine', version: 1, steps: [{minutes: 241}]})).ok).toBe(false);
    expect(importRoutineStructure(JSON.stringify({kind: 'zigoals-routine', version: 1, steps: [{title: 'Safe‮evil'}]}))).toMatchObject({ok: false, error: /plain text/});
    expect(importRoutineStructure(' '.repeat(MAX_SHARE_BYTES + 1))).toMatchObject({ok: false, error: /too large/});
  });
});
