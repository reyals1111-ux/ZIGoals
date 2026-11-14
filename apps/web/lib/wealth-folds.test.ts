// @vitest-environment jsdom
import {beforeEach, describe, expect, test} from 'vitest';
import {WEALTH_FOLDS_KEY, parseOpen, serialiseOpen, wealthFolds} from './wealth-folds';

describe('Wealth folds (RR-16): remembered on the device, ids only', () => {
  beforeEach(() => localStorage.clear());
  test('a missing, unreadable or foreign value reads as every section folded', () => {
    for (const raw of [null, '', '{', '[]', '"x"', JSON.stringify({version: 2, open: ['wealth:history']}), JSON.stringify({version: 1, open: 'wealth:history'})]) expect(parseOpen(raw), String(raw)).toEqual([]);
  });
  test('only well-formed ids are kept, once each, at most 64', () => {
    expect(parseOpen(JSON.stringify({version: 1, open: ['wealth:history', 'wealth:history', 'BAD ID', 5, '<x>', 'wealth:budgets']}))).toEqual(['wealth:history', 'wealth:budgets']);
    expect(parseOpen(JSON.stringify({version: 1, open: Array.from({length: 99}, (_, i) => `wealth:s${i}`)}))).toHaveLength(64);
  });
  test('nothing open stores nothing; an open section is stored and read back', () => {
    expect(serialiseOpen([])).toBeNull();
    wealthFolds.set('wealth:history', true);
    expect(JSON.parse(localStorage.getItem(WEALTH_FOLDS_KEY)!)).toEqual({version: 1, open: ['wealth:history']});
    expect([...wealthFolds.snapshot()]).toEqual(['wealth:history']);
    wealthFolds.set('wealth:history', false);
    expect(localStorage.getItem(WEALTH_FOLDS_KEY)).toBeNull();
    expect(wealthFolds.snapshot().size).toBe(0);
  });
  test('the snapshot is stable while nothing changes (useSyncExternalStore)', () => {
    wealthFolds.set('wealth:bills', true);
    expect(wealthFolds.snapshot()).toBe(wealthFolds.snapshot());
  });
});
