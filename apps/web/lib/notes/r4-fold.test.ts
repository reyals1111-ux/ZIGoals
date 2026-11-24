import {describe, expect, test} from 'vitest';
import {foldable, foldsHiding, hiddenBlocks, sectionSize} from './fold';

/** Session AV lane 2 (r4-notes; LEDGER #313, Bear's folding a section). */
describe('folding a section', () => {
  // # A, p, ## B, p, ### C, p, ## D, p, # E
  const levels = [1, null, 2, null, 3, null, 2, null, 1];
  test('a heading folds up to the next heading of its level or higher', () => {
    expect([0, 2, 4, 6, 8].map(i => sectionSize(levels, i))).toEqual([7, 3, 1, 1, 0]);
    expect([...hiddenBlocks(levels, new Set([2]))]).toEqual([3, 4, 5]);
    expect([...hiddenBlocks(levels, new Set([0]))]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect([...hiddenBlocks(levels, new Set([4, 6]))]).toEqual([5, 7]);
    expect([...hiddenBlocks(levels, new Set([8]))]).toEqual([]);
  });
  test('Fold all folds the headings with words under them; a heading inside a fold is opened by opening its parents', () => {
    expect(foldable(levels)).toEqual([0, 2, 4, 6]);
    expect(foldsHiding(levels, new Set([0, 2]), 4).sort()).toEqual([0, 2]);
    expect(foldsHiding(levels, new Set([2]), 6)).toEqual([]);
  });
});
