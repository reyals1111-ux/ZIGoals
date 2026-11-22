import {describe, expect, test} from 'vitest';
import {AFFIRMATIONS, AFFIRMATIONS_NL, affirmationOfTheDay} from './affirmations';

/** Session AV lane 2 (journal; LEDGER #176, Fabulous's daily affirmations), pure. */
describe('the daily affirmation', () => {
  test('the same number in English and Dutch, none repeated, short, calm and first-person', () => {
    expect(AFFIRMATIONS_NL).toHaveLength(AFFIRMATIONS.length);
    expect(AFFIRMATIONS.length).toBeGreaterThanOrEqual(28);
    for (const list of [AFFIRMATIONS, AFFIRMATIONS_NL]) {
      expect(new Set(list).size).toBe(list.length);
      for (const a of list) { expect(a.length, a).toBeLessThanOrEqual(70); expect(a, a).toMatch(/\.$/); expect(a, a).not.toMatch(/\b(?:must|should|weight|calorie|diet|money|moet|gewicht|calorie|geld)\b/i); }
    }
    for (const a of AFFIRMATIONS) expect(a, a).toMatch(/\b(?:I|My|me|myself)\b/);
  });
  test('one a day, the same for everyone that day; Another one steps on; Dutch in the same place', () => {
    const today = affirmationOfTheDay('2026-11-23'), next = affirmationOfTheDay('2026-11-23', 1);
    expect(today).not.toBe(next);
    expect(affirmationOfTheDay('2026-11-24')).toBe(next);
    expect(affirmationOfTheDay('2026-11-23', 0, 'nl')).toBe(AFFIRMATIONS_NL[AFFIRMATIONS.indexOf(today)]);
    expect(affirmationOfTheDay('2026-11-23', AFFIRMATIONS.length)).toBe(today);
  });
});
