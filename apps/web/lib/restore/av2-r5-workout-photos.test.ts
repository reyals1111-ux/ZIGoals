// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// jsdom's Blob cannot pass through IndexedDB's structured clone; Node's can (as in av2-restore-media.test.ts).
vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });

import {buildEverythingExport} from '../export/make-everything';
import {WORKOUTS_KEY, workoutsSchema} from '../workouts/schema';
import {WORKOUT_PHOTO_DB, getWorkoutPhoto, putWorkoutPhoto, workoutPhotoFileName, workoutPhotoIds} from '../workouts/photos';
import {KNOWN_DATABASES} from '../erase-everything';
import {STORE_NAMES, storesOf} from '../erase-areas';
import {AK_DATABASES} from '../ak-device-keys';
import {DEVICE_STORES} from '../data-health/catalog';
import {MEDIA_ENTRY, RESTORE_MEDIA_DBS, RESTORE_MEDIA_STORES} from './media-dbs';
import {indexMedia, mediaTarget} from './media';
import {planParts} from './plan';
import {openBackup, type OpenedBackup} from './read-backup';
import * as apply from './apply';
import {mediaChoiceLabel} from '../../components/restore/restore-backup';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #377; TIER 3 stored formats): the workout photos' database is in every shared
 * registry, and Export everything → erase → Restore brings a workout's photos back under the ids its `photos` keeps —
 * only one missing here, within the store's cap; broken bytes are skipped and counted; a photo no workout names stays in
 * the ZIP. Fictional data only.
 */
const AT = '2026-11-20T09:00:00.000Z', P1 = 'wph-0a1b2c3d-1111', P2 = 'wph-0a1b2c3d-2222', ORPHAN = 'wph-0a1b2c3d-9999';
function jpeg(w = 64, h = 48) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
const blob = (bytes: Uint8Array, type: string) => new Blob([bytes as Uint8Array<ArrayBuffer>], {type});
const bytesOf = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];
const wipe = (db: string) => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const wipeAll = () => Promise.all(RESTORE_MEDIA_DBS.map(wipe));
const log = workoutsSchema.parse({version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [{id: 'w-legs', name: 'Fictional legs', date: '2026-11-19', type: 'strength', startedAt: '2026-11-19T07:00:00.000Z', endedAt: '2026-11-19T08:00:00.000Z', exercises: [], photos: [P1, P2], star: true}]});
async function exportThenErase(broken = false): Promise<OpenedBackup> {
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(log));
  await putWorkoutPhoto('local', P1, {blob: blob(jpeg(), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg().length, at: AT});
  const second = broken ? new Uint8Array([1, 2, 3, 4]) : jpeg(80, 60);
  await putWorkoutPhoto('local', P2, {blob: blob(second, 'image/jpeg'), type: 'image/jpeg', bytes: second.length, at: AT});
  await putWorkoutPhoto('local', ORPHAN, {blob: blob(jpeg(), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg().length, at: AT});
  const {bytes} = await buildEverythingExport();
  localStorage.clear(); await wipeAll();
  return openBackup(new Blob([bytes as Uint8Array<ArrayBuffer>]));
}
const restore = (opened: OpenedBackup) => apply.applyRestore(opened, [{part: planParts(opened.json).find(p => p.id === 'device:workouts')!, mode: 'replace' as const}], {vision: false, progress: false, media: true});

Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(async () => { localStorage.clear(); apply.forgetRestoreUndo(); await wipeAll(); });
afterEach(() => { localStorage.clear(); apply.forgetRestoreUndo(); });

describe('the workout photos’ database in the shared registries', () => {
  test('erase, erase areas, the AK list, the data catalogue, restore and the export folder all name it', () => {
    expect(KNOWN_DATABASES).toContain(WORKOUT_PHOTO_DB);
    expect(AK_DATABASES).toContain(WORKOUT_PHOTO_DB);
    expect(STORE_NAMES[WORKOUT_PHOTO_DB]).toBe('Workout photos');
    // Photos first: the workout photos come before the non-photo stores.
    expect(storesOf([WORKOUT_PHOTO_DB, 'zigoals-notify-v1'])).toEqual(['Workout photos', 'Notifications']);
    expect(DEVICE_STORES).toContain('Workout photos (IndexedDB, this device only)');
    expect(RESTORE_MEDIA_STORES[WORKOUT_PHOTO_DB]).toBe('photos');
    expect(MEDIA_ENTRY.test(workoutPhotoFileName(P1, 'image/webp')) && MEDIA_ENTRY.test(workoutPhotoFileName(P1, 'image/jpeg')) && !MEDIA_ENTRY.test('workout-photos/../x.jpg')).toBe(true);
    const index = indexMedia({workouts: log});
    expect(mediaTarget(workoutPhotoFileName(P2, 'image/webp'), index)).toMatchObject({store: 'workouts', id: P2, type: 'image/webp', kind: 'photo', cap: 200_000});
    expect(mediaTarget(workoutPhotoFileName(ORPHAN, 'image/jpeg'), index)).toBeNull();
  });
});

describe('export → erase → restore brings a workout’s photos back', () => {
  test('both photos under their own ids and bytes; the one no workout names stays in the ZIP', async () => {
    const opened = await exportThenErase();
    expect(opened.media?.map(e => e.name).sort()).toEqual([P1, P2, ORPHAN].map(id => `workout-photos/${id}.jpg`).sort());
    const plan = await apply.mediaPreview(opened, localStorage);
    expect(plan).toMatchObject({back: {workouts: 2}, total: 2, unnamed: 1});
    expect(mediaChoiceLabel(plan)).toContain('2 on workouts');
    const outcome = await restore(opened);
    expect(outcome.media).toEqual({added: 2, present: 0, unnamed: 1, skipped: 0, closed: 0});
    expect((await workoutPhotoIds('local')).sort()).toEqual([P1, P2]);
    expect(await bytesOf((await getWorkoutPhoto('local', P2))!.blob)).toEqual([...jpeg(80, 60)]);
    expect(workoutsSchema.parse(JSON.parse(localStorage.getItem(WORKOUTS_KEY)!)).workouts[0]).toMatchObject({photos: [P1, P2], star: true});
    // The undo record names exactly the two ids added.
    const record = apply.restoreUndoSchema.parse(JSON.parse(localStorage.getItem(apply.RESTORE_UNDO_KEY)!));
    expect(record.steps.flatMap(s => s.kind === 'media' ? [{...s, ids: [...s.ids].sort()}] : [])).toEqual([{kind: 'media', db: WORKOUT_PHOTO_DB, scope: 'local', ids: [P1, P2]}]);
  });
  test('a photo already here is never written over; broken bytes are skipped and counted', async () => {
    const opened = await exportThenErase(true);
    const mine = jpeg(32, 32);
    await putWorkoutPhoto('local', P1, {blob: blob(mine, 'image/jpeg'), type: 'image/jpeg', bytes: mine.length, at: AT});
    const outcome = await restore(opened);
    expect(outcome.media).toMatchObject({added: 0, present: 1, skipped: 1, unnamed: 1});
    expect(await bytesOf((await getWorkoutPhoto('local', P1))!.blob)).toEqual([...mine]);
    expect(await getWorkoutPhoto('local', P2)).toBeNull();
  });
});
