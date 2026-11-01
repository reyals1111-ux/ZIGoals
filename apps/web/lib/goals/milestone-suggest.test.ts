import {describe, expect, test} from 'vitest';
import {MAX_MILESTONES, suggestedMilestones} from './milestone-suggest';
import {MILESTONE_SETS, milestoneSetFor, milestonesFromSet} from './milestone-templates';

// Session AK Q1 (WIRING_AUDIT 6.4): the "milestone-suggest" tests ADR-036 names, in their own file. The suggestions a goal
// can still take, in its record's shape: titles it already has are left out, values only for a value goal, above zero and
// at most its target, never past the record's 100 milestones. Fictional goals.
const value = (target: string, milestones: {title: string}[] = []) => ({type: 'SAVINGS' as never, target, milestones: milestones.map((m, i) => ({id: `m${i}`, done: false, ...m}))});
const project = (milestones: {title: string}[] = []) => ({type: 'PROJECT' as never, target: '1', milestones: milestones.map((m, i) => ({id: `m${i}`, done: false, ...m}))});

describe('suggestedMilestones', () => {
  test('a trip goal of 5,000.00: the set\'s steps as shares of the person\'s own target, in order', () => {
    const set = milestoneSetFor({name: 'Save for a trip to Lisbon'})!;
    expect(set).not.toBeNull();
    const steps = milestonesFromSet(set, 500000n);
    const out = suggestedMilestones(value('500000'), steps);
    expect(out.map(s => s.title)).toEqual(set.steps.map(s => s.title));
    for (const s of out) if (s.target !== undefined) { expect(BigInt(s.target)).toBeGreaterThan(0n); expect(BigInt(s.target)).toBeLessThanOrEqual(500000n); }
    expect(out.at(-1)!.target ?? '500000').toBe('500000');
  });
  test('titles the goal already has are left out (any case, spaces trimmed); repeats among the steps once', () => {
    expect(suggestedMilestones(value('1000', [{title: 'Book flights'}]), [{title: ' book FLIGHTS '}, {title: 'Pack'}, {title: 'pack'}])).toEqual([{title: 'Pack'}]);
  });
  test('values only for a value goal, whole minor units above zero and at most the target; a project keeps titles only', () => {
    expect(suggestedMilestones(value('1000'), [{title: 'Half', target: '500'}, {title: 'Over', target: '1001'}, {title: 'Zero', target: '0'}, {title: 'Odd', target: '12.5'}, {title: 'Neg', target: '-5'}]))
      .toEqual([{title: 'Half', target: '500'}, {title: 'Over'}, {title: 'Zero'}, {title: 'Odd'}, {title: 'Neg'}]);
    expect(suggestedMilestones(project(), [{title: 'Draft', target: '1'}])).toEqual([{title: 'Draft'}]);
    // A target the record cannot read as a whole number gives titles only, never a guessed value.
    expect(suggestedMilestones({...value('abc')}, [{title: 'Half', target: '1'}])).toEqual([{title: 'Half'}]);
  });
  test('blank titles are skipped, titles are cut at 100 characters, and the record never passes 100 milestones', () => {
    expect(suggestedMilestones(project(), [{title: '   '}, {title: 'x'.repeat(140)}])).toEqual([{title: 'x'.repeat(100)}]);
    const ninetyEight = project(Array.from({length: MAX_MILESTONES - 2}, (_, i) => ({title: `Step ${i}`})));
    expect(suggestedMilestones(ninetyEight, [{title: 'A'}, {title: 'B'}, {title: 'C'}]).map(s => s.title)).toEqual(['A', 'B']);
    expect(suggestedMilestones(project(Array.from({length: MAX_MILESTONES}, (_, i) => ({title: `Step ${i}`}))), [{title: 'A'}])).toEqual([]);
  });
  test('every set gives at least one suggestion for an empty goal of its kind', () => {
    for (const set of MILESTONE_SETS) {
      const goal = set.kind === 'project' ? project() : value('100000');
      expect(suggestedMilestones(goal, milestonesFromSet(set, set.kind === 'project' ? null : 100000n)).length, set.id).toBeGreaterThan(0);
    }
  });
});
