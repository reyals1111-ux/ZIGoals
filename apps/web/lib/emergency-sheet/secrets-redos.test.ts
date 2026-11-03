import {expect, test} from 'vitest';
import {HEX_GROUPS, secretKinds} from './secrets';

/** Session AK security review Z1B-8: the grouped-hex key scan is linear, with exactly the matches it had. */
const BEFORE = /[0-9a-fA-F]+(?:[\s:-]+[0-9a-fA-F]+)+/g;
const timed = (run: () => unknown) => { const t0 = performance.now(); run(); return performance.now() - t0; };

test('long hostile runs take milliseconds, not seconds (80,000 characters took 5.2 s)', () => {
  const inputs = ['1'.repeat(80_000) + '0', 'a'.repeat(80_000) + ' !', 'ab '.repeat(30_000) + 'zz', `${'1'.repeat(40_000)} ${'-'.repeat(40_000)}!`, 'a:'.repeat(40_000)];
  for (const text of inputs) expect(timed(() => secretKinds(text)), text.slice(0, 12)).toBeLessThan(1000);
});

test('the same blocks as before on many shapes of text', () => {
  let seed = 3;
  const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const alphabet = '0123456789abcdefABCDEF  ::--\n\tgxyz!.,';
  for (let i = 0; i < 3000; i++) {
    const text = Array.from({length: 1 + rand(160)}, () => alphabet[rand(alphabet.length)]).join('');
    expect(text.match(HEX_GROUPS), JSON.stringify(text)).toEqual(text.match(BEFORE));
  }
});

test('a grouped key is still found; prose, dates and phone numbers are not', () => {
  const key = 'e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262';
  const grouped = key.match(/.{8}/g)!.join(' '), colons = key.match(/.{2}/g)!.join(':');
  expect(secretKinds(`my key: ${grouped}`)).not.toEqual([]);
  expect(secretKinds(`fingerprint ${colons}`)).not.toEqual([]);
  expect(secretKinds('Meet on 2026-11-01 at 10:30, call 555-0100 or 555-0199.')).toEqual([]);
});
