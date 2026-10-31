/**
 * Session AK (F4, ADR-036 "Owner follow-up 1"): the validator chooser's facts, as pure functions over the validators
 * route's answer (lib/chain/validators-wire.ts, read by ZIGoals' server from the network's own LCD at one block). Works
 * the same on ZIGChain v5.1 and v6.0: both answer the same staking and slashing shapes (Cosmos SDK 0.53.8,
 * docs/research/session-ak/ZIGCHAIN_ECOSYSTEM.md §2).
 *
 * Nothing here ranks by return. The only ordering it offers beyond the name is a gentle decentralisation hint: validators
 * outside the 10 largest by stake first, because spreading stake keeps the network harder to control. Exact integer
 * arithmetic on azig (BigInt), never floats.
 */
export const TOP_N = 10;
/** The share of all bonded stake that can halt the chain (more than one third). */
export type ChooserValidator = {
  operator: string; moniker: string; status: 'bonded' | 'unbonding' | 'unbonded'; jailed: boolean; tombstoned: boolean | null;
  /** azig as an integer string; an earn-hub figure with a fraction is cut at the point. */
  tokens: string;
  uptime?: {window: number; missed: number} | null;
};
export type ValidatorStatus = 'active' | 'jailed' | 'tombstoned' | 'leaving' | 'inactive';
export const STATUS_WORDS: Readonly<Record<ValidatorStatus, {label: string; means: string}>> = Object.freeze({
  active: {label: 'Active', means: 'In the active set: it signs blocks and its delegators earn rewards.'},
  jailed: {label: 'Jailed', means: 'Paused by the chain, usually for missing too many blocks. Its delegators earn nothing until it is back.'},
  tombstoned: {label: 'Removed for good', means: 'The chain removed it permanently for signing twice. It can never sign again; move your stake.'},
  leaving: {label: 'Leaving', means: 'Leaving the active set. It earns nothing while it is out.'},
  inactive: {label: 'Inactive', means: 'Outside the active set. It earns nothing while it is out.'},
});
export function statusOf(v: Pick<ChooserValidator, 'status' | 'jailed' | 'tombstoned'>): ValidatorStatus {
  if (v.tombstoned) return 'tombstoned';
  if (v.jailed) return 'jailed';
  return v.status === 'bonded' ? 'active' : v.status === 'unbonding' ? 'leaving' : 'inactive';
}
const units = (tokens: string): bigint => { const whole = tokens.split('.')[0] ?? ''; return /^\d{1,78}$/.test(whole) ? BigInt(whole) : 0n; };
const byStake = (a: ChooserValidator, b: ChooserValidator) => { const x = units(a.tokens), y = units(b.tokens); return x === y ? a.operator.localeCompare(b.operator) : y > x ? 1 : -1; };
/** 1-based rank by bonded stake among active validators (bonded, not jailed); others have no rank. */
export function powerRanks(validators: readonly ChooserValidator[]): Map<string, number> {
  const active = validators.filter(v => statusOf(v) === 'active').sort(byStake);
  return new Map(active.map((v, i) => [v.operator, i + 1]));
}
/**
 * The Nakamoto count: the fewest active validators whose stake together is more than one third of all active stake —
 * the smallest group that could halt the chain. Null when there is no active stake.
 */
export function nakamotoCount(validators: readonly ChooserValidator[]): number | null {
  const active = validators.filter(v => statusOf(v) === 'active').sort(byStake);
  const total = active.reduce((n, v) => n + units(v.tokens), 0n);
  if (total <= 0n) return null;
  let sum = 0n;
  for (let i = 0; i < active.length; i++) { sum += units(active[i]!.tokens); if (sum * 3n > total) return i + 1; }
  return active.length;
}
/** The gentle hint for one validator: said only for the 10 largest, never as a warning. */
export function decentralisationHint(rank: number | undefined, activeCount: number): string | null {
  if (rank === undefined || activeCount <= TOP_N || rank > TOP_N) return null;
  return `One of the ${TOP_N} largest validators (number ${rank} by stake). Choosing one outside the ${TOP_N} largest helps keep ZIGChain in many hands.`;
}
/** A one-line summary of how spread the stake is, for the top of the chooser. */
export function spreadLine(validators: readonly ChooserValidator[]): string | null {
  const count = nakamotoCount(validators);
  if (count === null) return null;
  return count === 1 ? 'One validator alone holds more than a third of all active stake: it could halt the chain on its own. Spreading stake helps.'
    : `${count} validators together hold more than a third of all active stake, enough to halt the chain. The higher this number, the safer the network.`;
}
/** Missed blocks in the chain's window, in words; "Uptime unavailable" without signing info (unknown is not zero). */
export function uptimeWords(uptime: ChooserValidator['uptime']): string {
  if (!uptime || !Number.isInteger(uptime.window) || uptime.window <= 0 || !Number.isInteger(uptime.missed) || uptime.missed < 0) return 'Uptime unavailable';
  const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return uptime.missed === 0 ? `Missed no blocks of the last ${group(uptime.window)}` : `Missed ${group(uptime.missed)} of the last ${group(uptime.window)} blocks`;
}
/**
 * The chooser's order: by name, and — when `outsideTopFirst` — validators outside the 10 largest first (each group by
 * name). Inactive, jailed and removed validators keep their place after the active ones; the picker does not offer them.
 */
export function chooserOrder<T extends ChooserValidator>(validators: readonly T[], outsideTopFirst: boolean): T[] {
  const ranks = powerRanks(validators), active = ranks.size;
  const group = (v: T) => statusOf(v) !== 'active' ? 2 : outsideTopFirst && active > TOP_N && (ranks.get(v.operator) ?? 0) <= TOP_N ? 1 : 0;
  const name = (v: T) => (v.moniker || v.operator).toLocaleLowerCase('en');
  return [...validators].sort((a, b) => group(a) - group(b) || name(a).localeCompare(name(b), 'en') || a.operator.localeCompare(b.operator));
}
