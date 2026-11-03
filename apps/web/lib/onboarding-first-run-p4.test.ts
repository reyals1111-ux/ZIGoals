import {expect, test} from 'vitest';
import {createHabit, emptyHabitData} from './habits';
import {FOCUSES, SAVING_HABIT, emptyOnboardingSetup, focusHabitInput, focusHabitRhythm, onboardingSetupSchema, setupLanding, setupLandingLine, suggestionsFor} from './onboarding-setup';

/** Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-4 and FR-8): what the welcome makes and how Today greets it. */
const now = new Date('2026-11-01T09:00:00Z');
const made = {...emptyOnboardingSetup(), at: '2026-11-01T08:58:00.000Z', habitIds: ['h1', 'h2'], goalId: 'g1', focuses: ['save' as const]};

test('FR-8: "Save for something" suggests "Put money aside", weekly, under Money and linked to the goal', () => {
  expect(FOCUSES.find(f => f.id === 'save')?.habits).toEqual(['Put money aside']);
  expect(suggestionsFor(['save']).habits).not.toContain('Contribute');
  const input = focusHabitInput(SAVING_HABIT, '123');
  expect(input).toMatchObject({title: 'Put money aside', category: 'Money', schedule: {kind: 'frequency', times: 1, period: 'week'}, goalLink: {chainId: 'private', owner: 'local', goalId: '123'}});
  expect(focusHabitRhythm(SAVING_HABIT)).toBe('weekly');
  // It is a valid habit for Habits' own writer, and the other focuses' habits stay daily "Wellbeing" check-ins.
  expect(createHabit({...emptyHabitData(), timeZone: 'UTC'}, input, now, '7f9c1e2a-3b4d-4c5e-8f6a-1b2c3d4e5f60').habits[0]?.title).toBe('Put money aside');
  expect(focusHabitInput('Walk')).toMatchObject({category: 'Wellbeing', schedule: {kind: 'daily'}});
  expect(focusHabitInput('Walk')).not.toHaveProperty('goalLink');
  expect(focusHabitRhythm('Walk')).toBe('daily');
});

test('FR-4: Today says "You\'re set" with the new goal and today\'s habits, until a habit is ticked, closed or a day passes', () => {
  const l = setupLanding(made, now, {goalName: 'Emergency fund', habitsToday: 2, tickedToday: false});
  expect(l).toEqual({goal: 'Emergency fund', habits: 2});
  expect(setupLandingLine(l!)).toBe('Your goal “Emergency fund” · 2 habits for today');
  expect(setupLandingLine({habits: 1})).toBe('1 habit for today');
  expect(setupLanding(made, now, {goalName: 'Emergency fund', habitsToday: 2, tickedToday: true})).toBeNull();
  expect(setupLanding({...made, landingClosed: true}, now, {habitsToday: 2, tickedToday: false})).toBeNull();
  expect(setupLanding({...made, undone: true}, now, {habitsToday: 2, tickedToday: false})).toBeNull();
  expect(setupLanding(made, new Date('2026-11-02T09:00:00Z'), {habitsToday: 2, tickedToday: false})).toBeNull();
  expect(setupLanding(made, now, {habitsToday: 0, tickedToday: false})).toBeNull();
  expect(setupLanding(emptyOnboardingSetup(), now, {habitsToday: 0, tickedToday: false})).toBeNull();
});

test('FR-4: the record keeps its shape; "closed" is one optional field older builds ignore', () => {
  expect(onboardingSetupSchema.parse({...made, landingClosed: true}).landingClosed).toBe(true);
  expect(onboardingSetupSchema.parse(made).landingClosed).toBeUndefined();
  expect(() => onboardingSetupSchema.parse({...made, landingClosed: 'yes'})).toThrow();
});
