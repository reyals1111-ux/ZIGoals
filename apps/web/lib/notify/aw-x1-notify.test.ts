import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, withSnoozes, SNOOZE_MS, type PlanInput, type Snapshot} from './plan';
import {snoozedTaskSeries} from './actions';
import {DEFAULT_ON, emptyNotifyPrefs, NOTIFY_LABELS, NOTIFY_TYPES} from './prefs';
import {zonedInstant} from './zone';
import {snoozeButton} from '../tasks/snooze-choices';

/**
 * Session AW (X1, LEDGER #438–#440; TIER 3 (PWA)): on the notifications — a task reminder's repeats share its first ring's
 * id (Done or Snooze ends them all, their wakes leave), the snooze button can be the person's own first choice, and a
 * named timer's end wakes the device at its minute, by name only where names are allowed.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 10, 25, 16, 0); // Wednesday 17:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
type Note = {body: string; actions: {action: string; title: string}[]; data: {url: string; items?: unknown[]}};
function worker(snapshot?: unknown, fetched: unknown[] = []) {
  const handlers: Record<string, (e: unknown) => void> = {}, store = new Map<unknown, unknown>([['snapshot', snapshot], ['device', {id: 'd', secret: 's'}], ['registration', {body: {wakes: [], once: [], skips: []}}]]);
  const idb = {open: () => {
    const request: Record<string, unknown> = {};
    setTimeout(() => {
      const db = {objectStoreNames: {contains: () => true}, close() {}, transaction: () => {
        const tx: Record<string, unknown> = {};
        const s = {get: (k: string) => { const r = {result: store.get(k)}; setTimeout(() => (tx.oncomplete as () => void)?.()); return r; }, put: (v: {actionId?: string}, k?: string) => { store.set(k ?? `action:${v.actionId}`, v); setTimeout(() => (tx.oncomplete as () => void)?.()); }};
        tx.objectStore = () => s; return tx;
      }};
      request.result = db; (request.onsuccess as () => void)?.();
    });
    return request;
  }};
  const self = {location: {href: 'https://app.test/sw.js?v=abc123', origin: 'https://app.test'}, addEventListener: (t: string, h: (e: unknown) => void) => { handlers[t] = h; }, skipWaiting: async () => {},
    clients: {claim: async () => {}, matchAll: async () => [], openWindow: async () => null}, registration: {active: null, showNotification: async () => {}}, crypto: {randomUUID: () => 'tap'}};
  const fetchImpl = async (url: string, init: {body: string}) => { fetched.push({url, body: JSON.parse(init.body)}); return {ok: true}; };
  const context = vm.createContext({self, indexedDB: idb, caches: {keys: async () => [], open: async () => ({}), delete: async () => true}, fetch: fetchImpl, Request, Response, URL, Date, Promise, setTimeout, clearTimeout, Math, JSON, Number, String, Array, Set, Map, Object, Error, BigInt});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), context);
  const s = self as unknown as {zigoalsCompose: (snap: unknown, now: number) => Note; zigoalsSnoozeUntil: (snap: unknown, now: number) => number};
  const click = async (action: string, items: unknown[]) => { const waits: Promise<unknown>[] = []; handlers.notificationclick!({action, notification: {data: {items}, close() {}}, waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits); };
  return {compose: s.zigoalsCompose, snoozeUntil: s.zigoalsSnoozeUntil, click, store};
}

describe('remind again on the notifications (LEDGER #438)', () => {
  const first = at('2026-11-25', '18:00');
  const tasks = [0, 1, 2].map(k => ({id: 'task_a', title: 'Call mum', at: first + k * 600_000, series: first}));
  it('each repeat is a wake of its own, under the first ring’s id; Done names the task', () => {
    const plan = buildPlan(base({tasks}));
    expect(plan.snapshot.items.filter(i => i.kind === 'task').map(i => [i.id, i.at])).toEqual(tasks.map(t => [`task:task_a@${first}`, t.at]));
    expect(plan.registration.once).toEqual(tasks.map(t => Math.floor(t.at / 60000)));
  });
  it('Done on any ring removes the later repeats and their wake minutes', async () => {
    const plan = buildPlan(base({tasks})), fetched: {body: {once: number[]}}[] = [];
    const sw = worker(plan.snapshot, fetched);
    sw.store.set('registration', {body: plan.registration});
    const realNow = Date.now; Date.now = () => first + 30_000;
    try { await sw.click('done', [{kind: 'task', id: `task:task_a@${first}`, at: first}]); } finally { Date.now = realNow; }
    expect((sw.store.get('snapshot') as Snapshot).items.filter(i => i.kind === 'task')).toEqual([]);
    expect(fetched.at(-1)!.body.once).toEqual([]);
  });
  it('Snooze moves the ring once and drops its repeats; the tap carries when it ends', async () => {
    const now = first + 60_000, plan = buildPlan(base({tasks, now: first - 60_000})), fetched: {body: {once: number[]}}[] = [];
    const sw = worker({...plan.snapshot, snooze: snoozeButton({for: 120}, now, ZONE)}, fetched);
    sw.store.set('registration', {body: plan.registration});
    const realNow = Date.now; Date.now = () => now;
    try { await sw.click('snooze', [{kind: 'task', id: `task:task_a@${first}`, at: first}]); } finally { Date.now = realNow; }
    const items = (sw.store.get('snapshot') as Snapshot).items.filter(i => i.kind === 'task');
    expect(items.map(i => i.at)).toEqual([now + 7_200_000]);
    expect(fetched.at(-1)!.body.once).toEqual([Math.floor((now + 7_200_000) / 60000)]);
    const tap = [...sw.store.values()].find(v => (v as {type?: string})?.type === 'snooze') as {until: number};
    expect(tap.until).toBe(now + 7_200_000);
    expect(snoozedTaskSeries({items: [{kind: 'task', id: `task:task_a@${first}`, at: first}, {kind: 'habit', id: 'h1', at: first}]})).toEqual([{id: 'task_a', at: first}]);
  });
  it('a snooze tap with its own end keeps it in the plan, never twice for a task the page already snoozed', () => {
    // The notification shows up to three minutes before its ring (the wake's minute): the tap is just before it.
    const tap = first - 60_000, until = tap + 7_200_000;
    const kept = withSnoozes(buildPlan(base({now: tap + 60_000})), base({tasks: [{id: 'task_a', title: 'x', at: first}]}), [{at: tap, until, items: [{kind: 'task', id: `task:task_a@${first}`, at: first}]}], tap + 60_000);
    expect(kept.snapshot.items.filter(i => i.kind === 'task').map(i => i.at)).toEqual([until]);
    expect(kept.registration.once).toContain(Math.floor(until / 60000));
    // The page wrote the snooze on the task: the plan holds its ring at `until` already.
    const already = withSnoozes(buildPlan(base({now: tap + 60_000, tasks: [{id: 'task_a', title: 'x', at: until}]})), base({tasks: [{id: 'task_a', title: 'x', at: first}]}), [{at: tap, until, items: [{kind: 'task', id: `task:task_a@${first}`, at: first}]}], tap + 60_000);
    expect(already.snapshot.items.filter(i => i.kind === 'task')).toHaveLength(1);
    // Without its own end: an hour, as before.
    expect(withSnoozes(buildPlan(base({now: tap + 60_000})), base({tasks: [{id: 'task_a', title: 'x', at: first}]}), [{at: tap, items: [{kind: 'task', id: `task:task_a@${first}`, at: first}]}], tap + 60_000).snapshot.items.filter(i => i.kind === 'task').map(i => i.at)).toEqual([tap + SNOOZE_MS]);
  });
});
describe('own snooze choices on the notification (LEDGER #439)', () => {
  it('the first own choice names the button and sets its length; without, "Snooze 1 h"', () => {
    const tasks = [{id: 'task_a', title: 'Call mum', at: NOW + 60_000}];
    const plain = buildPlan(base({tasks})).snapshot, own = buildPlan(base({tasks, snoozeButton: snoozeButton({for: 120}, NOW, ZONE)})).snapshot;
    const sw = worker();
    expect(sw.compose(plain, NOW + 60_000).actions).toEqual([{action: 'done', title: 'Done'}, {action: 'snooze', title: 'Snooze 1 h'}]);
    expect(sw.compose(own, NOW + 60_000).actions).toEqual([{action: 'done', title: 'Done'}, {action: 'snooze', title: 'Snooze 2 h'}]);
    expect(sw.snoozeUntil(plain, NOW)).toBe(NOW + 3_600_000);
    expect(sw.snoozeUntil(own, NOW)).toBe(NOW + 7_200_000);
  });
  it('a choice at a time: the worker takes the step that has begun', () => {
    const snap = {snooze: snoozeButton({at: '19:00', day: 'next'}, NOW, ZONE)}, sw = worker();
    expect(sw.snoozeUntil(snap, NOW)).toBe(at('2026-11-25', '19:00'));
    expect(sw.snoozeUntil(snap, at('2026-11-25', '19:30'))).toBe(at('2026-11-26', '19:00'));
    expect(sw.snoozeUntil({snooze: {title: 'x', steps: [[0, 5]]}}, NOW)).toBe(NOW + 3_600_000);
  });
});
describe('named timers on the notifications (LEDGER #440)', () => {
  const ends = NOW + 9 * 60_000 + 30_000;
  it('a switch of its own, on by default, with its words', () => {
    expect(NOTIFY_TYPES).toContain('timers');
    expect(DEFAULT_ON.timers).toBe(true);
    expect(NOTIFY_LABELS.timers.blurb).toContain('its name only if names are on');
  });
  it('a wake at the minute it ends, never before; its name only with names on', () => {
    const plan = buildPlan(base({timers: [{id: 'tm-a', name: 'Pasta', at: ends}]}));
    expect(plan.registration.once).toEqual([Math.ceil(ends / 60000)]);
    expect(plan.snapshot.items.filter(i => i.kind === 'timer')).toEqual([{at: ends, kind: 'timer', id: `timer:tm-a@${ends}`, href: '/app/tasks?timers=1', actionable: false}]);
    expect(buildPlan(base({labels: true, timers: [{id: 'tm-a', name: 'Pasta', at: ends}]})).snapshot.items.find(i => i.kind === 'timer')!.label).toBe('Pasta');
  });
  it('switched off: no wake; inside quiet hours: said on the card, no wake', () => {
    expect(buildPlan(base({prefs: {...emptyNotifyPrefs(), types: {timers: false}}, timers: [{id: 'tm-a', at: ends}]})).registration.once).toEqual([]);
    const late = at('2026-11-25', '23:10'), quiet = buildPlan(base({timers: [{id: 'tm-a', at: late}]}));
    expect(quiet.registration.once).toEqual([]);
    expect(quiet.refused).toEqual([{kind: 'timer', time: '23:10'}]);
  });
  it('the worker says it in words, with no Snooze', () => {
    const sw = worker(), named = buildPlan(base({labels: true, timers: [{id: 'tm-a', name: 'Pasta', at: ends}]})).snapshot, plain = buildPlan(base({timers: [{id: 'tm-a', name: 'Pasta', at: ends}, {id: 'tm-b', at: ends}]})).snapshot;
    expect(sw.compose(named, ends + 20_000)).toMatchObject({body: 'Pasta timer is done', actions: [], data: {url: '/app/tasks?timers=1'}});
    expect(sw.compose(plain, ends + 20_000).body).toBe('2 timers are done');
  });
});
