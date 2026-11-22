'use client';
import {useId, useMemo} from 'react';
import type {Bill, BillsRecord} from '../../../lib/bills/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {countAsPayment, paidEarlyCandidates, undoCountAsPayment} from '../../../lib/bills/paid-early';
import {earlyDays} from '../../../lib/bills/month';
import {formatDate} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's "fix this bill", LEDGER #386): under a due date shown as passed in the
 * Bill tracker, the expenses of the days before it with the bill's amount (lib/bills/paid-early.ts), each with "This was
 * it": the bill then counts it as that payment (its match words learn the entry's payee), with Undo. Nothing in the money
 * log changes.
 */
export default function PaidEarly({record, entries, bill, due, today, onChange, onDone}: {record: BillsRecord; entries: readonly MoneyEntry[]; bill: Bill; due: string; today: string; onChange: (fn: (r: BillsRecord) => BillsRecord) => void; onDone: (words: string) => void}) {
  const id = useId(), found = useMemo(() => paidEarlyCandidates(record, entries, bill, due, today), [record, entries, bill, due, today]);
  const count = (entry: MoneyEntry) => {
    let before: ReturnType<typeof countAsPayment>['before'] | null = null;
    try { onChange(r => { const out = countAsPayment(r, bill.id, entry, today); before = out.before; return out.record; }); } catch { onDone('This could not be saved on this device. Nothing was changed.'); return; }
    const saved = before as ReturnType<typeof countAsPayment>['before'] | null;
    const words = `${bill.title} of ${formatDate(due)}: paid early on ${formatDate(entry.date)}. Its payments from ${(entry.note ?? entry.category).split(' · ')[0]} now count.`;
    onDone(words);
    if (saved) showUndo({message: words, undoLabel: `Undo counting ${bill.title} as paid early`, undone: `${bill.title} of ${formatDate(due)} shows as passed again.`, restore: () => { onChange(r => undoCountAsPayment(r, saved)); }});
  };
  return <div className="bill-paid-early" role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="fine">Expenses of the {earlyDays(bill.cadence)} days before {formatDate(due, {year: false})} with about this bill&rsquo;s amount ({moneyCents(Math.round(Number(bill.amount) * 100), bill.currency)}, within 5 %):</p>
    {found.length ? <ul className="bill-paid-early-list" aria-label={`Expenses that could be ${bill.title} of ${formatDate(due)}`}>{found.slice(0, 6).map(c => <li key={c.entry.id}>
      <span className="bill-paid-early-what"><strong>{(c.entry.note ?? c.entry.category).split(' · ')[0]}</strong> <span className="fine">· {c.entry.category} · {formatDate(c.entry.date, {weekday: true, year: false})}, {c.days} {c.days === 1 ? 'day' : 'days'} before</span></span>
      <span className="bills-amount" data-private-amount="">{moneyCents(Math.round(Number(c.entry.amount) * 100), c.entry.currency)}</span>
      <button type="button" className="secondary" aria-label={`Count ${(c.entry.note ?? c.entry.category).split(' · ')[0]} of ${formatDate(c.entry.date)} as ${bill.title} of ${formatDate(due)}`} onClick={() => count(c.entry)}>This was it</button>
    </li>)}</ul> : <p className="fine">No expense of about {moneyCents(Math.round(Number(bill.amount) * 100), bill.currency)} in those days. Log it in Spending, or use Mark paid.</p>}
  </div>;
}
