import {describe, expect, test} from 'vitest';
import {groupLatency, latencySeries, usualSleep, weekVsUsual} from './usual';
import {sleepSchema, type Sleep} from './schema';

/** Session AV lane 2 (body; LEDGER #123, #124): time to fall asleep; "your usual" from the person's own nights only. */
const AT = '2026-11-01T10:00:00.000Z';
const day = (n: number) => new Date(Date.parse('2026-11-20T12:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
const night = (d: string, startHour: number, latency?: number, quality?: number) => { const prev = new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return {id: `health_sleep-fictional-${d}`, kind: 'night' as const, source: 'manual' as const, start: `${prev}T${String(startHour).padStart(2, '0')}:00:00.000Z`, end: `${d}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, ...(latency !== undefined ? {latencyMin: latency} : {}), ...(quality ? {quality} : {})}; };
// The 20 nights before this week: in bed from 23:00 (8 h), 10 min to fall asleep, quality 3. This week: from 22:00, 20 min, quality 4.
const sleep: Sleep = sleepSchema.parse({version: 1, nights: [...Array.from({length: 20}, (_, i) => night(day(8 + i), 23, 10, 3)), ...Array.from({length: 5}, (_, i) => night(day(i), 22, 20, 4)), night(day(5), 22)]});
describe('your usual and the week beside it', () => {
  test('time to fall asleep per night; a night without one stays empty', () => {
    const s = latencySeries(sleep, '2026-11-20', 7);
    expect(s.map(p => p.latency)).toEqual([null, null, 20, 20, 20, 20, 20]);
    expect(groupLatency(latencySeries(sleep, '2026-11-20', 30), 'week').at(-1)).toMatchObject({latency: 20, nights: 5});
  });
  test('the usual is the median of the 90 days before this week; the week beside it', () => {
    expect(usualSleep(sleep, '2026-11-20')).toMatchObject({nights: 20, asleep: 470, latency: 10, quality: 3, bed: 660});
    const v = weekVsUsual(sleep, '2026-11-20')!;
    expect(v).toMatchObject({nights: 6, latency: 20, quality: 4});
    expect(v.asleep! > v.usual.asleep!).toBe(true);
  });
  test('fewer than 7 nights before this week: no usual', () => {
    const few = sleepSchema.parse({version: 1, nights: Array.from({length: 6}, (_, i) => night(day(8 + i), 23, 10))});
    expect(usualSleep(few, '2026-11-20')).toBeNull();
    expect(weekVsUsual(few, '2026-11-20')).toBeNull();
  });
});
