import {describe, expect, test} from 'vitest';
import {addShoe, freshBests, markSeen, removeShoe, retireShoe, seedSeen, setRunShoe, shoeStates, usualShoe, withUsualShoe} from './shoes';
import {RUN_TIPS, tipOf} from './run-tips';
import {workoutsSchema, type Workouts} from './schema';
import {showcaseWorkouts} from './showcase';

/** Session AV lane 2 (body; LEDGER #203, #204, #208; Nike Run Club): shoes, a beaten best marked once, written tips. */
const now = new Date('2026-11-20T08:00:00.000Z');
const run = (id: string, date: string, km: number) => ({id, name: `Fictional run ${id}`, date, type: 'cardio', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T08:40:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds: 2400, done: true}]}]});
const base = (): Workouts => workoutsSchema.parse({version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [run('a', '2026-11-01', 8), run('b', '2026-11-10', 10)]});
describe('shoes', () => {
  test('a pair\'s distance: what it had plus the runs it was picked on; near the limit at 90 %, then past it', () => {
    const added = addShoe(base(), {name: '  Fictional   trainers ', startKm: 610, retireKm: 700}, now), shoe = added.shoe;
    let w = added.workouts;
    expect(shoe.name).toBe('Fictional trainers');
    w = setRunShoe(setRunShoe(w, 'a', shoe.id), 'b', shoe.id);
    expect(shoeStates(w)[0]).toMatchObject({km: 628, runs: 2, near: false, lastRun: '2026-11-10'});
    w = workoutsSchema.parse({...w, workouts: [...w.workouts, {...run('c', '2026-11-15', 15), shoeId: shoe.id}]});
    expect(shoeStates(w)[0]).toMatchObject({km: 643, near: true, over: false});
    w = workoutsSchema.parse({...w, workouts: [...w.workouts, {...run('d', '2026-11-18', 60), shoeId: shoe.id}]});
    expect(shoeStates(w)[0]).toMatchObject({over: true});
  });
  test('the usual pair goes on a new run; retired pairs never; removing a pair frees its runs', () => {
    const added = addShoe(base(), {name: 'Fictional blue', startKm: 0, retireKm: 700}, now), shoe = added.shoe;
    let w = added.workouts;
    w = setRunShoe(w, 'b', shoe.id);
    expect(usualShoe(w)?.id).toBe(shoe.id);
    w = workoutsSchema.parse({...w, workouts: [...w.workouts, run('c', '2026-11-19', 5)]});
    expect(withUsualShoe(w, 'c').workouts.find(x => x.id === 'c')!.shoeId).toBe(shoe.id);
    const retired = retireShoe(w, shoe.id, now);
    expect(usualShoe(retired)).toBeNull();
    expect(withUsualShoe(retired, 'c').workouts.find(x => x.id === 'c')!.shoeId).toBeUndefined();
    expect(retireShoe(retired, shoe.id, now, false).shoes![0]!.retiredAt).toBeUndefined();
    const gone = removeShoe(w, shoe.id);
    expect(gone.shoes).toEqual([]);
    expect(gone.workouts.every(x => !x.shoeId)).toBe(true);
    expect(() => setRunShoe(gone, 'a', shoe.id)).toThrow('no longer here');
    expect(() => addShoe(base(), {name: ' ', startKm: 0, retireKm: 700}, now)).toThrow('Name the shoes');
  });
});
describe('a beaten run best, marked once', () => {
  test('nothing is marked before the first run is added; then only a best the new run beats; Noted clears it', () => {
    const before = base();
    expect(freshBests(before, null)).toEqual([]);
    const after = workoutsSchema.parse({...before, workouts: [...before.workouts, run('c', '2026-11-19', 12)]});
    const seeded = seedSeen(before, after, null);
    expect(seeded.seenBests).toEqual(['b:0']);
    expect(freshBests(seeded, null).map(b => [b.key, b.km])).toEqual([['c:0', 12]]);
    const noted = markSeen(seeded, null);
    expect(freshBests(noted, null)).toEqual([]);
    expect(seedSeen(noted, noted, null)).toBe(noted);
  });
});
describe('running tips', () => {
  test('twenty tips in English and Dutch; one a day, the same all day; Another tip moves on', () => {
    expect(RUN_TIPS.length).toBe(20);
    for (const t of RUN_TIPS) { expect(t.en.length).toBeGreaterThan(20); expect(t.nl.length).toBeGreaterThan(20); expect(t.nl).not.toBe(t.en); }
    expect(new Set(RUN_TIPS.map(t => t.id)).size).toBe(20);
    expect(tipOf('2026-11-20')).toBe(tipOf('2026-11-20'));
    expect(tipOf('2026-11-20', 1)).toBe(tipOf('2026-11-21'));
  });
  test('the Showcase\'s labelled pair is near its limit', () => {
    expect(shoeStates(showcaseWorkouts('2026-11-17'))[0]).toMatchObject({km: 631, runs: 2, near: true});
  });
});
