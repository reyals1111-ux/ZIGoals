import {expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, healthSchema} from '../health';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {homeRecordsIn} from '../sync-homes-store';
import {reviewWindow, weekSummary} from '../weekly-review/engine';
import {summaryCounts, summaryParagraph, guideWeekSummary} from './summary';

// ADR-011 "Summary": the paragraph's numbers equal the engines' counts for the same week; zeros are written out.
const DAY = '2026-09-20';
function showcase() {
  const {records} = buildShowcase(DAY);
  return {habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform: platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!)), review: homeRecordsIn(records).weeklyReview};
}
test('the Showcase week: habit days, water days and the intention agree with the weekly review engine', () => {
  const {habits, health, platform, review} = showcase(), window = reviewWindow(review.weekday, DAY), now = Date.parse(`${DAY}T12:00:00Z`);
  const counts = summaryCounts({...window, habits, health, platform, financial: true, review, now});
  const engine = weekSummary({...window, habits, health, platform, now, financial: true, review});
  expect(counts.scheduled).toBe(engine.habits.reduce((n, h) => n + h.scheduled, 0));
  expect(counts.done).toBe(engine.habits.reduce((n, h) => n + h.done, 0));
  const waterLine = engine.health.find(line => line.includes('with water'));
  expect(counts.waterDays).toBe(waterLine ? Number(waterLine.split(' ')[0]) : 0);
  expect(counts.lastIntention).toBe(engine.lastIntention);
  expect(counts.scheduled).toBeGreaterThan(0); expect(counts.waterDays).toBeGreaterThan(0);
  const text = guideWeekSummary({...window, habits, health, platform, financial: true, review, now});
  expect(text).toMatch(/^This week: \d+ of \d+ habit days done, water logged on \d+ days?, (no weights recorded|\d+ weights? recorded), (no planned contributions|\d+ of \d+ planned contributions? recorded)\.( Last week you wrote: ‘.+’\.)?$/);
  expect(text).not.toMatch(/!|should|only|must/);
});
test('zeros are written out, the financial clause leaves with the domain, and the intention is quoted when there was one', () => {
  const zero = {done: 0, scheduled: 0, waterDays: 0, weights: 0, recorded: 0, planned: 0, lastIntention: null};
  expect(summaryParagraph(zero, true)).toBe('This week: no habit days scheduled, no days with water logged, no weights recorded, no planned contributions.');
  expect(summaryParagraph(zero, false)).toBe('This week: no habit days scheduled, no days with water logged, no weights recorded.');
  expect(summaryParagraph({done: 4, scheduled: 7, waterDays: 1, weights: 1, recorded: 1, planned: 2, lastIntention: 'one walk a day'}, true)).toBe('This week: 4 of 7 habit days done, water logged on 1 day, 1 weight recorded, 1 of 2 planned contributions recorded. Last week you wrote: ‘one walk a day’.');
});
