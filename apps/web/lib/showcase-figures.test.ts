import {expect, test} from 'vitest';
import {buildShowcase} from './showcase-data';
import {SHOWCASE_PRICES} from './portfolio/showcase';

// Session AC (persona #12): the Showcase states one price per coin. Wealth's recorded history for Bitcoin and Ether is
// built from the Showcase Portfolio's fixture prices (their current value is the live market's, on every page).
test('Wealth\'s Showcase history values Bitcoin and Ether at the Portfolio fixture prices', () => {
  const platform = JSON.parse(buildShowcase('2026-09-20', 'UTC').records['zigoals:platform:v1']!) as {positions: {id: string; quantity: string; quantityDecimals?: number}[]; valuationSnapshots: {positionId: string; value: string; capturedAt?: string}[]};
  const fixture = (id: string) => Number(Object.entries(SHOWCASE_PRICES).find(([k]) => k.includes(id))![1]);
  for (const [position, coin, quantity] of [['showcase-btc', 'bitcoin', 0.45], ['showcase-eth', 'ethereum', 4]] as const) {
    const last = platform.valuationSnapshots.filter(s => s.positionId === position).at(-1)!;
    // The history's last step is 99.4 % of the spec value (the history rises to it); in cents.
    const perCoin = Number(last.value) / 100 / quantity / 0.994;
    expect(Math.abs(perCoin - fixture(coin)) / fixture(coin)).toBeLessThan(0.005);
  }
});
