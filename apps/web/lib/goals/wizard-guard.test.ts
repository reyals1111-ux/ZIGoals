import {describe, expect, it} from 'vitest';
import {draftBlockedBy, draftStepOf, leaveAsks, wizardGuardOn} from './wizard-guard';

const draft = {name: 'Berlin draft', type: 'VALUE', target: '1500', date: '', notes: '', milestones: '', category: 'Custom', asset: '', step: 2};

describe('the creator draft (Session AL final pass: BN-155, BUG-076, G-026, DV-056b)', () => {
  it('the browser putting the draft’s own words back into the fields never blocks the draft (the cause: it did)', () => {
    expect(draftBlockedBy(['Berlin draft', '1500', ''], draft)).toBe(false);
    expect(draftBlockedBy([' Berlin draft ', ''], draft)).toBe(false);
    expect(draftBlockedBy(['', '', ''], draft)).toBe(false);
  });
  it('text that is not the draft’s (typed while the page loaded) still wins', () => {
    expect(draftBlockedBy(['Lisbon', ''], draft)).toBe(true);
    expect(draftBlockedBy(['Berlin draft', '2000'], draft)).toBe(true);
  });
});

describe('leaving the creator (N-DV-02, D-205)', () => {
  it('asks nothing while this tab keeps the draft, whatever was typed', () => {
    expect(leaveAsks({dirty: true, kept: true})).toBe(false);
    expect(leaveAsks({dirty: false, kept: true})).toBe(false);
  });
  it('guards unsaved text only when the draft could not be kept', () => {
    expect(leaveAsks({dirty: true, kept: false})).toBe(true);
    expect(leaveAsks({dirty: false, kept: false})).toBe(false);
  });
  it('a saved goal or an untouched, restored draft is never "dirty" (DV-064 unchanged)', () => {
    expect(wizardGuardOn({saved: true, restored: false, touched: true, typed: true})).toBe(false);
    expect(wizardGuardOn({saved: false, restored: true, touched: false, typed: true})).toBe(false);
    expect(wizardGuardOn({saved: false, restored: false, touched: true, typed: true})).toBe(true);
  });
});

describe('the creator draft step (Session AO, T-014: three steps)', () => {
  it('opens a four-step draft left on the rhythm or the review on the last step, and step 1 drafts on step 1', () => {
    expect([1, 2, 3, '2', '3'].map(draftStepOf)).toEqual([1, 2, 2, 2, 2]);
    expect([0, -1, 1.5, 'x', null, undefined, Number.NaN].map(draftStepOf)).toEqual([null, null, null, null, null, null, null]);
  });
});
