import {describe, expect, it} from 'vitest';
import {milestoneLinesIssue, milestoneNameIssue} from './milestone-lines';

// Session AL (L4): DV-016a/b, DV-019b/c, DV-040d/e, DV-107, DV-109 — one rule for milestone names.
describe('milestone names', () => {
  it('the wizard box names the line to fix, on step 1', () => {
    expect(milestoneLinesIssue('')).toBe('Add at least one milestone.');
    expect(milestoneLinesIssue(`Plan\n${'x'.repeat(150)}`)).toBe('Milestone 2 is 150 characters long; use at most 100.');
    expect(milestoneLinesIssue('Run 3 km without stopping\nRest\nrun 3 km  without stopping')).toBe('Milestones 1 and 3 have the same name. Give each step its own name.');
    expect(milestoneLinesIssue('Plan\n\nBuild\nShip')).toBeNull();
  });
  it('the panel refuses empty, too long and repeated names', () => {
    expect(milestoneNameIssue('   ')).toBe('Give the milestone a name.');
    expect(milestoneNameIssue('y'.repeat(101))).toMatch(/at most 100 characters \(this one has 101\)/);
    expect(milestoneNameIssue('Plan 🗺️', ['plan 🗺️'])).toMatch(/already has a milestone called/);
    expect(milestoneNameIssue('Plan', ['Build'])).toBeNull();
  });
});
