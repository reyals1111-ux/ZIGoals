import {describe, expect, it} from 'vitest';
import {closedAfterReaching, finishedCounts, goalReached, isFinished} from './finished';
import {achievementsOf} from '../achievements';
import {emptyPlatform, privateGoalSchema, type GoalLifecycle} from '../positions';
import {privateGoalSummary} from '../goal-summary';

// Session AL (L4): DV-042, DV-045a, DV-057a, DV-058a; P-DV-22/P-DVR-10 — a goal finished then closed stays finished.
const at = (m: number) => new Date(Date.UTC(2026, 10, 4, 10, m)).toISOString();
const life = (kind: GoalLifecycle['kind'], cycle: number, m: number): GoalLifecycle => ({id: `l-${kind}-${cycle}-${m}`, kind, cycle, at: at(m), target: '100', asset: 'USD', decimals: 2});
const goal = (status: 'active' | 'completed' | 'closed', lifecycle: GoalLifecycle[] = [], extra = {}) => privateGoalSchema.parse({id: '1', name: 'Holiday', type: 'VALUE', status, asset: 'USD', denom: 'USD', decimals: 2, target: '100', notes: '', createdAt: at(0), milestones: [], lifecycle, ...extra});

describe('finished', () => {
  it('a goal closed after it reached its target is finished; closed before is not', () => {
    expect(goalReached(goal('closed', [life('completed', 0, 1), life('closed', 0, 2)]))).toBe(true);
    expect(goalReached(goal('closed', [life('closed', 0, 2)]))).toBe(false);
    // Reached in an earlier cycle, reopened, then closed short of the target: not finished now.
    expect(goalReached(goal('closed', [life('completed', 0, 1), life('closed', 0, 2), life('reopened', 1, 3), life('closed', 1, 4)]))).toBe(false);
    expect(goalReached(goal('completed'))).toBe(true);
    expect(goalReached(goal('active'))).toBe(false);
  });
  it('a closed project with every milestone done is finished (DV-045a: 4/4 then closed)', () => {
    const project = privateGoalSchema.parse({id: '2', name: 'Read project', type: 'PROJECT', status: 'closed', asset: 'USD', denom: 'USD', decimals: 0, target: '1', notes: '', createdAt: at(0), milestones: [1, 2, 3, 4].map(i => ({id: String(i), title: `Step ${i}`, done: true}))});
    expect(closedAfterReaching(project)).toBe(true);
  });
  it('the summary carries `reached`, and every count reads it', () => {
    const g = goal('closed', [life('completed', 0, 1), life('closed', 0, 2)]);
    const summary = privateGoalSummary({...emptyPlatform(), goals: [g]}, g);
    expect(summary.status).toBe('closed');
    expect(summary.reached).toBe(true);
    expect(isFinished(summary)).toBe(true);
    expect(finishedCounts([summary, {status: 'active'}, {status: 'completed'}])).toEqual({active: 1, finished: 2});
  });
  it('the Hall of achievements keeps it (DV-058a)', () => {
    const g = goal('closed', [life('completed', 0, 1), life('closed', 0, 2)]);
    const list = achievementsOf([g], [], {version: 1, areas: [], goals: {}} as never);
    expect(list.map(a => a.name)).toEqual(['Holiday']);
    expect(achievementsOf([goal('closed', [life('closed', 0, 2)])], [], {version: 1, areas: [], goals: {}} as never)).toEqual([]);
  });
});

// Session AL (DV-025b, P-DV-31): lowering the target below what is already counted is an edit, not a win.
import {platformSchema, positionSchema} from '../positions';
import {captureValuations, recordGoalChanges} from '../goal-intelligence';
import {reachedByTargetEdit} from './finished';
describe('a target lowered to what is counted', () => {
  const now = Date.parse('2026-11-04T10:00:00Z'), stamp = new Date(now).toISOString();
  const cash = positionSchema.parse({id: 'p', providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '20000', decimals: 2, verification: 'MANUAL', observedAt: stamp, liquidity: 'LIQUID', provenance: 'User entry', valuation: {value: '20000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: stamp}});
  const fund = privateGoalSchema.parse({id: '1', name: 'Emergency fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '100000', notes: '', createdAt: stamp, milestones: []});
  const funded = () => platformSchema.parse(recordGoalChanges(platformSchema.parse({...emptyPlatform(), positions: [cash], goals: [fund]}), platformSchema.parse({...emptyPlatform(), positions: [cash], goals: [fund], allocations: [{goalId: '1', positionId: 'p', quantity: '20000'}]}), now));
  it('records "Target changed" but no "Target reached", and the page reads it as reached by an edit', () => {
    const s = funded();
    expect(s.goals[0]!.status).toBe('active');
    const edited = platformSchema.parse(recordGoalChanges(s, {...s, goals: [{...s.goals[0]!, target: '5000'}]}, now + 60_000));
    const g = edited.goals[0]!;
    expect(g.status).toBe('completed');
    expect(g.lifecycle?.map(e => e.kind)).toEqual(['target_changed']);
    expect(reachedByTargetEdit(g)).toBe(true);
    expect(edited.goalHistory.some(h => h.kind === 'status' && h.label === 'Goal completed')).toBe(false);
  });
  it('the goal page\'s capture right after the save (useValuationHistory) records no "Target reached" either (run 2)', () => {
    const s = funded();
    const edited = platformSchema.parse(recordGoalChanges(s, {...s, goals: [{...s.goals[0]!, target: '5000'}]}, now + 60_000));
    const ticked = platformSchema.parse(captureValuations(edited, [], now + 120_000));
    expect(ticked.goals[0]!.lifecycle?.map(e => e.kind)).toEqual(['target_changed']);
    expect(reachedByTargetEdit(ticked.goals[0]!)).toBe(true);
    // A goal the capture finds over its target with no edit behind it still records the win, as before.
    const legacy = platformSchema.parse({...s, goals: [{...s.goals[0]!, target: '5000'}]});
    expect(captureValuations(legacy, [], now + 120_000).goals[0]!.lifecycle?.map(e => e.kind)).toEqual(['completed']);
  });
  it('real progress that crosses the target still records the win and celebrates', () => {
    const s = funded();
    const more = platformSchema.parse(recordGoalChanges(s, {...s, positions: [{...cash, quantity: '100000', valuation: {...cash.valuation!, value: '100000'}}], allocations: [{goalId: '1', positionId: 'p', quantity: '100000'}]}, now + 60_000));
    expect(more.goals[0]!.lifecycle?.map(e => e.kind)).toEqual(['completed']);
    expect(reachedByTargetEdit(more.goals[0]!)).toBe(false);
    // A legacy completed goal with no lifecycle rows still celebrates.
    expect(reachedByTargetEdit({status: 'completed', lifecycle: undefined})).toBe(false);
  });
});
