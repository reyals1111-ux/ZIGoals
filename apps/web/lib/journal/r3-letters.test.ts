import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, test} from 'vitest';
import {addMonths, isSealed, letterWakes, lettersAhead, lettersOpen, opensOnFor, withOpensOn} from './letters';
import {emptyJournal, journalSchema, type Journal} from './schema';
import {buildPlan, type PlanInput} from '../notify/plan';
import {emptyNotifyPrefs, morningTime, setType} from '../notify/prefs';
import {zonedInstant} from '../notify/zone';

/**
 * Session AV lane 2 (r3-notes; LEDGER #279, Stoic's letter to open later): a day to open on, folded away until then, on
 * Today the week it opens, and a morning wake that day (TIER 3 (PWA): the notification plan's journal kind) that never
 * says a word of the letter.
 */
const e = (id: string, date: string, opensOn?: string) => ({id, date, text: `Dear future me, fictional ${id}.`, createdAt: `${date}T20:00:00.000Z`, ...(opensOn ? {opensOn} : {})});
const j: Journal = journalSchema.parse({...emptyJournal(), entries: [e('a', '2025-11-22', '2026-11-22'), e('b', '2026-05-20', '2026-11-18'), e('c', '2026-11-22', '2027-11-22'), e('d', '2026-11-20'), e('old', '2025-01-01', '2026-01-01')]});
describe('a letter to open later', () => {
  test('a month, six months and a year on (a short month keeps its last day)', () => {
    expect([opensOnFor('month', '2026-11-22'), opensOnFor('half', '2026-11-22'), opensOnFor('year', '2026-11-22')]).toEqual(['2026-12-22', '2027-05-22', '2027-11-22']);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });
  test('folded away until its day; on Today the week it opens, the newest first', () => {
    expect(isSealed(j.entries[2]!, '2026-11-22')).toBe(true);
    expect(isSealed(j.entries[0]!, '2026-11-22')).toBe(false);
    expect(isSealed(j.entries[3]!, '2026-11-22')).toBe(false);
    expect(lettersOpen(j.entries, '2026-11-22').map(x => x.id)).toEqual(['a', 'b']);
    expect(lettersOpen(j.entries, '2026-11-25').map(x => x.id)).toEqual(['a']);
    expect(lettersAhead(j.entries, '2026-11-22').map(x => x.id)).toEqual(['c']);
  });
  test('the day can be changed or taken away', () => {
    expect(withOpensOn(j, 'c', '2026-12-01').entries[2]!.opensOn).toBe('2026-12-01');
    expect(withOpensOn(j, 'c', null).entries[2]!.opensOn).toBeUndefined();
    expect(() => withOpensOn(j, 'zz', null)).toThrow('no longer on this device');
  });
  test('the wakes: an id and a day, from today on, never a word', () => {
    expect(letterWakes(j, '2026-11-22')).toEqual([{id: 'letter:a', date: '2026-11-22'}, {id: 'letter:c', date: '2027-11-22'}]);
    expect(JSON.stringify(letterWakes(j, '2026-11-22'))).not.toContain('Dear');
  });
});
describe('the morning a letter opens, in the notification plan', () => {
  const ZONE = 'Europe/Amsterdam', NOW = Date.UTC(2026, 10, 22, 5, 0); // Sunday 06:00 in Amsterdam
  const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
  test('a one-off wake at the morning time of its day, under the journal switch; a letter far ahead waits', () => {
    const plan = buildPlan(base({letters: letterWakes(j, '2026-11-22')}));
    const items = plan.snapshot.items.filter(i => i.kind === 'journal');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({kind: 'journal', id: 'letter:a@2026-11-22', detail: 'a letter you wrote opens today', href: '/app/journal', actionable: false});
    expect(items[0]!.at).toBe(zonedInstant('2026-11-22', morningTime(emptyNotifyPrefs()), ZONE));
    expect(items[0]!.label).toBeUndefined();
    expect(buildPlan(base({letters: letterWakes(j, '2026-11-22'), prefs: setType(emptyNotifyPrefs(), 'journal', false)})).snapshot.items.filter(i => i.kind === 'journal')).toEqual([]);
  });
  test('the worker says it in its own words, apart from the reminder to write', () => {
    const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
    vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
    const compose = (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string}}}).self.zigoalsCompose;
    const plan = buildPlan(base({letters: letterWakes(j, '2026-11-22')}));
    const item = plan.snapshot.items.find(i => i.kind === 'journal')!;
    expect(compose(plan.snapshot, item.at).body).toContain('A letter you wrote opens today');
    expect(compose(plan.snapshot, item.at).body).not.toContain('Time to write');
  });
});
