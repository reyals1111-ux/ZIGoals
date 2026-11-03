import {beforeEach, expect, test, vi} from 'vitest';
import {createHabit, emptyHabitData, type HabitData} from '../habits';
import {AI_OPTIONS_KEY} from '../ai/store/keys';
import {REMINDERS_KEY} from '../reminders/schema';

// Session AK security review F4: notification names follow ADR-010's rule (lib/push/labels-sync.ts): a habit linked to
// Health never shows its name, and when the links cannot be read no name shows at all.
const store = new Map<string, string>();
const storage = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, key: () => null, clear: () => store.clear(), get length() { return store.size; }} as Storage;
const state = vi.hoisted(() => ({habits: undefined as HabitData | undefined, links: {data: {version: 1, links: {} as Record<string, unknown>, applied: []}, unreadable: false}}));
vi.mock('../showcase-storage', () => ({getAppStorage: () => storage, isShowcase: () => false}));
vi.mock('../push/support', () => ({deviceZone: () => 'Europe/Brussels'}));
vi.mock('../push/device', () => ({storedHabits: async () => state.habits}));
vi.mock(import('../habit-health-links/store'), async importOriginal => ({...await importOriginal(), readHabitHealthLinks: () => state.links as never}));
const {currentPlan, gatherPlanInput} = await import('./sync');

const WALK = '00000000-0000-4000-8000-000000000001', STEPS = '00000000-0000-4000-8000-000000000002';
const NOW = Date.UTC(2026, 9, 5, 5, 0); // Monday 07:00 in Brussels
beforeEach(() => {
  store.clear();
  let data = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), WALK);
  data = createHabit(data, {title: '10k steps', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), STEPS);
  state.habits = data;
  state.links = {data: {version: 1, links: {[STEPS]: {}}, applied: []}, unreadable: false};
  store.set(AI_OPTIONS_KEY, JSON.stringify({version: 1, notificationNames: true}));
  store.set(REMINDERS_KEY, JSON.stringify({version: 1, habits: {[WALK]: {time: '08:30'}, [STEPS]: {time: '08:30'}}, dismissed: {}}));
});

test('F4: a Health-linked habit carries no title; the others keep theirs', async () => {
  const input = (await gatherPlanInput(NOW))!;
  expect(input.labels).toBe(true);
  expect(input.habits.find(h => h.id === WALK)).toMatchObject({title: 'Walk'});
  expect(input.habits.find(h => h.id === STEPS)).not.toHaveProperty('title');
  const snapshot = (await currentPlan(NOW))!.snapshot;
  expect(snapshot.items.filter(i => i.kind === 'habit' && i.id === WALK).every(i => i.label === 'Walk')).toBe(true);
  expect(snapshot.items.filter(i => i.kind === 'habit' && i.id === STEPS).every(i => i.label === undefined)).toBe(true);
  expect(JSON.stringify(snapshot)).not.toContain('10k steps');
});

test('F4: unreadable Health links: no names at all', async () => {
  state.links = {data: {version: 1, links: {}, applied: []}, unreadable: true};
  const input = (await gatherPlanInput(NOW))!;
  expect(input.labels).toBe(false);
  const snapshot = (await currentPlan(NOW))!.snapshot;
  expect(JSON.stringify(snapshot)).not.toMatch(/Walk|10k steps/);
});
