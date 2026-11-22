import {describe, expect, test} from 'vitest';
import {eveningOf, readiness, recentEvenings, removePlan, savePlan, stepClock, suggestedSteps, tickStep} from './plan';
import {emptyEvening, eveningRecordSchema} from './schema';
import {showcaseEvening} from './showcase';

/** Session AV lane 2 (body; LEDGER #83, Calm Sleep's evening plan): questions to steps, ticks to a "ready for bed" bar. */
const now = new Date('2026-11-17T20:00:00.000Z');
describe('the evening plan', () => {
  test('the answers suggest steps in the evening\'s order; lights low, a wind-down and lights out always', () => {
    expect(suggestedSteps([], 30).map(s => [s.id, s.minutesBefore])).toEqual([['lights-low', 30], ['wind-down-sound', 15], ['lights-out', 0]]);
    expect(suggestedSteps(['screens', 'late-caffeine', 'busy-head'], 45).map(s => s.id)).toEqual(['no-caffeine', 'write-down', 'screens-away', 'lights-low', 'wind-down-sound', 'lights-out']);
    expect(stepClock('23:00', 45)).toBe('22:15');
    expect(stepClock('00:30', 60)).toBe('23:30');
  });
  test('the evening runs until 05:00 the next morning', () => {
    expect(eveningOf(new Date('2026-11-18T03:30:00.000Z'), 'UTC')).toBe('2026-11-17');
    expect(eveningOf(new Date('2026-11-18T05:30:00.000Z'), 'UTC')).toBe('2026-11-18');
    expect(eveningOf(new Date('2026-11-17T23:30:00.000Z'), 'Europe/Amsterdam')).toBe('2026-11-17'); // 00:30 there
  });
  test('save, tick, the bar fills; a step taken out loses its ticks; remove keeps the evenings', () => {
    let r = savePlan(emptyEvening(), {bedtime: '23:00', windDown: 30, hindrances: [], steps: suggestedSteps([], 30)}, now);
    r = tickStep(r, '2026-11-17', 'lights-low', true);
    expect(readiness(r, '2026-11-17')).toMatchObject({done: 1, total: 3, ready: false, next: {id: 'wind-down-sound'}});
    r = tickStep(tickStep(r, '2026-11-17', 'wind-down-sound', true), '2026-11-17', 'lights-out', true);
    expect(readiness(r, '2026-11-17')).toMatchObject({done: 3, ready: true, next: null});
    r = savePlan(r, {bedtime: '23:00', windDown: 30, hindrances: [], steps: suggestedSteps([], 30).filter(s => s.id !== 'lights-out')}, now);
    expect(r.days['2026-11-17']).toEqual(['lights-low', 'wind-down-sound']);
    expect(() => tickStep(r, '2026-11-17', 'lights-out', true)).toThrow('no longer in your plan');
    const gone = removePlan(r);
    expect(gone.plan).toBeUndefined();
    expect(gone.days).toEqual(r.days);
    expect(() => savePlan(r, {bedtime: '25:00', windDown: 30, hindrances: [], steps: []}, now)).toThrow('time to be asleep');
  });
  test('only the newest 120 evenings are kept; the Showcase\'s week', () => {
    let r = savePlan(emptyEvening(), {bedtime: '23:00', windDown: 30, hindrances: [], steps: suggestedSteps([], 30)}, now);
    for (let i = 0; i < 125; i++) r = tickStep(r, new Date(Date.parse('2026-01-01T12:00:00Z') + i * 86_400_000).toISOString().slice(0, 10), 'lights-out', true);
    expect(Object.keys(r.days)).toHaveLength(120);
    expect(Object.keys(r.days).sort()[0]).toBe('2026-01-06');
    const s = showcaseEvening('2026-11-17');
    expect(eveningRecordSchema.parse(s)).toEqual(s);
    expect(readiness(s, '2026-11-17')).toMatchObject({done: 2, total: 5});
    expect(recentEvenings(s, '2026-11-17')).toEqual({complete: 4, some: 5, days: 7});
  });
});
