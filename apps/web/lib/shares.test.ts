import {describe, expect, it} from 'vitest';
import {shareBasisPoints} from './shares';
import {manualSourcePosition} from './manual-source';
import {emptyPlatform, privateGoalSchema} from './positions';
import {createAllocatedGoal, goalAssetMix, mixRemainingPercent} from './wealth';

// Session AO (L-075): one largest-remainder rounding for shares, so the shown shares add up to exactly 100.00 %.
describe('shareBasisPoints (largest remainder)', () => {
  it('rounds 125 of 300 to 41.67 % and the rest to 58.33 % (it was cut to 41.66 % and 58.34 %)', () => {
    expect(shareBasisPoints([125n, 175n], 300n)).toEqual([4167, 5833]);
    expect(shareBasisPoints([50n, 250n], 300n)).toEqual([1667, 8333]);
  });
  it('gives three thirds 33.34 %, 33.33 % and 33.33 %, the first part taking the last hundredth', () => {
    expect(shareBasisPoints([1n, 1n, 1n], 3n)).toEqual([3334, 3333, 3333]);
    expect(shareBasisPoints([100n, 100n, 100n], 300n).reduce((n, v) => n + v, 0)).toBe(10000);
  });
  it('exact shares stay exact, a zero total is no share, and parts past the total are rounded shares of it', () => {
    expect(shareBasisPoints([2500n, 7500n], 10000n)).toEqual([2500, 7500]);
    expect(shareBasisPoints([5n], 0n)).toEqual([0]);
    expect(shareBasisPoints([2n, 2n], 3n)).toEqual([6667, 6666]); // 133.33 % in all
  });
});

describe("a goal's asset mix (L-075)", () => {
  const goal = (target: string) => privateGoalSchema.parse({id: '75', name: 'Mix', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target, notes: '', createdAt: '2026-11-01T00:00:00Z', milestones: []});
  const mixOf = (target: string, parts: [string, Parameters<typeof manualSourcePosition>[0]['category']][]) => {
    const positions = parts.map(([value, category], i) => manualSourcePosition({category, name: `Fictional ${i}`, symbol: category === 'Cash' ? undefined : `F${i}`, quantity: category === 'Cash' ? value : '1', currency: 'USD', value}, `ao-${i}`));
    const g = goal(target);
    return goalAssetMix(createAllocatedGoal({...emptyPlatform(), positions}, g, positions.map(p => ({positionId: p.id, quantity: p.quantity}))), g);
  };
  it('Cash US$125.00 of US$300.00 reads 41.67 %, and the remaining 58.33 %', () => {
    const mix = mixOf('30000', [['125', 'Cash']]);
    expect(mix.map(m => [m.assetClass, m.value, m.percent])).toEqual([['Cash', '12500', 41.67]]);
    expect(mixRemainingPercent(mix)).toBe(58.33);
    const fifty = mixOf('30000', [['50', 'Cash']]);
    expect(fifty[0]!.percent).toBe(16.67); expect(mixRemainingPercent(fifty)).toBe(83.33);
  });
  it('three classes of a third each read 33.34 %, 33.33 % and 33.33 % with nothing remaining', () => {
    const mix = mixOf('30000', [['100', 'Cash'], ['100', 'Crypto'], ['100', 'Stablecoins']]);
    expect(mix.map(m => m.percent).sort((a, b) => b - a)).toEqual([33.34, 33.33, 33.33]);
    expect(mixRemainingPercent(mix)).toBe(0);
  });
});
