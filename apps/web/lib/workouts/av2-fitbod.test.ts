import {describe, expect, test} from 'vitest';
import {addPlace, choosePlace, currentPlace, editPlace, removePlace} from './places';
import {emptyPlaces, type Place} from './places-schema';
import {availableWith, EQUIPMENT, NEEDS, needsWords, PLACE_PRESETS} from './equipment';
import {EXERCISES} from './library';
import {HOW_TOS} from './howto';
import {alternatives} from './replace';
import {replaceInWorkout} from './replace-entry';
import {addExercise, startWorkout, updateSet} from './engine';
import {dropSuggested, suggestionAsWorkout, suggestWorkout, swapSuggested} from './suggest';
import {showcaseWorkouts} from './showcase';
import {workoutsSchema, type Workouts} from './schema';

/** Session AV lane 2 (bodymind-r2; LEDGER #239, #240, #241, Fitbod): places and equipment, a suggested workout, Replace. */
const DAY = '2026-11-17', NOW = new Date(`${DAY}T19:00:00.000Z`), AT = new Date('2026-11-20T08:00:00.000Z');
const place = (equipment: string[], name = 'Home'): Place => ({id: 'place-home-1', name, equipment, createdAt: AT.toISOString()});
const EMPTY: Workouts = workoutsSchema.parse({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90});

describe('equipment tags and places (LEDGER #239)', () => {
  test('every built-in exercise has a tag, made of known equipment; words in English and Dutch', () => {
    for (const e of EXERCISES) { expect(NEEDS[e.id], e.id).toBeDefined(); for (const way of NEEDS[e.id]!) for (const x of way) expect(EQUIPMENT).toContain(x); }
    expect(needsWords('bench-press')).toBe('Barbell and plates + Bench');
    expect(needsWords('lateral-raise', 'nl')).toBe('Dumbbells, of Kabelstation, of Weerstandsbanden');
    expect(needsWords('push-up')).toBe('No equipment');
    expect(needsWords('own-exercise')).toBeNull();
  });
  test('an exercise is offered when any one way fits; own exercises and any place always', () => {
    expect(availableWith('bench-press', ['barbell'])).toBe(false);
    expect(availableWith('bench-press', ['barbell', 'bench'])).toBe(true);
    expect(availableWith('lateral-raise', ['bands'])).toBe(true);
    expect(availableWith('push-up', [])).toBe(true);
    expect(availableWith('own-thing', [])).toBe(true);
    expect(availableWith('leg-press', null)).toBe(true);
    const travel = PLACE_PRESETS.find(p => p.id === 'travel')!.equipment;
    expect(EXERCISES.filter(e => availableWith(e.id, travel)).map(e => e.id)).toEqual(expect.arrayContaining(['push-up', 'plank', 'lunge', 'running']));
  });
  test('up to five places, names unique however typed; the first is the place for now; remove, rename, re-equip, choose', () => {
    let r = addPlace(emptyPlaces(), 'Home', ['dumbbells', 'bench'], AT, 'place-home-1').record;
    expect(currentPlace(r)?.name).toBe('Home');
    r = addPlace(r, 'Gym', PLACE_PRESETS[0]!.equipment, AT, 'place-gym-1').record;
    expect(currentPlace(r)?.name).toBe('Home');
    expect(() => addPlace(r, ' home ', [], AT)).toThrow('You already have a place called home.');
    r = editPlace(r, 'place-home-1', {name: 'Living room', equipment: ['dumbbells', 'bench', 'bands', 'bands']});
    expect(r.places[0]).toMatchObject({name: 'Living room', equipment: ['dumbbells', 'bench', 'bands']});
    r = choosePlace(r, 'place-gym-1'); expect(currentPlace(r)?.name).toBe('Gym');
    r = choosePlace(r, null); expect(currentPlace(r)).toBeNull();
    r = removePlace(choosePlace(r, 'place-gym-1'), 'place-gym-1'); expect(r.current).toBeUndefined();
    for (let i = 0; i < 4; i++) r = addPlace(r, `Place ${i}`, [], AT).record;
    expect(() => addPlace(r, 'Sixth', [], AT)).toThrow('Up to 5 places fit.');
  });
});

