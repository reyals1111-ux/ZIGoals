import {describe, expect, it} from 'vitest';
import {emptyPlatform, goalProgress, platformSchema, positionSchema, privateGoalSchema, type Position} from '../positions';
import {goalDateIssue, goalDateMax, goalTargetCheck, pasteCutNote} from './goal-checks';
import {allocationCutWarning, availableWords, goalValueReason, heldUnitsOffer, holdingWords, markReleaseReviewed, releasedByArchive, releasedWords, valueReason} from './funding-notes';
import {privateGoalSummary} from '../goal-summary';
import {linkHabitToGoal, linkableHabits, unlinkHabitFromGoal} from './habit-link';
import {congratsOf, loggedMinutes, setCongrats, timeLine, hoursMinutes} from './congrats';
import {emptyGoalExtras} from '../goal-extras/store';
import {paydownGoals} from './debt-paydown';
import {createHabit, emptyHabitData, type HabitData} from '../habits';
import {archiveAsset} from '../asset-management';

// Session AL third pass (lane L4): the cross-lane asks and competitor rows closed in Goals.
const at = '2026-11-04T08:00:00.000Z';
const manual = (over: Partial<Position> & {id: string}): Position => positionSchema.parse({providerId: over.id, sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '100000', decimals: 2, verification: 'MANUAL', observedAt: at, liquidity: 'LIQUID', provenance: 'User entry', ...over});
const value = (id: string, asset = 'EUR', target = '800000') => privateGoalSchema.parse({id, name: `Goal ${id}`, type: 'VALUE', status: 'active', asset, denom: asset, decimals: 2, target, notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: []});

describe('TK-176, N-BN-19, BN-140: goal form checks', () => {
  it('a target of a billion or more asks once; smaller ones do not', () => {
    expect(goalTargetCheck('999999999', 'EUR')).toBeNull();
    expect(goalTargetCheck('999999999999', 'EUR')).toMatch(/^€999,999,999,999\.00 is more than a billion — unusually large for a goal/);
    expect(goalTargetCheck('1000000000', 'books')).toMatch(/more than a billion/);
  });
  it('a target date has a year bound a hundred years ahead', () => {
    expect(goalDateMax('2026-11-05')).toBe('2126-12-31');
    expect(goalDateIssue('2126-12-31', '2026-11-05')).toBeNull();
    expect(goalDateIssue('275760-01-01', '2026-11-05')).toBe('Choose a date.');
    expect(goalDateIssue('2200-01-01', '2026-11-05')).toBe('Choose a target date up to 2126.');
    expect(goalDateIssue('2026-11-04', '2026-11-05')).toBe('Choose today or a future target date.');
  });
  it('a paste past the name limit says how much was left out', () => {
    expect(pasteCutNote('Berlin ', 0, 'x'.repeat(293), 80)).toBe('Names hold up to 80 characters; the last 220 were left out.');
    expect(pasteCutNote('', 0, 'short', 80)).toBeNull();
    expect(pasteCutNote('a'.repeat(79), 0, 'bc', 80)).toBe('Names hold up to 80 characters; the last 1 was left out.');
  });
});

