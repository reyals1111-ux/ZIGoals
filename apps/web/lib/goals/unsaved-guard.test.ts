import {expect, test} from 'vitest';
import {wizardGuardOn} from './wizard-guard';

// Session AL (DV-064, P-DV-36; keep-list DV-032): the discard question only for a change made here and not saved.
test('typed now: asks (DV-032 stays); a restored draft left untouched: asks nothing (DV-064); saved or empty: never', () => {
  expect(wizardGuardOn({saved: false, restored: false, touched: true, typed: true})).toBe(true);
  expect(wizardGuardOn({saved: false, restored: true, touched: false, typed: true})).toBe(false);
  expect(wizardGuardOn({saved: false, restored: true, touched: true, typed: true})).toBe(true);
  expect(wizardGuardOn({saved: true, restored: false, touched: true, typed: true})).toBe(false);
  expect(wizardGuardOn({saved: false, restored: false, touched: false, typed: false})).toBe(false);
  // A template or shared link fills the form before any touch: still guarded (it was not restored from a draft).
  expect(wizardGuardOn({saved: false, restored: false, touched: false, typed: true})).toBe(true);
});
