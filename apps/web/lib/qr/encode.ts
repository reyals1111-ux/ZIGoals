/**
 * QR Code encoder (ISO/IEC 18004), byte mode only, versions 1–20. Written for WalletConnect v2 pairing URIs (ASCII),
 * no dependency. Picks the smallest version that fits at error correction M (or the caller's `minEcc`), falls back to L
 * when even version 20 is too small, and picks the mask with the lowest penalty score.
 */
export type QrEcc = 'L' | 'M' | 'Q' | 'H';
export type QrMatrix = {size: number; modules: boolean[][]; version: number; ecc: QrEcc};
export const QR_MAX_VERSION = 20;

/** The two format bits of each level (spec table 12). */
export const ECC_FORMAT_BITS: Record<QrEcc, number> = {L: 1, M: 0, Q: 3, H: 2};
// Spec table 9, versions 1–20 (index 0 unused): EC codewords per block, and number of blocks.
const EC_PER_BLOCK: Record<QrEcc, readonly number[]> = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28],
};
const NUM_BLOCKS: Record<QrEcc, readonly number[]> = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25],
};

export const qrSize = (version: number) => version * 4 + 17;

/** Codewords (data + EC) a version holds: every module minus the function patterns and format/version info. */
export function totalCodewords(version: number): number {
  let bits = (16 * version + 128) * version + 64;
  if (version >= 2) { const n = Math.floor(version / 7) + 2; bits -= (25 * n - 10) * n - 55; if (version >= 7) bits -= 36; }
  return Math.floor(bits / 8);
}

/** The block layout of a version/level: per block, its data codeword count; and the EC codewords per block. */
export function blockLayout(version: number, ecc: QrEcc): {dataPerBlock: number[]; ecPerBlock: number} {
  const blocks = NUM_BLOCKS[ecc][version]!, ec = EC_PER_BLOCK[ecc][version]!;
  const total = totalCodewords(version), shortLen = Math.floor(total / blocks), longCount = total % blocks;
  // The first (blocks - longCount) blocks are one data codeword shorter than the rest.
  return {dataPerBlock: Array.from({length: blocks}, (_, i) => shortLen - ec + (i < blocks - longCount ? 0 : 1)), ecPerBlock: ec};
}

export const dataCodewords = (version: number, ecc: QrEcc) => totalCodewords(version) - NUM_BLOCKS[ecc][version]! * EC_PER_BLOCK[ecc][version]!;
const countBits = (version: number) => (version <= 9 ? 8 : 16);
/** How many bytes byte mode fits at a version/level. */
export const byteCapacity = (version: number, ecc: QrEcc) => Math.floor((dataCodewords(version, ecc) * 8 - 4 - countBits(version)) / 8);

/** Alignment pattern centre coordinates (spec annex E). */
export function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const n = Math.floor(version / 7) + 2, step = Math.floor((version * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, out = [6];
  for (let pos = qrSize(version) - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

// ---- GF(256), primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D) ----
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 0x80 ? 0x11d : 0); }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
export const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

const generators = new Map<number, Uint8Array>();
/** Generator polynomial ∏(x − α^i), i < degree; coefficients high to low, leading 1 omitted. */
function generator(degree: number): Uint8Array {
  let g = generators.get(degree);
  if (g) return g;
  g = new Uint8Array(degree); g[degree - 1] = 1;
  for (let i = 0, root = 1; i < degree; i++) {
    for (let j = 0; j < degree; j++) g[j] = gfMul(g[j]!, root) ^ (j + 1 < degree ? g[j + 1]! : 0);
    root = gfMul(root, 2);
  }
  generators.set(degree, g);
  return g;
}

/** Reed–Solomon EC codewords: the remainder of data·x^degree divided by the generator. */
export function reedSolomon(data: ArrayLike<number>, degree: number): number[] {
  const g = generator(degree), rem = new Array<number>(degree).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i]! ^ rem.shift()!;
    rem.push(0);
    for (let j = 0; j < degree; j++) rem[j] = rem[j]! ^ gfMul(g[j]!, factor);
  }
  return rem;
}

