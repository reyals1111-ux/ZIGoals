/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c), H64): the only contract call ZIGoals encodes, written out by hand (no ABI
 * library): Multicall3's `aggregate3((address target, bool allowFailure, bytes callData)[])` (selector 0x82ad56cb, the
 * contract at the same address on all six chains, mds1/multicall3 deployments) carrying ERC-20 `balanceOf(address)`
 * (0x70a08231) calls, and the decoding of its `(bool success, bytes returnData)[]` answer. A read-only `eth_call`: nothing
 * is signed or sent. Byte layout tested in lib/wallets/balances/abi.test.ts against a word-by-word expectation.
 */
export const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
export const AGGREGATE3 = '82ad56cb';
export const BALANCE_OF = '70a08231';
const word = (hex: string) => hex.padStart(64, '0');
const num = (n: number) => word(n.toString(16));
const address = (a: string) => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw Error('Not an EVM address.');
  return word(a.slice(2).toLowerCase());
};
/** `balanceOf(owner)` call data, without 0x. */
export const balanceOfData = (owner: string) => BALANCE_OF + address(owner);
/** The `aggregate3` call data (0x…) for `balanceOf(owner)` on each token, every call allowed to fail on its own. */
export function aggregate3BalanceOf(tokens: readonly string[], owner: string): string {
  if (!tokens.length || tokens.length > 8) throw Error('One to eight tokens per call.');
  const data = balanceOfData(owner); // 36 bytes
  const padded = data.padEnd(Math.ceil(data.length / 64) * 64, '0');
  // Each tuple: target, allowFailure, offset of the bytes (3 words) → length word → the padded bytes.
  const tuples = tokens.map(t => address(t) + num(1) + num(0x60) + num(data.length / 2) + padded);
  const offsets: string[] = [];
  let at = tokens.length * 32;
  for (const t of tuples) { offsets.push(num(at)); at += t.length / 2; }
  return `0x${AGGREGATE3}${num(0x20)}${num(tokens.length)}${offsets.join('')}${tuples.join('')}`;
}
const readWord = (hex: string, byte: number): bigint => {
  const slice = hex.slice(byte * 2, byte * 2 + 64);
  if (slice.length !== 64 || !/^[0-9a-f]+$/i.test(slice)) throw Error('The answer is shorter than its own layout.');
  return BigInt(`0x${slice}`);
};
const small = (n: bigint, limit: number) => { if (n > BigInt(limit)) throw Error('The answer is larger than expected.'); return Number(n); };
/**
 * The `(bool success, bytes returnData)[]` answer to `aggregate3`, each `balanceOf` result as a base-unit integer string,
 * or null where that call failed (or answered something other than one 32-byte number). Throws when the layout is broken.
 */
export function decodeAggregate3Balances(result: string, expected: number): (string | null)[] {
  if (typeof result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(result) || result.length > 2 + 64 * 64) throw Error('Not an ABI answer.');
  const hex = result.slice(2);
  const base = small(readWord(hex, 0), 32);
  const count = small(readWord(hex, base), 8);
  if (count !== expected) throw Error('The answer has a different number of results.');
  const items = base + 32;
  return Array.from({length: count}, (_, i) => {
    const tuple = items + small(readWord(hex, items + i * 32), hex.length / 2);
    const success = readWord(hex, tuple), bytesAt = tuple + small(readWord(hex, tuple + 32), 96), length = small(readWord(hex, bytesAt), 64);
    if (success !== 1n || length !== 32) return null;
    return readWord(hex, bytesAt + 32).toString();
  });
}
/** A JSON-RPC quantity ("0x1bc16d674ec80000") as a base-unit integer string. */
export function quantity(value: unknown): string {
  if (typeof value !== 'string' || !/^0x(0|[1-9a-f][0-9a-f]{0,63})$/i.test(value)) throw Error('Not a quantity.');
  return BigInt(value).toString();
}
