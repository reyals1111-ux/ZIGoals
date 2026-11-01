import {expect, test} from 'vitest';
import {coachSlotShown} from './coach-slot';

/** Session AK P4 (FIRST_RUN_REVIEW FR-15): no "Your coach · Log a weight" on Today for a person who chose no Health. */
test('the coach check-in shows with Health, or once a weight exists', () => {
  expect(coachSlotShown({healthShown: false, weights: 0})).toBe(false);
  expect(coachSlotShown({healthShown: true, weights: 0})).toBe(true);
  expect(coachSlotShown({healthShown: false, weights: 3})).toBe(true);
});
