import {describe, expect, test} from 'vitest';
import {placedPhotoIds, withoutPhotoLines} from './note-photos';

/**
 * Session AV lane 2 (review b4g B4G-6; LEDGER #307): a photo deleted while editing leaves the unsaved words too (the
 * editor runs the same `withoutPhotoLines` on them), so Save never writes back a line for a deleted photo.
 */
describe('deleting a photo while editing', () => {
  test('the unsaved words lose its line and keep the new ones', () => {
    const unsaved = 'Saved words.\n\n![photo](p-2)\n\nNew words typed while editing.';
    const after = withoutPhotoLines(unsaved, 'p-2');
    expect(after).toBe('Saved words.\n\nNew words typed while editing.');
    expect(placedPhotoIds(after)).toEqual([]);
  });
});