// ---- BCH-coded format and version information ----
/** 15-bit format information for a level and mask, with the 0x5412 XOR mask applied. */
export function formatBits(ecc: QrEcc, mask: number): number {
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
/** 18-bit version information (versions 7+), BCH(18,6) with generator 0x1F25. */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

// ---- Data codewords ----
function utf8(text: string): Uint8Array { return new TextEncoder().encode(text); }

/** Mode indicator, character count, data, terminator, bit padding and 0xEC/0x11 pad codewords. */
export function dataCodewordsFor(bytes: Uint8Array, version: number, ecc: QrEcc): number[] {
  const capacity = dataCodewords(version, ecc) * 8, bits: number[] = [];
  const put = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, countBits(version));
  for (const b of bytes) put(b, 8);
  if (bits.length > capacity) throw new Error('QR data overflow');
  put(0, Math.min(4, capacity - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < capacity / 8; pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

/** Splits the data into blocks, appends each block's EC codewords, and interleaves (data first, then EC). */
export function interleave(data: number[], version: number, ecc: QrEcc): number[] {
  const {dataPerBlock, ecPerBlock} = blockLayout(version, ecc), blocks: number[][] = [], ecs: number[][] = [];
  let k = 0;
  for (const len of dataPerBlock) { const block = data.slice(k, k + len); k += len; blocks.push(block); ecs.push(reedSolomon(block, ecPerBlock)); }
  const out: number[] = [], longest = Math.max(...dataPerBlock);
  for (let i = 0; i < longest; i++) for (const b of blocks) if (i < b.length) out.push(b[i]!);
  for (let i = 0; i < ecPerBlock; i++) for (const e of ecs) out.push(e[i]!);
  return out;
}

// ---- Matrix ----
const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];
export const maskAt = (mask: number, x: number, y: number) => MASKS[mask]!(x, y);

type Grid = {size: number; dark: boolean[][]; fn: boolean[][]};

function functionPatterns(version: number): Grid {
  const size = qrSize(version);
  const dark = Array.from({length: size}, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({length: size}, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, on: boolean) => { dark[y]![x] = on; fn[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // timing
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) // finders + separators
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  const align = alignmentPositions(version), last = align.length - 1;
  align.forEach((ay, i) => align.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return; // finder corners
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  // Reserve the format areas (written per mask) and the dark module.
  for (let i = 0; i < 9; i++) { fn[8]![i] = fn[i]![8] = true; }
  for (let i = 0; i < 8; i++) { fn[8]![size - 1 - i] = fn[size - 1 - i]![8] = true; }
  set(8, size - 8, true);
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const on = ((bits >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, on); set(b, a, on);
    }
  }
  return {size, dark, fn};
}

function drawFormat(dark: boolean[][], size: number, ecc: QrEcc, mask: number) {
  const bits = formatBits(ecc, mask), bit = (i: number) => ((bits >>> i) & 1) === 1;
  // Copy 1, around the top-left finder (bit 0 = least significant).
  for (let i = 0; i <= 5; i++) dark[i]![8] = bit(i);
  dark[7]![8] = bit(6); dark[8]![8] = bit(7); dark[8]![7] = bit(8);
  for (let i = 9; i < 15; i++) dark[8]![14 - i] = bit(i);
  // Copy 2, split between the top-right and bottom-left finders.
  for (let i = 0; i < 8; i++) dark[8]![size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) dark[size - 15 + i]![8] = bit(i);
}

/** Places the codeword bits in the two-column zigzag, skipping function modules and the vertical timing column. */
function placeData(grid: Grid, codewords: number[]) {
  const {size, dark, fn} = grid;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = upward ? size - 1 - v : v;
      if (fn[y]![x]) continue;
      // Remainder bits past the codewords stay light (0).
      dark[y]![x] = i < codewords.length * 8 && ((codewords[i >>> 3]! >>> (7 - (i & 7))) & 1) === 1;
      i++;
    }
  }
}

function applyMask(grid: Grid, mask: number) {
  for (let y = 0; y < grid.size; y++) for (let x = 0; x < grid.size; x++) if (!grid.fn[y]![x] && maskAt(mask, x, y)) grid.dark[y]![x] = !grid.dark[y]![x];
}

/** The four penalty rules of spec 7.8.3. */
export function penalty(dark: boolean[][]): number {
  const size = dark.length;
  let score = 0, darkCount = 0;
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && get(i) === get(i - 1)) { run++; continue; }
      if (run >= 5) score += 3 + run - 5; // rule 1
      run = 1;
    }
    // Rule 3: 1:1:3:1:1 dark:light:dark:light:dark with four light modules on one side (outside the symbol counts as light).
    const at = (i: number) => i >= 0 && i < size && get(i);
    for (let i = -4; i < size; i++) {
      if (!(at(i) && !at(i + 1) && at(i + 2) && at(i + 3) && at(i + 4) && !at(i + 5) && at(i + 6))) continue;
      const before = !at(i - 1) && !at(i - 2) && !at(i - 3) && !at(i - 4);
      const after = !at(i + 7) && !at(i + 8) && !at(i + 9) && !at(i + 10);
      if (before || after) score += 40;
    }
  };
  for (let y = 0; y < size; y++) line(x => dark[y]![x]!);
  for (let x = 0; x < size; x++) line(y => dark[y]![x]!);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = dark[y]![x]!;
    if (c) darkCount++;
    if (x + 1 < size && y + 1 < size && c === dark[y]![x + 1] && c === dark[y + 1]![x] && c === dark[y + 1]![x + 1]) score += 3; // rule 2
  }
  const total = size * size;
  return score + Math.max(0, Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * 10; // rule 4
}

