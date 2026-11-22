import 'fake-indexeddb/auto';
import {describe, expect, test} from 'vitest';
import {addPhotoId, favourites, namedPhotoIds, removePhotoId, setStar} from './journal';
import {deleteAllWorkoutPhotos, exportWorkoutPhotoEntries, getWorkoutPhoto, MAX_WORKOUT_PHOTOS, putWorkoutPhoto, sweepWorkoutPhotos, workoutPhotoIds, WORKOUT_PHOTO_ORPHAN_GRACE_DAYS} from './photos';
import {emptyWorkouts, workoutsSchema, type Workout, type Workouts} from './schema';
import {showcaseWorkouts} from './showcase';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak's workout journal): a star and Favourites; up to four photo
 * ids on a workout; the photos kept in this browser per scope, swept only after 30 days unnamed, and exported as files.
 */
const AT = '2026-11-20T08:00:00.000Z';
const workout = (id: string, date: string): Workout => ({id, name: 'Push day', date, type: 'strength', startedAt: `${date}T07:00:00.000Z`, endedAt: `${date}T08:00:00.000Z`, exercises: []} as Workout);
const log = (): Workouts => workoutsSchema.parse({...emptyWorkouts(), workouts: [workout('w-1', '2026-11-18'), workout('w-2', '2026-11-19')]});
const blob = () => new Blob([new Uint8Array(4).fill(9)], {type: 'image/webp'});
const photo = () => ({blob: blob(), type: 'image/webp' as const, bytes: 4, at: AT});

describe('favourites', () => {
  test('a star puts a workout in Favourites, newest first; off removes the field', () => {
    let w = setStar(setStar(log(), 'w-1', true), 'w-2', true);
    expect(favourites(w).map(x => x.id)).toEqual(['w-2', 'w-1']);
    w = setStar(w, 'w-2', false);
    expect(favourites(w).map(x => x.id)).toEqual(['w-1']);
    expect(w.workouts.find(x => x.id === 'w-2')).not.toHaveProperty('star');
    expect(() => setStar(w, 'gone', true)).toThrow('This workout is no longer here.');
  });
  test('the Showcase has one labelled favourite: the last leg day', () => {
    expect(favourites(showcaseWorkouts('2026-11-20')).map(x => x.name)).toEqual(['Leg day']);
  });
});

describe('photo ids on a workout', () => {
  test('up to four; removing the last removes the field; Undo puts one back in its place', () => {
    let w = log();
    for (const n of ['a', 'b', 'c', 'd']) w = addPhotoId(w, 'w-1', `wph-0000000${n}-1111`);
    expect(() => addPhotoId(w, 'w-1', 'wph-0000000e-1111')).toThrow('Up to 4 photos fit on one workout.');
    const without = removePhotoId(w, 'w-1', 'wph-0000000b-1111');
    expect(addPhotoId(without, 'w-1', 'wph-0000000b-1111', 1).workouts[0]!.photos).toEqual(w.workouts[0]!.photos);
    expect(namedPhotoIds(w)).toHaveLength(4);
    let one = addPhotoId(log(), 'w-2', 'wph-0000000a-2222');
    one = removePhotoId(one, 'w-2', 'wph-0000000a-2222');
    expect(one.workouts[1]).not.toHaveProperty('photos');
  });
});

describe('the photo store (this browser only)', () => {
  test('each scope keeps its own; the cap holds; a Showcase scope is cleared alone', async () => {
    await putWorkoutPhoto('local', 'wph-aaaaaaaa-1', photo());
    await putWorkoutPhoto('showcase', 'wph-aaaaaaaa-2', photo());
    expect(await workoutPhotoIds('local')).toEqual(['wph-aaaaaaaa-1']);
    expect(await deleteAllWorkoutPhotos('showcase')).toBe(1);
    expect(await workoutPhotoIds('showcase')).toEqual([]);
    expect(await workoutPhotoIds('local')).toEqual(['wph-aaaaaaaa-1']);
    expect(MAX_WORKOUT_PHOTOS).toBe(300);
  });
  test('the sweep marks an unnamed photo, keeps it for 30 days, then deletes it; a named one loses its mark', async () => {
    await putWorkoutPhoto('sweep', 'wph-bbbbbbbb-1', photo());
    await putWorkoutPhoto('sweep', 'wph-bbbbbbbb-2', photo());
    const now = Date.parse(AT);
    expect((await sweepWorkoutPhotos('sweep', ['wph-bbbbbbbb-1'], now)).marked).toEqual(['wph-bbbbbbbb-2']);
    expect((await sweepWorkoutPhotos('sweep', ['wph-bbbbbbbb-1'], now + 86_400_000)).deleted).toEqual([]);
    expect((await getWorkoutPhoto('sweep', 'wph-bbbbbbbb-2'))?.orphanSince).toBe(AT);
    // Named again (Undo of a delete): the mark goes.
    await sweepWorkoutPhotos('sweep', ['wph-bbbbbbbb-1', 'wph-bbbbbbbb-2'], now + 2 * 86_400_000);
    expect((await getWorkoutPhoto('sweep', 'wph-bbbbbbbb-2'))?.orphanSince).toBeUndefined();
    await sweepWorkoutPhotos('sweep', ['wph-bbbbbbbb-1'], now);
    expect((await sweepWorkoutPhotos('sweep', ['wph-bbbbbbbb-1'], now + WORKOUT_PHOTO_ORPHAN_GRACE_DAYS * 86_400_000)).deleted).toEqual(['wph-bbbbbbbb-2']);
    expect(await workoutPhotoIds('sweep')).toEqual(['wph-bbbbbbbb-1']);
  });
  test('Export everything gets each photo as a file under workout-photos/', async () => {
    await putWorkoutPhoto('export', 'wph-cccccccc-1', photo());
    const files = await exportWorkoutPhotoEntries('export', new Date(AT));
    expect(files.map(f => f.name)).toEqual(['workout-photos/wph-cccccccc-1.webp']);
    expect([...files[0]!.data]).toEqual([9, 9, 9, 9]);
  });
});
