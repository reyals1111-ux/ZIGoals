import {expect, test} from 'vitest';
import {welcomeBack} from './checkin';
// Session AJ (item 10; P4 moment 7).
test('welcome back after 7 days or more; never on a first visit or a later day the same week', () => {
  expect(welcomeBack(undefined, '2026-10-29')).toBe(false);
  expect(welcomeBack('2026-10-22', '2026-10-29')).toBe(true);
  expect(welcomeBack('2026-10-23', '2026-10-29')).toBe(false);
  expect(welcomeBack('2026-10-29', '2026-10-29')).toBe(false);
});
