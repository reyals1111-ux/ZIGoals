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
