import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, type HabitData} from '../habits';
import {emptyReminders} from '../reminders/schema';
import {cleanLabel, GENERIC_TEXT, LABELS_DB, labelRows, labelText, type LabelRow} from './labels';

// Session V Part 13 (opt-in, owner-approved; ADR-014): reminder names composed on the device, read by the worker only.
const WORKER = readFileSync(new URL('../../public/push-sw.js', import.meta.url), 'utf8');
type Handlers = Record<string, (event: unknown) => void>;
/** The service worker in a sandbox: its handlers, what it showed and posted, and its own labelText. */
function worker(indexedDB?: unknown) {
  const handlers: Handlers = {}, shown: {title: string; options: Record<string, unknown>}[] = [], posted: unknown[] = [];
  const self = {
    addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler; }, skipWaiting() {},
    clients: {claim: async () => undefined, matchAll: async () => [{postMessage: (m: unknown) => posted.push(m), focus: async () => undefined}], openWindow: async () => null},
    registration: {showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({title, options}); }},
  };
  const context = vm.createContext({self, indexedDB, Intl, Date, Promise, setTimeout, clearTimeout, Number, Array, JSON});
  vm.runInContext(`${WORKER}\n;globalThis.__labelText = labelText;`, context);
  const push = async () => { const waits: Promise<unknown>[] = []; handlers.push!({data: {json: () => ({v: 1})}, waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits); };
  return {handlers, shown, posted, push, labelText: (context as unknown as {__labelText: (rows: unknown, now: Date) => string}).__labelText};
}
const habits = (titles: string[]): HabitData => titles.reduce((data, title, i) => createHabit(data, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), `00000000-0000-4000-8000-00000000000${i}`), emptyHabitData());
const id = (i: number) => `00000000-0000-4000-8000-00000000000${i}`;

