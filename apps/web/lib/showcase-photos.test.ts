import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {activateShowcase, clearShowcasePhotos, exitShowcase, SHOWCASE_PHOTO_SCOPE} from './showcase-storage';
import {NOTE_PHOTO_DB, notePhotoIds, putNotePhoto} from './notes/photos';
import {MEAL_PHOTO_DB, mealPhotoIds, putMealPhoto} from './meal-estimates/photos';
import {MONEY_PHOTO_DB, moneyPhotoIds, putMoneyPhoto} from './money-photos/store';
import {PHOTO_DB, getPhotoBlob, putPhotoBlob} from './health-aa/photos';

// Security review Z1B-9: a Showcase's photos are deleted when a Showcase starts and when it ends; the person's own photos
// (the local person's and an account's) stay.
const AT = '2026-11-01T09:00:00.000Z', ACCOUNT = '0b6f1a2c-3d4e-4f50-8a61-7b8c9d0e1f2a';
const SCOPES = ['local', ACCOUNT, SHOWCASE_PHOTO_SCOPE] as const;
const blob = () => new Blob([new Uint8Array(3).fill(7)], {type: 'image/jpeg'});
const wipe = (name: string) => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });

async function seed() {
  for (const scope of SCOPES) {
    await putNotePhoto(scope, 'n1', {blob: blob(), type: 'image/jpeg', bytes: 3, at: AT});
    await putMealPhoto(scope, 'f1', {blob: blob(), type: 'image/jpeg', bytes: 3, at: AT});
    await putMoneyPhoto(scope, {entryId: 'e1', blob: blob(), type: 'image/jpeg', bytes: 3, takenAt: AT});
    await putPhotoBlob(scope, 'photo_1', blob());
  }
}
async function kept(scope: string) {
  return {notes: await notePhotoIds(scope), meals: await mealPhotoIds(scope), money: await moneyPhotoIds(scope), progress: (await getPhotoBlob(scope, 'photo_1')) !== null};
}
const ALL = {notes: ['n1'], meals: ['f1'], money: ['e1'], progress: true}, NONE = {notes: [], meals: [], money: [], progress: false};
async function expectShowcaseGoneOthersKept() {
  expect(await kept(SHOWCASE_PHOTO_SCOPE)).toEqual(NONE);
  expect(await kept('local')).toEqual(ALL);
  expect(await kept(ACCOUNT)).toEqual(ALL);
}
/** A tab's sessionStorage, as the Showcase uses it. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear()};
}

beforeEach(async () => { for (const db of [NOTE_PHOTO_DB, MEAL_PHOTO_DB, MONEY_PHOTO_DB, PHOTO_DB]) await wipe(db); await seed(); });

describe('Z1B-9: the Showcase keeps no photos past its own time', () => {
  test('clearShowcasePhotos deletes the Showcase scope in all four photo stores and nothing else', async () => {
    expect(await kept(SHOWCASE_PHOTO_SCOPE)).toEqual(ALL);
    await clearShowcasePhotos();
    await expectShowcaseGoneOthersKept();
  });
  test('a Showcase starting deletes the photos an earlier one left', async () => {
    activateShowcase(memoryStorage(), '2026-11-01', {'zigoals:goals:v1': '[]'}, 'gen-start');
    await vi.waitFor(async () => expect(await kept(SHOWCASE_PHOTO_SCOPE)).toEqual(NONE));
    await expectShowcaseGoneOthersKept();
  });
  test('a Showcase ending deletes its photos', async () => {
    const session = memoryStorage();
    activateShowcase(session, '2026-11-01', {}, 'gen-end');
    await vi.waitFor(async () => expect(await kept(SHOWCASE_PHOTO_SCOPE)).toEqual(NONE));
    await seed(); // photos taken while the Showcase was open
    exitShowcase(session);
    await vi.waitFor(async () => expect(await kept(SHOWCASE_PHOTO_SCOPE)).toEqual(NONE));
    await expectShowcaseGoneOthersKept();
  });
});
