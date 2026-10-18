import {DECOY_DENOMS} from '@zigoals/chain-config/networks';
import {ZIG_DENOM} from './messages';

/**
 * Session AF (ADR-028 H21, L2 design §1; `TIER 3 (wallet/signing)`): ZIG is identified by its base denom `azig` only.
 * A token called "ZIG" under any other denom — the known decoy `coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig`
 * (symbol ZIG, exponent 6) or any other whose symbol, display or denom reads as ZIG — is a look-alike: shown apart with a
 * warning, never counted as ZIG, never staked (the message builders take no denom at all).
 */
export const LOOKALIKE_WARNING = 'Not ZIG. Never stake, buy or send this.';
export type DenomFacts = {denom: string; symbol?: string | null; display?: string | null};
export type DenomClass = 'zig' | 'lookalike' | 'other';
const ZIG_WORD = /^\s*zig\s*$/i;
/** The pre-v5 6-decimal unit, kept on mainnet only as IBC escrow backing (ADR-004): not stakeable, but not a decoy either. */
const LEGACY = 'uzig';
export function classifyDenom(facts: DenomFacts): DenomClass {
  if (facts.denom === ZIG_DENOM) return 'zig';
  if (facts.denom === LEGACY) return 'other';
  if (DECOY_DENOMS.includes(facts.denom)) return 'lookalike';
  const last = facts.denom.split(/[./]/).at(-1) ?? '';
  if ([facts.symbol, facts.display, last, facts.denom].some(v => typeof v === 'string' && ZIG_WORD.test(v))) return 'lookalike';
  return 'other';
}
export type Balance = DenomFacts & {amount: string};
/** The liquid ZIG of a balance list: the azig entry only, as an integer string ("0" when there is none). */
export function zigBalanceOf(balances: readonly Balance[]): string {
  const zig = balances.filter(b => b.denom === ZIG_DENOM);
  if (zig.length > 1) throw Error('Duplicate ZIG balance.');
  const amount = zig[0]?.amount ?? '0';
  if (!/^\d{1,78}$/.test(amount)) throw Error('Malformed ZIG balance.');
  return amount;
}
/** The look-alike tokens of a balance list, to show under "Look-alike tokens" with the warning. */
export const lookalikesOf = (balances: readonly Balance[]): Balance[] => balances.filter(b => classifyDenom(b) === 'lookalike');
