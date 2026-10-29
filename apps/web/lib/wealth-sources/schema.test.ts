import {expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {platformSchema} from '../positions';
import {wealthHistory, wealthHistoryBySource} from '../wealth';
import {classifyReading, emptyReadingSources, readingSource, readingSourcesSchema, recordReadingSources} from './schema';

// Session AJ (item 6, CO6; D7): readings keep their source from now on; earlier ones are "not recorded", never guessed.
test('each reading is classified from itself and its holding', () => {
  expect(classifyReading({sourceType: 'MANUAL', providerId: 'manual'}, {source: 'COINGECKO'})).toBe('market');
  expect(classifyReading({sourceType: 'MANUAL', providerId: 'manual'}, {source: 'MANUAL'})).toBe('own');
  expect(classifyReading({sourceType: 'NATIVE_STAKING', providerId: 'native-zig'}, {source: 'VERIFIED'})).toBe('staking');
  expect(classifyReading({sourceType: 'EXTERNAL_ACCOUNT', providerId: 'kraken-spot'}, {source: 'VERIFIED'})).toBe('exchange');
  expect(classifyReading({sourceType: 'WALLET_LIQUID', providerId: 'btc-wallet'}, {source: 'VERIFIED'})).toBe('wallet');
});
test('the first record sets "since"; readings before it stay unrecorded; each is written once', () => {
  const positions = [{id: 'p1', sourceType: 'MANUAL' as const, providerId: 'manual'}];
  const old = {id: 'r-old', positionId: 'p1', source: 'MANUAL' as const, capturedAt: '2026-10-01T00:00:00.000Z'};
  const first = recordReadingSources(emptyReadingSources(), positions, [old], '2026-10-29T10:00:00.000Z');
  expect(first).toEqual({version: 1, since: '2026-10-29T10:00:00.000Z', readings: {}});
  const fresh = {id: 'r-new', positionId: 'p1', source: 'MANUAL' as const, capturedAt: '2026-10-30T00:00:00.000Z'};
  const second = recordReadingSources(first, positions, [old, fresh], '2026-10-30T10:00:00.000Z');
  expect(second.readings).toEqual({'r-new': 'own'});
  expect(recordReadingSources(second, positions, [old, fresh], '2026-10-31T10:00:00.000Z')).toBe(second);
  expect(readingSource(second, 'r-old')).toBe('unrecorded');
  expect(readingSource(second, 'r-new')).toBe('own');
  // Loose and versioned: a newer build's field survives; an unknown source reads as a market price, never throws.
  expect(readingSourcesSchema.parse({...second, later: 1, readings: {x: 'robot'}})).toMatchObject({later: 1, readings: {x: 'market'}});
});
test('the by-source history keeps the same totals as the asset-class history, every point split in full', () => {
  const {records} = buildShowcase('2026-10-12', 'UTC'), platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!));
  const plain = wealthHistory(platform), bySource = wealthHistoryBySource(platform, () => 'unrecorded');
  expect(bySource.map(h => h.points.map(p => p.value))).toEqual(plain.map(h => h.points.map(p => p.value)));
  for (const h of bySource) for (const p of h.points) expect(Object.values(p.sources!).reduce((a, b) => a + BigInt(b), 0n)).toBe(BigInt(p.value));
});
