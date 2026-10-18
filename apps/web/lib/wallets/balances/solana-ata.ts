/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c), H50): PublicNode's Solana RPC refuses the indexed `getTokenAccountsByOwner`
 * ("Indexed requests require a personal token", read 2026-10-18 22:39 UTC), so a person's USDC/USDT is read from their
 * associated token account instead, whose address this module derives on the device (no dependency): the program-derived
 * address of [owner, token program, mint] under the Associated Token Account program, i.e. the first bump from 255 down
 * whose SHA-256 `seeds ‖ bump ‖ program ‖ "ProgramDerivedAddress"` is not a point of ed25519 (the curve check is the
 * standard decompression test: (y² − 1) / (d·y² + 1) must be a square mod 2²⁵⁵ − 19). Base58 encode/decode included.
 * Pinned in lib/wallets/balances/solana-ata.test.ts against an associated account read live once.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58Decode(text: string): Uint8Array {
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(text)) throw Error('Not base58.');
  let n = 0n;
  for (const c of text) n = n * 58n + BigInt(ALPHABET.indexOf(c));
  const bytes: number[] = [];
  while (n > 0n) { bytes.push(Number(n & 0xffn)); n >>= 8n; }
  for (const c of text) { if (c !== '1') break; bytes.push(0); }
  return Uint8Array.from(bytes.reverse());
}
export function base58Encode(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = `1${out}`; }
  return out;
}
const P = 2n ** 255n - 19n;
const mod = (a: bigint) => ((a % P) + P) % P;
function power(base: bigint, exp: bigint): bigint {
  let result = 1n, b = mod(base), e = exp;
  while (e > 0n) { if (e & 1n) result = mod(result * b); b = mod(b * b); e >>= 1n; }
  return result;
}
const D = mod(-121665n * power(121666n, P - 2n));
/** True when 32 bytes decode to a point of ed25519 (y below p, x² a square). */
export function onCurve(bytes: Uint8Array): boolean {
  if (bytes.length !== 32) return false;
  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(i === 31 ? bytes[i]! & 0x7f : bytes[i]!);
  if (y >= P) return false;
  const y2 = mod(y * y), u = mod(y2 - 1n), v = mod(D * y2 + 1n);
  const x2 = mod(u * power(v, P - 2n));
  if (x2 === 0n) return (bytes[31]! & 0x80) === 0;
  return power(x2, (P - 1n) / 2n) === 1n;
}
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const MARKER = new TextEncoder().encode('ProgramDerivedAddress');
/** The associated token account of `owner` for `mint` (classic SPL Token program), as base58. */
export async function associatedTokenAccount(owner: string, mint: string, subtle: SubtleCrypto = crypto.subtle): Promise<string> {
  const seeds = [base58Decode(owner), base58Decode(TOKEN_PROGRAM), base58Decode(mint)], program = base58Decode(ASSOCIATED_TOKEN_PROGRAM);
  if (seeds.some(s => s.length !== 32) || program.length !== 32) throw Error('A Solana address is 32 bytes.');
  for (let bump = 255; bump >= 0; bump--) {
    const input = new Uint8Array(32 * 3 + 1 + 32 + MARKER.length);
    seeds.forEach((s, i) => input.set(s, i * 32));
    input[96] = bump; input.set(program, 97); input.set(MARKER, 129);
    const hash = new Uint8Array(await subtle.digest('SHA-256', input));
    if (!onCurve(hash)) return base58Encode(hash);
  }
  throw Error('No associated address exists for these keys.');
}
