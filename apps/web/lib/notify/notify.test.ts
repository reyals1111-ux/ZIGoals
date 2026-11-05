import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it, test} from 'vitest';
import {buildPlan, registrationKey, type PlanInput} from './plan';
import {emptyNotifyPrefs, notifyPrefsSchema, setType, setTime, typeOn} from './prefs';
import {addDays, wallClock, zonedInstant} from './zone';
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
function swSandbox({snapshot, failDb = false, fetchImpl, idb, cachesImpl}: {snapshot?: unknown; failDb?: boolean; fetchImpl?: (url: string, init?: unknown) => Promise<unknown>; idb?: unknown; cachesImpl?: unknown} = {}) {
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
  const context = vm.createContext({self, indexedDB: idb ?? fakeIdb, caches: cachesImpl ?? {keys: async () => [], open: async () => ({}), delete: async () => true}, fetch: fetchImpl ?? (async () => { throw Error('offline'); }), Request, Response, URL, Date, Promise, setTimeout, clearTimeout, Math, JSON, Number, String, Array, Set, Map, Object, Error, BigInt});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), context);
  const push = async () => { const waits: Promise<unknown>[] = []; handlers.push!({data: null, waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits); };
  return {handlers, shown, posted, push, compose: (self as unknown as {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: {action: string}[]; data: {url: string}}}).zigoalsCompose, appPath: (self as unknown as {zigoalsAppPath: (h: unknown) => string | null}).zigoalsAppPath};
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

// Session AK security review F3, F7, F8, I1: what the offline cache keeps, the unhashed files, databases the worker must
// not create, and the address a notification may open.
type FakeCache = {put: (r: {url: string}, v: unknown) => Promise<void>; match: (r: {url: string}) => Promise<unknown>; keys: () => Promise<unknown[]>; delete: () => Promise<boolean>};
function fakeCaches() {
  const stores = new Map<string, Map<string, unknown>>(), deleted: string[] = [];
  const open = async (name: string): Promise<FakeCache> => {
    const entries = stores.get(name) ?? new Map<string, unknown>(); stores.set(name, entries);
    return {put: async (r, v) => { entries.set(r.url, v); }, match: async r => entries.get(r.url), keys: async () => [...entries.keys()], delete: async () => true};
  };
  return {stores, deleted, impl: {open, keys: async () => [...stores.keys()], delete: async (name: string) => { deleted.push(name); stores.delete(name); return true; }}};
}
const ok = () => ({status: 200, type: 'basic', headers: new Headers(), clone() { return this; }});
const page = (path: string, rsc = false) => ({method: 'GET', url: 'https://app.test' + path, mode: rsc ? 'cors' : 'navigate', headers: new Headers(rsc ? {RSC: '1'} : {})});
async function fetchThrough(sw: ReturnType<typeof swSandbox>, request: unknown) {
  // Session AL (P-LS-38): a real FetchEvent has waitUntil, which the worker now uses to keep a page's plain copy after an
  // in-app visit; the fake event carries it too, and the test waits for that work like the browser would.
  let answer: Promise<unknown> | undefined;
  const waits: Promise<unknown>[] = [];
  sw.handlers.fetch!({request, respondWith: (p: Promise<unknown>) => { answer = p; }, waitUntil: (p: Promise<unknown>) => { waits.push(p); }});
  const result = answer ? await answer.catch(e => e) : 'not handled';
  await Promise.all(waits);
  return result;
}

