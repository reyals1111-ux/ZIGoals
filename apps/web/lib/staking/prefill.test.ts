import {toBech32} from '@cosmjs/encoding';
import {expect, test} from 'vitest';
import {PREFILL_MAX_AGE_MS, takeStakingPrefill} from './prefill';

// Session AF (ADR-028 H47): ZIGi's pre-fill is read once, plain fields only, at most 10 minutes old.
class Memory { map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null; } setItem(k: string, v: string) { this.map.set(k, v); } removeItem(k: string) { this.map.delete(k); } }
const KEY = 'zigoals:ai:staking-prefill:v1', V = toBech32('zigvaloper', new Uint8Array(20).fill(2)), now = Date.parse('2026-10-18T21:00:00Z');
const put = (value: unknown) => { const s = new Memory(); s.setItem(KEY, typeof value === 'string' ? value : JSON.stringify(value)); return s; };
test('a fresh pre-fill fills the form once and is deleted', () => {
  const storage = put({version: 1, at: new Date(now - 60_000).toISOString(), network: 'practice', action: 'delegate', validator: V, amount: '10'});
  expect(takeStakingPrefill(storage, now)).toEqual({network: 'practice', action: 'delegate', validator: V, amount: '10'});
  expect(storage.map.size).toBe(0);
  expect(takeStakingPrefill(storage, now)).toBeNull();
});
test('old, future, malformed or foreign values are deleted and ignored; bad fields are dropped, never guessed', () => {
  for (const value of [
    {version: 1, at: new Date(now - PREFILL_MAX_AGE_MS - 1).toISOString(), network: 'practice', action: 'delegate'},
    {version: 1, at: new Date(now + 5 * 60_000).toISOString(), network: 'practice', action: 'delegate'},
    {version: 2, at: new Date(now).toISOString(), network: 'practice', action: 'delegate'},
    {version: 1, at: new Date(now).toISOString(), network: 'mainnet', action: 'delegate'},
    {version: 1, at: new Date(now).toISOString(), network: 'real', action: 'send'},
    '{not json', 'x'.repeat(3000),
  ]) { const storage = put(value); expect(takeStakingPrefill(storage, now), JSON.stringify(value).slice(0, 60)).toBeNull(); expect(storage.map.size).toBe(0); }
  expect(takeStakingPrefill(put({version: 1, at: new Date(now).toISOString(), network: 'real', action: 'claim', validator: toBech32('zig', new Uint8Array(20)), amount: '-1'}), now)).toEqual({network: 'real', action: 'claim'});
  expect(takeStakingPrefill(put({version: 1, at: new Date(now).toISOString(), network: 'real', action: 'undelegate', amount: '0.0'}), now)).toEqual({network: 'real', action: 'undelegate'});
  expect(takeStakingPrefill(null, now)).toBeNull();
});
