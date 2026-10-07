import {describe, expect, test} from 'vitest';
import {privateGoalSchema, type ContributionEvent, type PrivateGoal} from '../positions';
import {onTrack, paceOf, whatIfMonths} from './on-track';
import {milestoneDateOf, milestoneMarks, milestoneNoteId, milestoneState, pruneMilestoneDates, setMilestoneDate} from './milestones';
import {emptyMilestoneDates} from './milestone-dates';
import {GOAL_IDEAS} from '../templates/goals';

// Session W Part 11: milestones with values and dates, and "On track?" from the Goal's own numbers with zero return.
const goal = (extra: Partial<PrivateGoal> = {}): PrivateGoal => privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: [], ...extra});
const event = (id: string, day: string, cents: number, extra: Partial<ContributionEvent> = {}): ContributionEvent => ({id, goalId: '7', goalScope: 'private', direction: 'IN', quantity: String(cents), asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION', ...extra} as ContributionEvent);

describe('milestones', () => {
  test('done is the person\'s tick; reached is the recorded progress passing a value; marks sit along the target', () => {
    const g = goal({milestones: [{id: 'a', title: 'First thousand', done: false, target: '100000'}, {id: 'b', title: 'Half way', done: false, target: '300000'}, {id: 'c', title: 'Booked', done: true}]});
    expect(g.milestones.map(m => milestoneState(m, 150000n))).toEqual(['reached', 'open', 'done']);
    expect(milestoneMarks(g)).toEqual([{id: 'a', title: 'First thousand', at: 0.1666}, {id: 'b', title: 'Half way', at: 0.5}]);
    expect(milestoneMarks(goal({type: 'PROJECT', milestones: [{id: 'a', title: 'x', done: false}]}))).toEqual([]);
    expect(milestoneNoteId('7', 'a')).toBe('milestone:7:a');
  });
  test('dates on this device: set, read, cleared; a prune keeps only milestones that still exist', () => {
    let d = setMilestoneDate(emptyMilestoneDates(), '7', 'a', '2027-01-31');
    d = setMilestoneDate(d, '8', 'z', '2027-05-01');
    expect(milestoneDateOf(d, '7', 'a')).toBe('2027-01-31');
    expect(setMilestoneDate(d, '7', 'a', null).dates).toEqual({'8': {z: '2027-05-01'}});
    expect(pruneMilestoneDates(d, [{id: '7', milestones: [{id: 'a', title: 'x', done: false}]}, {id: '8', milestones: []}]).dates).toEqual({'7': {a: '2027-01-31'}});
    expect(pruneMilestoneDates(d, [{id: '7', milestones: [{id: 'a', title: 'x', done: false}]}, {id: '8', milestones: [{id: 'z', title: 'y', done: false}]}])).toBe(d);
  });
});

describe('on track', () => {
  test('to reach the target by its date with zero return: what is left, a week and every 30 days (rounded up)', () => {
    const t = onTrack(goal({targetDate: '2026-12-30'}), 150000n, [], '2026-10-01');
    expect(t).toMatchObject({remaining: 450000n, daysLeft: 90, perWeek: 35000n, perMonth: 150000n, pace: null, projected: null});
    expect(onTrack(goal(), 600000n, [], '2026-10-01').remaining).toBe(0n);
    expect(onTrack(goal({targetDate: '2026-09-01'}), 0n, [], '2026-10-01')).toMatchObject({daysLeft: -30, perWeek: null, perMonth: null});
  });
  test('the pace: net of withdrawals over the last 90 days, by Funding Wealth\'s rule; reward income and other currencies left out, never converted', () => {
    const events = [
      event('e1', '2026-07-10', 30000), event('e2', '2026-08-10', 30000), event('e3', '2026-09-10', 30000),
      event('w1', '2026-09-15', 10000, {direction: 'OUT'}), event('r1', '2026-09-20', 5000, {provenance: 'REWARD_INCOME'}),
      event('z1', '2026-09-21', 999, {asset: 'ZIG', decimals: 6}), event('old', '2026-06-20', 50000), event('other', '2026-09-01', 7000, {goalId: '8'}),
    ];
    const pace = paceOf(goal(), events, '2026-10-01')!;
    expect(pace).toEqual({perMonth: 26666n, windowDays: 90, counted: 4, skipped: 1});
    const t = onTrack(goal(), 150000n, events, '2026-10-01');
    expect(t.projected).toBe('2028-02-20');
    expect(paceOf(goal({createdAt: '2026-09-25T09:00:00.000Z'}), events, '2026-10-01')).toBeNull();
  });
  test('the "what if" is the person\'s own rate: months until the target, compounded monthly; none beyond 100 years', () => {
    expect(whatIfMonths(0, 1200, 100, 0)).toBe(12);
    expect(whatIfMonths(1000, 1000, 0, 5)).toBe(0);
    expect(whatIfMonths(10000, 20000, 0, 12)).toBe(74);
    expect(whatIfMonths(0, 1_000_000, 1, 0)).toBeNull();
    expect(whatIfMonths(0, 1000, 10, 150)).toBeNull();
  });
});

test('goal ideas name the kind of progress and steps only: no amount, rate or weight', () => {
  expect(GOAL_IDEAS.map(i => i.id)).toEqual(['emergency-fund', 'holiday', 'house-deposit', 'run-10k', 'read-20-books', 'chess-rating', 'language']);
  for (const idea of GOAL_IDEAS) {
    expect(idea.type === 'PROJECT' ? (idea.milestones?.length ?? 0) > 0 : idea.milestones === undefined, idea.id).toBe(true);
    expect(`${idea.name} ${idea.note} ${(idea.milestones ?? []).join(' ')}`, idea.id).not.toMatch(/[€$£%]|\bkg\b|\blb\b/);
  }
});
