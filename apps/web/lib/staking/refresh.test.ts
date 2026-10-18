import {toBech32} from '@cosmjs/encoding';
import {expect, test} from 'vitest';
import type {Position} from '../positions';
import {READ_MODE, observedHeight, readPositionsAfter} from './refresh';

// Session AF (ADR-028 H16, H63): the after-signing refresh asks the relay for the confirmed block.
const ME = toBech32('zig', new Uint8Array(20).fill(1));
const at = (height: number) => [{id: 'x', provenance: `https://testnet-api.zigchain.com · block ${height}`}] as unknown as Position[];
test('the read modes are the relay\'s two networks', () => {
  expect(READ_MODE).toEqual({practice: 'TESTNET_READ_ONLY', real: 'MAINNET_READ_ONLY'});
  expect(observedHeight(at(8290600))).toBe(8290600n);
  expect(observedHeight([])).toBeUndefined();
});
test('reads with minHeight until the relay reaches the confirmed block, at most three times', async () => {
  const asked: unknown[] = [], heights = [8290598, 8290600];
  const read = async (...args: unknown[]) => { asked.push(args); return at(heights.shift() ?? 0); };
  const result = await readPositionsAfter('practice', ME, 8290600, read as never, async () => undefined);
  expect(result.height).toBe('8290600');
  expect(asked).toEqual([['TESTNET_READ_ONLY', ME, {minHeight: '8290600'}], ['TESTNET_READ_ONLY', ME, {minHeight: '8290600'}]]);
  let count = 0;
  await expect(readPositionsAfter('real', ME, 9, (async () => { count++; return at(8); }) as never, async () => undefined)).rejects.toThrow('next refresh');
  expect(count).toBe(3);
  await expect(readPositionsAfter('real', ME, 0, read as never)).rejects.toThrow('block height');
});
