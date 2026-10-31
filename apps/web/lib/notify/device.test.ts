import {afterEach, beforeEach, expect, test, vi} from 'vitest';

// Session AK security review F2 and F8: this device's notification switch against fakes of its IndexedDB, its worker
// registration, the plan and /api/push-device. Nothing here reaches a network or a browser.
const kv = new Map<string, unknown>();
const db = vi.hoisted(() => ({readActions: vi.fn(async () => []), forget: vi.fn(async () => {})}));
vi.mock('./db', () => ({
  kvGet: async (key: string) => kv.get(key),
  kvPut: async (key: string, value: unknown) => { kv.set(key, value); },
  kvDelete: async (key: string) => { kv.delete(key); },
  readActions: db.readActions,
  forgetNotifyDatabases: db.forget,
}));
const plan = vi.hoisted(() => ({registration: {wakes: [{m: 480, d: 127}], once: [] as number[], skips: [] as number[]}}));
vi.mock('./sync', () => ({currentPlan: async () => ({snapshot: {v: 1, quiet: {from: '22:00', to: '07:00'}, items: []}, registration: plan.registration, refused: [], dropped: 0})}));
const reg = vi.hoisted(() => ({shown: [] as {close: () => void}[], subscription: {endpoint: 'https://fcm.googleapis.com/wp/abc', unsubscribe: async () => true}}));
const fakeRegistration = () => ({getNotifications: async () => reg.shown, pushManager: {getSubscription: async () => reg.subscription, subscribe: async () => reg.subscription}});
vi.mock('../sw/register', () => ({appRegistration: async () => fakeRegistration(), registerAppWorker: async () => fakeRegistration()}));
vi.mock('../showcase-storage', () => ({getAppStorage: () => ({getItem: () => null, setItem() {}, removeItem() {}}), isShowcase: () => false}));
vi.mock('../account-session', () => ({getAccountScope: () => null}));
vi.mock('../push/client', () => ({applicationServerKey: () => new Uint8Array(65), clearPushRecord() {}, postPush: async () => ({}), readPushRecord: () => ({data: null})}));
vi.mock('../push/support', () => ({deviceZone: () => 'Europe/Brussels'}));
const {refreshNotifications, sendTestNotification, turnOffNotifications, turnOnNotifications} = await import('./device');

const ID = {id: '11111111-1111-4111-8111-111111111111', secret: 'a'.repeat(43)};
let calls: {method: string; body: unknown}[] = [];
beforeEach(() => {
  kv.clear(); calls = []; reg.shown = []; db.readActions.mockClear(); db.forget.mockClear();
  plan.registration = {wakes: [{m: 480, d: 127}], once: [], skips: []};
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({method: String(init.method), body: init.body ? JSON.parse(String(init.body)) : null});
    return init.method === 'DELETE' ? Response.json({error: 'DEVICE_UNKNOWN'}, {status: 404}) : Response.json({registered: true});
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

test('F2: with nothing to wake for, the device’s server record leaves (DELETE), once per change; a reminder registers again', async () => {
  kv.set('device', ID);
  plan.registration = {wakes: [], once: [], skips: []};
  expect(await refreshNotifications({now: 1_000})).toMatchObject({ok: true, sent: true});
  expect(calls).toEqual([{method: 'DELETE', body: ID}]);
  expect(kv.get('device')).toEqual(ID); // the identity stays; only the server record left
  // The same empty plan again, even a day later: nothing is sent.
  expect(await refreshNotifications({now: 1_000 + 30 * 3_600_000})).toMatchObject({ok: true, sent: false});
  expect(calls).toHaveLength(1);
  expect(await sendTestNotification()).toMatch(/^Nothing is set to notify yet\./);
  expect(calls).toHaveLength(1);
  // A reminder comes back: one PUT with it.
  plan.registration = {wakes: [{m: 480, d: 127}], once: [], skips: []};
  expect(await refreshNotifications({now: 2_000})).toMatchObject({ok: true, sent: true});
  expect(calls[1]).toMatchObject({method: 'PUT', body: {...ID, wakes: [{m: 480, d: 127}], once: []}});
});

test('F8: turning off closes the notifications already shown, then forgets the device', async () => {
  kv.set('device', ID);
  const closed: number[] = [];
  reg.shown = [{close: () => closed.push(1)}, {close: () => closed.push(2)}];
  await turnOffNotifications();
  expect(closed).toEqual([1, 2]);
  expect(calls).toEqual([{method: 'DELETE', body: ID}]);
  expect(db.forget).toHaveBeenCalledTimes(1);
});

test('F8: turning on makes the action queue itself (the service worker never creates a database)', async () => {
  vi.stubGlobal('Notification', {requestPermission: async () => 'granted'});
  vi.stubGlobal('navigator', {serviceWorker: {ready: Promise.resolve()}});
  expect(await turnOnNotifications('B'.repeat(87))).toMatchObject({ok: true});
  expect(db.readActions).toHaveBeenCalled();
  expect(calls.map(c => c.method)).toEqual(['PUT']);
});
