import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it, test} from 'vitest';
import {buildPlan, registrationKey, type PlanInput} from './plan';
import {emptyNotifyPrefs, notifyPrefsSchema, setType, setTime, typeOn} from './prefs';
import {zonedInstant} from './zone';
import {doneChange} from './actions';
import {createHabit, emptyHabitData, habitDay} from '../habits';

// Session AK Part 2 (ADR-036 Q3, A1, A2): the notification plan, the service worker's composer and push handler.
const ZONE = 'Europe/Brussels';
// Monday 2026-10-05 07:00 in Brussels (05:00Z).
const NOW = Date.UTC(2026, 9, 5, 5, 0), MIN = 60_000;
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 1, total: 4}, prices: [], ...over});
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);

describe('the plan', () => {
  it('turns reminders into wake minutes with weekday masks; one wake per minute; never a name in the registration', () => {
    const plan = buildPlan(base({labels: true, habits: [{id: 'h1', title: 'Walk', time: '08:30', weekdays: 127, doneToday: false}, {id: 'h2', title: 'Read', time: '08:30', weekdays: 1, doneToday: false}], water: {time: '10:00', toGo: '1.2 L', done: false}}));
    expect(plan.registration.wakes).toEqual([{m: 480, d: 127}, {m: 510, d: 127}, {m: 600, d: 127}]); // morning 08:00, habits 08:30, water 10:00
    expect(JSON.stringify(plan.registration)).not.toMatch(/Walk|Read|water|habit|1\.2/i);
    const names = plan.snapshot.items.filter(i => i.at === at('2026-10-05', '08:30')).map(i => i.label);
    expect(names.sort()).toEqual(['Read', 'Walk']);
    expect(plan.snapshot.items.find(i => i.kind === 'water')).toMatchObject({detail: '1.2 L to go', at: at('2026-10-05', '10:00')});
  });
  it('without the opt-in (or with the device lock) the snapshot holds no names and no amounts', () => {
    const plan = buildPlan(base({habits: [{id: 'h1', title: 'Walk', time: '08:30', weekdays: 127, doneToday: false}], contributions: [{goalId: '7', title: 'House', time: '09:00', date: '2026-10-05', amount: '€50', done: false}]}));
    expect(JSON.stringify(plan.snapshot)).not.toMatch(/Walk|House|€50/);
    expect(plan.snapshot.items.find(i => i.kind === 'contribution')).toMatchObject({id: 'contribution:7', href: '/app/goals/tracked/7?contribute=1'});
  });
  it('a habit done today skips today’s wake minute only when everything at that minute is done; tomorrow still wakes', () => {
    const plan = buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'morning', false), habits: [{id: 'h1', title: 'Walk', time: '08:30', weekdays: 127, doneToday: true}]}));
    expect(plan.registration.skips).toEqual([at('2026-10-05', '08:30') / MIN]);
    expect(plan.snapshot.items.filter(i => i.kind === 'habit').map(i => i.at)).toEqual([at('2026-10-06', '08:30')]);
    const shared = buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'morning', false), habits: [{id: 'h1', title: 'Walk', time: '08:30', weekdays: 127, doneToday: true}, {id: 'h2', title: 'Read', time: '08:30', weekdays: 127, doneToday: false}]}));
    expect(shared.registration.skips).toEqual([]);
  });
  it('quiet hours refuse a recurring time and say so; a switched-off type plans nothing', () => {
    const plan = buildPlan(base({habits: [{id: 'h1', title: 'Late', time: '23:00', weekdays: 127, doneToday: false}], windDown: {time: '21:30', doneToday: false}}));
    expect(plan.refused).toEqual([{kind: 'habit', time: '23:00'}]);
    expect(plan.registration.wakes.map(w => w.m)).toEqual([480, 1290]);
    const off = buildPlan(base({prefs: setType(setType(emptyNotifyPrefs(), 'morning', false), 'windDown', false), windDown: {time: '21:30', doneToday: false}}));
    expect(off.registration.wakes).toEqual([]);
  });
  it('the review wakes on its weekday only; contributions and bills are one-off wakes; the cap keeps the earliest', () => {
    const plan = buildPlan(base({review: {time: '18:00', weekday: 0}, contributions: [{goalId: '7', title: 'House', time: '09:00', date: '2026-10-05', amount: '', done: false}], bills: [{id: 'b1', title: 'Rent', due: '2026-10-10', amount: '€900'}]}));
    expect(plan.registration.wakes).toEqual([{m: 480, d: 127}, {m: 1080, d: 64}]);
    expect(plan.registration.once).toEqual([at('2026-10-05', '09:00') / MIN, at('2026-10-09', '08:00') / MIN]);
    const many = buildPlan(base({habits: Array.from({length: 60}, (_, i) => ({id: `h${i}`, title: `H${i}`, time: `${String(8 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`, weekdays: 127, doneToday: false}))}));
    expect(many.registration.wakes.length + many.registration.once.length).toBe(48);
    expect(many.dropped).toBeGreaterThan(0);
  });
  it('a one-off at a skipped minute keeps the minute; DST days plan the right instants', () => {
    const plan = buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'morning', false), habits: [{id: 'h1', title: 'Walk', time: '09:00', weekdays: 127, doneToday: true}], contributions: [{goalId: '7', title: 'House', time: '09:00', date: '2026-10-05', amount: '', done: false}]}));
    expect(plan.registration.skips).toEqual([]);
    const fallBack = buildPlan(base({now: Date.UTC(2026, 9, 24, 20, 0), prefs: emptyNotifyPrefs()}));
    expect(fallBack.snapshot.items.filter(i => i.kind === 'morning').map(i => new Date(i.at).toISOString())).toEqual(['2026-10-25T07:00:00.000Z', '2026-10-26T07:00:00.000Z']);
  });
  it('the registration key changes only with what the Worker gets', () => {
    const a = buildPlan(base()), b = buildPlan(base({orbit: {done: 3, total: 4}}));
    expect(registrationKey(ZONE, a.snapshot.quiet, a.registration)).toBe(registrationKey(ZONE, b.snapshot.quiet, b.registration));
  });
});

