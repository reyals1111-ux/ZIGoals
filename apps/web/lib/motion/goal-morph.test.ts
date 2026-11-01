// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {clearGoalOpen, GOAL_MORPH_MS, goalMorphClass, goalMorphName, noteGoalOpen, openedGoal} from './goal-morph';

/** Session AK M1: the goal card → goal page morph's hand-off, its name and its level rule (Full only). */
afterEach(() => clearGoalOpen());

test('the hand-off: the tapped goal only, for a few seconds, read without being used up', () => {
  expect(openedGoal('82')).toBeNull();
  noteGoalOpen('82', 'Financial Freedom', 1000);
  expect(openedGoal('82', 1000 + 10)).toEqual({name: 'Financial Freedom'});
  expect(openedGoal('82', 1000 + 20)).toEqual({name: 'Financial Freedom'});
  expect(openedGoal('81', 1000 + 10)).toBeNull();
  expect(openedGoal('82', 1000 + GOAL_MORPH_MS + 1)).toBeNull();
  noteGoalOpen('81', 'x'.repeat(500), 2000);
  expect(openedGoal('81', 2000)?.name).toHaveLength(200);
  expect(openedGoal('82', 2000)).toBeNull();
});

test('the shared name is a valid view-transition name for any id', () => {
  expect(goalMorphName('82')).toBe('zg-goal-82');
  expect(goalMorphName('3f2a-9b:x y/é')).toBe('zg-goal-3f2a-9b_x_y__');
  expect(goalMorphName('a'.repeat(200))).toHaveLength('zg-goal-'.length + 80);
});

test('Full morphs; Calm, Off and reduced motion (which reads as Off) never do', () => {
  expect(goalMorphClass('full')).toBe('zg-morph');
  expect(goalMorphClass('calm')).toBe('none');
  expect(goalMorphClass('off')).toBe('none');
});
