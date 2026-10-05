import {describe, expect, it} from 'vitest';
import {MAX_REMEMBERED_FOLDS, TODAY_FOLDS_KEY, isFoldOpen, readTodayFolds, rememberFold} from './today-folds';
import {NON_PERSONAL_KEYS} from './onboarding';
import {DEVICE_KEYS} from './export/everything';

/** A Storage stand-in that records writes. */
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial)), writes: string[] = [];
  return {writes, values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); values.set(k, v); }};
}
describe("Today's remembered folds (Session V Part 1b)", () => {
  it('reads as all folded when nothing is stored, and reading never writes', () => {
    const storage = memory();
    expect(readTodayFolds(storage)).toEqual({version: 1, open: {}});
    expect(storage.writes).toEqual([]);
  });
  it('remembers an opened row and forgets it when closed again', () => {
    const storage = memory();
    expect(isFoldOpen(rememberFold(storage, 'preset-habits-health-0', true), 'preset-habits-health-0')).toBe(true);
    expect(isFoldOpen(readTodayFolds(storage), 'preset-habits-health-0')).toBe(true);
    expect(isFoldOpen(rememberFold(storage, 'preset-habits-health-0', false), 'preset-habits-health-0')).toBe(false);
    expect(JSON.parse(storage.values.get(TODAY_FOLDS_KEY)!)).toEqual({version: 1, open: {}});
  });
  it('unreadable bytes read as folded and are left untouched by a read', () => {
    for (const raw of ['not json', '{"version":2,"open":{}}', '{"version":1,"open":{"a":false}}', '{"version":1,"open":{},"extra":1}']) {
      const storage = memory({[TODAY_FOLDS_KEY]: raw});
      expect(readTodayFolds(storage)).toEqual({version: 1, open: {}});
      expect(storage.values.get(TODAY_FOLDS_KEY)).toBe(raw);
      expect(storage.writes).toEqual([]);
    }
  });
  it('an unknown widget id is kept but means nothing for the widgets that exist', () => {
    const storage = memory({[TODAY_FOLDS_KEY]: JSON.stringify({version: 1, open: {'widget-that-was-removed': true}})});
    const folds = readTodayFolds(storage);
    expect(isFoldOpen(folds, 'preset-balanced-0')).toBe(false);
    expect(isFoldOpen(folds, 'widget-that-was-removed')).toBe(true);
  });
  it('keeps at most 64 open rows, the newest winning', () => {
    const storage = memory();
    for (let i = 0; i < MAX_REMEMBERED_FOLDS + 5; i++) rememberFold(storage, `w${i}`, true);
    const folds = readTodayFolds(storage);
    expect(Object.keys(folds.open)).toHaveLength(MAX_REMEMBERED_FOLDS);
    expect(isFoldOpen(folds, 'w0')).toBe(false);
    expect(isFoldOpen(folds, `w${MAX_REMEMBERED_FOLDS + 4}`)).toBe(true);
  });
  it('a refusing storage throws with nothing written', () => {
    const storage = {getItem: () => null, setItem: () => { throw Error('QuotaExceededError'); }};
    expect(() => rememberFold(storage, 'w1', true)).toThrow();
  });
  it('is a display preference for the welcome check and travels in Export everything', () => {
    expect(NON_PERSONAL_KEYS).toContain(TODAY_FOLDS_KEY);
    expect(Object.values(DEVICE_KEYS)).toContain(TODAY_FOLDS_KEY);
  });
});
