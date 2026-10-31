// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildPlan, SNOOZE_MS, withSnoozes, type PlanInput} from './plan';
import {emptyNotifyPrefs} from './prefs';
import {zonedInstant} from './zone';
import {createHabit, emptyHabitData, HABITS_KEY, type HabitData} from '../habits';
import type {QueuedAction} from './db';

// Session AK journey bugs J5-1 and J5-2 (docs/review/session-ak/JOURNEY_BUGS.md).
const ZONE = 'Europe/Brussels', MIN = 60_000;
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (now: number, over: Partial<PlanInput> = {}): PlanInput => ({now, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 1}, prices: [], ...over});
// What the composer (public/sw.js) shows: items from 35 minutes before to 3 minutes after the push.
const due = <T extends {at: number}>(items: T[], now: number) => items.filter(i => i.at >= now - 35 * MIN && i.at <= now + 3 * MIN);

describe('J5-2: a "Snooze 1 h" survives the page rewriting the snapshot', () => {
  const remind = at('2026-10-05', '09:00'), tap = remind + 2 * MIN, until = tap + SNOOZE_MS;
  const habit = (doneToday: boolean) => ({id: 'h1', title: 'Walk', time: '09:00', weekdays: 127, doneToday});
  const snooze = {at: tap, items: [{kind: 'habit', id: 'h1', at: remind}]};
  it('the page\'s plan, rewritten during the hour, keeps the snoozed item an hour on, and its wake minute', () => {
    for (const now of [tap + MIN, tap + 30 * MIN, until - MIN, until]) {
      const input = base(now, {habits: [habit(false)]}), plan = withSnoozes(buildPlan(input), input, [snooze], now);
      expect(due(plan.snapshot.items, until).map(i => [i.kind, i.id, i.at, i.label])).toEqual([['habit', 'h1', until, 'Walk']]);
      if (now < until) expect(plan.registration.once).toContain(Math.floor(until / MIN));
      // Without the snooze (the old behaviour) the push an hour later finds nothing due.
      expect(due(buildPlan(input).snapshot.items, until)).toEqual([]);
    }
  });
  it('a habit done since, a snooze long past, or none at all: nothing comes back', () => {
    const now = tap + 10 * MIN, input = base(now, {habits: [habit(true)]});
    expect(due(withSnoozes(buildPlan(input), input, [snooze], now).snapshot.items, until)).toEqual([]);
    const later = until + SNOOZE_MS + MIN, laterInput = base(later, {habits: [habit(false)]}), plain = buildPlan(laterInput);
    expect(withSnoozes(plain, laterInput, [snooze], later)).toBe(plain);
    expect(withSnoozes(plain, laterInput, [], later)).toBe(plain);
  });
});

// J5-1: Done (and its Undo) from a notification is announced, so the open page and the snapshot follow.
const store = vi.hoisted(() => ({data: null as unknown, actions: [] as unknown[]}));
vi.mock('../showcase-storage', () => ({getAppStorage: () => ({getItem: () => null, setItem() {}, removeItem() {}}), isShowcase: () => false}));
vi.mock('../vault/local', () => ({isDurableMarker: () => false, updateDurableStore: async () => { throw Error('not used'); }}));
vi.mock('../private-storage', () => ({updatePrivateStore: async (_s: unknown, _k: string, _schema: unknown, _empty: unknown, change: (d: unknown) => unknown) => { store.data = change(store.data); return store.data; }}));
vi.mock('./db', () => ({
  readActions: async () => store.actions,
  claimAction: async (id: string) => { const a = (store.actions as QueuedAction[]).find(x => x.actionId === id); if (!a || a.applied !== undefined) return false; a.applied = 1; return true; },
  pruneActions: async () => {},
}));

describe('J5-1: Done and its Undo from a notification tell the open page', () => {
  const ID = '00000000-0000-4000-8000-000000000001';
  let events: string[] = [];
  const listen = (e: Event) => { events.push((e as CustomEvent<string>).detail); };
  beforeEach(() => { events = []; window.addEventListener('zigoals:private-change', listen); vi.stubGlobal('BroadcastChannel', undefined); });
  afterEach(() => { window.removeEventListener('zigoals:private-change', listen); vi.unstubAllGlobals(); });
  it('announces the habits after the Done write and again after its Undo', async () => {
    const {applyQueuedActions} = await import('./actions');
    store.data = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), ID) satisfies HabitData;
    store.actions = [{actionId: 'a1', type: 'done', at: Date.UTC(2026, 9, 5, 7), date: '2026-10-05', items: [{kind: 'habit', id: ID, at: 0}]} satisfies QueuedAction];
    const [applied] = await applyQueuedActions('2026-10-05');
    expect(applied?.message).toBe('Walk marked done from a notification');
    expect(events).toEqual([HABITS_KEY]);
    await applied!.undo!();
    expect(events).toEqual([HABITS_KEY, HABITS_KEY]);
  });
});

describe('J5-2: the page reads the worker\'s queued snoozes for its refresh', () => {
  it('every "Snooze 1 h" tap, applied or not; never a Done', async () => {
    const {queuedSnoozes} = await import('./device');
    store.actions = [{actionId: 's1', type: 'snooze', at: 5, applied: 6, items: [{kind: 'habit', id: 'h1', at: 1}]}, {actionId: 'd1', type: 'done', at: 7, items: [{kind: 'habit', id: 'h2', at: 1}]}] satisfies QueuedAction[];
    expect(await queuedSnoozes()).toEqual([{at: 5, items: [{kind: 'habit', id: 'h1', at: 1}]}]);
  });
});
