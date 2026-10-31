import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {saveNight} from '../sleep/engine';
import {emptySleep, type Sleep} from '../sleep/schema';
import {showcaseSleep} from '../sleep/showcase';
import {DEFAULT_NEED, DIP_FROM, DIP_TO, SPAN, curveSummary, curveWhy, energyCurve, levelAt, nowOn, usualWake} from './curve';

const TODAY = '2026-10-31', UTC = 'UTC';
const clock = (m: number) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** `n` nights ending at `wake` (UTC) after `hours` asleep, the last one ending `lastDay`. */
function nights(n: number, wake: string, hours: number, lastDay = TODAY, goal?: number): Sleep {
  let s: Sleep = emptySleep();
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(lastDay, -i), end = instantAt(day, wake, UTC);
    s = saveNight(s, {kind: 'night', start: end - hours * 3_600_000, end, timeZone: UTC}, new Date('2026-12-01T00:00:00Z'));
  }
  return goal ? {...s, goal: {minutes: goal, updatedAt: '2026-10-01T00:00:00.000Z'}} : s;
}

describe('energy curve (Session AK lane S, item 9)', () => {
  test('nothing without a night to read a wake time from', () => {
    expect(energyCurve(emptySleep(), TODAY)).toBeNull();
    expect(usualWake(emptySleep(), TODAY)).toBeNull();
  });
  test('from today\'s wake: the focus window matches Today\'s card, the dip is 7–9 h after waking, bedtime from the goal', () => {
    const c = energyCurve(nights(10, '07:00', 8, TODAY, 480), TODAY)!;
    expect(c.wakeFrom).toBe('today');
    expect(c.wake).toBe(420);
    expect(c.focus).toEqual({from: 540, to: 660});
    expect(c.dip).toEqual({from: 420 + DIP_FROM, to: 420 + DIP_TO});
    // Next wake 07:00 (1860) − 8 h − 20 min to fall asleep = 22:40 (1360); a 30-minute window before it.
    expect(c.bedtime).toEqual({from: 1330, to: 1360});
    expect(c.needFrom).toBe('goal');
    expect(c.points[0]!.at).toBe(420);
    expect(c.points.at(-1)!.at).toBe(420 + SPAN);
  });
  test('the shape: groggy at waking, high in the focus window, lower in the dip, lowest late', () => {
    const level = (h: number) => levelAt(h * 60, 0, false);
    expect(level(0)).toBeLessThan(level(3));
    expect(level(8)).toBeLessThan(level(3));
    expect(level(8)).toBeLessThan(level(11.5));
    expect(level(17.5)).toBeLessThan(level(8));
    for (let t = 0; t <= SPAN; t += 15) { expect(levelAt(t, -180, true)).toBeGreaterThanOrEqual(0.05); expect(levelAt(t, 60, false)).toBeLessThanOrEqual(1); }
  });
  test('a sleep balance under the goal lowers the curve; a short night shortens the focus window', () => {
    const rested = energyCurve(nights(10, '07:00', 8, TODAY, 480), TODAY)!, short = energyCurve(nights(10, '07:00', 6, TODAY, 480), TODAY)!;
    expect(short.balance?.perNight).toBe(-120);
    expect(short.short).toBe(true);
    expect(short.focus).toEqual({from: 570, to: 630});
    const at = (c: typeof rested, h: number) => c.points.find(p => p.at === c.wake + h * 60)!.level;
    expect(at(short, 3)).toBeLessThan(at(rested, 3));
  });
  test('without a night ending today it starts from the usual wake time; without a goal the need is 8 h, said so', () => {
    const c = energyCurve(nights(6, '06:30', 7, addLocalDays(TODAY, -1)), TODAY)!;
    expect(c).toMatchObject({wakeFrom: 'usual', wake: 390, need: DEFAULT_NEED, needFrom: 'default', balance: null, nights: 6});
    expect(curveWhy(c, clock, m => `${m} min`)).toContain('8 hours, a common figure');
    expect(curveWhy(c, clock, m => `${m} min`)).toContain('not a measurement');
  });
  test('wake times either side of midnight average around midnight, not noon', () => {
    let s: Sleep = emptySleep();
    for (const [back, wake] of [[6, '23:50'], [4, '23:50'], [2, '00:10'], [0, '00:10']] as const) {
      const end = instantAt(addLocalDays(TODAY, -back), wake, UTC);
      s = saveNight(s, {kind: 'night', start: end - 3 * 3_600_000, end, timeZone: UTC}, new Date('2026-12-01T00:00:00Z'));
    }
    const u = usualWake(s, TODAY)!.minutes;
    expect(u < 30 || u > 1410).toBe(true);
  });
  test('now on the curve, and the words', () => {
    const c = energyCurve(showcaseSleep(TODAY), TODAY)!;
    expect(nowOn(c, c.wake + 60)).toBe(c.wake + 60);
    expect(nowOn(c, c.wake - 120)).toBeNull();
    expect(nowOn(c, 30)).toBe(1470); // 00:30 after a day that started the morning before
    expect(curveSummary(c, clock)).toMatch(/^An estimate from your sleep times: a good focus window \d\d:\d\d to \d\d:\d\d, a likely dip/);
  });
});
