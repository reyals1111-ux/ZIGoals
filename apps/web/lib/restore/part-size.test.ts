import {expect, test} from 'vitest';
import {BILLS} from '../bills/schema';
import {MAX_DEVICE_PART_CHARS, TOO_LARGE_PART_MESSAGE, nextValue, planParts} from './plan';

// Session AK Part 15 (F8): a loose device record keeps unknown fields, so a backup could carry a part far larger than any
// browser can store. Such a part is left out, in plain words, before it is parsed.
test('a device part larger than this device can keep is left out with a plain reason', () => {
  const parts = planParts({device: {bills: {...BILLS.empty(), junk: 'x'.repeat(MAX_DEVICE_PART_CHARS)}}});
  expect(parts).toHaveLength(1);
  expect(parts[0]!.problem).toBe(TOO_LARGE_PART_MESSAGE);
  expect(TOO_LARGE_PART_MESSAGE).toBe('This part is larger than this device can keep for it (about 5 MB), so it is left out.');
  expect(nextValue(parts[0]!, 'replace', undefined)).toEqual({error: TOO_LARGE_PART_MESSAGE});
});

test('a part with a small unknown field still restores as before', () => {
  const [part] = planParts({device: {bills: {...BILLS.empty(), junk: 'x'.repeat(1000)}}});
  expect(part!.problem).toBeUndefined();
  expect(part!.value).toMatchObject({version: 1, bills: []});
});