describe('the preferences', () => {
  it('defaults, loose reading, versioned', () => {
    const p = emptyNotifyPrefs();
    expect(typeOn(p, 'habits')).toBe(true); expect(typeOn(p, 'evening')).toBe(false);
    expect(notifyPrefsSchema.parse({version: 1, types: {habits: false, future: true}, extra: 1})).toMatchObject({types: {habits: false, future: true}});
    expect(() => setTime(p, 'morning', '25:00')).toThrow();
    expect(notifyPrefsSchema.safeParse({version: 2, types: {}}).success).toBe(false);
  });
});

type Shown = {title: string; options: {body: string; actions?: unknown[]; data?: {url: string; items: unknown[]}}};
function swSandbox({snapshot, failDb = false, fetchImpl}: {snapshot?: unknown; failDb?: boolean; fetchImpl?: (url: string, init?: unknown) => Promise<unknown>} = {}) {
  const handlers: Record<string, (e: unknown) => void> = {}, shown: Shown[] = [], posted: unknown[] = [];
  const store = new Map<string, unknown>([['snapshot', snapshot]]);
  const fakeIdb = {
    open: () => {
      const request: Record<string, unknown> = {};
      setTimeout(() => {
        if (failDb) { (request.onerror as () => void)?.(); return; }
        const db = {objectStoreNames: {contains: () => true}, close() {}, transaction: () => {
          const tx: Record<string, unknown> = {};
          const objectStore = {get: (key: string) => { const r = {result: store.get(key)}; setTimeout(() => (tx.oncomplete as () => void)?.()); return r; }, put: (value: unknown, key: string) => { store.set(key, value); setTimeout(() => (tx.oncomplete as () => void)?.()); }};
          tx.objectStore = () => objectStore; return tx;
        }};
        request.result = db; (request.onsuccess as () => void)?.();
      });
      return request;
    },
  };
  const self = {
    location: {href: 'https://app.test/sw.js?v=abc123', origin: 'https://app.test'},
    addEventListener: (type: string, handler: (e: unknown) => void) => { handlers[type] = handler; }, skipWaiting: async () => {},
    clients: {claim: async () => {}, matchAll: async () => [{postMessage: (m: unknown) => posted.push(m), focus: async () => {}}], openWindow: async () => null},
    registration: {active: null, showNotification: async (title: string, options: Shown['options']) => { shown.push({title, options}); }},
    crypto: {randomUUID: () => 'x'},
  };
  const context = vm.createContext({self, indexedDB: fakeIdb, caches: {keys: async () => [], open: async () => ({}), delete: async () => true}, fetch: fetchImpl ?? (async () => { throw Error('offline'); }), Request, Response, URL, Date, Promise, setTimeout, clearTimeout, Math, JSON, Number, String, Array, Set, Map, Object, Error, BigInt});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), context);
  const push = async () => { const waits: Promise<unknown>[] = []; handlers.push!({data: null, waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits); };
  return {handlers, shown, posted, push, compose: (self as unknown as {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: {action: string}[]; data: {url: string}}}).zigoalsCompose};
}

