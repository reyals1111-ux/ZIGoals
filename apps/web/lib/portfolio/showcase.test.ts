import {expect, test} from 'vitest';
import {coinKey} from './schema';
import {SHOWCASE_PRICES, showcaseMarket, showcasePriceAt, showcasePrices} from './showcase';

// Session X Part 14 (J154): the Showcase holds three coins; any other coin has no fixture price, line or market, so its
// coin page shows the honest empty states instead of throwing on a missing price.
const now = Date.parse('2026-10-08T12:00:00.000Z'), HOUR = 3_600_000;

test('a coin the Showcase holds has its fixture line, ending at the fixture price', () => {
  const held = Object.keys(SHOWCASE_PRICES)[0]!, line = showcasePrices(held, now - 24 * HOUR, now, HOUR);
  expect(line).toHaveLength(25);
  expect(line.at(-1)).toEqual({at: now, price: showcasePriceAt(held, now, now)});
});

test('a coin the Showcase does not hold has no fixture price, line or market', () => {
  const other = coinKey({provider: 'coingecko', kind: 'coin', id: 'usd-coin'});
  expect(Object.keys(SHOWCASE_PRICES)).not.toContain(other);
  expect(showcasePriceAt(other, now, now)).toBeUndefined();
  expect(showcasePrices(other, now - 24 * HOUR, now, HOUR)).toEqual([]);
  expect(showcaseMarket(other, now)).toBeUndefined();
});
