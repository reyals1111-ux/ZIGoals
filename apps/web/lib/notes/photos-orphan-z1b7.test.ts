import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {getNotePhoto, NOTE_PHOTO_DB, NOTE_PHOTO_ORPHAN_GRACE_DAYS, notePhotoIds, putNotePhoto, sweepNotePhotos} from './photos';

// Session AL Part 14 (security review Z1B-7): a Restore of an older notes copy leaves today's photos unnamed; the arrival
// sweep keeps them for 30 days, so Undo of the restore finds them; only a photo unnamed for 30 days is deleted.
const AT = '2026-11-01T09:00:00.000Z', DAY = 86_400_000, NOW = Date.parse('2026-11-08T12:00:00.000Z');
const blob = () => new Blob([new Uint8Array(3).fill(7)], {type: 'image/jpeg'});
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(NOTE_PHOTO_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const put = (scope: string, id: string) => putNotePhoto(scope, id, {blob: blob(), type: 'image/jpeg', bytes: 3, at: AT});

describe('Z1B-7: the notes photo sweep after a Restore', () => {
  beforeEach(wipe);

  test('a photo no note names is marked, not deleted; Undo of the restore names it again and the mark goes', async () => {
    await put('local', 'today'); await put('local', 'kept');
    // After a Restore of an older copy only "kept" is named.
    expect(await sweepNotePhotos('local', ['kept', undefined], NOW)).toEqual({deleted: [], marked: ['today'], kept: []});
    expect((await notePhotoIds('local')).sort()).toEqual(['kept', 'today']);
    expect((await getNotePhoto('local', 'today'))?.orphanSince).toBe(new Date(NOW).toISOString());
    // A second visit a day later: still kept.
    expect(await sweepNotePhotos('local', ['kept'], NOW + DAY)).toEqual({deleted: [], marked: [], kept: ['today']});
    // Undo of the restore: the note names the photo again, which loses its mark.
    await sweepNotePhotos('local', ['kept', 'today'], NOW + 2 * DAY);
    const back = await getNotePhoto('local', 'today');
    expect(back?.orphanSince).toBeUndefined();
    expect(back?.bytes).toBe(3);
  });

  test('a photo unnamed for the whole grace period is deleted; one day short, it stays', async () => {
    await put('local', 'gone');
    await sweepNotePhotos('local', [], NOW);
    const grace = NOTE_PHOTO_ORPHAN_GRACE_DAYS * DAY;
    expect(await sweepNotePhotos('local', [], NOW + grace - DAY)).toEqual({deleted: [], marked: [], kept: ['gone']});
    expect(await sweepNotePhotos('local', [], NOW + grace)).toEqual({deleted: ['gone'], marked: [], kept: []});
    expect(await notePhotoIds('local')).toEqual([]);
  });

  test('another scope is never touched', async () => {
    await put('local', 'a'); await put('showcase', 'a');
    await sweepNotePhotos('local', [], NOW);
    await sweepNotePhotos('local', [], NOW + NOTE_PHOTO_ORPHAN_GRACE_DAYS * DAY);
    expect(await notePhotoIds('local')).toEqual([]);
    expect(await notePhotoIds('showcase')).toEqual(['a']);
    expect((await getNotePhoto('showcase', 'a'))?.orphanSince).toBeUndefined();
  });
});
