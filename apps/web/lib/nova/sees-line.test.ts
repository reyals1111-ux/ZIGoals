import {expect, test} from 'vitest';
import {seesLine} from './sees-line';

/** Session AK P4 (FIRST_RUN_REVIEW FR-13): the chip names what NOVA sees, never "4 of 5 pillars" (the app has four). */
test('NOVA\'s "Sees" chip names the areas', () => {
  const all = {today: true, goals: true, habits: true, wealth: true, health: true};
  expect(seesLine({...all, health: false})).toBe('Today, Goals, Habits, Wealth · Health off');
  expect(seesLine(all)).toBe('Today, Goals, Habits, Wealth, Health');
  expect(seesLine({...all, wealth: false, health: false})).toBe('Today, Goals, Habits · Health off');
  expect(seesLine({today: false, goals: false, habits: false, wealth: false, health: false})).toBe('Nothing yet');
  expect(seesLine({...all, health: false})).not.toMatch(/of 5/);
});
