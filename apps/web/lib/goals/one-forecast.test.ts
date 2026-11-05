import {expect, test} from 'vitest';
import {privateGoalSchema, type ContributionEvent} from '../positions';
import {paceForecast, privateGoalPoints} from '../goal-forecast';
import {onTrack} from './on-track';

// Session AL fourth pass (PR-024, D-235, M-056, B-006): one goal page showed three dates (pace 7 Jan 2028, plan 8 Aug 2028,
// "On track?" 17 Jun 2030). "On track?" now says the pace forecast's own date (components/platform/goal-on-track.tsx);
// the plan's date is labelled as the plan's ("if every planned payment is made"), a different question.
const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', targetDate: '2026-12-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: []});
const event = (id: string, day: string, cents: string, direction: 'IN' | 'OUT' = 'IN'): ContributionEvent => ({id, goalId: '7', goalScope: 'private', direction, quantity: cents, asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION', fundingMode: 'HISTORY_ONLY'} as ContributionEvent);
const events = [event('e1', '2026-07-10', '30000'), event('e2', '2026-08-10', '30000'), event('e3', '2026-09-10', '30000'), event('w1', '2026-09-15', '10000', 'OUT')];

test('PR-024: the date "On track?" shows is the pace forecast\'s date (one source), not the 90-day window\'s', () => {
  const forecast = paceForecast(privateGoalPoints(goal, events, 1500, '2026-10-01'), 1500, 6000, '2026-10-01');
  expect(forecast.state).toBe('estimate');
  // The two models disagree for this goal: that is why the card no longer shows its own.
  expect(onTrack(goal, 150000n, events, '2026-10-01').projected).toBe('2028-02-20');
  expect(forecast.date).toBe('2028-03-27');
});
