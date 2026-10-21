import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import type {Position} from '../positions';
import {nativeOwn, ownAsOf, valdoraOwn} from './your-position';

// Session AF (L1c, P1.23): the person's own position in an option is a sum of what the relay already read, never a new read.
const ADDRESS = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx', STZIG = 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig';
const row = (id: string, sourceType: Position['sourceType'], quantity: string, extra: Partial<Position> = {}) => ({id, providerId: 'native-zig', sourceType, network: 'zigchain-1', account: ADDRESS, asset: 'ZIG', denom: 'azig', decimals: 18, quantity, liquidity: 'BONDED', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-18T20:00:00.000Z', provenance: 'https://api.zigchain.com · block 13044950', ...extra}) as Position;
describe('your position, from the relay\'s own answer', () => {
  it('native staking: bonded ZIG and the rewards waiting, in azig; other rows and other assets do not count', () => {
    const positions = [row('s1', 'NATIVE_STAKING', '120000000000000000000'), row('s2', 'NATIVE_STAKING', '5000000000000000000'), row('r1', 'NATIVE_REWARDS', '1500000000000000000'),
      row('l1', 'WALLET_LIQUID', '9000000000000000000'), row('u1', 'NATIVE_UNBONDING', '3000000000000000000'), row('x1', 'NATIVE_STAKING', '7', {asset: 'OTHER'}), row('bad', 'NATIVE_STAKING', '1.5')];
    expect(nativeOwn(positions)).toEqual({staked: '125000000000000000000', rewards: '1500000000000000000'});
    expect(nativeOwn([])).toEqual({staked: '0', rewards: '0'});
  });
  it('Valdora: the stZIG held in its own units; rows that disagree on decimals are unreadable, not guessed', () => {
    const st = (q: string, decimals = 6) => row(`st${q}`, 'LIQUID_STAKING', q, {asset: 'stZIG', denom: STZIG, decimals, liquidity: 'LIQUID'});
    expect(valdoraOwn([st('100000000'), st('2500000'), row('s1', 'NATIVE_STAKING', '1')])).toEqual({units: '102500000', decimals: 6});
    expect(valdoraOwn([])).toEqual({units: '0', decimals: 6});
    expect(valdoraOwn([st('1', 6), st('1', 18)])).toBeNull();
  });
  it('"as of" is the newest block time the relay observed, else the time of the read', () => {
    expect(ownAsOf([row('a', 'NATIVE_STAKING', '1', {observedAt: '2026-10-18T20:00:00.000Z'}), row('b', 'NATIVE_STAKING', '1', {observedAt: '2026-10-18T21:00:00.000Z'})], '2026-10-19T00:00:00.000Z')).toBe('2026-10-18T21:00:00.000Z');
    expect(ownAsOf([], '2026-10-19T00:00:00.000Z')).toBe('2026-10-19T00:00:00.000Z');
  });
  it('the component reads nothing itself: no fetch, no position reader, only the page\'s reads', () => {
    const code = readFileSync(join(__dirname, '..', '..', 'components', 'earn', 'your-position.tsx'), 'utf8');
    expect(code).not.toMatch(/fetch\(|readPublicPositions|usePositionReads|useEarnWallets/);
    expect(readFileSync(join(__dirname, 'your-position.ts'), 'utf8')).not.toMatch(/fetch\(|import\(/);
  });
});
