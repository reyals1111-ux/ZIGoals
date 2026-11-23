import {afterEach, expect, test, vi} from 'vitest';
import {COMMON_ZONES, zoneChoices} from './second-zone';

/**
 * Session AV lane 2 (fixb5): Chrome's `Intl.supportedValuesOf('timeZone')` lists region zones only, without "UTC", so the
 * Agenda's "Second time zone" could not offer UTC (tests/av2-planned-day.spec.ts). It is added when the browser's list lacks it.
 */
afterEach(() => { vi.restoreAllMocks(); });
const withList = (list: string[]) => vi.spyOn(Intl as unknown as {supportedValuesOf: (k: string) => string[]}, 'supportedValuesOf').mockImplementation(() => list);

test('UTC is offered when the browser lists its zones without it, at the end', () => {
  withList(['Africa/Abidjan', 'Europe/Amsterdam']);
  expect(zoneChoices()).toEqual(['Africa/Abidjan', 'Europe/Amsterdam', 'UTC']);
});
test('a list that has UTC is kept as it is', () => {
  withList(['Europe/Amsterdam', 'UTC']);
  expect(zoneChoices()).toEqual(['Europe/Amsterdam', 'UTC']);
});
test('without a list, the short list (with UTC)', () => {
  withList([]);
  expect(zoneChoices()).toEqual([...COMMON_ZONES]);
});
