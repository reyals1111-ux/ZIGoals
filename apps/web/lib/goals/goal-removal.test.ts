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

  // TIER 3 (stored format, P-DV-09): lib/positions.ts assertGoalEditsUnlocked lets a Goal with history go only together
  // with all of its private contributions; the one Undo restores every record.
  const contribution = (id: string, goalId: string, extra = {}) => ({id, goalId, goalScope: 'private' as const, positionId: 'p1', direction: 'IN' as const, quantity: '1000', asset: 'BTC', decimals: 8, occurredAt: at, provenance: 'MANUAL_ATTRIBUTION' as const, fundingMode: 'FUND_GOAL' as const, ...extra});
  const lifecycle = [{id: 'l1', kind: 'completed' as const, cycle: 0, at, target: '100000000', asset: 'BTC', decimals: 8}];
  const plan = [{version: 1 as const, id: 'r1', effectiveFrom: '2026-11-04', recordedAt: at, terms: null, target: '100000000', asset: 'BTC', decimals: 8, priorHistory: 'known' as const}];
  const withHistory = () => platformSchema.parse({...emptyPlatform(), positions: [btc],
    goals: [g('1', {lifecycle, planRevisions: plan}), g('2')],
    allocations: [{goalId: '1', positionId: 'p1', quantity: '1000'}],
    contributions: [contribution('c1', '1'), contribution('c2', '1', {direction: 'OUT', reversesId: 'c1'}), contribution('c3', '2')]});

  it('Delete works for a goal with contributions, a plan and a reached target, and one Undo restores everything', () => {
    const s = withHistory();
    expect(goalRemovalBlock(s, s.goals[0]!)).toBeNull();
    const snap = goalRemovalSnapshot(s, '1')!;
    const removed = removeGoal(s, '1');
    expect(() => assertGoalEditsUnlocked(s, removed)).not.toThrow();
    expect(removed.contributions.map(e => e.id)).toEqual(['c3']);
    expect(removed.positions).toEqual(s.positions);
    const back = restoreRemovedGoal(removed, snap);
    expect(() => assertGoalEditsUnlocked(removed, back)).not.toThrow();
    expect(back.goals[0]).toEqual(s.goals[0]);
    expect(back.allocations).toEqual(s.allocations);
    expect([...back.contributions].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...s.contributions].sort((a, b) => a.id.localeCompare(b.id)));
    expect(() => platformSchema.parse(back)).not.toThrow();
  });
  it('still refuses a locked goal, a goal removed while its contributions stay, and edits to history that stays', () => {
    const s = withHistory();
    const locked = {...s, goals: s.goals.map(x => x.id === '1' ? {...x, locked: true} : x)};
    expect(() => assertGoalEditsUnlocked(locked, removeGoal({...locked, goals: s.goals}, '1'))).toThrow();
    expect(goalRemovalBlock(locked, locked.goals[0]!)).toBe('Unlock this goal to delete it.');
    // The goal goes but one of its contributions stays: the old append-only rule applies.
    expect(() => assertGoalEditsUnlocked(s, {...s, goals: s.goals.filter(x => x.id !== '1'), contributions: s.contributions.filter(e => e.id !== 'c2')})).toThrow(/append-only/);
    // Another goal's contribution cannot leave with it.
    expect(() => assertGoalEditsUnlocked(s, {...removeGoal(s, '1'), contributions: []})).toThrow(/append-only/);
    // The goal stays: its plan history and contributions are still append-only.
    expect(() => assertGoalEditsUnlocked(s, {...s, goals: s.goals.map(x => x.id === '1' ? {...x, planRevisions: []} : x)})).toThrow(/append-only/);
    expect(() => assertGoalEditsUnlocked(s, {...s, contributions: s.contributions.filter(e => e.id !== 'c1' && e.id !== 'c2')})).toThrow(/append-only/);
  });
});
