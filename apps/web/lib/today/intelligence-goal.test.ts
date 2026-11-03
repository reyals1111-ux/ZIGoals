import {describe, expect, it} from 'vitest';
import {attentionFirst, intelligenceGoal, type GoalRoles} from './goal-roles';

// Session AK F0 (H113, ADR-028): "What matters today" passes its goal's id to TodayIntelligence (`goalId`) instead of a
// reordered view of the records. The choice must be exactly what the earlier view gave the panel.
type G = {id: string; status: string; type: string; pinned?: boolean};
const g = (id: string, over: Partial<G> = {}): G => ({id, status: 'active', type: 'VALUE', ...over});
const roles = (id: string | null): GoalRoles => ({focus: null, attention: id ? {id, why: 'overdue'} : null, cards: []});
/** The panel's rule before H113, applied to the view the dashboard used to pass. */
const viaView = (goals: readonly G[], id: string | null) => [...attentionFirst(goals, roles(id))].filter(x => x.status !== 'closed' && x.type !== 'PROJECT').sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Number(a.status === 'completed') - Number(b.status === 'completed'))[0]?.id;

describe('intelligenceGoal (H113)', () => {
  const sets: G[][] = [
    [g('1', {pinned: true}), g('2'), g('3')],
    [g('1'), g('2', {pinned: true}), g('3', {status: 'completed'})],
    [g('1', {status: 'completed'}), g('2'), g('3', {pinned: true}), g('4', {pinned: true})],
    [g('1', {type: 'PROJECT'}), g('2', {status: 'closed'}), g('3')],
    [],
  ];
  it('picks the same goal as the earlier reordered view, for every chosen id and none', () => {
    for (const goals of sets) for (const id of [null, ...goals.map(x => x.id), 'gone']) {
      expect(intelligenceGoal(goals, id)?.id, `${JSON.stringify(goals)} / ${id}`).toBe(viaView(goals, id));
    }
  });
  it('never shows a closed goal or a project, even when chosen; then the panel\'s own rule applies', () => {
    const goals = [g('1', {type: 'PROJECT'}), g('2', {status: 'closed'}), g('3'), g('4', {pinned: true})];
    expect(intelligenceGoal(goals, '1')?.id).toBe('4');
    expect(intelligenceGoal(goals, '2')?.id).toBe('4');
    expect(intelligenceGoal(goals, '3')?.id).toBe('3');
    expect(intelligenceGoal(goals)?.id).toBe('4');
  });
  it('reads the records as they are: nothing reordered, no pin changed', () => {
    const goals = [g('1', {pinned: true}), g('2')], before = JSON.stringify(goals);
    expect(intelligenceGoal(goals, '2')?.id).toBe('2');
    expect(JSON.stringify(goals)).toBe(before);
  });
});
