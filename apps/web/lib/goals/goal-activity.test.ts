import {describe, expect, it} from 'vitest';
import {goalTimeline, historyOnlyNet, milestoneChangeLabel, recordGoalChanges, appendContribution} from '../goal-intelligence';
import {closeGoal, emptyPlatform, platformSchema, privateGoalSchema} from '../positions';
import {captureGoalLifecycle} from '../plan-revisions';

// Session AL (L4): DV-046a/b, DV-088, DV-112, DV-113 (one row per Close, milestone rows that say what changed) and
// DV-037/DV-050c (history-only amounts are named as such).
const at = '2026-11-04T10:00:00.000Z';
const project = (milestones: {id: string; title: string; done: boolean}[]) => privateGoalSchema.parse({id: '5', name: 'Read project', type: 'PROJECT', status: 'active', asset: 'USD', denom: 'USD', decimals: 0, target: '1', notes: '', createdAt: at, milestones});

describe('Activity rows for a goal', () => {
  it('says which milestone changed', () => {
    const a = [{id: '1', title: 'Build', done: false}, {id: '2', title: 'Extra', done: false}];
    expect(milestoneChangeLabel(a, [{...a[0]!, done: true}, a[1]!])).toBe('Milestone ticked: “Build”');
    expect(milestoneChangeLabel(a, [a[0]!])).toBe('Milestone removed: “Extra”');
    expect(milestoneChangeLabel(a, [{...a[0]!, title: 'Build it'}, a[1]!])).toBe('Milestone renamed: “Build” → “Build it”');
    expect(milestoneChangeLabel(a, [...a, {id: '3', title: 'Ship', done: false}])).toBe('Milestone added: “Ship”');
  });
  it('a single Close shows once in the timeline', () => {
    const before = platformSchema.parse({...emptyPlatform(), goals: [project([{id: '1', title: 'Build', done: false}])]});
    const now = Date.parse(at);
    const after = recordGoalChanges(before, closeGoal(before, '5'), now);
    const closedRows = goalTimeline(after, '5').filter(e => e.label === 'Goal closed');
    expect(closedRows).toHaveLength(1);
  });
  it('a ticked milestone writes a row that names it', () => {
    const before = platformSchema.parse({...emptyPlatform(), goals: [project([{id: '1', title: 'Build', done: false}, {id: '2', title: 'Ship', done: false}])]});
    const next = {...before, goals: before.goals.map(g => ({...g, milestones: g.milestones.map(m => m.id === '1' ? {...m, done: true} : m)}))};
    const after = recordGoalChanges(before, captureGoalLifecycle(before, next, Date.parse(at)), Date.parse(at));
    expect(goalTimeline(after, '5').map(e => e.label)).toContain('Milestone ticked: “Build”');
  });
  it('history-only records are counted apart (DV-037: the panel said 3 while the hero said 0)', () => {
    const g = privateGoalSchema.parse({id: '9', name: 'Books', type: 'QUANTITY', status: 'active', asset: 'BOOKS', denom: 'manual:BOOKS', decimals: 0, target: '20', notes: '', createdAt: at, milestones: []});
    let s = platformSchema.parse({...emptyPlatform(), goals: [g]});
    s = appendContribution(s, {id: 'h1', goalId: '9', goalScope: 'private', quantity: '3', asset: 'BOOKS', decimals: 0, direction: 'IN', occurredAt: at, provenance: 'MANUAL_ATTRIBUTION', fundingMode: 'HISTORY_ONLY'});
    expect(historyOnlyNet(s, g, Date.parse(at) + 1000)).toBe('3');
  });
});
