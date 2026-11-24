import {addLocalDays} from '../local-date';
import {fromMinor, minorUnits} from '../money-split/parts';
import {isCounted, isRefund, withChange} from './counted';
import type {MoneyEntry, MoneyLog} from './schema';
import {noteKey, payeePart} from './suggest';

/**
 * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425): a refund is money back for a purchase. It is
 * kept as income (`kind: 'income'`, so an older build reads it as money received, as today) with `refund: true`, in the
 * purchase's expense category, and may name the purchase (`refundOf`). Every figure counts it by the shared rule
 * (lib/money-log/counted.ts `isRefund`): spending below zero in its category, never income. Pure.
 */
export const REFUND_DAYS = 120, MAX_OFFERS = 20;
const payeeKey = (e: Pick<MoneyEntry, 'note'>) => noteKey(payeePart(e.note ?? ''));

/** The purchases a refund can point at: expenses in its currency and category, on or before its day, newest first (120 days). */
export function refundTargets(entries: readonly MoneyEntry[], refund: Pick<MoneyEntry, 'currency' | 'category' | 'date' | 'id'>, limit = 12): MoneyEntry[] {
  const from = addLocalDays(refund.date, -REFUND_DAYS), cat = refund.category.toLowerCase();
  return entries.filter(e => e.kind === 'expense' && e.id !== refund.id && e.currency === refund.currency && e.category.toLowerCase() === cat && e.date >= from && e.date <= refund.date)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export type RefundOffer = {entry: MoneyEntry; purchase: MoneyEntry};
/**
 * Money received from a bank file (an entry naming its account) from a payee the person paid before, offered as a refund:
 * the latest counted purchase from the same payee in the same currency, within 120 days before, of at least that amount.
 * Never a transfer, an entry left out, a split entry or one already a refund; `among` narrows to some entries (To review).
 */
export function refundOffers(entries: readonly MoneyEntry[], among?: ReadonlySet<string>): RefundOffer[] {
  const purchases = entries.filter(e => e.kind === 'expense' && isCounted(e) && payeeKey(e));
  const out: RefundOffer[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'income' || !entry.account || entry.refund || !isCounted(entry) || entry.parts?.length || (among && !among.has(entry.id))) continue;
    const key = payeeKey(entry), from = addLocalDays(entry.date, -REFUND_DAYS);
    if (!key) continue;
    const purchase = purchases.filter(p => p.currency === entry.currency && payeeKey(p) === key && p.date >= from && p.date <= entry.date && minorUnits(p.amount) >= minorUnits(entry.amount))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    if (purchase) out.push({entry, purchase});
    if (out.length >= MAX_OFFERS) break;
  }
  return out;
}

/**
 * Marks one entry a refund in `category` (an expense category), pointing at `of` when given: it is kept as income with
 * `refund: true`, and the category change goes into its history. Throws in plain words when it cannot be one.
 */
export function markRefund(log: MoneyLog, id: string, {category, of}: {category: string; of?: string | null}, at: string): MoneyLog {
  const entry = log.entries.find(e => e.id === id);
  if (!entry) throw new Error('This entry is no longer in your money log.');
  if (entry.transfer) throw new Error('A transfer cannot be a refund: mark it “Not a transfer” first.');
  const name = category.trim().slice(0, 40);
  if (!name) throw new Error('Choose the category it was spent in.');
  const purchase = of ? log.entries.find(e => e.id === of && e.kind === 'expense') : undefined;
  if (of && !purchase) throw new Error('That purchase is no longer in your money log.');
  return {...log, entries: log.entries.map(e => {
    if (e.id !== id) return e;
    const {refundOf: _o, sub: _s, spread: _p, share: _h, ...rest} = e; void _o; void _s; void _p; void _h;
    const share = refundShare(e.amount, purchase); // Review B6O-4: a refund of a shared cost counts the person's share of it
    return withChange({...rest, kind: 'income', refund: true, category: name, ...(of ? {refundOf: of} : {}), ...(share ? {share} : {})}, {by: 'you', field: 'category', from: e.category, to: name}, at);
  })};
}
/**
 * Review B6O-4: the person's share of a refund of a shared cost — the refund × their share ÷ what was paid, in exact cents
 * (to the nearest cent, at least one) — or undefined when the purchase is not shared (the refund counts whole). The share
 * is kept on the refund (`share`, as on any cost), so every figure counts it by the shared rule (`mineCents`).
 */
export function refundShare(amount: string, purchase: Pick<MoneyEntry, 'amount' | 'share'> | null | undefined): string | undefined {
  if (!purchase?.share) return undefined;
  const whole = BigInt(minorUnits(purchase.amount)), mine = BigInt(minorUnits(purchase.share)), back = BigInt(minorUnits(amount));
  if (mine <= 0n || mine >= whole || back <= 0n) return undefined;
  let part = (2n * back * mine + whole) / (2n * whole);
  if (part < 1n) part = 1n;
  return part < back ? fromMinor(Number(part)) : undefined;
}
/**
 * Review B6O-4: a refund with its share following the purchase it names (taken off when it names none, or one not
 * shared). A refund naming a purchase no longer in the log keeps the share it has. Any other entry: as it is.
 */
export function withRefundShare(entries: readonly MoneyEntry[], e: MoneyEntry): MoneyEntry {
  if (e.kind !== 'income' || !e.refund) return e;
  const purchase = refundedPurchase(entries, e);
  if (e.refundOf && !purchase) return e;
  const share = refundShare(e.amount, purchase);
  if (share === e.share) return e;
  const {share: _h, ...rest} = e; void _h;
  return share ? {...rest, share} : rest;
}
/** Takes the refund mark off: it is money received again, in `category` (an income category). */
export function unmarkRefund(log: MoneyLog, id: string, category: string, at: string): MoneyLog {
  return {...log, entries: log.entries.map(e => {
    if (e.id !== id || !e.refund) return e;
    const {refund: _r, refundOf: _o, share: _h, ...rest} = e; void _r; void _o; void _h; // B6O-4: money received counts whole
    return withChange({...rest, category}, {by: 'you', field: 'category', from: e.category, to: category}, at);
  })};
}
/** The purchase a refund names, while it is still in the log. */
export const refundedPurchase = (entries: readonly MoneyEntry[], refund: MoneyEntry) => refund.refundOf ? entries.find(e => e.id === refund.refundOf && e.kind === 'expense') ?? null : null;
/** Every refund counted in a period and currency, newest first (for answers and the month's line). */
export const refundsIn = (entries: readonly MoneyEntry[], from: string, to: string) => entries.filter(e => isRefund(e) && e.date >= from && e.date <= to).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
