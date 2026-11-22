import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, NOTIFY_LABELS, NOTIFY_TYPES, setType, typeOn} from './prefs';
import {zonedInstant} from './zone';
import {reminderPlanInput} from '../journal/reminder';
import {emptyJournal} from '../journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #40, Day One's journaling reminders): the reminder to write becomes a daily wake on its
 * weekdays at its time, skipped on a day already written; its line keeps the streak (a count, never a word of the journal);
 * inside quiet hours it is said on the card; the worker says it in words; the Settings switch can mute it.
 */
const ZONE = 'Europe/Amsterdam', NOW = Date.UTC(2026, 10, 23, 8, 0); // Monday 09:00 in Amsterdam
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: {action: string}[]; data: {url: string}}}}).self.zigoalsCompose;
};

describe('Session AV lane 2: the reminder to write in the notification plan', () => {
  it('a switch of its own in Settings, on (the reminder itself is off until set in the Journal)', () => {
    expect(NOTIFY_TYPES).toContain('journal');
    expect(typeOn(emptyNotifyPrefs(), 'journal')).toBe(true);
    expect(NOTIFY_LABELS.journal.title).toBe('Reminder to write');
  });
  it('the journal gives the plan nothing while the reminder is off; on, its time, days, written days and streak', () => {
    const entries = [{id: 'a', date: '2026-11-21', text: 'x', createdAt: '2026-11-21T20:00:00.000Z'}, {id: 'b', date: '2026-11-22', text: 'y', createdAt: '2026-11-22T20:00:00.000Z'}];
    expect(reminderPlanInput({...emptyJournal(), entries}, '2026-11-23')).toBeNull();
    expect(reminderPlanInput({...emptyJournal(), entries, reminder: {on: true, time: '21:15', days: 31}}, '2026-11-23')).toEqual({time: '21:15', weekdays: 31, written: [], streak: 2});
    expect(reminderPlanInput({...emptyJournal(), entries: [...entries, {id: 'c', date: '2026-11-23', text: 'z', createdAt: '2026-11-23T07:00:00.000Z'}], reminder: {on: true, time: '21:15', days: 127}}, '2026-11-23')).toMatchObject({written: ['2026-11-23'], streak: 3});
  });
  it('a daily wake on its weekdays; a day already written has no item; the line keeps the streak', () => {
    const plan = buildPlan(base({journal: {time: '21:15', weekdays: 31, written: [], streak: 2}}));
    const items = plan.snapshot.items.filter(i => i.kind === 'journal');
    expect(items).toEqual([
      {at: at('2026-11-23', '21:15'), kind: 'journal', id: 'journal', detail: 'keeps your 2-day streak', href: '/app/journal', actionable: false},
      {at: at('2026-11-24', '21:15'), kind: 'journal', id: 'journal', detail: 'keeps your 2-day streak', href: '/app/journal', actionable: false},
      {at: at('2026-11-25', '21:15'), kind: 'journal', id: 'journal', detail: 'keeps your 2-day streak', href: '/app/journal', actionable: false},
    ].filter(i => i.at <= NOW + 48 * 3_600_000));
    expect(plan.registration.wakes).toContainEqual({m: 21 * 60 + 15, d: 31});
    const written = buildPlan(base({journal: {time: '21:15', weekdays: 127, written: ['2026-11-23'], streak: 3}}));
    expect(written.snapshot.items.filter(i => i.kind === 'journal').map(i => i.at)).not.toContain(at('2026-11-23', '21:15'));
    const fresh = buildPlan(base({journal: {time: '21:15', weekdays: 127, written: [], streak: 0}}));
    expect(fresh.snapshot.items.find(i => i.kind === 'journal')).not.toHaveProperty('detail');
  });
  it('inside quiet hours it is said on the card and wakes nothing; muted in Settings, nothing at all', () => {
    expect(buildPlan(base({journal: {time: '22:30', weekdays: 127, written: [], streak: 0}})).refused).toEqual([{kind: 'journal', time: '22:30'}]);
    const off = buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'journal', false), journal: {time: '21:15', weekdays: 127, written: [], streak: 0}}));
    expect(off.snapshot.items.filter(i => i.kind === 'journal')).toEqual([]);
    expect(off.registration.wakes).toEqual([{m: 8 * 60, d: 127}]); // the morning orbit only
  });
  it('the worker says it in words, with the streak, and the tap opens the Journal', () => {
    const compose = composer(), when = at('2026-11-23', '21:15');
    const shown = compose({labels: false, items: [{at: when, kind: 'journal', id: 'journal', detail: 'keeps your 2-day streak', href: '/app/journal', actionable: false}], summary: {date: '2026-11-23', done: 0, total: 0}}, when);
    expect(shown.body).toBe('Time to write in your journal · keeps your 2-day streak');
    expect(shown.data.url).toContain('/app/journal');
    expect(shown.actions.map(a => a.action)).toEqual(['snooze']);
  });
});
