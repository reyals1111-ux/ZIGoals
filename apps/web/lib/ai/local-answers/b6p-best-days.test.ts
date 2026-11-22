import {describe, expect, test} from 'vitest';
import {showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R6BodyAnswer} from './av2-r6-body';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {workoutsSchema, emptyWorkouts} from '../../workouts/schema';

/** Review B6P-7 (Session AV lane 2, r6-body; LEDGER #422): "when did I set my personal bests" names at most four exercises. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const pair = (id: string, date: string, a: string, b: string) => ({id, name: `Fictional ${id}`, date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`,
  exercises: [a, b].map((x, i) => ({id: `${id}-e${i}`, exerciseId: x, name: x, measure: 'weight-reps', sets: [{id: `${id}-s${i}`, kind: 'normal', reps: 5, weightKg: 50 + i, done: true}]}))});
describe('B6P-7: the bests answer stops at four', () => {
  test('six exercises over three workouts: four named', () => {
    const w = workoutsSchema.parse({...emptyWorkouts(), workouts: [pair('a', '2026-11-02', 'squat', 'bench-press'), pair('b', '2026-11-09', 'deadlift', 'overhead-press'), pair('c', '2026-11-16', 'barbell-row', 'romanian-deadlift')]});
    const base = showcaseAll(), s: ToolSources = {...base, ak: {...base.ak, workouts: w} as typeof base.ak};
    const said = text(av2R6BodyAnswer('when did I set my personal bests', zigiEnv(s, true)));
    expect(said).toMatch(/^Your heaviest sets and their days: /);
    expect(said.match(/ kg \(/g)).toHaveLength(4);
  });
});