describe('N-MO-23 (TIER 3 positions): a share of a valued holding rounds half up to the cent', () => {
  it('6 of 11 items valued $1,250.00 count $681.82, not $681.81', () => {
    const watch = manual({id: 'w', asset: 'UNIT', denom: 'manual:UNIT', quantity: '11', decimals: 0, valuation: {value: '125000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: at}});
    const s = platformSchema.parse({...emptyPlatform(), positions: [watch], goals: [value('1', 'USD')], allocations: [{goalId: '1', positionId: 'w', quantity: '6'}]});
    expect(goalProgress(s, '1').current).toBe('68182');
  });
});

describe('TK-144, TK-194, G-009, MO-145/MO-160/BN-156: what funds a goal, in words', () => {
  const btc = manual({id: 'b', asset: 'BTC', denom: 'manual:BTC', quantity: '500000000000000000', decimals: 18, assetClass: 'Crypto'});
  const savings = manual({id: 's', providerId: 'Savings Test', asset: 'EUR', denom: 'EUR', quantity: '400000', assetClass: 'Cash'});
  it('a count goal of BTC is offered the BTC already held; a fully allocated source says it is all counted', () => {
    const s = platformSchema.parse({...emptyPlatform(), positions: [btc, savings], goals: [value('9')], allocations: [{goalId: '9', positionId: 's', quantity: '400000'}]});
    const offer = heldUnitsOffer(s, {type: 'QUANTITY', asset: 'BTC', denom: 'manual:BTC', decimals: 18, network: 'zigchain-1'});
    expect(offer.map(o => [o.position.id, o.free])).toEqual([['b', '500000000000000000']]);
    expect(heldUnitsOffer(s, {type: 'VALUE', asset: 'BTC', denom: 'BTC', decimals: 2, network: 'zigchain-1'})).toEqual([]);
    expect(availableWords(s, btc)).toBe('Available 0.5 BTC');
    expect(availableWords(s, savings)).toBe('Available 0 · all counted toward other goals');
    expect(holdingWords(s, savings)).toBe('Holding €4,000.00 · €4,000.00 counted toward goals · Available 0 · all counted toward other goals');
    expect(holdingWords(s, btc)).toBe('Holding 0.5 BTC · none of it counted toward a goal yet');
  });
  it('a USD asset on a EUR goal says it is not converted, on the card and per source', () => {
    const custom = manual({id: 'c', providerId: 'B7 Test Watch', asset: 'UNIT', denom: 'manual:UNIT', quantity: '11', decimals: 0, assetClass: 'Custom', valuation: {value: '125000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: at}});
    expect(valueReason(custom, 'EUR')).toMatch(/^Valued in USD; this goal counts EUR\. ZIGoals never converts between currencies/);
    expect(valueReason(custom, 'USD')).toBeNull();
    expect(valueReason(manual({id: 'x', asset: 'EUR', denom: 'EUR', assetClass: 'Cash'}), 'EUR')).toBeNull();
    const s = platformSchema.parse({...emptyPlatform(), positions: [custom], goals: [value('5')], allocations: [{goalId: '5', positionId: 'c', quantity: '5'}]});
    expect(goalValueReason(s, s.goals[0]!, ['c'])).toBe('Funded in USD; this goal is in EUR. ZIGoals does not convert: change the goal’s currency or count a EUR asset.');
    expect(privateGoalSummary(s, s.goals[0]!).valueReason).toBe(goalValueReason(s, s.goals[0]!, ['c']));
  });
});

describe('TK-196: an archived asset that counted toward a goal leaves a note and a review flag', () => {
  const two = manual({id: 't', providerId: 'Savings Two', asset: 'EUR', denom: 'EUR', quantity: '300000', assetClass: 'Cash', valuation: {value: '300000', currency: 'EUR', decimals: 2, source: 'MANUAL', observedAt: at}});
  const snap = {id: 'v1', goalId: '7', kind: 'valuation' as const, capturedAt: '2026-11-04T07:00:00.000Z', current: '300000', target: '800000', asset: 'EUR', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: [{positionId: 't', quantity: '300000', counted: '300000'}]};
  const base = platformSchema.parse({...emptyPlatform(), positions: [two], goals: [value('7')], allocations: [{goalId: '7', positionId: 't', quantity: '300000'}], goalHistory: [snap]});
  it('says what stopped counting until marked reviewed', () => {
    expect(releasedByArchive(base, '7')).toEqual([]);
    const archived = archiveAsset(base, 't', true, Date.parse('2026-11-04T09:00:00Z'));
    const released = releasedByArchive(archived, '7');
    expect(released).toHaveLength(1);
    expect(releasedWords(released[0]!)).toMatch(/^Savings Two was archived on .*; it had counted €3,000\.00 toward this goal, and no longer does\.$/);
    const summary = privateGoalSummary(archived, archived.goals[0]!);
    expect([summary.released, summary.requiresReview]).toEqual([1, true]);
    const reviewed = platformSchema.parse(markReleaseReviewed(archived, '7', released[0]!, '2026-11-04T10:00:00.000Z'));
    expect(releasedByArchive(reviewed, '7')).toEqual([]);
    expect(privateGoalSummary(reviewed, reviewed.goals[0]!).released).toBeUndefined();
  });
});

describe('TK-181: a lower quantity than its goals count is said before saving', () => {
  it('names the goals; nothing for a quantity that still covers them', () => {
    const acc = manual({id: 'a', asset: 'EUR', denom: 'EUR', quantity: '500000', assetClass: 'Cash'});
    const s = platformSchema.parse({...emptyPlatform(), positions: [acc], goals: [value('1')], allocations: [{goalId: '1', positionId: 'a', quantity: '500000'}]});
    expect(allocationCutWarning(s, 'a', '400000')).toBe('Your goals count €5,000.00 of this; €4,000.00 would leave Goal 1 counting less and marked for review. Save again to keep it.');
    expect(allocationCutWarning(s, 'a', '500000')).toBeNull();
    expect(allocationCutWarning(s, 'nope', '1')).toBeNull();
  });
});

describe('MO-126: link a habit the person already has', () => {
  const now = new Date('2026-11-04T08:00:00Z');
  const data = (): HabitData => createHabit(emptyHabitData(), {title: 'Meditate', category: 'Mind', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}}, now, '11111111-1111-4111-8111-111111111111');
  it('links, refuses another goal, and Undo unlinks', () => {
    const d = data();
    expect(linkableHabits(d).map(h => h.title)).toEqual(['Meditate']);
    const linked = linkHabitToGoal(d, '11111111-1111-4111-8111-111111111111', '42', now);
    expect(linked.habits[0]!.goalLink).toEqual({chainId: 'private', owner: 'local', goalId: '42'});
    expect(linkableHabits(linked)).toEqual([]);
    expect(() => linkHabitToGoal(linked, '11111111-1111-4111-8111-111111111111', '43', now)).toThrow('already supports another goal');
    expect(unlinkHabitFromGoal(linked, '11111111-1111-4111-8111-111111111111', '42', now).habits[0]!.goalLink).toBeUndefined();
  });
});

describe('GAP-121: a congrats message and time in hours and minutes', () => {
  it('keeps a trimmed message in the goal extras and removes a blank one', () => {
    const x = setCongrats(emptyGoalExtras(), 'private:1', '  You  did it!  ', at);
    expect(congratsOf(x, 'private:1')).toBe('You did it!');
    expect(congratsOf(setCongrats(x, 'private:1', '  ', at), 'private:1')).toBe('');
  });
  it('adds up focus sessions and time logged by hand', () => {
    expect(loggedMinutes('Focus session: 25 min (2026-11-01)\nnote\nTime logged: 90 min (2026-11-02)')).toBe(115);
    expect(hoursMinutes(115)).toBe('1 h 55 min');
    expect(timeLine('1', '30', '2026-11-04')).toEqual({line: 'Time logged: 90 min (2026-11-04)'});
    expect(timeLine('0', '75', '2026-11-04')).toEqual({error: 'Minutes go up to 59; add the rest as hours.'});
    expect(timeLine('', '', '2026-11-04')).toEqual({error: 'Enter at least one minute.'});
  });
});

describe('GAP-119: debts as goals to reach zero', () => {
  const account = (id: string, name: string, kind: string, snapshots: [string, string][], ratePercent?: string) => ({id, kind, name, currency: 'USD', payments: [], createdAt: at, updatedAt: at, ...(ratePercent ? {ratePercent} : {}), snapshots: snapshots.map(([date, v], i) => ({id: `${id.slice(0, -1)}${i}`, date, value: v, decimals: 2}))}) as never;
  it('shows paid-down share, payoff month and interest saved; says what is missing', () => {
    const car = account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0', 'Car loan', 'loan', [['2026-01-01', '980000'], ['2026-11-01', '691100']], '5.9');
    const card = account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0', 'Credit card', 'credit-card', [['2026-11-01', '64000']], '21.9');
    const groups = paydownGoals([car, card], {version: 1, extra: '100', debts: {'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0': {minimum: '280'}, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0': {minimum: '25'}}}, '2026-11-05');
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.rows.find(r => r.name === 'Car loan')!.paidShare).toBeCloseTo(0.294, 3);
    expect(g.payoff).toMatch(/^\d{4}-\d{2}$/);
    expect(g.saved !== null && g.saved > 0n).toBe(true);
    expect(g.rows.every(r => r.payoff && !r.missing)).toBe(true);
    const none = paydownGoals([car], {version: 1}, '2026-11-05')[0]!;
    expect(none.rows[0]!.missing).toBe('Add its minimum monthly payment in the payoff planner to see a payoff month.');
    expect(none.payoff).toBeNull();
  });
});
