import {describe, expect, test} from 'vitest';
import {blockLayout, buildQr, byteCapacity, dataCodewords, encodeQr, formatBits, penalty, reedSolomon, totalCodewords, versionBits, type QrEcc} from './encode';

// ---- An independent decoder: its own tables (from the spec), its own GF(256) and its own function-pattern map. ----
const LEVELS: QrEcc[] = ['L', 'M', 'Q', 'H'];
// Spec table 1: total codewords; table 7: data codewords (L, M, Q, H); annex E: alignment centres; remainder bits.
const TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085];
const DATA: Record<QrEcc, number[]> = {
  L: [0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274, 324, 370, 428, 461, 523, 589, 647, 721, 795, 861],
  M: [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216, 254, 290, 334, 365, 415, 453, 507, 563, 627, 669],
  Q: [0, 13, 22, 34, 48, 62, 76, 88, 110, 132, 154, 180, 206, 244, 261, 295, 325, 367, 397, 445, 485],
  H: [0, 9, 16, 26, 36, 46, 60, 66, 86, 100, 122, 140, 158, 180, 197, 223, 253, 283, 313, 341, 385],
};
const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]];
const REMAINDER = (v: number) => (v === 1 ? 0 : v <= 6 ? 7 : v <= 13 ? 0 : 3);
// Spec table D.1: version information bit streams, versions 7–20.
const VERSION_INFO: Record<number, number> = {7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3, 11: 0x0bbf6, 12: 0x0c762, 13: 0x0d847,
  14: 0x0e60d, 15: 0x0f928, 16: 0x10b78, 17: 0x1145d, 18: 0x12a17, 19: 0x13532, 20: 0x149a6};

function mul(a: number, b: number): number { // shift-and-add GF(256) multiply, no tables
  let r = 0;
  for (; b; b >>= 1) { if (b & 1) r ^= a; a = (a << 1) ^ (a & 0x80 ? 0x11d : 0); }
  return r;
}
function syndromesZero(block: number[], ec: number): boolean {
  for (let i = 0, alpha = 1; i < ec; i++, alpha = mul(alpha, 2)) {
    let s = 0;
    for (const c of block) s = mul(s, alpha) ^ c; // Horner: block(α^i)
    if (s !== 0) return false;
  }
  return true;
}
function formatCode(ecBits: number, mask: number): number { // BCH(15,5) by polynomial long division
  const data = (ecBits << 3) | mask;
  let r = data << 10;
  for (let bit = 14; bit >= 10; bit--) if (r & (1 << bit)) r ^= 0b10100110111 << (bit - 10);
  return ((data << 10) | r) ^ 0b101010000010010;
}
const popcount = (n: number) => n.toString(2).replaceAll('0', '').length;

