import {describe, expect, it} from 'vitest';
import {createHabit, logHabitCount, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {buildSystemPrompt} from '../ai/context/specialists';
import {Handles} from '../ai/handles';
import {toolEnv} from '../ai/tools/env';
import {gatesFor, showcaseSources} from '../ai/tools/fixtures';
import {runTool} from '../ai/tools/registry';

// Session AK F0: the two ZIGi rows of ADR-034 that had only real-model evidence get unit tests.
const DAY = '2026-10-05', ID = '7a000000-0000-4000-8000-0000000000c1';
/** A daily habit started on `start` with a check-in on every day from `from` to DAY (the fixture's today). */
function streakFrom(start: string, from: string): HabitData {
  let habits = createHabit(showcaseSources().habits, {title: 'Stretch daily', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${start}T07:00:00Z`), ID);
  for (let day = from; day <= DAY; day = addLocalDays(day, 1)) habits = logHabitCount(habits, ID, day, 1, '', new Date(`${day}T08:00:00Z`));
  return habits;
}
const streakOf = (habits: HabitData, range: string) => {
  const result = runTool('habit_stats', {habit: 'Stretch daily', metric: 'streak', range}, toolEnv(showcaseSources(DAY, {habits}), gatesFor(true), 'provider', new Handles()));
  if (!result.ok) throw new Error(result.refusal);
  return (result.data as {streak: {current: number; best: number; unit: string; since?: string; counts: string}}).streak;
};

describe('ZI14 (Grok\'s M-044): a streak carries its start date and what it counts', () => {
  it('a streak that began last month says so, even when the range asked is this month', () => {
    const streak = streakOf(streakFrom('2026-09-01', '2026-09-20'), 'this month');
    expect(streak.current).toBe(16);
    expect(streak.since).toBe('2026-09-20'); // across the month boundary: 11 days of September and 5 of October
    expect(streak.counts).toMatch(/across months \(not only the range asked\)/);
  });
  it('a one-day streak starts today; across a year end the date is exact', () => {
    expect(streakOf(streakFrom('2026-09-01', DAY), 'today')).toMatchObject({current: 1, since: DAY});
    const habits = streakFrom('2026-09-01', '2026-09-01');
    expect(streakOf(habits, 'this month')).toMatchObject({current: 35, since: '2026-09-01'});
  });
  it('no streak has no start date (never a made-up one)', () => {
    const habits = createHabit(showcaseSources().habits, {title: 'Stretch daily', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T07:00:00Z'), ID);
    const streak = streakOf(habits, 'this month');
    expect(streak.current).toBe(0);
    expect(streak.since).toBeUndefined();
  });
});

describe('G15: when a streak ends, ZIGi leads with what still counts', () => {
  const words = 'When a streak ends, lead with what still counts (the days done, the best streak) and the next small step; never words of failure, blame or guilt';
  it('is in the system prompt on every page ZIGi answers from', () => {
    for (const area of ['today', 'habits', 'health', 'goals', 'wealth'] as const) {
      expect(buildSystemPrompt({area, context: null, customInstructions: '', providerName: 'Mock'}), area).toContain(words);
    }
  });
  it('the Habits page adds that a skip never breaks a streak and rest days are part of a plan', () => {
    const prompt = buildSystemPrompt({area: 'habits', context: null, customInstructions: '', providerName: 'Mock'});
    expect(prompt).toContain('a skipped day is neutral, it never breaks a streak');
    expect(prompt).toContain('Rest days are part of a plan, not a failure.');
  });
});
