import {expect, test} from 'vitest';
import {activityTimeLabel} from './activity-time';

test('a date-only record (midnight to the millisecond in the shown time zone) shows no invented time', () => {
  expect(activityTimeLabel('2026-09-20T00:00:00.000Z', 'UTC')).toBeNull();
  expect(activityTimeLabel('2026-09-19T22:00:00.000Z', 'Europe/Brussels')).toBeNull();
});
test('a saved moment keeps its time, midnight included when it carries seconds', () => {
  expect(activityTimeLabel('2026-09-20T09:30:00.000Z', 'UTC')).toMatch(/09.30|9.30/);
  expect(activityTimeLabel('2026-09-20T00:00:07.120Z', 'UTC')).not.toBeNull();
  // Midnight elsewhere is a real time here.
  expect(activityTimeLabel('2026-09-20T00:00:00.000Z', 'Europe/Brussels')).not.toBeNull();
  expect(activityTimeLabel('not a date', 'UTC')).toBeNull();
});
