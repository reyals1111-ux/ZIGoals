import {expect, test} from 'vitest';
import {readZoneInput} from './time-zone-input';

// Session AH Part 5 (VA10, C8): typed zones are matched, explained or refused.
test('case is corrected; an offset is explained with places; a made-up name is refused', () => {
  expect(readZoneInput('europe/brussels')).toEqual({zone: 'Europe/Brussels'});
  expect(readZoneInput(' UTC ')).toEqual({zone: 'UTC'});
  const offset = readZoneInput('UTC+13', new Date('2026-07-01T12:00:00Z'));
  expect('error' in offset && offset.error).toMatch(/^UTC\+13 is a fixed offset, with no daylight-saving rules\. Choose the place instead, such as [A-Z]\w+\/\w+/);
  expect(readZoneInput('Foo/Bar')).toEqual({error: '“Foo/Bar” is not a time zone name. Pick one from the list, for example Europe/Brussels.'});
  expect('error' in readZoneInput('')).toBe(true);
});
