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
