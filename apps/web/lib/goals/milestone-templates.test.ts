import {describe, expect, test} from 'vitest';
import {MILESTONE_SETS, habitsForMilestone, linkHabitToMilestone, milestoneHabitsOf, milestoneSetFor, milestonesForHabit, milestonesFromSet, moveMilestone, moveMilestoneTo, pruneMilestoneHabits, unlinkHabitFromMilestone} from './milestone-templates';
import {GOAL_LIBRARY} from '../templates/goal-library';
import {emptyGoalExtras, goalExtrasSchema, setGoalArea} from '../goal-extras/store';

// Session AK (6.4): milestone sets, reorder, and habit → milestone links in the loose goal extras.
const AT = '2026-10-31T10:00:00.000Z';
describe('sets', () => {
  test('every set is well formed; library ids exist; shares are fractions ending at the whole target', () => {
    const ids = new Set(GOAL_LIBRARY.map(t => t.id));
    expect(new Set(MILESTONE_SETS.map(s => s.id)).size).toBe(MILESTONE_SETS.length);
    for (const set of MILESTONE_SETS) {
      for (const id of set.libraryIds) expect(ids.has(id), `${set.id}: ${id}`).toBe(true);
      expect(set.steps.length).toBeGreaterThanOrEqual(3);
      for (const step of set.steps) { expect(step.title.length).toBeLessThanOrEqual(100); if (step.share !== undefined) expect(step.share > 0 && step.share <= 1).toBe(true); }
      if (set.kind === 'value') expect(set.steps.filter(x => x.share !== undefined).at(-1)!.share).toBe(1);
      else expect(set.steps.every(x => x.share === undefined)).toBe(true);
    }
  });
  test('found by template, then by the longest keyword in the name; none → null', () => {
    expect(milestoneSetFor({templateId: 'house-deposit'})!.id).toBe('buy-home');
    expect(milestoneSetFor({templateId: 'run-10k'})!.id).toBe('run-10k');
    expect(milestoneSetFor({name: 'My first half marathon'})!.id).toBe('half-marathon');
    expect(milestoneSetFor({name: 'Learn Spanish'})!.id).toBe('learn-language');
    expect(milestoneSetFor({name: 'Launch my app'})!.id).toBe('launch-project');
    expect(milestoneSetFor({name: 'Be kind'})).toBeNull();
    expect(milestoneSetFor({templateId: 'unknown', name: ''})).toBeNull();
  });
  test('milestones in the goal\'s shape: shares of the person\'s own target only', () => {
    const fund = MILESTONE_SETS.find(s => s.id === 'emergency-fund')!;
    expect(milestonesFromSet(fund)).toEqual(fund.steps.map(s => ({title: s.title})));
    expect(milestonesFromSet(fund, 1_200_000n)).toEqual([{title: 'Work out one month of essential costs'}, {title: 'One month of costs', target: '200000'}, {title: 'Three months of costs', target: '600000'}, {title: 'Six months of costs', target: '1200000'}]);
    expect(milestonesFromSet(MILESTONE_SETS.find(s => s.id === 'run-10k')!, 5000n).every(m => m.target === undefined)).toBe(true);
  });
  test('reorder', () => {
    const list = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    expect(moveMilestone(list, 'c', 'top').map(m => m.id)).toEqual(['c', 'a', 'b']);
    expect(moveMilestone(list, 'a', 1).map(m => m.id)).toEqual(['b', 'a', 'c']);
    expect(moveMilestoneTo(list, 2, 0).map(m => m.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('habit → milestone links (goal extras, loose, optional)', () => {
  test('link, read both ways, unlink; the field survives the extras\' own writes and a parse', () => {
    let x = linkHabitToMilestone(emptyGoalExtras(), 'private:7', 'm1', 'h1', AT);
    x = linkHabitToMilestone(x, 'private:7', 'm1', 'h2', AT);
    x = linkHabitToMilestone(x, 'private:7', 'm2', 'h1', AT);
    expect(linkHabitToMilestone(x, 'private:7', 'm1', 'h1', AT)).toBe(x);
    expect(habitsForMilestone(x, 'private:7', 'm1')).toEqual(['h1', 'h2']);
    expect(milestonesForHabit(x, 'private:7', 'h1')).toEqual(['m1', 'm2']);
    x = setGoalArea(x, 'private:7', 'health', AT);
    x = goalExtrasSchema.parse(JSON.parse(JSON.stringify(x)));
    expect(milestoneHabitsOf(x, 'private:7')).toEqual({m1: ['h1', 'h2'], m2: ['h1']});
    x = unlinkHabitFromMilestone(x, 'private:7', 'm2', 'h1', AT);
    expect(milestoneHabitsOf(x, 'private:7')).toEqual({m1: ['h1', 'h2']});
    expect(unlinkHabitFromMilestone(x, 'private:7', 'm9', 'h1', AT)).toBe(x);
  });
  test('prune keeps live milestones and habits; the goal\'s extra goes when nothing is left; bad keys and limits refused', () => {
    let x = linkHabitToMilestone(emptyGoalExtras(), 'private:7', 'm1', 'h1', AT);
    x = linkHabitToMilestone(x, 'private:7', 'm2', 'h2', AT);
    expect(milestoneHabitsOf(pruneMilestoneHabits(x, 'private:7', new Set(['m1', 'm2']), new Set(['h1']), AT), 'private:7')).toEqual({m1: ['h1']});
    expect(pruneMilestoneHabits(x, 'private:7', new Set(['m1', 'm2']), new Set(['h1', 'h2']), AT)).toBe(x);
    expect(pruneMilestoneHabits(x, 'private:7', new Set(), new Set(), AT).goals).toEqual({});
    expect(() => linkHabitToMilestone(emptyGoalExtras(), 'nope', 'm1', 'h1', AT)).toThrow();
    let full = emptyGoalExtras();
    for (let i = 0; i < 20; i++) full = linkHabitToMilestone(full, 'private:7', 'm1', `h${i}`, AT);
    expect(() => linkHabitToMilestone(full, 'private:7', 'm1', 'h99', AT)).toThrow(/20 habits/);
    expect(milestoneHabitsOf({...emptyGoalExtras(), goals: {'private:7': {milestoneHabits: {m1: 'oops'}} as never}}, 'private:7')).toEqual({});
  });
});
