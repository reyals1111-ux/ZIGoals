import 'fake-indexeddb/auto';
import {expect, test} from 'vitest';
import {enqueue, forgetOfflineQueue, readJobs, removeJob, validJob} from './queue';

// Session AK Part 3: what the person asked for offline is kept once, a week at most, and only in the shape it needs.
test('jobs are checked, kept once, read oldest first, dropped after a week, removed and forgotten', async () => {
  await forgetOfflineQueue();
  expect(validJob({kind: 'food-lookup', value: '5449000000996'})).toBe(true);
  expect(validJob({kind: 'food-lookup', value: 'apple'})).toBe(false);
  expect(await enqueue('food-lookup', 'not-a-barcode')).toBe(false);
  expect(await enqueue('food-lookup', '5449000000996', 1000)).toBe(true);
  expect(await enqueue('food-lookup', '5449000000996', 2000)).toBe(true);
  expect(await enqueue('exchange-refresh', 'kraken', 1500)).toBe(true);
  expect((await readJobs(3000)).map(j => j.value)).toEqual(['5449000000996', 'kraken']);
  expect(await readJobs(1000 + 8 * 86_400_000)).toEqual([]);
  expect(await enqueue('exchange-refresh', 'kraken', 10_000)).toBe(true);
  await removeJob('exchange-refresh:kraken');
  expect(await readJobs(10_001)).toEqual([]);
  await forgetOfflineQueue();
});
