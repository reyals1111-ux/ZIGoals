import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, test} from 'vitest';
import {agoWords, memoryWakes, throwbacks} from './throwback';
import {onThisDay} from './on-this-day';
import {buildPlan, type PlanInput} from '../notify/plan';
import {emptyNotifyPrefs, morningTime, setType} from '../notify/prefs';
import {zonedInstant} from '../notify/zone';

/**
 * Session AV lane 2 (r4-mind; LEDGER #309, Journey's throwbacks): a week, a month and a year back side by side on the
 * Journal (Today's card keeps onThisDay as it was), entries set aside stay away, and the opt-in morning wake (TIER 3
 * (PWA), the journal kind) that says only how long ago, under the journal switch.
 */
const e = (id: string, date: string, text = 'A fictional memory.') => ({id, date, text});
const entries = [e('y1', '2025-11-22'), e('y3', '2023-11-22'), e('m', '2026-10-22'), e('w', '2026-11-15'), e('noise', '2026-11-14'), e('today', '2026-11-22')];
describe('a week, a month and a year back', () => {
  test('the years first (nearest first), then a month ago, then a week ago', () => {
    expect(throwbacks(entries, '2026-11-22').map(i => [i.entry.id, i.label])).toEqual([['y1', '1 year ago'], ['y3', '3 years ago'], ['m', 'A month ago'], ['w', 'A week ago']]);
  });
  test('Today’s line keeps onThisDay: a month ago only when no year matches, and never a week', () => {
    expect(onThisDay(entries, '2026-11-22').map(i => i.entry.id)).toEqual(['y1', 'y3']);
  });
  test('set aside, empty or capped', () => {
    expect(throwbacks(entries, '2026-11-22', {hidden: ['y1', 'w']}).map(i => i.entry.id)).toEqual(['y3', 'm']);
    expect(throwbacks([e('w', '2026-11-15', '   ')], '2026-11-22')).toEqual([]);
    expect(throwbacks(entries, '2026-11-22', {max: 2})).toHaveLength(2);
    expect(throwbacks(entries, 'not a day')).toEqual([]);
  });
  test('the notification’s words', () => {
    expect([agoWords({years: 1, months: null}), agoWords({years: 4, months: null}), agoWords({years: null, months: 1}), agoWords({years: null, months: null, weeks: 1})]).toEqual(['a year ago', '4 years ago', 'a month ago', 'a week ago']);
  });
});
describe('the morning wake', () => {
  test('only when asked, and not while On this day is hidden; today and tomorrow; never a word', () => {
    expect(memoryWakes(entries, {}, '2026-11-22')).toEqual([]);
    expect(memoryWakes(entries, {memoryNotify: true, onThisDay: false}, '2026-11-22')).toEqual([]);
    const wakes = memoryWakes([...entries, e('w2', '2026-11-16', 'Secret fictional words')], {memoryNotify: true}, '2026-11-22');
    expect(wakes).toEqual([{id: 'memory:2026-11-22', date: '2026-11-22', detail: 'a year ago'}, {id: 'memory:2026-11-23', date: '2026-11-23', detail: 'a week ago'}]);
    expect(JSON.stringify(wakes)).not.toContain('Secret');
    expect(memoryWakes(entries, {memoryNotify: true, hidden: ['y1', 'y3', 'm', 'w']}, '2026-11-22')).toEqual([]);
  });
  const ZONE = 'Europe/Amsterdam', NOW = Date.UTC(2026, 10, 22, 5, 0);
  const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
  test('a one-off wake at the morning time, under the journal switch, and the worker’s own words', () => {
    const memories = memoryWakes(entries, {memoryNotify: true}, '2026-11-22'), plan = buildPlan(base({memories}));
    const items = plan.snapshot.items.filter(i => i.kind === 'journal');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({id: 'memory:2026-11-22@2026-11-22', detail: 'a year ago', href: '/app/journal', actionable: false});
    expect(items[0]!.at).toBe(zonedInstant('2026-11-22', morningTime(emptyNotifyPrefs()), ZONE));
    expect(buildPlan(base({memories, prefs: setType(emptyNotifyPrefs(), 'journal', false)})).snapshot.items.filter(i => i.kind === 'journal')).toEqual([]);
    const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
    vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
    const compose = (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string}}}).self.zigoalsCompose;
    const body = compose(plan.snapshot, items[0]!.at).body;
    expect(body).toContain('A memory from a year ago');
    expect(body).not.toContain('Time to write');
    expect(body).not.toContain('fictional');
  });
});
