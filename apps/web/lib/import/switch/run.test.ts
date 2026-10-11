import {expect, test} from 'vitest';
import {readExport, STOPPED} from './run';
import {STOPPED as COMMON_STOPPED} from './common';

// Session X Part 5: Settings loads the reader on use and tells a stop from a failure by the text run.ts hands it.
test('the reader hands the page the same stop text the reading code throws', async () => {
  expect(STOPPED).toBe(COMMON_STOPPED);
  const controller = new AbortController(); controller.abort();
  await expect(readExport([], {zone: 'UTC', now: 0}, {signal: controller.signal})).rejects.toThrow(STOPPED);
});
