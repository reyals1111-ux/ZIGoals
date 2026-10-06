import 'fake-indexeddb/auto';
import {afterEach, expect, it, vi} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, HABITS_KEY} from '../habits';
import {enableDurableStore, isDurableMarker, localDatabase} from '../vault/local';
import {storedHabits} from './device';

// Session V Part 13 found a T bug: once the account vault keeps the habits in its durable store, the browser key holds
// only a pointer, and the push schedule (and the reminder names) read no habits at all, so every habit reminder was
// left out. The pointer is now followed.
function storage(): Storage {
  const m = new Map<string, string>();
  return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()};
}
afterEach(() => { vi.unstubAllGlobals(); });
it('the plain record, then the same habits behind the durable pointer; anything unreadable is no habits', async () => {
  vi.stubGlobal('navigator', {locks: {request: async (_key: string, run: () => unknown) => run()}});
  const s = storage(), data = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), '00000000-0000-4000-8000-000000000001');
  expect(await storedHabits(s)).toBeUndefined();
  s.setItem(HABITS_KEY, JSON.stringify(data));
  expect((await storedHabits(s))?.habits.map(h => h.title)).toEqual(['Stretch']);
  await enableDurableStore(s, HABITS_KEY, habitDataSchema, emptyHabitData);
  expect(isDurableMarker(s.getItem(HABITS_KEY))).toBe(true);
  expect(habitDataSchema.safeParse(JSON.parse(s.getItem(HABITS_KEY)!)).success).toBe(false);
  expect((await storedHabits(s))?.habits.map(h => h.title)).toEqual(['Stretch']);
  s.setItem(HABITS_KEY, '{broken');
  expect(await storedHabits(s)).toBeUndefined();
  localDatabase.close();
});
