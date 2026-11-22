import {holdings} from './math';
import {receiptsSchema, type Receipts} from './receipts';
import type {Portfolio} from './schema';

/**
 * Session AV lane 2 (money; CoinStats' "Include in Profit/Loss"): a transaction the person leaves out of the results —
 * a gift received, coins moved in from an old wallet whose cost is not theirs to count. Its coins still count in what
 * the portfolio holds and is worth; the profit and loss, the cost and the all-time result are worked out without it.
 * The ids live in the portfolio-receipts record (the Portfolio record is strict in every release). Pure.
 */
export const uncountedOf = (record: Receipts | null | undefined): ReadonlySet<string> => new Set(record?.uncounted ?? []);
/** The portfolio the results are counted from: without the transactions left out. */
export function forResults<T extends Pick<Portfolio, 'transactions'>>(portfolio: T, uncounted: ReadonlySet<string>): T {
  return uncounted.size && portfolio.transactions.some(t => uncounted.has(t.id)) ? {...portfolio, transactions: portfolio.transactions.filter(t => !uncounted.has(t.id))} : portfolio;
}
/**
 * Leaves one transaction out of the results (or counts it again). Refused, in words, when leaving it out would make a later
 * sale or transfer out sell more than the results still hold (the results would not add up).
 */
export function setCounted(record: Receipts, portfolio: Pick<Portfolio, 'transactions'>, transactionId: string, counted: boolean): Receipts {
  const now = new Set(record.uncounted ?? []);
  if (counted) now.delete(transactionId); else now.add(transactionId);
  if (!counted) { try { holdings(forResults(portfolio, now)); } catch { throw new Error('This one cannot be left out: a later sale or transfer out needs its coins in the results. Leave that one out too, or keep this counted.'); } }
  const {uncounted: _u, ...rest} = record; void _u;
  return receiptsSchema.parse(now.size ? {...rest, uncounted: [...now]} : rest);
}
