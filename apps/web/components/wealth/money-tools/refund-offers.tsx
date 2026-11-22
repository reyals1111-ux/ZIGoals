'use client';
import {useId, useMemo, useRef} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import type {MoneyLog} from '../../../lib/money-log/schema';
import {markRefund, refundOffers} from '../../../lib/money-log/refunds';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {formatDate} from '../../../lib/visual-format';
import {money} from './format';
import '../spending/money-r6.css';

/**
 * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425): in To review, money received from a bank file from a
 * payee the person paid before, offered as a refund of that purchase. "Count as a refund" moves it into the purchase's
 * category as a refund (it lowers that category, never income), with Undo. Nothing changes without a tap. Its own chunk.
 */
export default function RefundOffers({log, among, onSaid}: {log: DeviceRecordState<MoneyLog>; among: ReadonlySet<string>; onSaid: (words: string) => void}) {
  const id = useId(), offers = useMemo(() => refundOffers(log.data.entries, among), [log.data.entries, among]), head = useRef<HTMLHeadingElement>(null);
  const had = useRef(false);
  if (offers.length) had.current = true;
  if (!offers.length && !had.current) return null;
  if (!offers.length) return <section className="money-r6" aria-labelledby={`${id}-title`}><h5 id={`${id}-title`} ref={head} tabIndex={-1}>Money back from a shop you paid before</h5><p className="fine">Nothing more to look at here.</p></section>;
  const take = (entryId: string, category: string, of: string, words: string) => {
    void changeWithUndo(log.update, current => markRefund(current, entryId, {category, of}, new Date().toISOString()), words, {undone: 'Counted as money received again.', undoLabel: 'Undo the refund'})
      .then(() => requestAnimationFrame(() => head.current?.focus()), () => onSaid('This could not be saved on this device. Nothing was changed.'));
  };
  return <section className="money-r6" aria-labelledby={`${id}-title`}>
    <h5 id={`${id}-title`} ref={head} tabIndex={-1}>Money back from a shop you paid before ({offers.length})</h5>
    <p className="fine">Each came in from a payee you spent with in the 120 days before. Counted as a refund, it lowers that purchase&rsquo;s category instead of counting as money received.</p>
    <ul className="money-r6-list">{offers.map(o => { const what = `${money(o.entry.amount, o.entry.currency)} from ${(o.entry.note ?? o.entry.category).split(' · ')[0]}`; return <li key={o.entry.id}>
      <span className="money-r6-what"><strong>{what}</strong><span className="fine"> · {formatDate(o.entry.date)} · paid {money(o.purchase.amount, o.purchase.currency)} on {formatDate(o.purchase.date)} ({o.purchase.category})</span></span>
      <span className="money-r6-actions"><button type="button" className="secondary" aria-label={`Count ${what} as a refund in ${o.purchase.category}`} onClick={() => take(o.entry.id, o.purchase.category, o.purchase.id, `${what} counted as a refund: it lowers ${o.purchase.category}.`)}>Count as a refund</button></span>
    </li>; })}</ul>
  </section>;
}
