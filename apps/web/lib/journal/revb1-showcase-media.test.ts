import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {JOURNAL_MEDIA_DB, deleteAllJournalMedia, journalMediaIds, putJournalMedia} from './media';
import {SHOWCASE_PHOTO_SCOPE, activateShowcase, clearShowcasePhotos, exitShowcase} from '../showcase-storage';

/**
 * Session AV lane 2 (review b1 #4, privacy): the journal's photos and voice notes kept while the Showcase is on are
 * deleted when a Showcase starts or ends, as the notes', receipts' and tasks' are; the person's own (local, an account's)
 * stay.
 */
const AT = '2026-11-20T09:00:00.000Z', ACCOUNT = '0b6f1a2c-3d4e-4f50-8a61-7b8c9d0e1f2a';
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(JOURNAL_MEDIA_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const photo = () => ({kind: 'photo' as const, blob: new Blob([new Uint8Array(4).fill(7)]), type: 'image/webp' as const, bytes: 4, at: AT});
const audio = () => ({kind: 'audio' as const, blob: new Blob([new Uint8Array(9).fill(3)]), type: 'audio/webm' as const, bytes: 9, seconds: 3, at: AT});
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear()};
}
beforeEach(wipe);

describe('the Showcase keeps no journal media past its own time', () => {
  const seed = async () => { for (const scope of ['local', ACCOUNT, SHOWCASE_PHOTO_SCOPE]) { await putJournalMedia(scope, 'm-photo0001', photo()); await putJournalMedia(scope, 'm-audio0001', audio()); } };
  const expectOnlyShowcaseGone = async () => {
    expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]);
    expect((await journalMediaIds('local')).sort()).toEqual(['m-audio0001', 'm-photo0001']);
    expect((await journalMediaIds(ACCOUNT)).sort()).toEqual(['m-audio0001', 'm-photo0001']);
  };
  test('a scope delete takes only that scope', async () => {
    await seed();
    expect(await deleteAllJournalMedia(SHOWCASE_PHOTO_SCOPE)).toBe(2);
    await expectOnlyShowcaseGone();
  });
  test('clearShowcasePhotos, a Showcase starting and a Showcase ending each delete it', async () => {
    await seed();
    await clearShowcasePhotos();
    await expectOnlyShowcaseGone();
    const session = memoryStorage();
    await seed();
    activateShowcase(session, '2026-11-01', {}, 'gen-journal');
    await vi.waitFor(async () => expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]));
    await seed(); // a voice note recorded while trying the Showcase
    exitShowcase(session);
    await vi.waitFor(async () => expect(await journalMediaIds(SHOWCASE_PHOTO_SCOPE)).toEqual([]));
    await expectOnlyShowcaseGone();
  });
});
