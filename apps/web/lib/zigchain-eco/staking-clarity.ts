import type {Position} from '../positions';
import type {StakingJournalEntry} from '../staking/journal';
import {zigText} from '../staking/view';
import {csvSafeCell} from '../export/csv-safe';
import {calendarDay} from '../visual-format';

/**
 * Session AK (F4): staking clarity, pure and read-only. Everything comes from what the app already reads — the positions
 * relay's one-block reading of an address (lib/native-positions.ts: NATIVE_REWARDS, NATIVE_UNBONDING with the chain's own
 * `completion_time` as `exitDate`) and the person's own staking journal (lib/staking/journal.ts). Nothing is estimated:
 * an unbonding date is the chain's, a claim's amount is what the journal recorded (the journal records claims without an
 * amount, so the history says so instead of guessing). The same shapes on ZIGChain v5.1 and v6.0.
 *
 * `unbondingEvents()` is the one export the lead feeds to the notification plan (lib/notify/plan.ts, a one-off item on
 * the morning of the day) and to the agenda: each event carries its instant, its calendar day in the person's zone, the
 * amount in azig and in words, and where it opens. Practice-network events are marked so a caller can label or skip them.
 */
export const MAX_UNBONDING_EVENTS = 100;
export const DAY_MS = 86_400_000;
export const PRACTICE_CHAIN = 'zig-test-2';
export type UnbondingEvent = {
  id: string; kind: 'unbonding'; network: string; practice: boolean; account: string;
  validator: string; validatorName: string;
  /** azig, integer string. */
  amount: string; amountText: string;
  /** The chain's completion time (ISO) and its calendar day in `timeZone`. */
  at: string; date: string;
  /** Whole days until it completes (0 = today or past due), counted from `now` by the clock, rounded up. */
  daysLeft: number; availability: string;
  title: string; href: string;
};
/** "available today" / "available tomorrow" / "available in 5 days". */
export function availabilityWords(daysLeft: number): string {
  if (!Number.isFinite(daysLeft) || daysLeft <= 0) return 'available today';
  return daysLeft === 1 ? 'available tomorrow' : `available in ${daysLeft} days`;
}
export const daysUntil = (at: string, now: number) => { const t = Date.parse(at); return Number.isNaN(t) ? NaN : Math.max(0, Math.ceil((t - now) / DAY_MS)); };
/**
 * The unbonding calendar: every unbonding entry the reading holds that has not completed by `now`, soonest first, at
 * most 100. A position without a valid completion time or with a zero amount is skipped (never shown as a date).
 */
export function unbondingEvents(positions: readonly Position[], {now, timeZone, includePast = false}: {now: number; timeZone?: string; includePast?: boolean}): UnbondingEvent[] {
  const out: UnbondingEvent[] = [];
  const seen = new Set<string>();
  for (const p of positions) {
    if (p.sourceType !== 'NATIVE_UNBONDING' || p.archivedAt || p.asset !== 'ZIG' || !p.exitDate || !/^[1-9]\d{0,77}$/.test(p.quantity)) continue;
    const t = Date.parse(p.exitDate);
    if (Number.isNaN(t) || (!includePast && t < now) || seen.has(p.id)) continue;
    seen.add(p.id);
    const daysLeft = daysUntil(p.exitDate, now), amount = toAzig(p);
    out.push({
      id: `unbonding:${p.id}`, kind: 'unbonding', network: p.network, practice: p.network === PRACTICE_CHAIN, account: p.account,
      validator: p.validator?.address ?? '', validatorName: p.validator?.name || 'your validator',
      amount, amountText: zigText(amount), at: new Date(t).toISOString(), date: calendarDay(t, timeZone),
      daysLeft, availability: availabilityWords(daysLeft),
      title: `${zigText(amount)} ${p.network === PRACTICE_CHAIN ? 'of test ZIG ' : ''}unstaked from ${p.validator?.name || 'your validator'}`,
      href: '/app/earn#staking-clarity',
    });
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id)).slice(0, MAX_UNBONDING_EVENTS);
}
/** Unbonding events grouped by calendar day (soonest first), with the day's total in azig. */
export function unbondingCalendar(events: readonly UnbondingEvent[]): {date: string; total: string; events: UnbondingEvent[]}[] {
  const days = new Map<string, UnbondingEvent[]>();
  for (const e of events) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({date, events: list, total: list.reduce((n, e) => n + BigInt(e.amount), 0n).toString()}));
}
const toAzig = (p: Pick<Position, 'quantity' | 'decimals'>) => (BigInt(p.quantity) * 10n ** BigInt(18 - Math.min(18, p.decimals))).toString();

