import {expect, test} from 'vitest';
import {AT_ANSWERS, AT_QUESTIONS, AT_STAGE, AT_WIDGETS, answerProblem, detailsProblem} from './hosted-alpha-at.mjs';

// Session AT (TIER 3 (verifier), ADR-043 D13): stage 14's own checks, without a browser.
test('stage 14 is appended, browser-local, not live only', () => {
  expect([AT_STAGE.number, AT_STAGE.key, AT_STAGE.browser, AT_STAGE.liveOnly, AT_STAGE.reportsItself]).toEqual([14, 'at', true, false, false]);
  expect(AT_QUESTIONS).toEqual({missed: 'how many habits did I miss this week', meditate: 'wgat days did i forget to meditate this month'});
  expect(AT_WIDGETS).toEqual({missed: 'habit-misses', meditate: 'habit-missed-days'});
});
test('the answers are checked by their shape, whatever the day', () => {
  // The owner's 17 Nov Showcase answers (tests/nova-answers-as.spec.ts) pass.
  expect(answerProblem('missed', 'You missed no habit this week (Mon, Nov 16 to Tue, Nov 17): 11 of 11 due check-ins done.')).toBeNull();
  expect(answerProblem('missed', 'You missed 2 of 7 habits this week (Mon, Nov 16 to Thu, Nov 19): Read and Run.')).toBeNull();
  expect(answerProblem('meditate', 'Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12.')).toBeNull();
  // The answers before Session AS fail: the list of habits, and the month's minutes.
  expect(answerProblem('missed', 'Your habits: Exercise, Meditate, Read, Drink water, Journal, Stretch and Walk.')).toMatch(/does not start/);
  expect(answerProblem('meditate', 'Meditate: 140 minutes this month.')).toMatch(/minutes instead of the days/);
  expect(answerProblem('meditate', '')).toMatch(/empty/);
  expect(AT_ANSWERS.missed.test('Every habit was done on every due day this week (11 of 11).')).toBe(true);
});
test('Send feedback\'s details name the theme and the screen', () => {
  expect(detailsProblem('App: ZIGoals Alpha\nTheme: Nebula\nScreen: 1280 × 900 px')).toBeNull();
  expect(detailsProblem('App: ZIGoals Alpha\nTheme: Nebula')).toBe("Send feedback's device details lack Screen:");
});
