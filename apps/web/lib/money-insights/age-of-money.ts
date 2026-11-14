import {daysBetween} from '../bills/cadence';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';

/**
 * Session AP (owner-approved): "Age of money", pure, one currency at a time (never converted). Over the last 90 days of
 * the money log, each amount spent is matched to the oldest money received that is not yet spent (first in, first out);
 * its age is the days between the two. The figure is the average of those ages, weighted by the amount. Spending that no
 * logged income in the window covers (money from before the window, or not logged) is left out, and the result says how
 * much. Fewer than 30 days of records in the currency, or no income in the window: "not enough records yet". On one day,
 * income counts before spending (money received and spent the same day is 0 days old). Records only; nothing projected.
 * The weighted sum is a BigInt, so ten thousand large entries never lose a cent.
 */
export const AGE_WINDOW_DAYS = 90, AGE_MIN_HISTORY_DAYS = 30;
export const AGE_RULE = 'Each amount you spent is matched to the oldest money you logged as received and had not spent yet (first in, first out), over the last 90 days; its age is the days between the two.';
export type AgeOfMoney =
  | {currency: string; status: 'ok'; days: number; matched: number; unmatched: number; spent: number}
  | {currency: string; status: 'not-enough'; reason: 'history' | 'no-income' | 'no-spending'; historyDays: number};

const validDay = (d: string) => Number.isFinite(Date.parse(`${d}T00:00:00Z`));
export function ageOfMoney(entries: readonly MoneyEntry[], currency: string, today: string): AgeOfMoney {
  const own = entries.filter(e => e.currency === currency && e.date <= today && validDay(e.date));
  const first = own.reduce<string | null>((min, e) => min === null || e.date < min ? e.date : min, null);
  const historyDays = first ? daysBetween(first, today) + 1 : 0;
  if (historyDays < AGE_MIN_HISTORY_DAYS) return {currency, status: 'not-enough', reason: 'history', historyDays};
  const inWindow = own.filter(e => { const d = daysBetween(e.date, today); return d >= 0 && d < AGE_WINDOW_DAYS; })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? a.createdAt.localeCompare(b.createdAt) : a.kind === 'income' ? -1 : 1));
  if (!inWindow.some(e => e.kind === 'income')) return {currency, status: 'not-enough', reason: 'no-income', historyDays};
  const queue: {date: string; left: number}[] = [];
  let head = 0, weighted = 0n, matched = 0, unmatched = 0, spent = 0;
  for (const e of inWindow) {
    const amount = minorUnits(e.amount);
    if (e.kind === 'income') { queue.push({date: e.date, left: amount}); continue; }
    spent += amount;
    let need = amount;
    while (need > 0 && head < queue.length) {
      const lot = queue[head]!, take = Math.min(need, lot.left);
      weighted += BigInt(take) * BigInt(daysBetween(lot.date, e.date));
      matched += take; need -= take; lot.left -= take;
      if (lot.left === 0) head++;
    }
    unmatched += need;
  }
  if (!matched) return {currency, status: 'not-enough', reason: 'no-spending', historyDays};
  // Average days, to one decimal, rounded half up, in integers: round(10 × weighted ÷ matched) ÷ 10.
  const tenths = (weighted * 20n + BigInt(matched)) / (BigInt(matched) * 2n);
  return {currency, status: 'ok', days: Number(tenths) / 10, matched, unmatched, spent};
}
