import {describe, expect, test} from 'vitest';
import {CHALLENGE_TEMPLATES, amountCents, challengeForTemplate, challengeWeek, emptySavingsChallenges, fiftyTwoWeek, noSpend, recordedSince, removeChallenge, roundUp, roundUps, savingsChallengesSchema, scheduleTotal, setChallenge, toggleNoSpendDay, weekAmount, yearTotal, type Challenge} from './challenges';
import {showcaseSavingsChallenges} from './showcase';
import {showcaseMoneyLog} from '../money-log/showcase';
import {weekOf} from '../money-log/engine';
import {GOAL_LIBRARY, templateById} from '../templates/goal-library';
import {addLocalDays} from '../local-date';

const DAY = '2026-10-31';
describe('savings challenges (Session AK F5a, item 2)', () => {
  test('each challenge is a template in the library, in the Wealth area, with clear steps and no suggested sum', () => {
    for (const id of Object.values(CHALLENGE_TEMPLATES)) {
      const t = templateById(id)!;
      expect(t, id).toBeTruthy();
      expect(t.area).toBe('wealth');
      expect(t.milestones!.length).toBeGreaterThanOrEqual(3);
      expect([t.title, t.summary, ...t.milestones!].join(' ')).not.toMatch(/[$€£]|\b(usd|eur)\b|\d+\s?%/i);
    }
    expect(challengeForTemplate('challenge-52-week')).toBe('52-week');
    expect(challengeForTemplate('run-10k')).toBeNull();
    expect(challengeForTemplate(undefined)).toBeNull();
    expect(new Set(GOAL_LIBRARY.map(t => t.id)).size).toBe(GOAL_LIBRARY.length);
  });
  test('the 52-week schedule: n steps in week n (or 53 − n counting down); the year is 1,378 steps either way', () => {
    expect(weekAmount(1, 500n)).toBe(500n);
    expect(weekAmount(52, 500n)).toBe(26_000n);
    expect(weekAmount(1, 500n, 'down')).toBe(26_000n);
    expect(weekAmount(0, 500n)).toBe(0n);
    expect(weekAmount(53, 500n)).toBe(0n);
    expect(yearTotal(100n)).toBe(137_800n);
    expect(scheduleTotal(52, 100n, 'down')).toBe(137_800n);
    expect(scheduleTotal(4, 100n)).toBe(1_000n);
    expect(scheduleTotal(4, 100n, 'down')).toBe(100n * BigInt(52 + 51 + 50 + 49));
    let sum = 0n; for (let n = 1; n <= 52; n++) sum += weekAmount(n, 7n, 'down');
    expect(sum).toBe(yearTotal(7n));
  });
  test('weeks: 0 before the start, 1 on the first day, 53 after the last week', () => {
    expect(challengeWeek(DAY, addLocalDays(DAY, -1))).toBe(0);
    expect(challengeWeek(DAY, DAY)).toBe(1);
    expect(challengeWeek(DAY, addLocalDays(DAY, 6))).toBe(1);
    expect(challengeWeek(DAY, addLocalDays(DAY, 7))).toBe(2);
    expect(challengeWeek(DAY, addLocalDays(DAY, 400))).toBe(53);
  });
  test('progress comes from what was recorded toward the goal since the start: weeks covered, ahead or behind', () => {
    const amounts = [{day: '2026-09-01', units: 99_999n}, {day: '2026-10-03', units: 5_000n}, {day: '2026-10-10', units: 10_000n}, {day: '2026-10-12', units: -2_000n}, {day: '2026-11-05', units: 1n}];
    const recorded = recordedSince(amounts, '2026-10-03', DAY);
    expect(recorded).toBe(13_000n);
    const p = fiftyTwoWeek('2026-10-03', DAY, 1_000n, 'up', recorded);
    expect(p).toEqual({week: 5, thisWeek: 5_000n, expected: 15_000n, recorded: 13_000n, covered: 4, difference: -2_000n, done: false});
    expect(fiftyTwoWeek('2025-01-01', DAY, 1n, 'up', 1_378n).done).toBe(true);
    expect(fiftyTwoWeek(DAY, DAY, 1_000n, 'down', 0n).covered).toBe(0);
  });
  test('no-spend days: only marked days count; a marked day with a logged expense is listed apart; unknown is not zero', () => {
    const c = {startedOn: '2026-10-20', targetDays: 10, noSpendDays: ['2026-10-19', '2026-10-25', '2026-10-29', '2026-10-30', '2026-10-31']};
    const log = [{date: '2026-10-25', kind: 'expense' as const}, {date: '2026-10-30', kind: 'income' as const}, {date: '2026-10-28', kind: 'expense' as const}];
    expect(noSpend(c, log, DAY, '2026-10-26')).toEqual({counted: 3, conflicts: ['2026-10-25'], thisWeek: 3, run: 3, target: 10});
    expect(noSpend({startedOn: DAY}, [], DAY, DAY)).toEqual({counted: 0, conflicts: [], thisWeek: 0, run: 0, target: 30});
    // Yesterday ends a run too (today is not over yet).
    expect(noSpend({startedOn: '2026-10-01', noSpendDays: ['2026-10-29', '2026-10-30']}, [], DAY, '2026-10-26').run).toBe(2);
    let ch: Challenge = {kind: 'no-spend', startedOn: DAY};
    ch = toggleNoSpendDay(ch, DAY); expect(ch.noSpendDays).toEqual([DAY]);
    ch = toggleNoSpendDay(ch, DAY); expect(ch.noSpendDays).toEqual([]);
  });
  test('round-ups by hand: exact cents per expense, by week, in one currency; others counted apart', () => {
    expect(amountCents('3.4')).toBe(340n);
    expect(amountCents('x')).toBeNull();
    expect(roundUp(340n, 1)).toBe(60n);
    expect(roundUp(400n, 1)).toBe(0n);
    expect(roundUp(1_240n, 5)).toBe(260n);
    expect(roundUp(1_240n, 10)).toBe(760n);
    const week = (d: string) => weekOf(d, 'monday').start;
    const entries = [
      {date: '2026-10-31', kind: 'expense' as const, amount: '4.20', currency: 'EUR'}, {date: '2026-10-27', kind: 'expense' as const, amount: '12.50', currency: 'EUR'},
      {date: '2026-10-20', kind: 'expense' as const, amount: '9.99', currency: 'EUR'}, {date: '2026-10-20', kind: 'income' as const, amount: '0.50', currency: 'EUR'},
      {date: '2026-10-21', kind: 'expense' as const, amount: '3.00', currency: 'USD'}, {date: '2026-09-01', kind: 'expense' as const, amount: '1.10', currency: 'EUR'},
    ];
    const r = roundUps(entries, 'EUR', 1, '2026-10-15', DAY, week);
    expect(r).toEqual({total: 80n + 50n + 1n, thisWeek: 130n, counted: 3, otherCurrency: 1, weeks: [{start: '2026-10-19', cents: 1n}, {start: '2026-10-26', cents: 130n}]});
  });
  test('the record is loose, versioned and bounded; set and remove', () => {
    expect(savingsChallengesSchema.parse({version: 1})).toEqual({version: 1, goals: {}});
    expect(savingsChallengesSchema.safeParse({version: 1, goals: {abc: {kind: '52-week', startedOn: DAY}}}).success).toBe(false);
    expect(savingsChallengesSchema.safeParse({version: 1, goals: {'7': {kind: 'round-up', startedOn: DAY, roundTo: 3}}}).success).toBe(false);
    expect(savingsChallengesSchema.safeParse({version: 1, goals: {'7': {kind: 'no-spend', startedOn: DAY, noSpendDays: Array(401).fill(DAY)}}}).success).toBe(false);
    const r = setChallenge(emptySavingsChallenges(), '7', {kind: 'round-up', startedOn: DAY, roundTo: 5, later: true} as Challenge);
    expect(r.goals['7']!.roundTo).toBe(5);
    expect(removeChallenge(r, '7').goals).toEqual({});
  });
  test('the Showcase: labelled, valid, and its no-spend marks are checked against the Showcase money log', () => {
    const s = showcaseSavingsChallenges(DAY), log = showcaseMoneyLog(DAY).entries;
    expect(Object.values(s.goals).every(c => /SHOWCASE DATA/.test(c.note ?? ''))).toBe(true);
    const p = noSpend(s.goals['9203']!, log, DAY, weekOf(DAY, 'monday').start);
    expect(p.counted).toBe(8);
    expect(p.conflicts).toEqual([addLocalDays(DAY, -12)]);
    const w = fiftyTwoWeek(s.goals['9202']!.startedOn, DAY, 5_000n, 'up', 200_000n);
    expect(w.week).toBe(4);
    expect(w.difference > 0n).toBe(true);
  });
});
