import {describe, expect, it} from 'vitest';
import {addCountdown, emptyCountdowns} from './schema';
import {dueReminders, emptyCountdownExtras, nextYearly, splitWithExtras, withExtra, withoutExtra} from './extras';

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
