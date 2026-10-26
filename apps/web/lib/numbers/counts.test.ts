import {expect, test} from 'vitest';
import {assetCounts, checkInsOn, goalCounts, habitsOnDay} from './counts';
import {createHabit, emptyHabitData, logHabitCount, setHabitEntryStatus, type HabitInput} from '../habits';
import {emptyPlatform, positionSchema} from '../positions';

// Session AH Part 4 (TR6/B5): one count per thing. Fictional data.
const today = '2026-09-23', A = '59a35604-3696-4a78-b455-4015acb66885', B = '6e0f3f52-1d2b-4a5e-9a51-1f2f1d7c8a01', C = '7a1e4c3b-2f0d-4e6a-8b9c-0d1e2f3a4b5c';
const input = (title: string, target = 1): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target});
const at = new Date('2026-09-01T12:00:00');
function data() {
  let h = createHabit(emptyHabitData(), input('Fictional walk'), at, A);
  h = createHabit(h, input('Fictional stretch', 3), at, B);
  h = createHabit(h, input('Fictional read'), at, C);
  h = logHabitCount(h, A, today, 1, '', new Date(`${today}T08:00:00`)); // done
  h = logHabitCount(h, B, today, 1, '', new Date(`${today}T08:00:00`)); // partly done (1 of 3)
  h = setHabitEntryStatus(h, C, today, 'skipped', '', new Date(`${today}T08:00:00`)); // a rest day
  return h;
}
test('habits today: a rest day is not due; a partly done day is due, not done', () => {
  expect(habitsOnDay(data().habits, today, today)).toEqual({due: 2, done: 1});
});
test('a check-in is a scheduled day completed, once per habit; partly done and skipped days are not', () => {
  let h = data(); h = logHabitCount(h, A, today, 2, '', new Date(`${today}T09:00:00`));
  expect(checkInsOn(h.habits, today, today)).toBe(1);
});
test('Goals: active and finished from each status, average goals included', () => {
  expect(goalCounts([{status: 'active'}, {status: 'completed'}, {status: 'closed'}], [{status: 'active'}, {status: 'completed'}])).toEqual({active: 2, finished: 2});
});
test('assets: live-priced by Wealth\'s rule, the rest manual; archived left out', () => {
  const base = {providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', denom: 'x', quantity: '1', decimals: 0, verification: 'MANUAL', observedAt: '2026-09-01T00:00:00.000Z', liquidity: 'LIQUID', provenance: 'User entry'} as const;
  const live = positionSchema.parse({...base, id: 'p1', asset: 'BTC', marketRef: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, valuationMode: 'automatic'});
  const own = positionSchema.parse({...base, id: 'p2', asset: 'House', valuationMode: 'manual'});
  const ownRef = positionSchema.parse({...base, id: 'p3', asset: 'ETH', marketRef: {provider: 'coingecko', kind: 'coin', id: 'ethereum'}, valuationMode: 'manual'});
  const gone = positionSchema.parse({...base, id: 'p4', asset: 'Car', valuationMode: 'manual', archivedAt: '2026-09-02T00:00:00.000Z'});
  expect(assetCounts({...emptyPlatform(), positions: [live, own, ownRef, gone]})).toEqual({assets: 3, livePriced: 1, manual: 2});
});