/** Builds the symbol for a fixed version, level and mask (or the best mask when `mask` is omitted). */
export function buildQr(bytes: Uint8Array, version: number, ecc: QrEcc, mask?: number): QrMatrix & {mask: number} {
  const codewords = interleave(dataCodewordsFor(bytes, version, ecc), version, ecc);
  const base = functionPatterns(version);
  placeData(base, codewords);
  let best: {dark: boolean[][]; mask: number; score: number} | undefined;
  for (const m of mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [mask]) {
    const grid: Grid = {size: base.size, fn: base.fn, dark: base.dark.map(r => r.slice())};
    applyMask(grid, m);
    drawFormat(grid.dark, grid.size, ecc, m);
    const score = mask === undefined ? penalty(grid.dark) : 0;
    if (!best || score < best.score) best = {dark: grid.dark, mask: m, score};
  }
  return {size: base.size, modules: best!.dark, version, ecc, mask: best!.mask};
}

/**
 * Encodes text (UTF-8, byte mode) as the smallest QR symbol of versions 1–20 at `minEcc` (default M). When even
 * version 20 is too small, it steps down a level at a time (H → Q → M → L) and throws when L does not fit either.
 */
export function encodeQr(text: string, opts: {minEcc?: QrEcc} = {}): QrMatrix {
  const bytes = utf8(text), levels: QrEcc[] = ['H', 'Q', 'M', 'L'];
  for (const ecc of levels.slice(levels.indexOf(opts.minEcc ?? 'M')))
    for (let version = 1; version <= QR_MAX_VERSION; version++)
      if (bytes.length <= byteCapacity(version, ecc)) {
        const {size, modules, version: v, ecc: e} = buildQr(bytes, version, ecc);
        return {size, modules, version: v, ecc: e};
      }
  throw new Error(`QR: ${bytes.length} bytes do not fit a version ${QR_MAX_VERSION} symbol (at most ${byteCapacity(QR_MAX_VERSION, 'L')} bytes at level L).`);
}
