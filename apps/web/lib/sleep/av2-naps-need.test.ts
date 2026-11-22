import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {saveNight, sleepBalance} from './engine';
import {emptySleep, type Sleep} from './schema';
import {showcaseSleep} from './showcase';
import {balanceWithNaps, napsOn, needWords, sleepNeed} from './naps-need';
import {energyCurve, napLiftAt} from '../energy-curve/curve';

/** Session AV lane 2 (bodymind-r2; LEDGER #237, #238): naps in the balance and the curve; a sleep need from your own nights. */
const TODAY = '2026-10-31' /* a Saturday */, UTC = 'UTC', LATER = new Date('2026-12-01T00:00:00Z');
const hm = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
function nights(n: number, wake: string, hours: (day: string) => number, goal?: number): Sleep {
  let s: Sleep = emptySleep();
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(TODAY, -i), end = instantAt(day, wake, UTC);
    s = saveNight(s, {kind: 'night', start: end - hours(day) * 3_600_000, end, timeZone: UTC, latencyMin: 0, awakeMin: 0}, LATER);
  }
  return goal ? {...s, goal: {minutes: goal, updatedAt: '2026-10-01T00:00:00.000Z'}} : s;
}
const nap = (s: Sleep, day: string, from: string, minutes: number) => saveNight(s, {kind: 'nap', start: instantAt(day, from, UTC), end: instantAt(day, from, UTC) + minutes * 60_000, timeZone: UTC}, LATER);

describe('naps in the sleep balance (LEDGER #237)', () => {
  test('a nap on a logged day adds to that day; the nights-only balance is unchanged', () => {
    let s = nights(10, '07:00', () => 7, 480);
    expect(balanceWithNaps(s, TODAY)).toBeNull(); // no nap: nothing to add
    s = nap(s, addLocalDays(TODAY, -1), '14:00', 30);
    s = nap(s, addLocalDays(TODAY, -3), '15:00', 20);
    expect(sleepBalance(s, TODAY)!.perNight).toBe(-60);
    const b = balanceWithNaps(s, TODAY)!;
    expect(b).toMatchObject({naps: 2, napMinutes: 50, nights: 10, goal: 480});
    expect(b.perNight).toBe(-55); // (10 × −60 + 50) / 10
    expect(napsOn(s, addLocalDays(TODAY, -1))).toHaveLength(1);
  });
  test('a nap on a day without a logged night never stands in for the night', () => {
    let s = nights(6, '07:00', () => 7, 480);
    s = nap(s, addLocalDays(TODAY, -10), '14:00', 40);
    expect(balanceWithNaps(s, TODAY)).toBeNull();
  });
  test('the Showcase has one nap, two days ago, on a logged day: counted, marked', () => {
    const s = showcaseSleep('2026-11-17'), b = balanceWithNaps(s, '2026-11-17')!;
    expect(b.naps).toBe(1);
    expect(b.napMinutes).toBe(25);
    expect(b.perNight).toBeGreaterThan(sleepBalance(s, '2026-11-17')!.perNight - 1);
  });
});

describe('a nap\'s lift on the energy curve (LEDGER #237)', () => {
  test('a short nap lifts the curve after it ends and fades; a long one dips first', () => {
    expect(napLiftAt(800, [{to: 840, minutes: 20}])).toBe(0);
    expect(napLiftAt(870, [{to: 840, minutes: 20}])).toBeGreaterThan(0.03);
    expect(napLiftAt(1500, [{to: 840, minutes: 20}])).toBeLessThan(0.01);
    expect(napLiftAt(845, [{to: 840, minutes: 90}])).toBeLessThan(0);
  });
  test('today\'s nap is on the curve, in its summary and its Why; a curve without a nap is as before', () => {
    const plain = nights(10, '07:00', () => 8, 480), napped = nap(plain, TODAY, '14:00', 25);
    const a = energyCurve(plain, TODAY)!, b = energyCurve(napped, TODAY)!;
    expect(a.naps).toEqual([]);
    expect(b.naps).toEqual([{from: 840, to: 865, minutes: 25}]);
    const at = (c: typeof a, m: number) => c.points.find(p => p.at === m)!.level;
    expect(at(b, 900)).toBeGreaterThan(at(a, 900));
    expect(at(b, 600)).toBe(at(a, 600));
  });
});

describe('a sleep need from your own nights (LEDGER #238)', () => {
  test('weekend nights first: their middle, rounded to 15 minutes', () => {
    const weekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
    const n = sleepNeed(nights(28, '08:00', d => weekend(d) ? 8.4 : 6.8, 450), TODAY)!;
    expect(n).toMatchObject({from: 'weekends', minutes: 510, goal: 450});
    expect(n.nights).toBe(8);
    expect(needWords(n, hm)).toBe('About 8 h 30 min: the middle of your 8 weekend nights in the last 30 days, when most people wake without an alarm. Your goal is 7 h 30 min. An estimate from your own log, not a measurement and not medical advice.');
  });
  test('too few weekend nights: the longer half of at least ten nights; too few nights: none', () => {
    let s: Sleep = emptySleep();
    for (const back of [1, 2, 3, 4, 5, 8, 9, 10]) { const day = addLocalDays(TODAY, -back); if ([0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay())) continue; const end = instantAt(day, '07:00', UTC); s = saveNight(s, {kind: 'night', start: end - (6 + back / 10) * 3_600_000, end, timeZone: UTC, latencyMin: 0, awakeMin: 0}, LATER); }
    expect(sleepNeed(s, TODAY)).toBeNull(); // eight weekday nights only
    s = nights(12, '07:00', () => 7.5);
    expect(sleepNeed(s, TODAY)!.minutes).toBe(450);
    expect(sleepNeed(nights(3, '07:00', () => 8), TODAY)).toBeNull();
  });
  test('kept between 5 and 11 hours', () => {
    expect(sleepNeed(nights(20, '12:00', () => 13), TODAY)!.minutes).toBe(660);
    expect(sleepNeed(nights(20, '07:00', () => 3.5), TODAY)!.minutes).toBe(300);
  });
});
