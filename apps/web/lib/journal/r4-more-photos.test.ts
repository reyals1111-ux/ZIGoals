import {describe, expect, test} from 'vitest';
import {entryPhotos, photoRoom, splitPhotos, withPhotos, withoutPhoto} from './more-photos';
import {journalSchema} from './schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #317, Journey's more photos in an entry): up to 12 photos, the first four in
 * `photos` (as older builds read them) and the rest in `morePhotos`; taking one off moves the next up; the room check
 * says plainly when the device's journal media store or the browser's storage is full.
 */
const ids = (n: number, from = 0) => Array.from({length: n}, (_, i) => `m-photo${String(i + from).padStart(3, '0')}`);
const AT = '2026-11-20T09:00:00.000Z';
describe('photos five to twelve', () => {
  test('split: four, then eight; nothing past twelve; empty fields left out', () => {
    expect(splitPhotos([])).toEqual({});
    expect(splitPhotos(ids(3))).toEqual({photos: ids(3)});
    expect(splitPhotos(ids(13))).toEqual({photos: ids(4), morePhotos: ids(8, 4)});
  });
  test('an entry with twelve reads in this build; an older build still finds the first four in photos', () => {
    const e = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'e', date: '2026-11-20', text: 'A fictional day.', createdAt: AT, ...splitPhotos(ids(12))}]}).entries[0]!;
    expect(entryPhotos(e)).toEqual(ids(12));
    expect(e.photos).toHaveLength(4);
  });
  test('taking one of the first four off moves the fifth up; taking the last of the more photos off leaves no empty list', () => {
    const e = {id: 'e', ...splitPhotos(ids(6))};
    expect(withoutPhoto(e, 'm-photo001')).toEqual({id: 'e', photos: ['m-photo000', 'm-photo002', 'm-photo003', 'm-photo004'], morePhotos: ['m-photo005']});
    expect(withoutPhoto({id: 'e', ...splitPhotos(ids(5))}, 'm-photo004')).toEqual({id: 'e', photos: ids(4)});
    expect(withPhotos({id: 'e', photos: ids(2)}, [])).toEqual({id: 'e'});
  });
});
describe('the room check', () => {
  test('fits; the store’s 400 are full; the browser’s storage is nearly full', async () => {
    expect(await photoRoom('s', 3, {count: async () => 10, estimate: async () => ({usage: 1_000_000, quota: 100_000_000})})).toEqual({ok: true});
    const full = await photoRoom('s', 3, {count: async () => 399, estimate: () => null});
    expect(full).toEqual({ok: false, reason: 'This device keeps at most 400 journal photos and voice notes, and 399 are kept. Take some off older entries first, or add 1 at most.'});
    const quota = await photoRoom('s', 5, {count: async () => 0, estimate: async () => ({usage: 9_000_000, quota: 10_000_000})});
    expect(quota.ok).toBe(false);
    expect(await photoRoom('s', 0)).toEqual({ok: true});
  });
});
