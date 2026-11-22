'use client';
import {useId, useMemo} from 'react';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {refundShare, refundTargets} from '../../../lib/money-log/refunds';
import {formatDate} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {minorUnits} from '../../../lib/money-split/parts';
import './money-r6.css';

/**
 * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425): in the entry form, while "Refund" is chosen, what it
 * does in words and the purchase it is for (optional; the person's own link, nothing is counted by it). Its own chunk.
 */
export default function RefundOf({entries, draft, amount, value, onChange}: {entries: readonly MoneyEntry[]; draft: Pick<MoneyEntry, 'id' | 'currency' | 'category' | 'date'>; amount?: string | null; value: string; onChange: (id: string) => void}) {
  const id = useId(), {id: own, currency, category, date} = draft;
  const list = useMemo(() => refundTargets(entries, {id: own, currency, category, date}), [entries, own, currency, category, date]);
  const kept = value && !list.some(e => e.id === value) ? entries.find(e => e.id === value) : undefined, shown = kept ? [kept, ...list] : list;
  // Review B6O-4: a refund of a shared cost counts the person's share of it, as the purchase does.
  const purchase = value ? entries.find(e => e.id === value && e.kind === 'expense') : undefined, share = amount && purchase ? refundShare(amount, purchase) : undefined;
  const label = (e: MoneyEntry) => `${(e.note ?? e.category).split(' · ')[0]} · ${moneyCents(minorUnits(e.amount), e.currency)} · ${formatDate(e.date)}`;
  return <div className="money-refund-of">
    <p className="fine" id={`${id}-how`}>A refund lowers {category}: its spending, its budget and this month&rsquo;s figures. It is never counted as money received.</p>
    {shown.length ? <label className="field"><span>The purchase it refunds — optional</span>
      <select value={value} aria-describedby={`${id}-how`} onChange={e => onChange(e.target.value)}><option value="">Not said</option>{shown.map(e => <option key={e.id} value={e.id}>{label(e)}</option>)}</select></label>
      : <p className="fine">No {category} purchase in {currency} in the 120 days before {formatDate(date)} to point at; the refund still lowers {category}.</p>}
    {share && purchase?.share && <p className="fine" role="status">That purchase was shared (your share {moneyCents(minorUnits(purchase.share), currency)} of {moneyCents(minorUnits(purchase.amount), currency)}), so this refund counts your share of it: {moneyCents(minorUnits(share), currency)}.</p>}
  </div>;
}
