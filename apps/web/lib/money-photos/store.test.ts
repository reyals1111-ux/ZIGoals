import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {MAX_MONEY_PHOTOS, MONEY_PHOTO_DB, MONEY_PHOTO_MAX_BYTES, deleteMoneyPhoto, deleteMoneyPhotos, exportMoneyPhotoEntries, getMoneyPhoto, moneyPhotoFileName, moneyPhotoIds, moneyPhotoKey, moneyPhotoValueSchema, orphanPhotoIds, putMoneyPhoto, type MoneyPhoto} from './store';

const AT = '2026-11-01T09:00:00.000Z';
const photo = (entryId: string, bytes = 3): MoneyPhoto => ({entryId, blob: new Blob([new Uint8Array(bytes).fill(7)], {type: 'image/jpeg'}), type: 'image/jpeg', bytes, takenAt: AT});
beforeEach(async () => { await new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(MONEY_PHOTO_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); });

describe('BUILD list 2 #10: a photo on a money entry (device-only)', () => {
  test('the database, the limits, the per-scope key and the value shape', () => {
    expect(MONEY_PHOTO_DB).toBe('zigoals-money-photos-v1');
    expect(MAX_MONEY_PHOTOS).toBe(500); expect(MONEY_PHOTO_MAX_BYTES).toBe(200_000);
    expect(moneyPhotoKey('local', 'e-1')).toBe('local:e-1');
    expect(moneyPhotoValueSchema.safeParse(photo('e-1')).success).toBe(true);
    expect(moneyPhotoValueSchema.safeParse({...photo('e-1'), type: 'image/png'}).success).toBe(false);
    expect(moneyPhotoValueSchema.safeParse({...photo('e-1'), bytes: MONEY_PHOTO_MAX_BYTES + 1}).success).toBe(false);
    expect(moneyPhotoValueSchema.safeParse({...photo('e-1'), entryId: '../x'}).success).toBe(false);
  });
  test('kept, read back, replaced, deleted; scopes never mix', async () => {
    await putMoneyPhoto('local', photo('e1'));
    await putMoneyPhoto('showcase', photo('e1', 5));
    expect(await moneyPhotoIds('local')).toEqual(['e1']);
    const back = await getMoneyPhoto('local', 'e1');
    expect(back?.bytes).toBe(3);
    expect(new Uint8Array(await back!.blob.arrayBuffer())).toEqual(new Uint8Array(3).fill(7));
    await putMoneyPhoto('local', photo('e1', 4));
    expect((await getMoneyPhoto('local', 'e1'))?.bytes).toBe(4);
    await deleteMoneyPhoto('local', 'e1');
    expect(await getMoneyPhoto('local', 'e1')).toBeNull();
    expect(await moneyPhotoIds('showcase')).toEqual(['e1']);
  });
  test('quota: the 501st photo of a scope is refused plainly; replacing one still works at the cap', async () => {
    for (let i = 0; i < MAX_MONEY_PHOTOS; i++) await putMoneyPhoto('local', photo(`e${i}`, 1));
    await expect(putMoneyPhoto('local', photo('one-more', 1))).rejects.toThrow('At most 500 money photos on this device; delete one first.');
    await expect(putMoneyPhoto('local', photo('e0', 2))).resolves.toBeUndefined();
    await expect(putMoneyPhoto('showcase', photo('one-more', 1))).resolves.toBeUndefined();
  }, 30_000);
  test('an orphan photo after its entry is deleted: listed, kept until the person deletes it', async () => {
    await putMoneyPhoto('local', photo('kept'));
    await putMoneyPhoto('local', photo('gone'));
    const orphans = orphanPhotoIds(await moneyPhotoIds('local'), ['kept', 'other']);
    expect(orphans).toEqual(['gone']);
    expect(await moneyPhotoIds('local')).toHaveLength(2);
    expect(await deleteMoneyPhotos('local', orphans)).toBe(1);
    expect(await moneyPhotoIds('local')).toEqual(['kept']);
    expect(await deleteMoneyPhotos('local')).toBe(1);
    expect(await moneyPhotoIds('local')).toEqual([]);
  });
  test('export manifest: one file per photo, named by the entry\'s day and id, in its own folder; other scopes left out', async () => {
    await putMoneyPhoto('local', photo('e1'));
    await putMoneyPhoto('local', {...photo('orphan'), type: 'image/webp'});
    await putMoneyPhoto('showcase', photo('s1'));
    const now = new Date(AT);
    const files = await exportMoneyPhotoEntries('local', new Map([['e1', '2026-10-30']]), now);
    expect(files.map(f => f.name).sort()).toEqual(['money-photos/2026-10-30-e1.jpg', 'money-photos/orphan.webp']);
    expect(files.every(f => f.data.length === 3 && f.modified === now)).toBe(true);
    expect(moneyPhotoFileName('a b/c', 'not a date', 'image/jpeg')).toBe('money-photos/a_b_c.jpg');
  });
});