describe('the service worker', () => {
  const snap = (labels: boolean) => buildPlan(base({labels, habits: [{id: 'h1', title: 'Walk', time: '07:00', weekdays: 127, doneToday: false}, {id: 'h2', title: 'Read', time: '07:00', weekdays: 127, doneToday: false}], water: {time: '07:00', toGo: '1.2 L', done: false}})).snapshot;
  it('composes on the device: names only with the opt-in, otherwise counts; Done and Snooze for habits', () => {
    const {compose} = swSandbox();
    const named = compose(snap(true), NOW), counted = compose(snap(false), NOW);
    expect(named.body).toBe('Walk · Read · Water: 1.2 L to go');
    expect(counted.body).toBe('2 habits due · Water: 1.2 L to go');
    expect(named.actions.map(a => a.action)).toEqual(['done', 'snooze']);
    expect(named.data.url).toBe('/app/habits');
  });
  it('nothing due: a calm line, never nothing (A2); the morning summary counts the day and opens the Checklist', () => {
    const {compose} = swSandbox();
    expect(compose(snap(false), NOW + 5 * 3_600_000).body).toBe('Today: 1 of 4 done. Nothing is due right now.');
    expect(compose(null, NOW).body).toBe('Nothing is due right now.');
    const morning = buildPlan(base()).snapshot, note = compose(morning, at('2026-10-05', '08:00'));
    expect(note.body).toBe('Good morning. Today: 1 of 4 done.');
    expect(note.data.url).toBe('/app/checklist');
  });
  it('every push shows exactly one notification: with a snapshot, with none, and when IndexedDB fails (A2)', async () => {
    for (const setup of [{snapshot: snap(true)}, {snapshot: undefined}, {failDb: true}]) {
      const sw = swSandbox(setup);
      await sw.push();
      expect(sw.shown, JSON.stringify(setup).slice(0, 40)).toHaveLength(1);
      expect(sw.shown[0]!.title).toBe('ZIGoals');
    }
  });
  it('no push path can end without showNotification: the handler’s only exits show one', () => {
    const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const handler = source.slice(source.indexOf("addEventListener('push'"), source.indexOf("async function snooze"));
    expect(handler).toMatch(/showFor\(Date\.now\(\)\)\.catch\(\(\) => self\.registration\.showNotification\(/);
    const showFor = source.slice(source.indexOf('async function showFor'), source.indexOf("self.addEventListener('push'"));
    expect(showFor.match(/return/g)).toBeNull(); // no early return before showNotification
    expect(showFor).toContain('await self.registration.showNotification(');
  });
  it('a crossed price alert: the same rule as the app, both directions', () => {
    const {handlers} = swSandbox(); void handlers;
    const sw = swSandbox() as unknown as {compose: unknown}; void sw;
    const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
    vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
    const crossed = (sandbox as unknown as {self: {zigoalsCrossedAlerts: (w: unknown[], q: unknown[]) => {alertId: string}[]}}).self.zigoalsCrossedAlerts;
    const quotes = [{providerAssetId: 'bitcoin', currency: 'EUR', price: '6100000', priceDecimals: 2}];
    expect(crossed([{alertId: 'a', coin: 'bitcoin', currency: 'EUR', direction: 'above', price: '60000'}, {alertId: 'b', coin: 'bitcoin', currency: 'EUR', direction: 'below', price: '60000'}, {alertId: 'c', coin: 'bitcoin', currency: 'USD', direction: 'above', price: '1'}], quotes).map(w => w.alertId)).toEqual(['a']);
  });
  it('the offline cache never takes /api, another origin or anything but GET', () => {
    const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    expect(source).toContain("if (request.method !== 'GET') return;");
    expect(source).toContain("if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;");
    expect(source).toMatch(/response\.status === 200 && response\.type === 'basic'/);
  });
});

describe('applying a queued Done', () => {
  it('marks only habits still due on that day; an unknown or already-done habit is left alone', () => {
    let data = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), '00000000-0000-4000-8000-000000000001');
    const {change, ids} = doneChange({actionId: 'a', type: 'done', at: Date.UTC(2026, 9, 5, 7), date: '2026-10-05', items: [{kind: 'habit', id: '00000000-0000-4000-8000-000000000001', at: 0}, {kind: 'habit', id: 'gone', at: 0}, {kind: 'water', id: 'water', at: 0}]}, '2026-10-05');
    expect(ids).toEqual(['00000000-0000-4000-8000-000000000001', 'gone']);
    data = change(data);
    expect(habitDay(data.habits[0]!, '2026-10-05', '2026-10-05').status).toBe('complete');
    expect(change(data)).toEqual(data);
  });
});

test('the worker loads no other script: its own CSP (strict-dynamic, Trusted Types) would refuse importScripts', () => {
  const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  expect(source).not.toMatch(/importScripts\s*\(/);
});