describe('Replace an exercise (LEDGER #241)', () => {
  test('similar: the same main muscle and kind of sets, what the place has, not already in the workout', () => {
    const list = alternatives({id: 'bench-press', measure: 'weight-reps'}, EMPTY, null);
    expect(list.length).toBeGreaterThan(0);
    for (const x of list) { expect(x.measure).toBe('weight-reps'); expect(HOW_TOS.find(h => h.id === x.id)!.primary).toContain('chest'); }
    const home = alternatives({id: 'bench-press', measure: 'weight-reps'}, EMPTY, ['dumbbells', 'bench'], ['incline-db-press']);
    expect(home.map(x => x.id)).not.toContain('incline-db-press');
    for (const x of home) expect(availableWith(x.id, ['dumbbells', 'bench'])).toBe(true);
    expect(alternatives({id: 'own-thing', measure: 'reps'}, EMPTY, null)).toEqual([]);
  });
  test('replacing keeps the sets typed so far, the note and the entry; Undo is the same write back', () => {
    let w = startWorkout(EMPTY, {date: DAY, now: NOW});
    w = addExercise(w, {id: 'bench-press', name: 'Bench press', measure: 'weight-reps'});
    const entry = w.workouts[0]!.exercises[0]!;
    w = updateSet(w, entry.id, entry.sets[0]!.id, {weightKg: 40, reps: 10, done: true});
    const swapped = replaceInWorkout(w, entry.id, {id: 'incline-db-press', name: 'Incline dumbbell press', measure: 'weight-reps'});
    const e = swapped.workouts[0]!.exercises[0]!;
    expect([e.id, e.exerciseId, e.name]).toEqual([entry.id, 'incline-db-press', 'Incline dumbbell press']);
    expect(e.sets[0]).toMatchObject({weightKg: 40, reps: 10, done: true});
    expect(replaceInWorkout(swapped, entry.id, {id: 'bench-press', name: 'Bench press', measure: 'weight-reps'}).workouts[0]!.exercises[0]!.exerciseId).toBe('bench-press');
    expect(() => replaceInWorkout(w, entry.id, {id: 'plank', name: 'Plank', measure: 'time'})).toThrow('records the same');
  });
});

describe('a workout made for today (LEDGER #240)', () => {
  const w = showcaseWorkouts(DAY), library = EXERCISES;
  test('4–6 built-in exercises by length, for the freshest groups, from the place\'s equipment; no calories', () => {
    for (const [minutes, n] of [[30, 4], [45, 5], [60, 6]] as const) {
      const s = suggestWorkout({w, library, now: NOW, today: DAY, place: null, minutes});
      expect(s.exercises, String(minutes)).toHaveLength(n);
      expect(new Set(s.exercises.map(x => x.exerciseId)).size).toBe(n);
      for (const x of s.exercises) expect(EXERCISES.some(e => e.id === x.exerciseId)).toBe(true);
      expect(JSON.stringify(s)).not.toMatch(/kcal|calorie/i);
    }
    const home = suggestWorkout({w, library, now: NOW, today: DAY, place: place(['dumbbells', 'bench']), minutes: 45});
    for (const x of home.exercises) expect(availableWith(x.exerciseId, ['dumbbells', 'bench'])).toBe(true);
    expect(home.place).toBe('Home');
  });
  test('groups by freshness: the Showcase\'s freshest first; sets from the person\'s own sessions through the rule', () => {
    const s = suggestWorkout({w, library, now: NOW, today: DAY, place: null, minutes: 60});
    const fresh = s.groups.map(g => g.freshness ?? 100);
    expect([...fresh].sort((a, b) => b - a)).toEqual(fresh);
    const known = s.exercises.filter(x => x.from !== 'new');
    for (const x of known) { expect(x.lastDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(x.sets.every(set => set.reps !== undefined)).toBe(true); }
    const bench = suggestWorkout({w, library, now: NOW, today: DAY, place: null, minutes: 60, skip: []}).exercises.find(x => x.exerciseId === 'bench-press');
    if (bench) expect(bench.rule).toBe('routine'); // the Showcase's Push day has a rule
    const fresh0 = suggestWorkout({w: EMPTY, library, now: NOW, today: DAY, place: null, minutes: 30});
    expect(fresh0.exercises.every(x => x.from === 'new' && x.sets.every(set => set.weightKg === undefined))).toBe(true);
  });
  test('edit before starting: leave out, replace; started as an ordinary workout with those sets', () => {
    let s = suggestWorkout({w, library, now: NOW, today: DAY, place: null, minutes: 45});
    const first = s.exercises[0]!;
    s = dropSuggested(s, s.exercises[1]!.exerciseId);
    expect(s.exercises).toHaveLength(4);
    const alt = alternatives({id: first.exerciseId, measure: first.measure}, w, null, s.exercises.map(x => x.exerciseId))[0]!;
    s = swapSuggested(w, s, first.exerciseId, alt, NOW);
    expect(s.exercises[0]!.exerciseId).toBe(alt.id);
    const started = startWorkout(EMPTY, {date: DAY, now: NOW, repeat: suggestionAsWorkout(s)});
    const x = started.workouts[0]!;
    expect(x.name).toBe('Suggested workout');
    expect(x.templateId).toBeUndefined();
    expect(x.exercises.map(e => e.exerciseId)).toEqual(s.exercises.map(e => e.exerciseId));
    expect(x.exercises[0]!.sets.map(set => set.reps)).toEqual(s.exercises[0]!.sets.map(set => set.reps));
  });
});
