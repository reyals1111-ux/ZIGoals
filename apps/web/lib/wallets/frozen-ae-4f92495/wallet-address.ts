/**
 * Session AE (Part 6, ADR-027): address checks for the read-only linked wallets, made on this device with no network
 * request and no dependency: ZIGChain's bech32 (`zig1…`), Bitcoin's bech32 and bech32m (`bc1…`, BIP-173 and BIP-350,
 * checksum by polymod) and base58check (`1…`, `3…`, a double SHA-256 checksum through crypto.subtle), and an EVM account
 * (0x and 40 hex digits; the EIP-55 mixed-case checksum needs Keccak, which the browser does not offer, so any case is
 * accepted). A check only says an address is well formed; it proves nothing about who holds it.
 */
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32 = 1, BECH32M = 0x2bc830a3;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function polymod(values: readonly number[]): number {
  let chk = 1;
  for (const v of values) { const top = chk >>> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATOR[i]!; }
  return chk >>> 0;
}
const hrpExpand = (hrp: string) => [...[...hrp].map(c => c.charCodeAt(0) >> 5), 0, ...[...hrp].map(c => c.charCodeAt(0) & 31)];

/** A bech32 or bech32m string's human part and 5-bit data (checksum removed), or null when it is not one. */
export function decodeBech32(text: string): {hrp: string; data: number[]; encoding: 'bech32' | 'bech32m'} | null {
  if (typeof text !== 'string' || text.length < 8 || text.length > 90) return null;
  const lower = text.toLowerCase();
  if (text !== lower && text !== text.toUpperCase()) return null; // mixed case is never valid
  for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); if (code < 33 || code > 126) return null; }
  const at = lower.lastIndexOf('1');
  if (at < 1 || at + 7 > lower.length) return null;
  const hrp = lower.slice(0, at), data = [...lower.slice(at + 1)].map(c => CHARSET.indexOf(c));
  if (data.some(v => v < 0)) return null;
  const check = polymod([...hrpExpand(hrp), ...data]);
  const encoding = check === BECH32 ? 'bech32' : check === BECH32M ? 'bech32m' : null;
  return encoding ? {hrp, data: data.slice(0, -6), encoding} : null;
}
/** Regroups bits (5-bit words to bytes); null when padding is not zero, as BIP-173 requires. */
export function convertBits(data: readonly number[], from: number, to: number, pad: boolean): number[] | null {
  let acc = 0, bits = 0;
  const out: number[] = [], maxv = (1 << to) - 1, maxAcc = (1 << (from + to - 1)) - 1;
  for (const v of data) {
    if (v < 0 || v >> from) return null;
    acc = ((acc << from) | v) & maxAcc; bits += from;
    while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); }
  }
  if (pad) { if (bits) out.push((acc << (to - bits)) & maxv); }
  else if (bits >= from || ((acc << (to - bits)) & maxv)) return null;
  return out;
}

/** A ZIGChain account address: bech32 (not bech32m) with the `zig` prefix and a 20- or 32-byte payload. */
export function isZigAddress(text: string): boolean {
  const decoded = decodeBech32(text);
  if (!decoded || decoded.hrp !== 'zig' || decoded.encoding !== 'bech32') return false;
  const bytes = convertBits(decoded.data, 5, 8, false);
  return !!bytes && (bytes.length === 20 || bytes.length === 32);
}
/** A Bitcoin mainnet segwit address (`bc1…`): version 0 in bech32 with a 20- or 32-byte program, versions 1–16 in bech32m. */
export function isBitcoinSegwit(text: string): boolean {
  const decoded = decodeBech32(text);
  if (!decoded || decoded.hrp !== 'bc' || !decoded.data.length) return false;
  const version = decoded.data[0]!;
  if (version > 16) return false;
  const program = convertBits(decoded.data.slice(1), 5, 8, false);
  if (!program || program.length < 2 || program.length > 40) return false;
  if (version === 0 && program.length !== 20 && program.length !== 32) return false;
  return decoded.encoding === (version === 0 ? 'bech32' : 'bech32m');
}
/** The 25 bytes of a legacy Bitcoin address (`1…` version 0, `3…` version 5) before its checksum is checked, or null. */
export function base58Payload(text: string): Uint8Array | null {
  if (typeof text !== 'string' || !/^[13][1-9A-HJ-NP-Za-km-z]{24,34}$/.test(text)) return null;
  let n = 0n;
  for (const c of text) n = n * 58n + BigInt(BASE58.indexOf(c));
  const bytes: number[] = [];
  while (n > 0n) { bytes.push(Number(n & 0xffn)); n >>= 8n; }
  for (const c of text) { if (c !== '1') break; bytes.push(0); }
  const out = Uint8Array.from(bytes.reverse());
  if (out.length !== 25 || out[0] !== (text[0] === '1' ? 0x00 : 0x05)) return null;
  return out;
}
/** A legacy Bitcoin address whose last four bytes are the double SHA-256 of the rest. */
export async function isBitcoinBase58(text: string): Promise<boolean> {
  const bytes = base58Payload(text);
  if (!bytes) return false;
  try {
    const once = await crypto.subtle.digest('SHA-256', bytes.slice(0, 21)), twice = new Uint8Array(await crypto.subtle.digest('SHA-256', once));
    return bytes.slice(21).every((b, i) => b === twice[i]);
  } catch { return false; }
}
export const isEvmAddress = (text: string) => typeof text === 'string' && /^0x[0-9a-fA-F]{40}$/.test(text);

export type AddressKind = 'cosmos' | 'evm' | 'btc';
/** The checks that need no hashing (every write runs them): a base58 address is checked for shape here, its checksum by verifyAddress. */
export function addressShapeOk(kind: AddressKind, address: string): boolean {
  return kind === 'cosmos' ? isZigAddress(address) : kind === 'evm' ? isEvmAddress(address) : isBitcoinSegwit(address) || base58Payload(address) !== null;
}
/** Every check, the base58 checksum included: what an address must pass before it is linked. */
export async function verifyAddress(kind: AddressKind, address: string): Promise<boolean> {
  if (!addressShapeOk(kind, address)) return false;
  return kind === 'btc' && !isBitcoinSegwit(address) ? isBitcoinBase58(address) : true;
}
/** The stored spelling: bech32 addresses in lower case (BIP-173's canonical form), the others as given. */
export const canonicalAddress = (kind: AddressKind, address: string) => kind === 'cosmos' || (kind === 'btc' && /^bc1/i.test(address)) ? address.toLowerCase() : address;
/** "zig1abcd…wxyz": the first eight and last four characters, as the wallet button shows Keplr's address. */
export const shortAddress = (address: string) => address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-4)}` : address;
