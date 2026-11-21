import {describe, expect, it} from 'vitest';
import {addCountdown, emptyCountdowns} from './schema';
import {countdownWakes, dueReminders, emptyCountdownExtras, nextYearly, splitWithExtras, withExtra, withoutExtra} from './extras';
import {buildPlan} from '../notify/plan';
import {emptyNotifyPrefs, setType} from '../notify/prefs';
import {zonedInstant} from '../notify/zone';

/** Session AV (owner follow-up 1, F-COUNTDOWN-YEARLY; TickTick): yearly countdowns and a reminder some days before. */
const at = new Date('2026-01-10T10:00:00Z');
let r = addCountdown(emptyCountdowns(), {title: 'Fictional birthday', date: '2026-03-14'}, {id: 'b', at});
r = addCountdown(r, {title: 'Fictional trip', date: '2026-12-01'}, {id: 't', at});
describe('Session AV (F-COUNTDOWN-YEARLY)', () => {
  it('moves a yearly one to its next day once passed; a one-off stays passed', () => {
    const extras = withExtra(emptyCountdownExtras(), 'b', {yearly: true});
    const s = splitWithExtras(r, extras, '2026-11-21');
    expect(s.upcoming.map(c => [c.id, c.shown])).toEqual([['t', '2026-12-01'], ['b', '2027-03-14']]);
    expect(splitWithExtras(r, emptyCountdownExtras(), '2026-11-21').passed.map(c => c.id)).toEqual(['b']);
    expect([nextYearly('2024-02-29', '2026-03-01'), nextYearly('2024-02-29', '2027-12-01')]).toEqual(['2027-02-28', '2028-02-29']);
  });
  it('reminds from N days before up to the day itself', () => {
    const extras = withExtra(withExtra(emptyCountdownExtras(), 'b', {yearly: true, remindDays: 7}), 't', {remindDays: 14});
    expect(dueReminders(r, extras, '2026-11-21').map(x => [x.item.id, x.days])).toEqual([['t', 10]]);
    expect(dueReminders(r, extras, '2027-03-10').map(x => [x.item.id, x.days])).toEqual([['b', 4]]);
    expect(dueReminders(r, extras, '2027-03-15')).toEqual([]);
  });
  it('clears an entry with nothing left, and on removal', () => {
    const e = withExtra(emptyCountdownExtras(), 'b', {yearly: true});
    expect(withExtra(e, 'b', {yearly: false, remindDays: null}).items).toEqual({});
    expect(withoutExtra(e, 'b').items).toEqual({});
  });
});

/** Session AV (1c, q1 #44, fresh-agent review; TickTick notifies): a countdown's reminder reaches the notification plan. */
describe('Session AV (1c): countdown reminders as morning wakes', () => {
  const record = {version: 1 as const, items: [
    {id: 'c1', title: 'Fictional birthday', date: '1990-12-01', createdAt: '2026-01-01T00:00:00.000Z'},
    {id: 'c2', title: 'Fictional trip', date: '2026-11-25', createdAt: '2026-01-01T00:00:00.000Z'},
    {id: 'c3', title: 'No reminder', date: '2026-11-26', createdAt: '2026-01-01T00:00:00.000Z'},
  ]};
  const extras = {version: 1 as const, items: {c1: {yearly: true as const, remindDays: 7}, c2: {remindDays: 3}}};
  it('the first morning of the reminder and the day itself, within 30 days; a reminder already running keeps its day', () => {
    expect(countdownWakes(record, extras, '2026-11-23')).toEqual([
      {id: 'c1', title: 'Fictional birthday', date: '2026-11-24', days: 7},
      {id: 'c2', title: 'Fictional trip', date: '2026-11-25', days: 0},
      {id: 'c1', title: 'Fictional birthday', date: '2026-12-01', days: 0},
    ]);
  });
  it('a one-off wake at the morning time, named only with names on, and its own switch', () => {
    const ZONE = 'Europe/Amsterdam', now = zonedInstant('2026-11-23', '07:00', ZONE), wakes = countdownWakes(record, extras, '2026-11-23');
    const input = {now, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], countdowns: wakes};
    const plan = buildPlan(input), first = zonedInstant('2026-11-24', '08:00', ZONE);
    // The snapshot holds the next 48 hours; the wakes reach 30 days ahead.
    expect(plan.snapshot.items.filter(i => i.kind === 'countdown').map(i => [i.at, i.id, 'label' in i])).toEqual([[first, 'countdown:c1@2026-11-24', false]]);
    expect(plan.registration.once).toEqual(['2026-11-24', '2026-11-25', '2026-12-01'].map(d => Math.floor(zonedInstant(d, '08:00', ZONE) / 60000)));
    expect(buildPlan({...input, labels: true}).snapshot.items.find(i => i.kind === 'countdown')!.label).toBe('Fictional birthday');
    expect(buildPlan({...input, prefs: setType(emptyNotifyPrefs(), 'countdowns', false)}).snapshot.items.filter(i => i.kind === 'countdown')).toEqual([]);
  });
});
