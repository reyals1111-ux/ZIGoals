import {fromBech32, toBech32} from '@cosmjs/encoding';
/**
 * Session AL fourth pass (C-BN-12): whose vote to read. A validator votes from its own account, which is its operator
 * address (zigvaloper1…) with the account prefix; any ZIG account (zig1…) reads as itself. Null, with a reason, otherwise.
 */
export function voterAccountOf(raw: string): {account: string; validator: boolean} | {problem: string} {
  const text = raw.trim();
  if (!text) return {problem: 'Paste a validator’s address (zigvaloper1…) or a ZIG address (zig1…).'};
  try {
    const decoded = fromBech32(text, 90);
    if (decoded.data.length !== 20) return {problem: 'That address is not one ZIGChain uses.'};
    if (decoded.prefix === 'zigvaloper') return {account: toBech32('zig', decoded.data), validator: true};
    if (decoded.prefix === 'zig') return {account: toBech32('zig', decoded.data), validator: false};
    return {problem: 'That is not a ZIGChain address: it should start with zigvaloper1 or zig1.'};
  } catch { return {problem: 'That address is not complete or has a typo: check it and paste it again.'}; }
}
