import {describe, expect, it} from 'vitest';
import {closeGoal, emptyPlatform, platformSchema, positionSchema, privateGoalSchema} from '../positions';
import {recordGoalChanges} from '../goal-intelligence';
import {countAgain, countedBeforeClose, undoClose} from './reopen';

// Session AL (DV-099, P-DV-34): closing frees what a goal counted; Undo and Reopen bring it back from the person's records.
const at = '2026-11-04T08:00:00.000Z';
const cash = positionSchema.parse({id: 'p', providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '10000', decimals: 2, verification: 'MANUAL', observedAt: at, liquidity: 'LIQUID', provenance: 'User entry', valuation: {value: '10000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: at}});
const fund = privateGoalSchema.parse({id: '1', name: 'Fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '50000', notes: '', createdAt: at, milestones: []});
const funded = () => platformSchema.parse({...emptyPlatform(), positions: [cash], goals: [fund], allocations: [{goalId: '1', positionId: 'p', quantity: '10000'}]});
const close = (s: ReturnType<typeof funded>, now: number) => platformSchema.parse(recordGoalChanges(s, closeGoal(s, '1'), now));

describe('reopen', () => {
  it('Undo of Close reopens the goal and counts what it counted again', () => {
    const s = funded(), released = s.allocations.filter(a => a.goalId === '1');
    const closed = close(s, Date.parse('2026-11-04T09:00:00Z'));
    expect(closed.allocations).toEqual([]);
    const back = undoClose(closed, '1', released);
    expect(back.goals[0]!.status).not.toBe('closed');
    expect(back.goals[0]!.lifecycle?.map(e => e.kind)).toEqual(['closed', 'reopened']);
    expect(back.allocations).toEqual(released);
    // A second Undo changes nothing.
    expect(undoClose(back, '1', released)).toBe(back);
  });
  it('Reopen later offers the last counted snapshot before Close, capped to what is still free', () => {
    const s = funded();
    const snap = {id: 'v1', goalId: '1', kind: 'valuation' as const, capturedAt: '2026-11-04T08:30:00.000Z', current: '10000', target: '50000', asset: 'USD', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: [{positionId: 'p', quantity: '10000', counted: '10000'}]};
    const closed = close(platformSchema.parse({...s, goalHistory: [snap]}), Date.parse('2026-11-04T09:00:00Z'));
    expect(countedBeforeClose(closed, '1')).toEqual([{goalId: '1', positionId: 'p', quantity: '10000'}]);
    // Another goal took 60.00 of it since: only 40.00 is offered.
    const other = privateGoalSchema.parse({...fund, id: '2', name: 'Other'});
    const busy = platformSchema.parse({...closed, goals: [...closed.goals, other], allocations: [{goalId: '2', positionId: 'p', quantity: '6000'}]});
    expect(countedBeforeClose(busy, '1')).toEqual([{goalId: '1', positionId: 'p', quantity: '4000'}]);
    // No snapshot: nothing to offer (the page says where to add it again).
    expect(countedBeforeClose(close(s, Date.parse('2026-11-04T09:00:00Z')), '1')).toEqual([]);
    const open = undoClose(closed, '1', []);
    expect(countAgain(open, '1', countedBeforeClose(open, '1')).allocations).toEqual([{goalId: '1', positionId: 'p', quantity: '10000'}]);
  });
});
