'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {addEntry} from '../../../lib/money-log/engine';
import type {BillsRecord} from '../../../lib/bills/schema';
import {paidEntry} from '../../../lib/bills/tracker';
import {billsToRecord} from '../../../lib/money-more/alerts';
import {formatDate} from '../../../lib/visual-format';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2, round 2 (money; Wallet's planned payments): at the top of Upcoming bills, each bill whose day has come
 * (today or the last three days) and that the money log does not show yet, with one tap to record it (an expense on its
 * day, with Undo) or "Not now" (until this page is opened again). A reminder only: nothing is ever recorded without that
 * tap — every mark is the person's own record (lib/bills/tracker.ts). Its own chunk.
 */
export default function DueToRecord({record, entries, today}: {record: BillsRecord; entries: readonly MoneyEntry[]; today: string}) {
  const id = useId(), log = useDeviceRecord(MONEY_LOG), [later, setLater] = useState<ReadonlySet<string>>(() => new Set()), [said, setSaid] = useState('');
  const due = useMemo(() => billsToRecord(record, entries, today).filter(l => !later.has(`${l.billId}|${l.due}`)), [record, entries, today, later]);
  if (!log.loaded || log.unreadable || (!due.length && !said)) return null;
  const byId = new Map(record.bills.map(b => [b.id, b]));
  const recordIt = (l: (typeof due)[number]) => {
    const bill = byId.get(l.billId); if (!bill) return;
    const words = `${bill.title} recorded: ${moneyCents(l.cents, l.currency)} on ${formatDate(l.due)}, in your money log.`;
    void changeWithUndo(log.update, current => addEntry(current, paidEntry(bill, l.due, today, crypto.randomUUID(), new Date().toISOString())), words, {undone: `${bill.title} taken out again.`, undoLabel: `Undo recording ${bill.title}`})
      .then(() => setSaid(words), () => setSaid('This could not be saved on this device. Nothing was recorded.'));
  };
  return <section className="bills-to-record" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`}>Due now, not in your money log yet</h3>
    {due.length ? <ul className="bills-list">{due.map(l => { const bill = byId.get(l.billId); return <li key={`${l.billId}-${l.due}`} className="bills-row">
      <span className="bills-date">{l.due === today ? 'Today' : formatDate(l.due, {weekday: true, year: false})}</span>
      <span className="bills-what"><strong>{l.title}</strong>{bill?.autopay && <span className="fine"> · paid automatically: record it to keep your log complete</span>}</span>
      <span className="bills-amount">{moneyCents(l.cents, l.currency)}</span>
      <span className="bills-actions"><button type="button" className="secondary" aria-label={`Record ${l.title} of ${formatDate(l.due)} in your money log`} onClick={() => recordIt(l)}>Record it</button>
        <button type="button" className="quiet" aria-label={`Not now: ${l.title}`} onClick={() => { setLater(s => new Set([...s, `${l.billId}|${l.due}`])); setSaid(`${l.title}: not now. It is offered again next time.`); }}>Not now</button></span>
    </li>; })}</ul> : null}
    <p className="fine" role="status">{said || 'One tap records it on its day; ZIGoals never records or pays anything by itself.'}</p>
  </section>;
}
