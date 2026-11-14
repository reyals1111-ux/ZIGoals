'use client';
import {useMemo} from 'react';
import {billPriceChange, candidatePriceChange, type PriceChange} from '../../../lib/bills/price-change';
import type {BillCandidate} from '../../../lib/bills/detect';
import type {Bill} from '../../../lib/bills/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AP (feature 6): on Upcoming bills, a bill found in the money log whose latest payment differs from the one
 * before it says so: "went up by €0.50 since Oct 2026". From the log's own payments, in the bill's currency. Its own chunk.
 */
export const priceLine = (title: string, c: PriceChange) => `${title} went ${c.direction} by ${moneyCents(c.cents, c.currency)} since ${formatMonth(c.sinceMonth)} (${moneyCents(c.previous, c.currency)} then, ${moneyCents(c.latest, c.currency)} now).`;
export default function PriceChanges({bills, candidates, entries, today}: {bills: readonly Bill[]; candidates: readonly BillCandidate[]; entries: readonly MoneyEntry[]; today: string}) {
  const lines = useMemo(() => [
    ...bills.flatMap(b => { const c = billPriceChange(b, entries, today); return c ? [{key: b.id, text: priceLine(b.title, c)}] : []; }),
    ...candidates.flatMap(k => { const c = candidatePriceChange(k, entries, today); return c ? [{key: k.key, text: priceLine(k.title, c)}] : []; }),
  ], [bills, candidates, entries, today]);
  if (!lines.length) return null;
  return <section className="bills-price-changes" aria-label="Price changes">
    <ul className="bills-notes">{lines.map(l => <li key={l.key}>{l.text}</li>)}</ul>
  </section>;
}