export type Claimable = {network: string; account: string; total: string; byValidator: {validator: string; name: string; amount: string}[]; observedAt?: string};
/** The rewards waiting to be claimed, per network and address, from the reading (whole azig; fractions were floored by the reader). */
export function claimableOf(positions: readonly Position[]): Claimable[] {
  const groups = new Map<string, Claimable>();
  for (const p of positions) {
    if (p.sourceType !== 'NATIVE_REWARDS' || p.archivedAt || p.asset !== 'ZIG' || !/^\d{1,78}$/.test(p.quantity)) continue;
    const key = `${p.network}\u0000${p.account}`, group = groups.get(key) ?? {network: p.network, account: p.account, total: '0', byValidator: [], observedAt: p.observedAt};
    const amount = toAzig(p);
    group.total = (BigInt(group.total) + BigInt(amount)).toString();
    if (amount !== '0') group.byValidator.push({validator: p.validator?.address ?? '', name: p.validator?.name || 'Unnamed validator', amount});
    groups.set(key, group);
  }
  return [...groups.values()].map(g => ({...g, byValidator: g.byValidator.sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : BigInt(b.amount) < BigInt(a.amount) ? -1 : a.name.localeCompare(b.name)))}));
}

export type RewardsHistoryRow = {at: string; network: string; practice: boolean; wallet: string; action: 'claim' | 'sweep'; validators: string[]; amount: string | null; hash?: string};
/**
 * The rewards the person claimed through ZIGoals on this device: confirmed `claim` and `sweep` entries of the staking
 * journal, newest first. The journal records a claim without its amount, so `amount` is null for those ("in the
 * transaction"), never 0. A sweep's amount is kept only when the journal holds a positive one.
 */
export function rewardsHistory(entries: readonly StakingJournalEntry[]): RewardsHistoryRow[] {
  return entries.filter(e => (e.action === 'claim' || e.action === 'sweep') && e.state === 'CONFIRMED')
    .map(e => ({at: e.updatedAt ?? e.at, network: e.chainId, practice: e.chainId === PRACTICE_CHAIN, wallet: e.wallet, action: e.action as 'claim' | 'sweep',
      validators: e.validators?.length ? [...e.validators] : e.validator ? [e.validator] : [], amount: /^[1-9]\d{0,77}$/.test(e.amount) ? e.amount : null, ...(e.hash ? {hash: e.hash} : {})}))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * The info-only rewards CSV: the claims of `rewardsHistory` and, per address, the rewards waiting now. Every cell goes
 * through csvSafeCell (a cell a spreadsheet could run as a formula is defused). Amounts in ZIG with all 18 places so the
 * sum is exact; an unknown amount is the words "in the transaction", never 0.
 */
export const REWARDS_CSV_HEADER = ['Date (UTC)', 'Network', 'What', 'Address', 'Validators', 'Amount (ZIG)', 'Transaction'] as const;
const zigExact = (azig: string) => { const s = azig.padStart(19, '0'); const whole = s.slice(0, -18).replace(/^0+(?=\d)/, ''), frac = s.slice(-18).replace(/0+$/, ''); return frac ? `${whole}.${frac}` : whole; };
const networkName = (chainId: string) => chainId === PRACTICE_CHAIN ? 'ZIGChain practice network (zig-test-2)' : chainId === 'zigchain-1' ? 'ZIGChain (zigchain-1)' : chainId;
export function rewardsCsv(history: readonly RewardsHistoryRow[], claimable: readonly Claimable[], now: number): string {
  const rows: string[][] = [[...REWARDS_CSV_HEADER]];
  for (const c of claimable) rows.push([new Date(c.observedAt ? Date.parse(c.observedAt) : now).toISOString(), networkName(c.network), 'Waiting to be claimed', c.account, c.byValidator.map(v => v.validator).join(' '), zigExact(c.total), '']);
  for (const h of history) rows.push([h.at, networkName(h.network), h.action === 'sweep' ? 'Claimed and restaked (sweep)' : 'Claimed', h.wallet, h.validators.join(' '), h.amount ? zigExact(h.amount) : 'in the transaction', h.hash ?? '']);
  return rows.map(r => r.map(csvSafeCell).join(',')).join('\r\n') + '\r\n';
}
export const rewardsCsvName = (now: number) => `zigoals-staking-rewards-${new Date(now).toISOString().slice(0, 10)}.csv`;
