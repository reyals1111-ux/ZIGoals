import {expect, test} from 'vitest';
import {coachSlotShown} from './coach-slot';

/** Session AK P4 (FIRST_RUN_REVIEW FR-15): no "Your coach · Log a weight" on Today for a person who chose no Health. */
test('the coach check-in shows with Health, or once a weight exists', () => {
  expect(coachSlotShown({healthShown: false, weights: 0})).toBe(false);
  expect(coachSlotShown({healthShown: true, weights: 0})).toBe(true);
  expect(coachSlotShown({healthShown: false, weights: 3})).toBe(true);
});

/** Session AL (P-NB-10, NB-244, NB-254): no coach for a profile with nothing logged; "Log a weight →" opens the Weight view. */
test('NB-244: with Health shown, the coach waits for a first Health record', async () => {
  expect(coachSlotShown({healthShown: true, weights: 0, records: 0})).toBe(false);
  expect(coachSlotShown({healthShown: true, weights: 0, records: 2})).toBe(true);
  expect(coachSlotShown({healthShown: false, weights: 0, records: 5})).toBe(false);
  expect(coachSlotShown({healthShown: false, weights: 1, records: 1})).toBe(true);
  const {LOG_WEIGHT_HREF} = await import('./coach-slot');
  expect(new URL(LOG_WEIGHT_HREF, 'https://x.test').searchParams.get('view')).toBe('weight');
});
