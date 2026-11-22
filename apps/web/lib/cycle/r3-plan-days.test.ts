import {describe, expect, it} from 'vitest';
import {cyclePlanDays, cyclePlanLine} from './plan-days';
import {cycleOnPlan, cycleSchema} from './store';
import {setCycleOn, setCycleOnPlan} from './engine';

/**
 * Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, without the seasons: no phases, no advice): the cycle
 * day and the period days on the day plan, opt-in.
 */
const flow = (days: string[]) => Object.fromEntries(days.map(d => [d, {flow: 'medium' as const}]));
// Four periods 28 days apart: three complete cycles, so the next is estimated (28 to 28 days after 2026-11-23).
const rec = cycleSchema.parse({version: 1, on: true, days: flow(['2026-08-31', '2026-09-01', '2026-09-28', '2026-09-29', '2026-10-26', '2026-10-27', '2026-11-23', '2026-11-24'])});
describe('the cycle on the plan (LEDGER #262)', () => {
  it('the cycle day and logged period days', () => {
    const days = cyclePlanDays(rec, '2026-11-23', '2026-11-26', '2026-11-25');
    expect(days.map(d => [d.date, d.cycleDay, d.period])).toEqual([['2026-11-23', 1, 'logged'], ['2026-11-24', 2, 'logged'], ['2026-11-25', 3, null], ['2026-11-26', 4, null]]);
    expect(cyclePlanLine(days[0]!)).toBe('Day 1 of your cycle · period day (logged)');
    expect(cyclePlanLine(days[2]!)).toBe('Day 3 of your cycle');
  });
  it('the estimated window ahead says “may start (an estimate)”, and gives no cycle day from its start', () => {
    const [d] = cyclePlanDays(rec, '2026-12-21', '2026-12-21', '2026-11-25');
    expect(d).toEqual({date: '2026-12-21', cycleDay: null, period: 'estimated'});
    expect(cyclePlanLine(d!)).toBe('period may start (an estimate)');
    expect(cyclePlanDays(rec, '2026-12-20', '2026-12-20', '2026-11-25')[0]!.cycleDay).toBe(28);
  });
  it('nothing logged: nothing to say; the opt-in needs the log on and is kept apart', () => {
    expect(cyclePlanDays(cycleSchema.parse({version: 1, days: {}}), '2026-11-23', '2026-11-23', '2026-11-23').map(cyclePlanLine)).toEqual(['']);
    expect(cycleOnPlan(rec)).toBe(false);
    expect(cycleOnPlan(setCycleOnPlan(rec, true))).toBe(true);
    expect(cycleOnPlan(setCycleOn(setCycleOnPlan(rec, true), false))).toBe(false);
  });
  it('never says a phase, a season or advice', () => {
    const words = cyclePlanDays(rec, '2026-11-01', '2026-12-31', '2026-11-25').map(cyclePlanLine).join(' ');
    expect(words).not.toMatch(/phase|season|follicular|luteal|ovulat|fertile|should|best time|advice/i);
  });
});
