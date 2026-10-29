import {expect, test} from 'vitest';
import {base58check, ripemd160, segwitV0Address} from './encode';

// Session AJ (item 36): the encodings against their published test vectors.
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex'), utf8 = (s: string) => new TextEncoder().encode(s);
test('RIPEMD-160: the reference vectors', () => {
  expect(hex(ripemd160(utf8('')))).toBe('9c1185a5c5e9fc54612808977ee8f548b2258d31');
  expect(hex(ripemd160(utf8('abc')))).toBe('8eb208f7e05d987a9b044a8e98c6b087f15a0bfc');
  expect(hex(ripemd160(utf8('message digest')))).toBe('5d0689ef49d2fae572b881b123a85ffa21595f36');
  expect(hex(ripemd160(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe('12a053384a9c0c88e405a06c27dcf49ada62eb2b');
  expect(hex(ripemd160(utf8('a'.repeat(1_000_000))))).toBe('52783243c1697bdbe16d37f97f68f08325dc1528');
});
test('bech32 (BIP-173): the P2WPKH example', () => {
  expect(segwitV0Address('bc', Buffer.from('751e76e8199196d454941c45d1b3a323f1433bd6', 'hex'))).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
});
test('base58check: a legacy address from its hash160', async () => {
  expect(await base58check(0, Buffer.from('010966776006953d5567439e5e39f86a0d273bee', 'hex'))).toBe('16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM');
});
