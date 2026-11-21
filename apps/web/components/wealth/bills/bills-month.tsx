'use client';
import {useMemo} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {billsThisMonth, dueBeforePayday, nextPayday, type MonthBillState} from '../../../lib/bills/month';
import {formatDate, formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV (owner follow-up 1, F-BILLS-MONTH; Copilot, Rocket Money): Upcoming bills → "This month": each due date of
 * the month as seen in the money log, passed without it, or still to come, with the totals per currency; and, when the
 * money log shows a monthly income, the next payday and what falls due before it. Words say what is from the log;
 * nothing is paid or judged. Its own chunk.
 */
const STATE_WORDS: Record<MonthBillState, string> = {seen: 'in your money log', passed: 'date passed, not in your money log', coming: 'still to come'};
export default function BillsMonth({record, entries, today}: {record: BillsRecord; entries: readonly MoneyEntry[]; today: string}) {
  const m = useMemo(() => billsThisMonth(record, entries, today), [record, entries, today]);
  const pay = useMemo(() => nextPayday(entries, today), [entries, today]);
  const before = useMemo(() => pay ? dueBeforePayday(record, entries, today, pay.date) : [], [pay, record, entries, today]);
  if (!m.lines.length && !pay) return null;
  return <section className="bills-month" aria-label="Bills this month">
    <h3>This month <small>{formatMonth(`${today.slice(0, 7)}-01`)}</small></h3>
    {m.totals.map(t => <p key={t.currency} className="bills-month-total"><strong>{moneyCents(t.seen, t.currency)}</strong> seen in your money log ({t.seenCount} {t.seenCount === 1 ? 'bill' : 'bills'}) · <strong>{moneyCents(t.left, t.currency)}</strong> still to pay or not seen ({t.leftCount})</p>)}
    {m.lines.length > 0 && <ul className="bills-month-list">{m.lines.map(l => <li key={`${l.billId}-${l.due}`} className={`is-${l.state}`}><span dir="auto">{l.title}</span> <span>{formatDate(l.due, {weekday: true, year: false})} · {moneyCents(l.cents, l.currency)} · {STATE_WORDS[l.state]}</span></li>)}</ul>}
    {pay && <p className="fine bills-month-payday">Next payday about {formatDate(pay.date, {weekday: true, year: false})}, from your money log ({pay.source}). {before.length ? `Due before it: ${before.map(b => `${moneyCents(b.cents, b.currency)} (${b.count} ${b.count === 1 ? 'bill' : 'bills'})`).join(' · ')}.` : 'No bill falls due before it.'}</p>}
    <p className="fine">&ldquo;In your money log&rdquo; means an expense of that payee and amount within four days of the date. ZIGoals pays nothing.</p>
  </section>;
}