type Decoded = {text: string; version: number; ecc: QrEcc; mask: number; syndromesOk: boolean; bytes: number[]};
function decode(m: boolean[][]): Decoded {
  const size = m.length, version = (size - 17) / 4;
  if (!Number.isInteger(version) || version < 1 || version > 20) throw new Error(`bad size ${size}`);
  const at = (r: number, c: number) => m[r]![c]!;
  // Fixed patterns are where they should be.
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
    if (at(r0! + r, c0! + c) !== (ring !== 2)) throw new Error('finder');
  }
  for (let i = 8; i < size - 8; i++) if (at(6, i) !== (i % 2 === 0) || at(i, 6) !== (i % 2 === 0)) throw new Error('timing');
  if (!at(size - 8, 8)) throw new Error('dark module');
  // Format information: both copies, bit 14 first.
  const copy1: [number, number][] = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  const copy2: [number, number][] = [...Array.from({length: 7}, (_, i) => [size - 1 - i, 8] as [number, number]), ...Array.from({length: 8}, (_, i) => [8, size - 8 + i] as [number, number])];
  const read = (cells: [number, number][]) => cells.reduce((acc, [r, c]) => (acc << 1) | (at(r, c) ? 1 : 0), 0);
  const f1 = read(copy1), f2 = read(copy2);
  if (f1 !== f2) throw new Error('format copies differ');
  const ecBits: Record<QrEcc, number> = {L: 1, M: 0, Q: 3, H: 2};
  let found: {ecc: QrEcc; mask: number} | undefined;
  for (const ecc of LEVELS) for (let mask = 0; mask < 8; mask++) if (formatCode(ecBits[ecc], mask) === f1) found = {ecc, mask};
  if (!found) throw new Error(`format ${f1.toString(2)}`);
  const {ecc, mask} = found;
  // Version information (bit 0 at the corner nearest the finder's top-left), checked against the spec table.
  if (version >= 7) {
    let tr = 0, bl = 0;
    for (let i = 17; i >= 0; i--) { tr = (tr << 1) | (at(Math.floor(i / 3), size - 11 + (i % 3)) ? 1 : 0); bl = (bl << 1) | (at(size - 11 + (i % 3), Math.floor(i / 3)) ? 1 : 0); }
    if (tr !== VERSION_INFO[version] || bl !== VERSION_INFO[version]) throw new Error('version info');
  }
  // Function-module map.
  const fn = Array.from({length: size}, () => new Array<boolean>(size).fill(false));
  const fill = (r0: number, c0: number, h: number, w: number) => { for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) fn[r]![c] = true; };
  fill(0, 0, 9, 9); fill(0, size - 8, 9, 8); fill(size - 8, 0, 8, 9); fill(6, 0, 1, size); fill(0, 6, size, 1);
  if (version >= 7) { fill(0, size - 11, 6, 3); fill(size - 11, 0, 3, 6); }
  const centres = ALIGN[version]!, far = centres[centres.length - 1];
  for (const r of centres) for (const c of centres) if (!((r === 6 && c === 6) || (r === 6 && c === far) || (r === far && c === 6))) fill(r - 2, c - 2, 5, 5);
  const masked = (r: number, c: number): boolean => [
    (r + c) % 2 === 0, r % 2 === 0, c % 3 === 0, (r + c) % 3 === 0, (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    ((r * c) % 2) + ((r * c) % 3) === 0, (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (((r + c) % 2) + ((r * c) % 3)) % 2 === 0][mask]!;
  // Read the zigzag.
  const bits: number[] = [];
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let k = 0; k < size; k++) {
      const r = upward ? size - 1 - k : k;
      for (const c of [col, col - 1]) if (!fn[r]![c]) bits.push(at(r, c) !== masked(r, c) ? 1 : 0);
    }
    upward = !upward;
  }
  const total = TOTAL[version]!;
  if (bits.length !== total * 8 + REMAINDER(version)) throw new Error(`module count ${bits.length}`);
  if (bits.slice(total * 8).some(b => b)) throw new Error('remainder bits');
  const codewords = Array.from({length: total}, (_, i) => bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  // De-interleave.
  const {dataPerBlock, ecPerBlock} = blockLayout(version, ecc);
  const blocks = dataPerBlock.map(() => [] as number[]);
  let k = 0;
  for (let i = 0; i < Math.max(...dataPerBlock); i++) dataPerBlock.forEach((len, b) => { if (i < len) blocks[b]!.push(codewords[k++]!); });
  for (let i = 0; i < ecPerBlock; i++) blocks.forEach(b => b.push(codewords[k++]!));
  const syndromesOk = blocks.every(b => syndromesZero(b, ecPerBlock));
  const data = blocks.flatMap((b, i) => b.slice(0, dataPerBlock[i]));
  // Byte-mode segment, terminator and pad codewords.
  let p = 0;
  const take = (n: number) => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | ((data[(p + i) >>> 3]! >>> (7 - ((p + i) & 7))) & 1); p += n; return v; };
  if (take(4) !== 0b0100) throw new Error('mode');
  const count = take(version <= 9 ? 8 : 16), bytes = Array.from({length: count}, () => take(8));
  const left = data.length * 8 - p;
  if (left > 0 && take(Math.min(4, left)) !== 0) throw new Error('terminator');
  p = Math.ceil(p / 8) * 8;
  for (let i = 0; p < data.length * 8; i++) if (take(8) !== (i % 2 ? 0x11 : 0xec)) throw new Error('padding');
  return {text: new TextDecoder('utf-8', {fatal: true}).decode(new Uint8Array(bytes)), version, ecc, mask, syndromesOk, bytes};
}

