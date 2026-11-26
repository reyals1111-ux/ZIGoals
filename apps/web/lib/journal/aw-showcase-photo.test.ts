import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {JOURNAL_MEDIA_DB, JOURNAL_PHOTO_MAX_BYTES, getJournalMedia, journalMediaIds} from './media';
import {SHOWCASE_JOURNAL_PHOTOS, SHOWCASE_MEDIA_SCOPE, isShowcaseJournalPhoto} from './showcase-photo-ids';
import {SHOWCASE_PHOTO_BYTES, showcasePhotoMedia} from './showcase-photo';
import {SHOWCASE_PHOTO_SCOPE, clearShowcasePhotos} from '../showcase-storage';
import {newMediaId} from './media';

/**
 * Session AW (showcase): the Showcase journal's example photo is made in the Showcase's own media scope the first time
 * an entry shows it, and only there; a person's scope and a person's ids never get it, and the Showcase's clean-up still
 * deletes it.
 */
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(JOURNAL_MEDIA_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
beforeEach(wipe);

describe('the Showcase journal photo', () => {
  test('its scope is the Showcase photo scope, and no id a person gets can be one of its ids', () => {
    expect(SHOWCASE_MEDIA_SCOPE).toBe(SHOWCASE_PHOTO_SCOPE);
    for (let i = 0; i < 50; i++) expect(isShowcaseJournalPhoto(SHOWCASE_MEDIA_SCOPE, newMediaId())).toBe(false);
    for (const id of SHOWCASE_JOURNAL_PHOTOS) { expect(isShowcaseJournalPhoto('showcase', id)).toBe(true); expect(isShowcaseJournalPhoto('local', id)).toBe(false); }
  });
  test('a small JPEG within the journal photo limit, readable as a journal photo', async () => {
    const m = showcasePhotoMedia('2026-11-17T09:00:00.000Z');
    expect(m).toMatchObject({kind: 'photo', type: 'image/jpeg', bytes: SHOWCASE_PHOTO_BYTES});
    expect(m.bytes).toBeLessThan(JOURNAL_PHOTO_MAX_BYTES);
    const head = new Uint8Array(await m.blob.arrayBuffer()).slice(0, 3);
    expect([...head]).toEqual([0xff, 0xd8, 0xff]); // a JPEG's first bytes
  });
  test('made in the Showcase scope on first view, kept there, and deleted with the Showcase', async () => {
    expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]);
    const first = await getJournalMedia(SHOWCASE_PHOTO_SCOPE, SHOWCASE_JOURNAL_PHOTOS[0]);
    expect(first).toMatchObject({kind: 'photo', type: 'image/jpeg', bytes: SHOWCASE_PHOTO_BYTES});
    expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([SHOWCASE_JOURNAL_PHOTOS[0]]);
    expect((await getJournalMedia(SHOWCASE_PHOTO_SCOPE, SHOWCASE_JOURNAL_PHOTOS[0]))?.at).toBe(first!.at);
    await clearShowcasePhotos();
    expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]);
  });
  test('never in a person’s scope, never for another id', async () => {
    expect(await getJournalMedia('local', SHOWCASE_JOURNAL_PHOTOS[0])).toBeNull();
    expect(await getJournalMedia('0b6f1a2c-3d4e-4f50-8a61-7b8c9d0e1f2a', SHOWCASE_JOURNAL_PHOTOS[1])).toBeNull();
    expect(await getJournalMedia(SHOWCASE_PHOTO_SCOPE, 'm-photo0001')).toBeNull();
    expect(await journalMediaIds('local')).toEqual([]);
    expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]);
  });
});
