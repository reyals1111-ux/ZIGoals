import {base58Encode} from '../balances/solana-ata';

/**
 * Session AJ (item 36, D2b): the three encodings a watched Bitcoin extended public key needs, on the device and without a
 * new dependency (the key arithmetic itself is @scure/bip32's): RIPEMD-160 (for a wrapped-SegWit script hash), base58check
 * (legacy and wrapped-SegWit addresses) and bech32 (native SegWit v0 addresses, BIP-173). Pinned to published test
 * vectors in encode.test.ts.
 */

// RIPEMD-160 (Dobbertin, Bosselaers, Preneel), the reference rounds.
const RL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
const RR = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
const SL = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
const SR = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
const KL = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e], KR = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
const f = (j: number, x: number, y: number, z: number) => j < 16 ? x ^ y ^ z : j < 32 ? (x & y) | (~x & z) : j < 48 ? (x | ~y) ^ z : j < 64 ? (x & z) | (y & ~z) : x ^ (y | ~z);
export function ripemd160(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8, padded = new Uint8Array(((message.length + 8) >> 6) * 64 + 64);
  padded.set(message); padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength >>> 0, true); view.setUint32(padded.length - 4, Math.floor(bitLength / 2 ** 32), true);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const x = new Array<number>(16);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) x[i] = view.getUint32(block + i * 4, true);
    let al = h0, bl = h1, cl = h2, dl = h3, el = h4, ar = h0, br = h1, cr = h2, dr = h3, er = h4;
    for (let j = 0; j < 80; j++) {
      const round = j >> 4;
      let t = (rotl((al + f(j, bl, cl, dl) + x[RL[j]!]! + KL[round]!) | 0, SL[j]!) + el) | 0;
      al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
      t = (rotl((ar + f(79 - j, br, cr, dr) + x[RR[j]!]! + KR[round]!) | 0, SR[j]!) + er) | 0;
      ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
    }
    const t = (h1 + cl + dr) | 0;
    h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0; h3 = (h4 + al + br) | 0; h4 = (h0 + bl + cr) | 0; h0 = t;
  }
  const out = new Uint8Array(20), o = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => o.setUint32(i * 4, h >>> 0, true));
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)); }
export async function hash160(bytes: Uint8Array): Promise<Uint8Array> { return ripemd160(await sha256(bytes)); }
export async function base58check(version: number, payload: Uint8Array): Promise<string> {
  const body = new Uint8Array(1 + payload.length); body[0] = version; body.set(payload, 1);
  const check = (await sha256(await sha256(body))).slice(0, 4), all = new Uint8Array(body.length + 4); all.set(body); all.set(check, body.length);
  return base58Encode(all);
}

// Bech32 (BIP-173), witness version 0 only.
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function polymod(values: readonly number[]): number { let chk = 1; for (const v of values) { const top = chk >>> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!; } return chk >>> 0; }
const expand = (hrp: string) => [...[...hrp].map(c => c.charCodeAt(0) >> 5), 0, ...[...hrp].map(c => c.charCodeAt(0) & 31)];
function toWords(bytes: Uint8Array): number[] { let acc = 0, bits = 0; const out: number[] = []; for (const b of bytes) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; out.push((acc >> bits) & 31); } } if (bits) out.push((acc << (5 - bits)) & 31); return out; }
export function segwitV0Address(hrp: 'bc' | 'tb', program: Uint8Array): string {
  if (program.length !== 20 && program.length !== 32) throw Error('A version-0 witness program is 20 or 32 bytes.');
  const data = [0, ...toWords(program)], mod = polymod([...expand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({length: 6}, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `${hrp}1${[...data, ...checksum].map(v => CHARSET[v]).join('')}`;
}
