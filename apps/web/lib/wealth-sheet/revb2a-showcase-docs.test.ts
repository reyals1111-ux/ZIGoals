import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {WEALTH_DOCS_DB, deleteWealthDocs, docKeys, putDoc} from './docs';
import {SHOWCASE_PHOTO_SCOPE, activateShowcase, clearShowcasePhotos, exitShowcase} from '../showcase-storage';

/**
 * Session AV lane 2 (review b2a #4, privacy): an account document (a statement, a deed) added while the Showcase is on is
 * kept under the Showcase's scope and deleted when a Showcase starts or ends, as its photos and journal media are; the
 * person's own documents (local, an account's) stay.
 */
const AT = '2026-11-20T09:00:00.000Z', ACCOUNT = '0b6f1a2c-3d4e-4f50-8a61-7b8c9d0e1f2a', BANK = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(WEALTH_DOCS_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const doc = (docId: string) => ({accountId: BANK, docId, name: 'Statement November.pdf', blob: new Blob([new Uint8Array(6).fill(5)]), type: 'application/pdf' as const, bytes: 6, addedAt: AT});
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear()};
}
beforeEach(wipe);

describe('the Showcase keeps no account documents past its own time', () => {
  const seed = async () => { for (const scope of ['local', ACCOUNT, SHOWCASE_PHOTO_SCOPE]) { await putDoc(scope, doc('d-1')); await putDoc(scope, doc('d-2')); } };
  const expectOnlyShowcaseGone = async () => {
    expect(await docKeys(SHOWCASE_PHOTO_SCOPE)).toEqual([]);
    expect((await docKeys('local')).sort()).toEqual([`${BANK}:d-1`, `${BANK}:d-2`]);
    expect((await docKeys(ACCOUNT)).sort()).toEqual([`${BANK}:d-1`, `${BANK}:d-2`]);
  };
  test('a scope delete takes only that scope', async () => {
    await seed();
    expect(await deleteWealthDocs(SHOWCASE_PHOTO_SCOPE)).toBe(2);
    expect(await deleteWealthDocs(SHOWCASE_PHOTO_SCOPE)).toBe(0);
    await expectOnlyShowcaseGone();
  });
  test('clearShowcasePhotos, a Showcase starting and a Showcase ending each delete them', async () => {
    await seed();
    await clearShowcasePhotos();
    await expectOnlyShowcaseGone();
    const session = memoryStorage();
    await seed();
    activateShowcase(session, '2026-11-01', {}, 'gen-wealth-docs');
    await vi.waitFor(async () => expect(await docKeys(SHOWCASE_PHOTO_SCOPE)).toEqual([]));
    await seed(); // a statement added while trying the Showcase
    exitShowcase(session);
    await vi.waitFor(async () => expect(await docKeys(SHOWCASE_PHOTO_SCOPE)).toEqual([]));
    await expectOnlyShowcaseGone();
  });
});
