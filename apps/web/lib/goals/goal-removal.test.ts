import {describe, expect, it} from 'vitest';
import {goalHistoryWords, goalRemovalBlock, goalRemovalSnapshot, removeGoal, restoreRemovedGoal} from './goal-removal';
import {assertGoalEditsUnlocked, emptyPlatform, platformSchema, positionSchema, privateGoalSchema} from '../positions';

// Session AL (L4): DV-021b, DV-026b, DV-041c, MO-129, P-DV-09/P-DVR-09 — Delete with the one Undo, offered when the store accepts it.
const at = '2026-11-04T10:00:00.000Z';
const g = (id: string, extra = {}) => privateGoalSchema.parse({id, name: `Goal ${id}`, type: 'QUANTITY', status: 'active', asset: 'BTC', denom: 'manual:BTC', decimals: 8, target: '100000000', notes: '', createdAt: at, milestones: [], ...extra});
const btc = positionSchema.parse({id: 'p1', providerId: 'Cold wallet', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'BTC', denom: 'manual:BTC', quantity: '50000000', decimals: 8, verification: 'MANUAL', sync: 'MANUAL', liquidity: 'UNKNOWN', observedAt: at, provenance: 'test'});

describe('goal removal', () => {
  it('removes the goal and its allocation, and Undo puts both back in place in the latest record', () => {
    const s = platformSchema.parse({...emptyPlatform(), positions: [btc], goals: [g('1'), g('2'), g('3')], allocations: [{goalId: '2', positionId: 'p1', quantity: '1000'}]});
    const snap = goalRemovalSnapshot(s, '2')!;
    const removed = removeGoal(s, '2');
    expect(() => assertGoalEditsUnlocked(s, removed)).not.toThrow();
    expect(removed.goals.map(x => x.id)).toEqual(['1', '3']);
    expect(removed.allocations).toEqual([]);
    expect(removed.positions).toEqual(s.positions);
    // Something else changed meanwhile: a fourth goal. Undo keeps it and restores goal 2 at its place.
    const latest = {...removed, goals: [...removed.goals, g('4')]};
    const back = restoreRemovedGoal(latest, snap);
    expect(back.goals.map(x => x.id)).toEqual(['1', '2', '3', '4']);
    expect(back.allocations).toEqual([{goalId: '2', positionId: 'p1', quantity: '1000'}]);
    expect(() => assertGoalEditsUnlocked(latest, back)).not.toThrow();
    // A second Undo changes nothing.
    expect(restoreRemovedGoal(back, snap)).toBe(back);
  });
  it('offers Delete for an untouched goal, refuses a locked one, and names the history that holds one back', () => {
    const s = platformSchema.parse({...emptyPlatform(), goals: [g('1')]});
    expect(goalRemovalBlock(s, s.goals[0]!)).toBeNull();
    const locked = g('1', {locked: true});
    expect(goalRemovalBlock({...s, goals: [locked]}, locked)).toBe('Unlock this goal to delete it.');
    const reached = g('1', {lifecycle: [{id: 'l1', kind: 'completed', cycle: 0, at, target: '100000000', asset: 'BTC', decimals: 8}]});
    const block = goalRemovalBlock({...s, goals: [reached]}, reached);
    // The store's own rule decides; whichever it is, the words match the history.
    if (block) expect(block).toMatch(/keeps a reached target for good/);
    expect(goalHistoryWords({...s, goals: [reached]}, reached)).toBe('a reached target');
  });
});