describe('the service worker’s offline cache and openings (security review)', () => {
  it('F3: keeps a page only without a query (but _rsc); never the share target or an OAuth callback', async () => {
    const caches = fakeCaches(), fetched: string[] = [];
    const sw = swSandbox({cachesImpl: caches.impl, fetchImpl: async r => { fetched.push((r as unknown as {url: string}).url); return ok(); }});
    for (const path of ['/app/habits', '/app/share?title=Hi&text=secret&url=https%3A%2F%2Fx.test', '/app/share', '/app/goals/new?name=My%20plan', '/app/health?barcode=4006381333931', '/app/music/spotify?code=abc&state=xyz', '/app/music/spotify', '/app/chess?lichess=callback&code=abc&state=xyz', '/app/health?code=abc&state=xyz'])
      await fetchThrough(sw, page(path));
    await fetchThrough(sw, page('/app/habits?_rsc=1a2b', true));
    await fetchThrough(sw, page('/app/habits?view=list&_rsc=1a2b', true));
    expect(fetched).toHaveLength(11); // every one went to the network
    expect([...caches.stores.get('zigoals-pages-abc123')!.keys()].sort()).toEqual(['https://app.test/app/habits', 'https://app.test/app/habits?_rsc=1a2b']);
  });
  it('F3: offline, an address with a query opens its page’s plain copy; the share target gets the offline line', async () => {
    const caches = fakeCaches();
    (await caches.impl.open('zigoals-pages-abc123')).put({url: 'https://app.test/app/health'}, 'health page');
    (await caches.impl.open('zigoals-pages-abc123')).put({url: 'https://app.test/app/share'}, 'never stored, but even so');
    const sw = swSandbox({cachesImpl: caches.impl});
    expect(await fetchThrough(sw, page('/app/health?view=sleep'))).toBe('health page');
    const share = await fetchThrough(sw, page('/app/share?text=x')) as Response;
    expect(share.status).toBe(503);
  });
  it('F7: only hashed /_next/static files are cache-first; icons and the manifest come from the network, in this build’s cache', async () => {
    const caches = fakeCaches(), fetched: string[] = [];
    (await caches.impl.open('zigoals-static-v1')).put({url: 'https://app.test/_next/static/chunks/a.js'}, 'cached chunk');
    (await caches.impl.open('zigoals-static-v1')).put({url: 'https://app.test/icons/zigoals-192.png'}, 'old icon');
    const sw = swSandbox({cachesImpl: caches.impl, fetchImpl: async r => { fetched.push((r as unknown as {url: string}).url); return ok(); }});
    const get = (path: string) => ({method: 'GET', url: 'https://app.test' + path, mode: 'no-cors', headers: new Headers()});
    expect(await fetchThrough(sw, get('/_next/static/chunks/a.js'))).toBe('cached chunk');
    await fetchThrough(sw, get('/icons/zigoals-192.png'));
    await fetchThrough(sw, get('/manifest.webmanifest'));
    expect(fetched).toEqual(['https://app.test/icons/zigoals-192.png', 'https://app.test/manifest.webmanifest']);
    expect([...caches.stores.get('zigoals-assets-abc123')!.keys()]).toEqual(['https://app.test/icons/zigoals-192.png', 'https://app.test/manifest.webmanifest']);
    // A new build's worker drops the older build's pages and assets, and keeps the hashed files.
    (await caches.impl.open('zigoals-assets-old1'));
    (await caches.impl.open('zigoals-pages-old1'));
    const waits: Promise<unknown>[] = [];
    sw.handlers.activate!({waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits);
    expect(caches.deleted.sort()).toEqual(['zigoals-assets-old1', 'zigoals-pages-old1']);
  });
  it('F8: a missing database is never created: the upgrade is aborted, the push still shows one notification, a tap queues nothing', async () => {
    let aborted = 0, upgrades = 0;
    const idb = {open: (_name: string, version?: number) => {
      expect(version).toBeUndefined();
      const request: Record<string, unknown> = {transaction: {abort: () => { aborted++; }}};
      setTimeout(() => { upgrades++; (request.onupgradeneeded as () => void)(); (request.onerror as () => void)(); });
      return request;
    }};
    const sw = swSandbox({idb});
    await sw.push();
    expect(sw.shown).toHaveLength(1);
    const waits: Promise<unknown>[] = [];
    sw.handlers.notificationclick!({action: 'done', notification: {data: {items: [{kind: 'habit', id: 'h1', at: NOW}]}, close() {}}, waitUntil: (p: Promise<unknown>) => waits.push(p)});
    await Promise.all(waits);
    expect(aborted).toBe(upgrades);
    expect(aborted).toBeGreaterThan(1);
  });
  it('Session AK (journey bug J6-1): after "zigoals:sw-forget" the worker caches nothing more, empties its caches and answers', async () => {
    const caches = fakeCaches(), fetched: string[] = [];
    (await caches.impl.open('zigoals-static-v1')).put({url: 'https://app.test/_next/static/chunks/a.js'}, 'cached chunk');
    const sw = swSandbox({cachesImpl: caches.impl, fetchImpl: async r => { fetched.push((r as unknown as {url: string}).url); return ok(); }});
    const answers: unknown[] = [], waits: Promise<unknown>[] = [];
    sw.handlers.message!({data: {type: 'zigoals:sw-forget'}, ports: [{postMessage: (m: unknown) => answers.push(m)}], waitUntil: (p: Promise<unknown>) => waits.push(p)});
    await Promise.all(waits);
    expect(caches.deleted).toEqual(['zigoals-static-v1']);
    expect(answers).toEqual([{type: 'zigoals:sw-forgotten'}]);
    const get = (path: string) => ({method: 'GET', url: 'https://app.test' + path, mode: 'no-cors', headers: new Headers()});
    // The browser fetches them itself: the worker answers none, so no cache can come back.
    expect(await fetchThrough(sw, get('/_next/static/chunks/b.js'))).toBe('not handled');
    expect(await fetchThrough(sw, page('/app/habits'))).toBe('not handled');
    expect(await fetchThrough(sw, get('/icons/zigoals-192.png'))).toBe('not handled');
    expect([...caches.stores.keys()]).toEqual([]);
  });
  it('I1: a notification opens only this app’s /app addresses', async () => {
    const sw = swSandbox();
    for (const bad of ['//evil.test/app', '/\\evil.test/app', 'https://evil.test/app', 'javascript:alert(1)', '/settings', '/application', '', null])
      expect(sw.appPath(bad), String(bad)).toBeNull();
    expect(sw.appPath('/app/habits?x=1#y')).toBe('/app/habits?x=1#y');
    expect(sw.appPath('/app')).toBe('/app');
    expect(sw.compose({items: [{at: NOW, kind: 'water', id: 'water', href: '//evil.test/x'}]}, NOW).data.url).toBe('/app');
    const waits: Promise<unknown>[] = [];
    sw.handlers.notificationclick!({action: '', notification: {data: {url: '//evil.test/app'}, close() {}}, waitUntil: (p: Promise<unknown>) => waits.push(p)});
    await Promise.all(waits);
    expect(sw.posted).toEqual([{type: 'zigoals:push-open', url: '/app'}]);
  });
});

// Session AK (F5): supplement and medication reminders wake only when the person turned the type on, and never carry a
// name or a dose, even with names allowed (the plan gets times only).
test('supplement reminders: off by default; on, they wake at their times and are never named', () => {
  const supplements = [{id: 'supplement:supp_abcd:09:00', time: '09:00', weekdays: 127, doneToday: false}];
  expect(buildPlan(base({supplements})).snapshot.items.filter(i => i.kind === 'supplement')).toEqual([]);
  const prefs = {...emptyNotifyPrefs(), types: {supplements: true}};
  const items = buildPlan(base({supplements, prefs, labels: true})).snapshot.items.filter(i => i.kind === 'supplement');
  expect(items.length).toBeGreaterThan(0);
  for (const i of items) { expect(i.label).toBeUndefined(); expect(i.detail).toBeUndefined(); expect(i.href).toBe('/app/health'); }
});

// Owner follow-up 1 (F4): a governance vote reminder the person set is a one-off wake a day before voting ends, never
// named (the snapshot says only that a vote ends); inside quiet hours it moves to that morning.
test('vote reminders: a one-off at the morning of their day, never at the proposal\'s own minute, never named, never in quiet hours', () => {
  const day = wallClock(NOW, ZONE).date, tomorrow = addDays(day, 1);
  // Due tomorrow at 13:37 (a proposal's public end time minus a day): the wake is tomorrow's morning time, not 13:37.
  const plan = buildPlan(base({labels: true, votes: [{id: 'governance:zig-test-2:7', at: at(tomorrow, '13:37')}]}));
  expect(plan.registration.once).toEqual([Math.floor(at(tomorrow, '08:00') / 60000)]);
  expect(plan.snapshot.items.filter(i => i.kind === 'vote')).toEqual([{at: at(tomorrow, '08:00'), kind: 'vote', id: 'governance:zig-test-2:7', href: '/app/governance', actionable: false}]);
  // R3-F1: a morning inside quiet hours (07:30 with quiet 22:00–08:00) moves to the end of quiet hours.
  const early = buildPlan(base({prefs: setTime(emptyNotifyPrefs(), 'morning', '07:30'), quiet: {from: '22:00', to: '08:00'}, votes: [{id: 'governance:zig-test-2:8', at: at(tomorrow, '23:30')}]}));
  expect(early.snapshot.items.filter(i => i.kind === 'vote').map(i => i.at)).toEqual([at(tomorrow, '08:00')]);
  // Due today after the morning: it wakes now (rounded up to the minute), never at the proposal's minute.
  const late = buildPlan(base({now: at(day, '15:00') + 20_000, votes: [{id: 'governance:zig-test-2:9', at: at(day, '15:10')}]}));
  expect(late.registration.once).toEqual([Math.ceil((at(day, '15:00') + 20_000) / 60000)]);
});
