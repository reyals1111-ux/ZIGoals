import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitInput} from '../habits';
import {reviewPeriod, type LifeReview} from '../life-review/engine';
import {EXAMPLE_FOOTER, FOOTER, goalProgressCard, habitStreakCard, weekReviewCard} from './kinds';

const TODAY = '2026-10-31', ID = '11111111-1111-4111-8111-111111111111';
const input: HabitInput = {title: 'Stretch', category: 'Wellbeing', description: '', notes: 'my private note', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
function habit(days: number) { let d = createHabit(emptyHabitData(), input, new Date('2026-09-01T06:00:00Z'), ID); for (let i = 0; i < days; i++) { const day = new Date(Date.parse(`${TODAY}T12:00:00Z`) - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10); d = logHabitValue(d, ID, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); } return d.habits[0]!; }
const review = (over: Partial<LifeReview> = {}): Pick<LifeReview, 'counts' | 'streaks' | 'wins' | 'health' | 'goalsMoved' | 'window'> => ({
  window: reviewPeriod('week', TODAY), counts: {habitCheckIns: 12, healthDays: 5, contributions: 2},
  streaks: [{title: 'Read', streak: 9, unit: 'days'}], wins: ['Finished Laptop fund', 'Sleep 7 h: on target, 7.4 h on average', 'Stretch: every scheduled day done'],
  health: [{label: 'Sleep a night', now: '7 h 10 min', before: null, detail: ''}, {label: 'Steps a day', now: '8,100', before: null, detail: ''}, {label: 'Days with water', now: '5 of 7', before: null, detail: ''}],
  goalsMoved: [{name: 'House', href: '/x', line: '+€250.00 put in (2 contributions)'}, {name: 'Trip', href: '/y', line: 'Booked the flights'}], ...over,
});
const text = (c: {lines: readonly string[]; title: string; eyebrow: string; footer?: string}) => [c.eyebrow, c.title, ...c.lines, c.footer].join(' | ');

describe('8.5 one share-card system: sensitive numbers off by default, Showcase cards labelled', () => {
  test('goal progress: the percentage only; amounts with the box ticked; nothing to tick without known amounts', () => {
    const goal = {title: 'House deposit', current: 2500, target: 10000, currency: 'EUR'};
    const plain = goalProgressCard(goal);
    expect(plain.lines).toEqual(['25% of the way']);
    expect(text(plain)).not.toMatch(/€|2,500|10,000/);
    expect(plain.hasSensitive).toBe(true);
    expect(goalProgressCard(goal, {sensitive: true}).lines[1]).toMatch(/€2,500\.00 of €10,000\.00/);
    expect(goalProgressCard({title: 'X', current: null, target: null}).hasSensitive).toBe(false);
    expect(plain.footer).toBe(FOOTER);
    expect(plain.fileName).toBe('zigoals-goal-progress-house-deposit.png');
  });
  test('habit streak and strength: counts and its own percentage, never its notes', () => {
    const card = habitStreakCard(habit(10), TODAY);
    expect(card.title).toBe('Stretch');
    expect(card.lines).toEqual(expect.arrayContaining(['10 days in a row', expect.stringMatching(/^Strength: done on \d+% of its scheduled days$/)]));
    expect(text(card)).not.toContain('private');
    expect(card.hasSensitive).toBe(false);
  });
  test('week review: counts, streak and figure-free wins by default; Health values and amounts only when ticked', () => {
    const plain = weekReviewCard(review(), 'Oct 25 – Oct 31');
    expect(plain.title).toBe('My week');
    expect(plain.lines).toEqual(['12 habit check-ins', 'Health records on 5 of 7 days', '2 goal contributions', 'Longest streak: Read, 9 days', 'Finished Laptop fund', 'Stretch: every scheduled day done']);
    expect(text(plain)).not.toMatch(/€|7 h 10|8,100|7\.4/);
    expect(plain.hasSensitive).toBe(true);
    const all = weekReviewCard(review(), 'Oct 25 – Oct 31', {sensitive: true});
    expect(all.lines.length).toBeLessThanOrEqual(6);
    const roomy = weekReviewCard(review({counts: {habitCheckIns: 0, healthDays: 0, contributions: 0}, streaks: [], wins: []}), 'r', {sensitive: true});
    expect(roomy.lines).toEqual(['Sleep: 7 h 10 min a night on average', 'Steps: 8,100 a day on average', 'House: +€250.00 put in (2 contributions)']);
    expect(weekReviewCard(review({window: reviewPeriod('month', TODAY)}), 'Oct').title).toBe('My month');
  });
  test('an empty period has a calm line and nothing to tick', () => {
    const quiet = weekReviewCard(review({counts: {habitCheckIns: 0, healthDays: 0, contributions: 0}, streaks: [], wins: [], health: [], goalsMoved: []}), 'r');
    expect(quiet.lines).toEqual(['A quiet stretch, and that is fine.']);
    expect(quiet.hasSensitive).toBe(false);
  });
  test('Showcase cards say "Example" on the card and in the file name', () => {
    for (const card of [goalProgressCard({title: 'Trip', current: 1, target: 2}, {example: true}), habitStreakCard(habit(2), TODAY, {example: true}), weekReviewCard(review(), 'r', {example: true})]) {
      expect(card.eyebrow).toMatch(/^Example · /);
      expect(card.footer).toBe(EXAMPLE_FOOTER);
      expect(card.fileName).toMatch(/^zigoals-example-/);
      expect(card.example).toBe(true);
    }
  });
});
