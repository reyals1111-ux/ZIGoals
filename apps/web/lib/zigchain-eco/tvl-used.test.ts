import {describe, expect, it} from 'vitest';
import {TVL_HISTORY_KEY, emptyTvlHistory, readTvlHistory, saveTvlHistory, trendWords, tvlTrend, withTvlRead} from './tvl-history';
import {usedByMe} from './used-by-me';
import type {Position} from '../positions';

// Session AL (Part 15): C-BN-14 / GAP-144 (a value-locked trend from this device's own reads) and C-BN-16 / GAP-146
// ("Used by you" only where a holding proves it).
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
describe('the value-locked trend', () => {
  it('keeps one figure a day (the last read), reads back, and needs two days for a trend', () => {
    let h = withTvlRead(emptyTvlHistory(), 'oroswap', '2026-11-01', 1_000_000);
    expect(tvlTrend(h, 'oroswap')).toBeNull();
    h = withTvlRead(h, 'oroswap', '2026-11-01', 1_100_000);
    expect(h.projects.oroswap).toEqual([{day: '2026-11-01', usd: 1_100_000}]);
    expect(withTvlRead(h, 'oroswap', '2026-11-01', 1_100_000)).toBe(h);
    h = withTvlRead(h, 'oroswap', '2026-11-05', 1_144_000);
    expect(tvlTrend(h, 'oroswap')).toEqual({from: '2026-11-01', days: 2, change: expect.closeTo(0.04, 5)});
    expect(trendWords(tvlTrend(h, 'oroswap'))).toBe('up 4 %');
    const s = memory(); expect(saveTvlHistory(s, h)).toBe(true); expect(readTvlHistory(s)).toEqual(h);
  });
  it('words a fall, no change and an unknown start; refuses odd input; keeps 90 days', () => {
    const fall = withTvlRead(withTvlRead(emptyTvlHistory(), 'nawa-protocol', '2026-11-01', 200), 'nawa-protocol', '2026-11-02', 150);
    expect(trendWords(tvlTrend(fall, 'nawa-protocol'))).toBe('down 25 %');
    const same = withTvlRead(withTvlRead(emptyTvlHistory(), 'x', '2026-11-01', 1000), 'x', '2026-11-02', 1001);
    expect(trendWords(tvlTrend(same, 'x'))).toBe('about the same');
    const zero = withTvlRead(withTvlRead(emptyTvlHistory(), 'x', '2026-11-01', 0), 'x', '2026-11-02', 5);
    expect(trendWords(tvlTrend(zero, 'x'))).toBeNull();
    const h = emptyTvlHistory();
    expect(withTvlRead(h, 'Bad Slug', '2026-11-01', 1)).toBe(h);
    expect(withTvlRead(h, 'x', '2026-11-01', Number.NaN)).toBe(h);
    let long = emptyTvlHistory();
    for (let i = 0; i < 100; i++) long = withTvlRead(long, 'x', new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), i);
    expect(long.projects.x).toHaveLength(90);
  });
  it('reads a damaged record as empty and keeps unknown fields', () => {
    const s = memory();
    s.setItem(TVL_HISTORY_KEY, 'nope'); expect(readTvlHistory(s)).toEqual(emptyTvlHistory());
    s.setItem(TVL_HISTORY_KEY, JSON.stringify({version: 1, later: 1, projects: {oroswap: [{day: '2026-11-01', usd: 5}, {day: 'bad', usd: 1}], 'BAD KEY': []}}));
    expect(readTvlHistory(s)).toEqual({version: 1, later: 1, projects: {oroswap: [{day: '2026-11-01', usd: 5}]}});
  });
});
describe('used by me', () => {
  const pos = (over: Partial<Position>) => ({id: 'p', asset: 'stZIG', quantity: '5000000', ...over}) as Position;
  it('shows Valdora from an stZIG holding with a quantity, and nothing for other projects', () => {
    expect(usedByMe('valdora', [pos({})])).toEqual({count: 1, what: 'stZIG, Valdora’s liquid-staking token'});
    expect(usedByMe('valdora', [pos({}), pos({id: 'q'})])?.count).toBe(2);
    expect(usedByMe('valdora', [pos({quantity: '0'})])).toBeNull();
    expect(usedByMe('valdora', [pos({archivedAt: '2026-11-01T00:00:00.000Z'})])).toBeNull();
    expect(usedByMe('valdora', [pos({asset: 'ZIG'})])).toBeNull();
    expect(usedByMe('oroswap', [pos({})])).toBeNull();
  });
});
