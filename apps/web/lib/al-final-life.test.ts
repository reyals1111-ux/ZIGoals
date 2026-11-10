import {expect, test} from 'vitest';
import {customReturnIssue} from '../components/calculator/calculator-extras';
import {waterTargetWarning} from './health-plausible';
import {pillarGlance} from './review-unified/glance';
import {periodNote} from './insight-notes/notes';

// Session AL final pass: the logic behind four replay rows (docs/review/session-al/GROK53_REPLAY_*_3.md).
test('N-TK-18: "Another return" says what is wrong with "-abc5", and takes a real return', () => {
  expect(customReturnIssue('')).toBeNull();
  expect(customReturnIssue('-abc5')).toBe('Enter a yearly return in percent, like 7 or -2.5.');
  expect(customReturnIssue('7')).toBeNull();
  expect(customReturnIssue('-2,5')).toBeNull();
  expect(customReturnIssue('-80')).toBe('Enter a yearly return from -50 to 100 %.');
});
test('D-076: a water target under a glass a day asks once', () => {
  expect(waterTargetWarning(1)).toBe('1 mL a day is less than one glass of water. If it is right, press Save journal preferences again to keep it.');
  expect(waterTargetWarning(2000)).toBeNull();
});
test('N-NB-04: the review says "1 day", never "1 days"', () => {
  const review = {counts: {contributions: 0, habitCheckIns: 1, healthDays: 0}, goalsMoved: [], streaks: [{title: 'Drink water', streak: 1, unit: 'days'}], money: [], window: {start: '2026-11-02', end: '2026-11-08'}};
  const habits = pillarGlance(review as never, {financial: false}).find(g => g.pillar === 'habits')!;
  expect(habits.line).toBe('1 check-in · longest streak 1 day');
  expect(pillarGlance({...review, streaks: [{title: 'Read', streak: 9, unit: 'days'}]} as never, {financial: false}).find(g => g.pillar === 'habits')!.line).toContain('longest streak 9 days');
  const note = periodNote({period: 'week', days: 7, counts: review.counts, trends: [], streak: {title: 'Drink water', streak: 1, unit: 'days'}} as never);
  expect(note.lines).toContain('Your longest running streak: Drink water, 1 day.');
});
