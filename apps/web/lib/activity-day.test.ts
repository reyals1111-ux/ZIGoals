import {expect, test} from 'vitest';
import {activityDay} from './life-intelligence';

// Session AH (TR12, D-227): an Activity row sits under its record's own day (a meal logged today for yesterday is
// yesterday's), else under the day of its time.
test('the record\'s own day wins over the time it was saved', () => {
  expect(activityDay({at: '2026-10-25T09:00:00.000Z', day: '2026-10-24'})).toBe('2026-10-24');
  expect(activityDay({at: '2026-10-25T12:00:00.000Z'})).toMatch(/^2026-10-2[45]$/);
});
