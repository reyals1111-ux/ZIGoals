import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, setType} from './prefs';
import {zonedInstant} from './zone';

/**
 * Session AW (x3; LEDGER #444, The Five Minute Journal): the morning page's reminder is a second journal wake a day, off
 * until chosen, quiet once that morning's page is written; the evening reminder says it is for the evening page; both sit
 * under the journal switch and never carry a word of the journal.
 */
const ZONE = 'Europe/Amsterdam', NOW = Date.UTC(2026, 10, 23, 5, 0); // Monday 06:00 in Amsterdam
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};
describe('Session AW x3: the morning page’s reminder', () => {
  it('nothing without it; with it, a wake of its own beside the evening one', () => {
    expect(buildPlan(base()).snapshot.items.filter(i => i.kind === 'journal')).toEqual([]);
    const plan = buildPlan(base({journalMorning: {time: '07:30', weekdays: 127, written: []}, journal: {time: '21:00', weekdays: 127, written: [], streak: 3, part: 'evening'}}));
    const journal = plan.snapshot.items.filter(i => i.kind === 'journal');
    expect(journal.filter(i => i.id === 'journal-morning').map(i => i.at)).toEqual([at('2026-11-23', '07:30'), at('2026-11-24', '07:30')]);
    expect(journal.find(i => i.id === 'journal-morning')).toEqual({at: at('2026-11-23', '07:30'), kind: 'journal', id: 'journal-morning', detail: 'your morning page', href: '/app/journal#day-pages', actionable: false});
    expect(journal.find(i => i.id === 'journal')).toMatchObject({detail: 'your evening page · keeps your 3-day streak'});
    expect(plan.registration.wakes).toEqual(expect.arrayContaining([{m: 7 * 60 + 30, d: 127}, {m: 21 * 60, d: 127}]));
  });
  it('a morning already written has no item; inside quiet hours it is said on the card; muted, nothing', () => {
    const written = buildPlan(base({journalMorning: {time: '07:30', weekdays: 127, written: ['2026-11-23']}}));
    expect(written.snapshot.items.filter(i => i.id === 'journal-morning').map(i => i.at)).toEqual([at('2026-11-24', '07:30')]);
    expect(buildPlan(base({journalMorning: {time: '06:30', weekdays: 127, written: []}})).refused).toEqual([{kind: 'journal', time: '06:30'}]);
    expect(buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'journal', false), journalMorning: {time: '07:30', weekdays: 127, written: []}})).snapshot.items.filter(i => i.kind === 'journal')).toEqual([]);
  });
  it('the worker says it in words, never a word of the journal', () => {
    const when = at('2026-11-23', '07:30');
    const shown = composer()({labels: false, items: [{at: when, kind: 'journal', id: 'journal-morning', detail: 'your morning page', href: '/app/journal#day-pages', actionable: false}], summary: {date: '2026-11-23', done: 0, total: 0}}, when);
    expect(shown.body).toBe('Time to write in your journal · your morning page');
    expect(shown.data.url).toContain('/app/journal');
  });
});
