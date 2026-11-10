import type {PurposeView} from '../../allocation/purpose';
import {splitWealthTotals} from '../../wealth-total';

/**
 * Session AL Part 11 (lane L8): the wealth HUD's figures, from the Wealth page's own overview (lib/wealth.ts
 * wealthOverview, with the same quotes) and its purpose flow (lib/allocation/purpose.ts purposeFlows). Currencies are
 * never converted or added together: the HUD speaks in the headline currency the Wealth page leads with
 * (lib/wealth-total.ts splitWealthTotals, as WealthTotal picks it) and says how many other currencies are held apart.
 * - the glowing line: the recorded history of that currency (the page's "Your wealth over time");
 * - the allocation dial: each asset class's share of that currency's known value (the page's "in perspective" mix);
 * - the mini purpose flow: what is set aside for goals and what is still available, in that currency, with the share in
 *   the purpose flow's own figure ("34.0%").
 */
type Subtotal = {currency: string; value: bigint; allocated: bigint; unallocated: bigint};
export type WealthInput = {
  subtotals: readonly Subtotal[];
  incomplete: boolean; missingValue: boolean;
  categories: readonly {assetClass: string; subtotals: readonly Subtotal[]}[];
  history: readonly {currency: string; points: readonly {at: string; value: string}[]}[];
  rows: readonly unknown[];
};
export type WealthHud = {
  primary: Subtotal | null;
  otherCurrencies: string[];
  line: {at: string; value: number}[];
  mix: {assetClass: string; value: bigint; share: number}[];
  purpose: {allocated: bigint; available: bigint; total: bigint; shareText: string; goals: {label: string; value: bigint}[]} | null;
  incomplete: boolean; missingValue: boolean;
  /** Holdings on this device (0: a fresh start teaches). */
  holdings: number;
  /** Review M6 (lane L8d): when the headline total was counted (ISO), to place "now" beside the recorded line. */
  nowAt?: string;
};
/** The purpose flow's share (components/wealth/allocation/purpose-flow.tsx): one decimal, rounded down, or "—". Second
 *  review p7 (lane L8f): written as NOVA writes every percent ("12.7%", as the format layer does), the figure unchanged. */
export const purposeShare = (part: bigint, total: bigint): string => total > 0n ? `${(Number(part * 1000n / total) / 10).toFixed(1)}%` : '—';
export function wealthHud(o: WealthInput, views: readonly PurposeView[] = []): WealthHud {
  const {primary, others} = splitWealthTotals(o.subtotals);
  const currency = primary?.currency;
  const history = currency ? o.history.find(h => h.currency === currency) : undefined;
  const line = (history?.points ?? []).map(p => ({at: p.at, value: Number(p.value) / 100})).filter(p => Number.isFinite(p.value));
  const total = primary?.value ?? 0n;
  const mix = currency && total > 0n ? o.categories.flatMap(c => {
    const s = c.subtotals.find(x => x.currency === currency);
    return s && s.value > 0n ? [{assetClass: c.assetClass, value: s.value, share: Number(s.value * 10000n / total) / 10000}] : [];
  }).sort((a, b) => b.share - a.share) : [];
  const view = views.find(v => v.currency === currency) ?? null;
  const purpose = view ? (() => {
    const goals = view.targets.filter(t => t.kind === 'goal'), allocated = goals.reduce((n, t) => n + t.value, 0n);
    return {allocated, available: view.total - allocated, total: view.total, shareText: purposeShare(allocated, view.total), goals: goals.slice(0, 3).map(g => ({label: g.label, value: g.value}))};
  })() : null;
  return {primary: primary ?? null, otherCurrencies: others.filter(s => s.value !== 0n).map(s => s.currency), line, mix, purpose, incomplete: o.incomplete, missingValue: o.missingValue, holdings: o.rows.length};
}

/**
 * Second review m9 (lane L8f): the recorded line's frame words. A last record that is also the highest (or lowest) is
 * printed once, in its corner, with its date ("Nov 5 $537,406.10" beside "max"), never a second time at the line's end;
 * otherwise the end keeps its value (`end`). (The hollow "now" point says "now" with today's figure; wealth-hud.tsx.)
 */
export function frameWords(line: readonly {at: string; value: number}[], money: (v: number) => string, day: (at: string) => string): {max: string; min: string; span: string; end: string | null} {
  const values = line.map(x => x.value), hi = Math.max(...values), lo = Math.min(...values), last = line.at(-1)!;
  const corner = (v: number) => last.value === v ? `${day(last.at)} ${money(v)}` : money(v);
  return {max: corner(hi), min: hi === lo ? money(lo) : corner(lo), span: `${day(line[0]!.at)} – ${day(last.at)}`, end: last.value === hi || last.value === lo ? null : money(last.value)};
}
