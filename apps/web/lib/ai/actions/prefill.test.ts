import {expect, test} from 'vitest';
import {PREFILL_KEY, pickerCategory, stashPrefill, takePrefill} from './prefill';

// ADR-012, Part 5: the money hand-off is a one-time read of plain field texts in this tab, never a write.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}
const draft = {category: 'Precious metals' as const, name: 'Gold coins', quantity: '2.5', currency: 'USD', value: '6200', symbol: 'XAU'};
test('a stashed hand-off is read exactly once and then gone', () => {
  const storage = new MemoryStorage();
  expect(stashPrefill(draft, 1_000, storage)).toBe(true);
  expect(JSON.parse(storage.getItem(PREFILL_KEY)!)).toEqual({version: 1, at: 1_000, ...draft});
  expect(takePrefill(2_000, storage)).toEqual(draft);
  expect(storage.getItem(PREFILL_KEY)).toBeNull(); expect(takePrefill(3_000, storage)).toBeNull();
});
test('stale, invalid or oversized hand-offs are dropped silently and never pre-fill anything', () => {
  const storage = new MemoryStorage();
  stashPrefill(draft, 0, storage); expect(takePrefill(11 * 60_000, storage)).toBeNull(); expect(storage.getItem(PREFILL_KEY)).toBeNull();
  storage.setItem(PREFILL_KEY, 'not json'); expect(takePrefill(0, storage)).toBeNull(); expect(storage.getItem(PREFILL_KEY)).toBeNull();
  storage.setItem(PREFILL_KEY, JSON.stringify({version: 1, at: 0, category: 'Wallet', name: 'x', quantity: '1', currency: 'USD'})); expect(takePrefill(0, storage)).toBeNull();
  storage.setItem(PREFILL_KEY, JSON.stringify({version: 1, at: 0, ...draft, extra: 'field'})); expect(takePrefill(0, storage)).toBeNull();
  expect(stashPrefill({...draft, quantity: 'two'}, 0, storage)).toBe(false); expect(storage.getItem(PREFILL_KEY)).toBeNull();
});
test('without a tab storage nothing is stashed or read', () => {
  expect(stashPrefill(draft, 0, undefined as unknown as Storage)).toBe(typeof window !== 'undefined');
  expect(pickerCategory('Custom asset')).toBe('Custom'); expect(pickerCategory('Cash')).toBe('Cash');
});
