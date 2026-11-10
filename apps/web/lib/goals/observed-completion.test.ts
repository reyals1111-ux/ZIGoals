import {expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {PLATFORM_KEY, platformSchema, type Platform} from '../positions';
import {fundGoal} from '../contribution-funding';
import {goalTimeline} from '../goal-intelligence';
import {firstReachedReading} from './observed-completion';

// Session AL fourth pass (PR-057, BUG-073, B-058, N-037): funding the Showcase's Emergency fund wrote "Target reached ·
// goal completed · My first 0.1 BTC" at the same minute. The completion of a goal already at its target is dated where
// its own history first showed it, never at another goal's save.
const DAY = '2026-11-05', zone = 'Europe/Brussels';
const showcase = () => platformSchema.parse(JSON.parse(buildShowcase(DAY, zone).records[PLATFORM_KEY]!)) as Platform;
const NOW = Date.parse('2026-11-05T05:31:00+01:00');

test('PR-057/BUG-073: funding the Emergency fund records no "Target reached" for My first 0.1 BTC at that minute', () => {
  const s = showcase();
  expect(s.goals.find(g => g.id === '9204')!.lifecycle ?? []).toEqual([]);
  const funded = fundGoal(s, {id: 'fund-1', goalId: '9201', positionId: 'showcase-usd', quantity: '25000', occurredAt: new Date(NOW).toISOString()}, [], NOW);
  const emergency = funded.goals.find(g => g.id === '9201')!, btc = funded.goals.find(g => g.id === '9204')!;
  // The goal that was funded is not reached and gets no completion.
  expect((emergency.lifecycle ?? []).filter(e => e.kind === 'completed')).toEqual([]);
  // The BTC goal's completion (already at its target in its own history) is dated at that reading, before the save.
  const done = (btc.lifecycle ?? []).filter(e => e.kind === 'completed');
  expect(done.length).toBeLessThanOrEqual(1);
  for (const e of done) expect(Date.parse(e.at)).toBeLessThan(NOW - 60_000);
  // No "Target reached" (lifecycle) row for the BTC goal at the save's minute.
  const atSave = goalTimeline(funded, '9204').filter(r => r.kind === 'lifecycle' && Math.abs(Date.parse(r.at) - NOW) < 60_000);
  expect(atSave).toEqual([]);
});

test('B-058: a goal that crosses its target in the tick keeps the tick time (its last reading was below)', () => {
  const g = {id: 'g', asset: 'USD', decimals: 2};
  const row = (at: string, current: string) => ({id: `v-${at}`, goalId: 'g', kind: 'valuation' as const, capturedAt: at, current, target: '100', asset: 'USD', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: []});
  const now = Date.parse('2026-11-05T12:00:00Z');
  expect(firstReachedReading([row('2026-11-03T00:00:00.000Z', '120'), row('2026-11-04T00:00:00.000Z', '80')], g, '100', '2026-01-01T00:00:00.000Z', now)).toBeUndefined();
  // Reached on the 3rd and the 4th: the run starts on the 3rd.
  expect(firstReachedReading([row('2026-11-02T00:00:00.000Z', '50'), row('2026-11-03T00:00:00.000Z', '100'), row('2026-11-04T00:00:00.000Z', '130')], g, '100', '2026-01-01T00:00:00.000Z', now)).toBe('2026-11-03T00:00:00.000Z');
  // A reading for another target, one needing review, or one before the cycle began does not count.
  expect(firstReachedReading([{...row('2026-11-04T00:00:00.000Z', '130'), target: '90'}], g, '100', '2026-01-01T00:00:00.000Z', now)).toBeUndefined();
  expect(firstReachedReading([{...row('2026-11-04T00:00:00.000Z', '130'), requiresReview: true}], g, '100', '2026-01-01T00:00:00.000Z', now)).toBeUndefined();
  expect(firstReachedReading([row('2026-11-04T00:00:00.000Z', '130')], g, '100', '2026-11-04T06:00:00.000Z', now)).toBeUndefined();
});
