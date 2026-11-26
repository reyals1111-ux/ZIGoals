import {describe, expect, it} from 'vitest';
import {SUGGESTED_SLEEP_MINUTES, suggestedSleepGoal} from './onboarding-setup';
import {SLEEP_GOALS} from './templates/health';

// Session AW (FR-AW-7): the "Sleep better" focus suggests a sleep goal the starters step can offer.
describe('the sleep goal suggested by a focus', () => {
  it('is 8 h when "Sleep better" is picked, among the choices the starters step shows', () => {
    expect(suggestedSleepGoal(['sleep'])).toBe(480);
    expect(suggestedSleepGoal(['read', 'sleep', 'save'])).toBe(480);
    expect(SLEEP_GOALS).toContain(SUGGESTED_SLEEP_MINUTES);
  });
  it('is nothing without that focus', () => {
    expect(suggestedSleepGoal([])).toBeNull();
    expect(suggestedSleepGoal(['move', 'water', 'meditate'])).toBeNull();
  });
});