// Deterministic PRNG so failures reproduce.
function rng(seed: number) { return () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; }; }
const randomAscii = (rand: () => number, n: number) => Array.from({length: n}, () => String.fromCharCode(32 + Math.floor(rand() * 95))).join('');
const hex = (rand: () => number, n: number) => Array.from({length: n}, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('');

describe('tables', () => {
  test('codeword counts match spec tables 1 and 7 for versions 1–20', () => {
    for (let v = 1; v <= 20; v++) {
      expect(totalCodewords(v)).toBe(TOTAL[v]);
      for (const e of LEVELS) {
        expect(dataCodewords(v, e)).toBe(DATA[e][v]);
        const {dataPerBlock, ecPerBlock} = blockLayout(v, e);
        expect(dataPerBlock.reduce((a, b) => a + b, 0) + dataPerBlock.length * ecPerBlock).toBe(TOTAL[v]);
        expect(Math.max(...dataPerBlock) - Math.min(...dataPerBlock)).toBeLessThanOrEqual(1);
      }
    }
    // A few rows of spec table 9 spelled out: 5-Q is 2×(33,15) + 2×(34,16); 20-M is 3×(67,41) + 13×(68,42).
    expect(blockLayout(5, 'Q')).toEqual({dataPerBlock: [15, 15, 16, 16], ecPerBlock: 18});
    expect(blockLayout(20, 'M')).toEqual({dataPerBlock: [41, 41, 41, ...new Array(13).fill(42)], ecPerBlock: 26});
    // Byte-mode capacities from spec table 7.
    expect([byteCapacity(1, 'M'), byteCapacity(1, 'H'), byteCapacity(10, 'M'), byteCapacity(20, 'M'), byteCapacity(20, 'L')]).toEqual([14, 7, 213, 666, 858]);
  });

  test('format information BCH values match the spec (annex C)', () => {
    expect(formatBits('M', 0)).toBe(0b101010000010010);
    expect(formatBits('L', 0)).toBe(0b111011111000100);
    expect(formatBits('L', 4)).toBe(0b110011000101111);
    expect(formatBits('L', 7)).toBe(0b110100101110110);
    expect(formatBits('Q', 0)).toBe(0b011010101011111);
    expect(formatBits('H', 0)).toBe(0b001011010001001);
    for (const e of LEVELS) for (let m = 0; m < 8; m++) expect(formatBits(e, m)).toBe(formatCode({L: 1, M: 0, Q: 3, H: 2}[e], m));
    // Any two format codes differ in at least 7 bits (the BCH(15,5) minimum distance).
    const all = LEVELS.flatMap(e => [0, 1, 2, 3, 4, 5, 6, 7].map(m => formatBits(e, m)));
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(popcount(all[i]! ^ all[j]!)).toBeGreaterThanOrEqual(7);
  });

  test('version information BCH values match spec table D.1', () => {
    for (let v = 7; v <= 20; v++) expect(versionBits(v)).toBe(VERSION_INFO[v]);
    expect(versionBits(7)).toBe(0x07c94);
  });
});

describe('Reed–Solomon', () => {
  test('known vector: 1-M "HELLO WORLD" data codewords give the published EC codewords', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomon(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  test('every block of every version/level has zero syndromes', () => {
    const rand = rng(7);
    for (let v = 1; v <= 20; v++) for (const e of LEVELS) {
      const decoded = decode(buildQr(new TextEncoder().encode(randomAscii(rand, byteCapacity(v, e))), v, e).modules);
      expect(decoded.syndromesOk, `${v}-${e}`).toBe(true);
    }
  });

  test('the decoder notices a corrupted codeword', () => {
    const qr = buildQr(new TextEncoder().encode('corrupt me'), 1, 'M', 0);
    const flipped = qr.modules.map(r => r.slice());
    flipped[10]![0] = !flipped[10]![0]; // left edge: the last column pair holds EC codewords
    expect(decode(flipped).syndromesOk).toBe(false);
  });
});

describe('round trip through the independent decoder', () => {
  test('random strings at every version 1–20 and every level pick the smallest version and decode', () => {
    const rand = rng(2026);
    for (const e of LEVELS) for (let v = 1; v <= 20; v++) {
      const lo = v === 1 ? 0 : byteCapacity(v - 1, e) + 1, hi = byteCapacity(v, e);
      for (const n of [lo, hi, lo + Math.floor(rand() * (hi - lo + 1))]) {
        const text = randomAscii(rand, n), qr = encodeQr(text, {minEcc: e});
        expect([qr.version, qr.ecc, qr.size, qr.modules.length], `${v}-${e} n=${n}`).toEqual([v, e, v * 4 + 17, v * 4 + 17]);
        const d = decode(qr.modules);
        expect([d.text, d.version, d.ecc, d.syndromesOk]).toEqual([text, v, e, true]);
      }
    }
  });

  test('all eight masks decode, and the automatic choice has the lowest penalty', () => {
    const bytes = new TextEncoder().encode('wc:abc@2?relay-protocol=irn&symKey=0123456789abcdef');
    const scores = [0, 1, 2, 3, 4, 5, 6, 7].map(mask => {
      const qr = buildQr(bytes, 7, 'Q', mask), d = decode(qr.modules);
      expect([d.mask, d.version, d.ecc, d.syndromesOk]).toEqual([mask, 7, 'Q', true]);
      return penalty(qr.modules);
    });
    const auto = buildQr(bytes, 7, 'Q');
    expect(penalty(auto.modules)).toBe(Math.min(...scores));
    const chosen = encodeQr('wc:abc@2?relay-protocol=irn&symKey=0123456789abcdef', {minEcc: 'Q'}); // 5-Q
    expect(decode(chosen.modules).mask).toBe(buildQr(bytes, chosen.version, 'Q').mask);
  });

  test('UTF-8 text survives', () => {
    const text = 'Zielsparen 🎯 — ZIGoals ✓ ünïcödé';
    const d = decode(encodeQr(text).modules);
    expect(d.text).toBe(text);
  });
});

describe('WalletConnect v2 pairing URI', () => {
  const rand = rng(42);
  const uri = `wc:${hex(rand, 64)}@2?relay-protocol=irn&symKey=${hex(rand, 64)}&expiryTimestamp=1793462400`
    + '&methods=[wc_sessionPropose],[wc_authRequest,wc_authBatchRequest]';

  test('the longest realistic URI encodes at M within version 20 and round-trips', () => {
    expect(uri.length).toBeGreaterThanOrEqual(230);
    expect(uri.length).toBeLessThanOrEqual(300);
    const qr = encodeQr(uri);
    expect(qr.ecc).toBe('M');
    expect(qr.version).toBeLessThanOrEqual(20);
    expect(uri.length).toBe(252);
    expect(qr.version).toBe(12); // 11-M holds 251 bytes, 12-M holds 287
    expect(decode(qr.modules).text).toBe(uri);
  });

  test('encoding a version 20 symbol takes under 50 ms', () => {
    const text = randomAscii(rand, 666);
    encodeQr(text); // warm up
    const start = performance.now(), qr = encodeQr(text), ms = performance.now() - start;
    expect(qr.version).toBe(20);
    expect(ms).toBeLessThan(50);
  });
});

describe('limits', () => {
  test('falls back to L past 20-M and throws past 20-L', () => {
    const rand = rng(9);
    const qr = encodeQr(randomAscii(rand, 700)); // 20-M holds 666 bytes; 18-L holds 718
    expect([qr.version, qr.ecc]).toEqual([18, 'L']);
    expect(() => encodeQr('x'.repeat(859))).toThrow(/859 bytes do not fit a version 20 symbol/);
    expect(() => encodeQr('x'.repeat(859), {minEcc: 'H'})).toThrow(Error);
    expect(encodeQr('x'.repeat(300), {minEcc: 'H'}).ecc).toBe('H'); // 20-H holds 382 bytes
    expect(encodeQr('x'.repeat(400), {minEcc: 'H'})).toMatchObject({version: 19, ecc: 'Q'}); // steps down only when needed; 19-Q holds 442
  });
});
