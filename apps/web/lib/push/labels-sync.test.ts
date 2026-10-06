import {beforeEach, expect, it, vi} from 'vitest';
import {createHabit, emptyHabitData, HABITS_KEY} from '../habits';
import {REMINDERS_KEY} from '../reminders/schema';
import {AI_OPTIONS_KEY} from '../ai/store/keys';
import {PUSH_KEY} from './client';

// Session V Part 13: the names table's syncs take turns. Found on the phone run: a sync that read the switch as off (it
// began with a reminder change) deleted the table after the switch's own sync had written it.
const calls: string[] = [];
let release: () => void = () => undefined;
vi.mock('./labels-db', () => ({
  clearPushLabels: vi.fn(async () => { calls.push('clear:start'); await new Promise<void>(resolve => { release = resolve; }); calls.push('clear:end'); }),
  writePushLabels: vi.fn(async (rows: {label: string}[]) => { calls.push(`write:${rows.map(r => r.label).join(',')}`); }),
}));
const store = new Map<string, string>();
vi.mock('../showcase-storage', () => ({getAppStorage: () => ({getItem: (key: string) => store.get(key) ?? null}), isShowcase: () => false}));
const {syncPushLabels} = await import('./labels-sync');
const HABIT = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  calls.length = 0; store.clear();
  store.set(PUSH_KEY, JSON.stringify({version: 1, subscriptionId: '00000000-0000-4000-8000-0000000000aa', endpointHash: 'a'.repeat(64), quiet: {from: '22:00', to: '07:00'}, lastSyncDay: '2026-10-06'}));
  store.set(HABITS_KEY, JSON.stringify(createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), HABIT)));
  store.set(REMINDERS_KEY, JSON.stringify({version: 1, habits: {[HABIT]: {time: '07:30'}}, dismissed: {}}));
});
it('a delete that began while the switch was off finishes before the newer write, never after it', async () => {
  store.set(AI_OPTIONS_KEY, JSON.stringify({version: 1, notificationNames: false}));
  const first = syncPushLabels();
  await vi.waitFor(() => expect(calls).toEqual(['clear:start']));
  store.set(AI_OPTIONS_KEY, JSON.stringify({version: 1, notificationNames: true}));
  const second = syncPushLabels();
  // The write waits for its turn.
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(calls).toEqual(['clear:start']);
  release();
  await Promise.all([first, second]);
  expect(calls).toEqual(['clear:start', 'clear:end', 'write:Stretch']);
});
it('each sync reads the records when its turn comes', async () => {
  store.set(AI_OPTIONS_KEY, JSON.stringify({version: 1, notificationNames: true}));
  await syncPushLabels();
  expect(calls).toEqual(['write:Stretch']);
  store.delete(PUSH_KEY);
  const off = syncPushLabels();
  await vi.waitFor(() => expect(calls).toEqual(['write:Stretch', 'clear:start']));
  release(); await off;
  expect(calls.at(-1)).toBe('clear:end');
});
