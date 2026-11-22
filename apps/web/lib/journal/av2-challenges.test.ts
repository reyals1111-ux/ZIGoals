import {describe, expect, test} from 'vitest';
import {CHALLENGES, CHALLENGES_NL, challengeDoneToday, challengeOfTheDay} from './challenges';
import {affirmationOfTheDay} from './affirmations';
import {LET_GO_LINES, letGoLine, WRITE_IT_OUT_ID} from './write-it-out';

/** Session AV lane 2 (bodymind-r2; LEDGER #230, #231, Reflectly), pure. */
describe('the small daily challenge', () => {
  test('the same number in English and Dutch, none repeated, short and kind; nothing about weight, food, money or results', () => {
    expect(CHALLENGES_NL).toHaveLength(CHALLENGES.length);
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(28);
    for (const list of [CHALLENGES, CHALLENGES_NL]) {
      expect(new Set(list).size).toBe(list.length);
      for (const c of list) { expect(c.length, c).toBeLessThanOrEqual(70); expect(c, c).toMatch(/\.$/); expect(c, c).not.toMatch(/\b(?:must|should|weight|calorie|diet|money|buy|spend|streak|moet|gewicht|calorie|dieet|geld|koop|reeks)\b/i); }
    }
  });
  test('one a day, the same for everyone that day, beside (not equal to) the affirmation; Another one steps on; Dutch in the same place', () => {
    const today = challengeOfTheDay('2026-11-23'), next = challengeOfTheDay('2026-11-23', 1);
    expect(today).not.toBe(next);
    expect(challengeOfTheDay('2026-11-24')).toBe(next);
    expect(challengeOfTheDay('2026-11-23', 0, 'nl')).toBe(CHALLENGES_NL[CHALLENGES.indexOf(today)]);
    expect(challengeOfTheDay('2026-11-23', CHALLENGES.length)).toBe(today);
    expect(today).not.toBe(affirmationOfTheDay('2026-11-23'));
  });
  test('Done is today\'s own mark only: the next day starts fresh', () => {
    expect(challengeDoneToday({challengeDone: '2026-11-23'}, '2026-11-23')).toBe(true);
    expect(challengeDoneToday({challengeDone: '2026-11-23'}, '2026-11-24')).toBe(false);
    expect(challengeDoneToday({}, '2026-11-24')).toBe(false);
  });
});

describe('Write it out', () => {
  test('a calm closing line, English and Dutch the same number, each saying nothing was kept or that it is gone', () => {
    expect(LET_GO_LINES.nl).toHaveLength(LET_GO_LINES.en.length);
    for (const l of LET_GO_LINES.en) expect(l).toMatch(/nothing was (?:kept|saved)|gone/i);
    for (const l of LET_GO_LINES.nl) expect(l).toMatch(/niets (?:bewaard|opgeslagen)|weg/i);
    expect(LET_GO_LINES.en).toContain(letGoLine(Date.UTC(2026, 10, 23, 9, 0), 'en'));
    expect(LET_GO_LINES.nl).toContain(letGoLine(Date.UTC(2026, 10, 23, 9, 1), 'nl'));
    expect(WRITE_IT_OUT_ID).toMatch(/^[a-z0-9-]{1,40}$/); // the journal entry's template id pattern
  });
});
