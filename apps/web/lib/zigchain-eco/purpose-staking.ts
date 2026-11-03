import type {Position} from '../positions';
import {zigText, daysText} from '../staking/view';
import {availabilityWords, daysUntil} from './staking-clarity';

/**
 * Session AK (F4, purpose staking): staked ZIG in the purpose picture (lib/allocation/purpose.ts, 7.5). Staked ZIG is
 * already an asset the person can allocate to a Goal (the platform's allocations, positionId → goalId); this says, per
 * staking position, how soon that money could actually be used — staked ZIG needs the unbonding period, an unbonding
 * entry is "available in N days" (the chain's own completion time), rewards are claimable any time — and which Goals it
 * is set aside for. Pure; nothing is signed or moved; amounts stay in ZIG (never converted).
 */
export type StakedPurposeRow = {
  positionId: string; network: string; practice: boolean;
  kind: 'staked' | 'unbonding' | 'rewards';
  amount: string; amountText: string; validatorName: string;
  /** When it can be used: words for the person, and the days for a sort or a badge (null when not known). */
  when: string; daysLeft: number | null;
  goals: {goalId: string; name: string; amount: string; amountText: string}[];
  /** azig not set aside for a Goal (never below 0; over-promised allocations are scaled as purpose.ts does). */
  free: string;
};
const KIND: Partial<Record<Position['sourceType'], StakedPurposeRow['kind']>> = {NATIVE_STAKING: 'staked', NATIVE_UNBONDING: 'unbonding', NATIVE_REWARDS: 'rewards'};
const azigOf = (p: Pick<Position, 'quantity' | 'decimals'>, q = p.quantity) => BigInt(q) * 10n ** BigInt(18 - Math.min(18, p.decimals));
export function stakedPurposeRows(input: {
  positions: readonly Position[];
  allocations: readonly {goalId: string; positionId: string; quantity: string}[];
  goals: readonly {id: string; name: string; status: string}[];
  now: number;
  /** The chain's unbonding period in seconds, when read (21 days on both networks today); otherwise the words stay general. */
  unbondingSeconds?: number;
}): StakedPurposeRow[] {
  const open = new Map(input.goals.filter(g => g.status !== 'closed').map(g => [g.id, g.name]));
  const rows: StakedPurposeRow[] = [];
  for (const p of input.positions) {
    const kind = KIND[p.sourceType];
    if (!kind || p.archivedAt || p.asset !== 'ZIG' || !/^\d{1,78}$/.test(p.quantity) || p.quantity === '0') continue;
    const held = BigInt(p.quantity);
    const mine = input.allocations.filter(a => a.positionId === p.id && open.has(a.goalId) && /^\d{1,78}$/.test(a.quantity) && BigInt(a.quantity) > 0n);
    const promised = mine.reduce((n, a) => n + BigInt(a.quantity), 0n);
    const goals = mine.map(a => {
      const units = promised > held ? BigInt(a.quantity) * held / promised : BigInt(a.quantity);
      const amount = azigOf(p, units.toString()).toString();
      return {goalId: a.goalId, name: open.get(a.goalId)!, amount, amountText: zigText(amount)};
    });
    const given = goals.reduce((n, g) => n + BigInt(g.amount), 0n), total = azigOf(p);
    const days = kind === 'unbonding' && p.exitDate ? daysUntil(p.exitDate, input.now) : null;
    const when = kind === 'rewards' ? 'claimable any time'
      : kind === 'unbonding' ? (days === null || Number.isNaN(days) ? 'unstaking; completion date not known' : availabilityWords(days))
      : input.unbondingSeconds && input.unbondingSeconds > 0 ? `staked: usable ${daysText(input.unbondingSeconds)} after you unstake` : 'staked: usable after the unbonding period once you unstake';
    rows.push({
      positionId: p.id, network: p.network, practice: p.network === 'zig-test-2', kind,
      amount: total.toString(), amountText: zigText(total.toString()), validatorName: p.validator?.name || 'your validator',
      when, daysLeft: days === null || Number.isNaN(days) ? (kind === 'rewards' ? 0 : null) : days,
      goals, free: (total > given ? total - given : 0n).toString(),
    });
  }
  const order = {rewards: 0, unbonding: 1, staked: 2} as const;
  return rows.sort((a, b) => order[a.kind] - order[b.kind] || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) || a.positionId.localeCompare(b.positionId));
}
/** The one sentence over the rows: how much staked ZIG is set aside for Goals (real network only; practice is apart). */
export function stakedPurposeSummary(rows: readonly StakedPurposeRow[]): string | null {
  const real = rows.filter(r => !r.practice);
  if (!real.length) return null;
  const total = real.reduce((n, r) => n + BigInt(r.amount), 0n), free = real.reduce((n, r) => n + BigInt(r.free), 0n), set = total - free;
  if (set === 0n) return `None of your ${zigText(total.toString())} in staking is set aside for a Goal yet.`;
  return `${zigText(set.toString())} of your ${zigText(total.toString())} in staking is set aside for Goals.`;
}
