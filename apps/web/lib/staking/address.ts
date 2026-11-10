import {fromBech32} from '@cosmjs/encoding';

/**
 * Session AF (ADR-028 H46): the address shapes the staking pipeline accepts. A delegator is a `zig1…` account (bech32
 * prefix `zig`, 20 bytes); a validator is a `zigvaloper1…` operator (prefix `zigvaloper`, 20 bytes). Lower case only,
 * as the chain writes them; anything else is refused before a message is built.
 */
function bech32Of(value: unknown, prefix: string, bytes: number): boolean {
  if (typeof value !== 'string' || value.length > 100 || value !== value.toLowerCase()) return false;
  try { const decoded = fromBech32(value, 90); return decoded.prefix === prefix && decoded.data.length === bytes; } catch { return false; }
}
export const isZigAccount = (value: unknown): value is string => bech32Of(value, 'zig', 20);
export const isValoper = (value: unknown): value is string => bech32Of(value, 'zigvaloper', 20);
/** "zigvaloper18vyk…ldrl": enough to tell validators apart on a review line; the whole address is in the title. */
export const shortAddress = (value: string, head = 14, tail = 4) => value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
/**
 * Session AL (N-BN-16, P-BN-23): why a typed public address is not a ZIG account, in words the person can act on: another
 * network's prefix (cosmos1…, 0x…, a validator's zigvaloper1…), a wrong length, or a mistyped character. Null when it is a
 * ZIG account. The address is compared in lower case (bech32 is one address in either case).
 */
export function zigAddressProblem(raw: string): string | null {
  const value = raw.trim().toLowerCase(), lead = 'Could not verify public positions:', tail = 'Nothing was read or saved.';
  if (bech32Of(value, 'zig', 20)) return null; // the plain check, not the type guard (which would narrow value to never)
  if (value.startsWith('zigvaloper')) return `${lead} this is a validator’s address (zigvaloper1…). Track the wallet that stakes with it instead: its address starts with zig1. ${tail}`;
  if (value.startsWith('0x')) return `${lead} this looks like an Ethereum-style address (0x…). ZIGChain addresses start with zig1; your wallet shows that address when ZIGChain is chosen. ${tail}`;
  const prefix = /^([a-z]+)1/.exec(value)?.[1];
  if (prefix && prefix !== 'zig') return `${lead} this address is for another network (${prefix}1…). ZIGChain addresses start with zig1; your wallet shows that address when ZIGChain is chosen. ${tail}`;
  if (value.startsWith('zig1') && value.length !== 42) return `${lead} this zig1 address is ${value.length} characters long; a public ZIG address is 42. Check for a missing or extra character. ${tail}`;
  if (value.startsWith('zig1')) return `${lead} a character in this address is not right (it does not match its own check). Copy it again from your wallet. ${tail}`;
  return `${lead} this is not a ZIGChain address. A public ZIG address starts with zig1 and is 42 characters long; check it and try again. ${tail}`;
}