describe('the rows the page keeps', () => {
  it('one row per habit reminder, with its push schedule\'s time and weekdays; water and Health-linked habits are left out', () => {
    const data = habits(['Stretch', 'Read', 'Walk 8000 steps']);
    const reminders = {...emptyReminders(), habits: {[id(0)]: {time: '20:00'}, [id(1)]: {time: '07:30'}, [id(2)]: {time: '18:00'}}, water: {time: '10:00'}};
    const rows = labelRows({reminders, habits: data, healthLinked: new Set([id(2)]), zone: 'Europe/Brussels', today: '2026-09-20'});
    expect(rows).toEqual([{id: id(1), time: '07:30', zone: 'Europe/Brussels', weekdays: 127, label: 'Read'}, {id: id(0), time: '20:00', zone: 'Europe/Brussels', weekdays: 127, label: 'Stretch'}]);
    // Unreadable links: no names at all.
    expect(labelRows({reminders, habits: data, healthLinked: null, zone: 'UTC', today: '2026-09-20'})).toEqual([]);
  });
  it('a name is one plain line of at most 60 characters', () => {
    expect(cleanLabel('  Stretch\n\tthe   back  ')).toBe('Stretch the back');
    expect(cleanLabel('x'.repeat(80))).toHaveLength(60);
  });
});
describe('the text a push shows', () => {
  const row = (label: string, time: string, zone = 'UTC', weekdays = 127): LabelRow => ({id: label, time, zone, weekdays, label});
  const cases: [string, LabelRow[], string, string][] = [
    ['one due now', [row('Stretch', '20:00')], '2026-09-20T20:05:00Z', 'Reminder: Stretch'],
    ['exactly 30 minutes late', [row('Stretch', '20:00')], '2026-09-20T20:30:00Z', 'Reminder: Stretch'],
    ['too late', [row('Stretch', '20:00')], '2026-09-20T20:31:00Z', GENERIC_TEXT],
    ['not yet', [row('Stretch', '20:00')], '2026-09-20T19:59:00Z', GENERIC_TEXT],
    ['another zone', [row('Stretch', '22:00', 'Europe/Brussels')], '2026-09-20T20:10:00Z', 'Reminder: Stretch'],
    ['not on this weekday (Sunday is 64)', [row('Stretch', '20:00', 'UTC', 63)], '2026-09-20T20:05:00Z', GENERIC_TEXT],
    ['several', [row('Read', '20:00'), row('Stretch', '20:10'), row('Walk', '19:50'), row('Tea', '19:45')], '2026-09-20T20:12:00Z', 'Reminders: Read, Stretch, Walk and 1 more'],
    ['the same name twice', [row('Read', '20:00'), {...row('Read', '20:05'), id: 'b'}], '2026-09-20T20:06:00Z', 'Reminder: Read'],
    ['none', [], '2026-09-20T20:05:00Z', GENERIC_TEXT],
    ['an unknown zone', [row('Stretch', '20:00', 'Mars/Olympus')], '2026-09-20T20:05:00Z', GENERIC_TEXT],
    // Session Y Part 3: across midnight the reminder belongs to the day before (2026-09-20 is a Sunday, bit 64).
    ['due 23:50, the push at 00:05', [row('Stretch', '23:50')], '2026-09-21T00:05:00Z', 'Reminder: Stretch'],
    ['due 23:50 on Sundays only, the push at 00:05 on Monday', [row('Stretch', '23:50', 'UTC', 64)], '2026-09-21T00:05:00Z', 'Reminder: Stretch'],
    ['due 23:50 on Mondays only, the push at 00:05 on Monday', [row('Stretch', '23:50', 'UTC', 1)], '2026-09-21T00:05:00Z', GENERIC_TEXT],
    ['due 23:50, the push at 00:21 (31 minutes late)', [row('Stretch', '23:50')], '2026-09-21T00:21:00Z', GENERIC_TEXT],
    ['due 00:10, the push at 23:55 the evening before', [row('Stretch', '00:10')], '2026-09-20T23:55:00Z', GENERIC_TEXT],
    ['across midnight in another zone', [row('Stretch', '23:45', 'Europe/Brussels')], '2026-09-20T22:05:00Z', 'Reminder: Stretch'],
  ];
  it('the page\'s rule and the worker\'s own copy agree on every case', () => {
    const sw = worker();
    for (const [name, rows, now, text] of cases) {
      expect(labelText(rows, new Date(now)), name).toBe(text);
      expect(sw.labelText(rows, new Date(now)), `worker: ${name}`).toBe(text);
    }
    // The worker also shrugs off rows that are not rows.
    expect(sw.labelText([null, {label: 3}, 'x'], new Date())).toBe(GENERIC_TEXT);
  });
});
describe('the worker reads the table, and nothing else', () => {
  it('no table (never opted in): the upgrade a missing database would need is aborted, and the text is the generic line', async () => {
    let aborted = false;
    const indexedDB = {open: (name: string) => {
      expect(name).toBe(LABELS_DB);
      const request: Record<string, unknown> = {transaction: {abort: () => { aborted = true; }}};
      setTimeout(() => { (request.onupgradeneeded as () => void)(); (request.onerror as () => void)(); });
      return request;
    }};
    const sw = worker(indexedDB);
    await sw.push();
    expect(aborted).toBe(true);
    expect(sw.shown).toEqual([{title: 'ZIGoals', options: expect.objectContaining({body: GENERIC_TEXT, tag: 'zigoals-reminder', icon: '/brand/figures/zigi-reminder.png'})}]);
    expect(sw.posted).toEqual([{type: 'zigoals:push-reminder'}]);
  });
  it('the opted-in table, opened read-only: the names due now', async () => {
    const modes: string[] = [];
    const now = new Date();
    const clock = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const indexedDB = {open: () => {
      const request: Record<string, unknown> = {};
      const db = {objectStoreNames: {contains: (s: string) => s === 'labels'}, close() {}, transaction: (store: string, mode: string) => { modes.push(`${store}:${mode}`); return {objectStore: () => ({getAll: () => { const all: Record<string, unknown> = {result: [{id: 'a', time: clock, zone: 'UTC', weekdays: 127, label: 'Stretch'}]}; setTimeout(() => (all.onsuccess as () => void)()); return all; }})}; }};
      setTimeout(() => { request.result = db; (request.onsuccess as () => void)(); });
      return request;
    }};
    const sw = worker(indexedDB);
    await sw.push();
    expect(modes).toEqual(['labels:readonly']);
    expect(sw.shown[0]!.options.body).toBe('Reminder: Stretch');
  });
  it('a table that never answers: the generic line in time', async () => {
    const sw = worker({open: () => ({})});
    await sw.push();
    expect(sw.shown[0]!.options.body).toBe(GENERIC_TEXT);
  });
});
