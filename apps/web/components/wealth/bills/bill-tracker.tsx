'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {recordPayment} from '../../../lib/accounts/net-worth';
import {BILL_CADENCES, type Bill, type BillCadence, type BillsRecord} from '../../../lib/bills/schema';
import {billsThisMonth} from '../../../lib/bills/month';
import {billHistory, debtMinimumsThisMonth, editBill, paidEntry, setAutopay} from '../../../lib/bills/tracker';
import {DEBT_PLANNER} from '../../../lib/debt-planner/store';
import {centsText} from '../../../lib/debt-planner/plan';
import {MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {addEntry} from '../../../lib/money-log/engine';
import {readMoneyAmount} from '../../../lib/money-log/form';
import {formatDate, formatMoney} from '../../../lib/visual-format';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';
// Session AV lane 2, round 5 (money; PocketSmith, LEDGER #386): a passed bill date paid early (in this chunk).
import PaidEarly from './paid-early';
// Session AW X7 (LEDGER #462): a bill that ends — set in Edit; an ended bill stays here, marked, with its history.
import {choiceOf, endsOf, endsProblem, setEnds, type EndsChoice} from '../../../lib/bills/ends';
import type {BillEnds} from '../../../lib/bills/schema';
import {EndsFields, endsWords} from './bill-ends';
import '../spending/money-r5.css';

/**
 * Session AV lane 2 (money; Undebt.it's Plan.it and Bill Tracker): "Bill tracker" under Upcoming bills — this month's
 * bills and debt minimums in one list with "Mark paid" (a bill: an expense in the money log on its day; a debt: a
 * payment recorded on it), each bill's last 12 months as the money log shows them, the "paid automatically" mark, and
 * editing a bill; and a printable sheet. ZIGoals pays nothing; every mark is the person's own record. Lazy.
 */
const CADENCE: Record<BillCadence, string> = {weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly'};
export default function BillTracker({record, entries, today, onChange}: {record: BillsRecord; entries: readonly MoneyEntry[]; today: string; onChange: (fn: (r: BillsRecord) => BillsRecord) => void}) {
  const id = useId(), log = useDeviceRecord(MONEY_LOG), accounts = useDeviceRecord(ACCOUNTS), planner = useDeviceRecord(DEBT_PLANNER);
  const [status, setStatus] = useState(''), [problem, setProblem] = useState(''), [editing, setEditing] = useState<string | null>(null), [early, setEarly] = useState<string | null>(null), toPay = useRef<HTMLHeadingElement>(null);
  const month = useMemo(() => billsThisMonth(record, entries, today), [record, entries, today]);
  const debts = useMemo(() => accounts.loaded && planner.loaded ? debtMinimumsThisMonth(accounts.unreadable ? null : accounts.data, planner.unreadable ? null : planner.data, today) : [], [accounts.loaded, accounts.unreadable, accounts.data, planner.loaded, planner.unreadable, planner.data, today]);
  const say = (words: string) => { setProblem(''); setStatus(words); };
  const markBill = (bill: Bill, due: string) => { void changeWithUndo(log.update, current => addEntry(current, paidEntry(bill, due, today, crypto.randomUUID(), new Date().toISOString())), `${bill.title}: marked paid in your money log.`, {undone: 'Taken out again.', undoLabel: `Undo marking ${bill.title} paid`}).then(ok => ok && say(`${bill.title}: marked paid in your money log.`), () => setProblem('Not saved on this device.')); };
  const markDebt = (d: (typeof debts)[number]) => { void changeWithUndo(accounts.update, current => recordPayment(current, d.id, {value: d.cents, decimals: 2, date: today}, new Date().toISOString()), `${d.name}: a payment of ${formatMoney(centsText(d.cents), d.currency)} recorded.`, {undone: 'Payment taken out again.', undoLabel: `Undo the payment on ${d.name}`}).then(ok => ok && say(`${d.name}: a payment of ${formatMoney(centsText(d.cents), d.currency)} recorded; Wealth shows it owed less until your next statement.`), () => setProblem('Not saved on this device.')); };
  const print = () => { document.documentElement.classList.add('zg-print-bills'); const done = () => { document.documentElement.classList.remove('zg-print-bills'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60_000); };
  const byId = new Map(record.bills.map(b => [b.id, b]));
  return <section className="bill-tracker" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Bill tracker</h3>
    <h4 ref={toPay} tabIndex={-1}>To pay this month</h4>
    {month.lines.length || debts.length ? <ul className="bills-list bill-tracker-list">
      {month.lines.map(l => { const bill = byId.get(l.billId)!; return <li key={`${l.billId}-${l.due}`} className="bills-row">
        <span className="bills-date">{formatDate(l.due, {weekday: true, year: false})}</span>
        <span className="bills-what"><strong>{l.title}</strong><span className="fine"> · {l.state === 'seen' ? 'paid: in your money log' : l.state === 'passed' ? 'date passed, not in your money log' : 'still to come'}{bill.autopay ? ' · paid automatically' : ''}</span></span>
        <span className="bills-amount">{moneyCents(l.cents, l.currency)}</span>
        <span className="bills-actions">{l.state !== 'seen' && log.loaded && !log.unreadable && <button type="button" className="secondary" aria-label={`Mark ${l.title} of ${formatDate(l.due)} paid`} onClick={() => markBill(bill, l.due)}>Mark paid</button>}{l.state === 'passed' && <button type="button" className="quiet" aria-expanded={early === `${l.billId}|${l.due}`} aria-label={`Paid early? ${l.title} of ${formatDate(l.due)}`} onClick={() => setEarly(k => k === `${l.billId}|${l.due}` ? null : `${l.billId}|${l.due}`)}>Paid early?</button>}</span>
        {l.state === 'passed' && early === `${l.billId}|${l.due}` && <PaidEarly record={record} entries={entries} bill={bill} due={l.due} today={today} onChange={onChange} onDone={words => { say(words); setEarly(null); requestAnimationFrame(() => toPay.current?.focus()); }}/>}
      </li>; })}
      {debts.map(d => <li key={d.id} className="bills-row">
        <span className="bills-date">This month</span>
        <span className="bills-what"><strong>{d.name}</strong><span className="fine"> · debt minimum{d.paid ? ' · a payment is recorded this month' : ''}</span></span>
        <span className="bills-amount">{formatMoney(centsText(d.cents), d.currency)}</span>
        <span className="bills-actions">{!d.paid && accounts.loaded && !accounts.unreadable && <button type="button" className="secondary" aria-label={`Mark the ${d.name} minimum paid`} onClick={() => markDebt(d)}>Mark paid</button>}</span>
      </li>)}
    </ul> : <p className="fine">Nothing falls due this month. Debts show here once their minimum is kept in the debt planner.</p>}
    <h4>Each bill</h4>
    <ul className="bill-tracker-bills">{record.bills.map(b => <BillItem key={b.id} bill={b} entries={entries} today={today} editing={editing === b.id} onEdit={() => setEditing(e => e === b.id ? null : b.id)}
      onAutopay={on => { try { onChange(r => setAutopay(r, b.id, on)); say(on ? `${b.title}: marked as paid automatically.` : `${b.title}: no longer marked as paid automatically.`); } catch { setProblem('Not saved on this device.'); } }}
      onSave={(edit, ends) => { try { onChange(r => setEnds(editBill(r, b.id, edit), b.id, ends)); setEditing(null); say(`${edit.title.trim()} saved.${ends ? ` ${endsWords({...b, nextDue: edit.nextDue, cadence: edit.cadence, ends}, today) ?? ''}` : ''}`.trim()); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); } }}/>)}</ul>
    <div className="money-actions"><button type="button" className="quiet" onClick={print}>Print the bill tracker</button></div>
    <p className="bills-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
function BillItem({bill, entries, today, editing, onEdit, onAutopay, onSave}: {bill: Bill; entries: readonly MoneyEntry[]; today: string; editing: boolean; onEdit: () => void; onAutopay: (on: boolean) => void; onSave: (edit: {title: string; amount: string; currency: string; cadence: BillCadence; nextDue: string}, ends: BillEnds | undefined) => void}) {
  const [ends, setEndsChoice] = useState<EndsChoice>(() => choiceOf(bill)), endsLine = endsWords(bill, today);
  const history = useMemo(() => billHistory(bill, entries, today), [bill, entries, today]), seen = history.filter(h => h.state === 'seen').length;
  const [title, setTitle] = useState(bill.title), [amount, setAmount] = useState(bill.amount), [cadence, setCadence] = useState<BillCadence>(bill.cadence), [nextDue, setNextDue] = useState(bill.nextDue), [problem, setProblem] = useState('');
  const save = (e: FormEvent) => { e.preventDefault(); const a = readMoneyAmount(amount); if (!a) { setProblem('Enter the amount above zero, with at most two decimals.'); return; } const endIssue = endsProblem(ends); if (endIssue) { setProblem(endIssue); return; } setProblem(''); onSave({title, amount: a, currency: bill.currency, cadence, nextDue}, endsOf(ends)); };
  return <li className="bill-tracker-bill">
    <div className="bill-tracker-head"><strong>{bill.title}</strong><span className="fine"> · {CADENCE[bill.cadence].toLowerCase()} · {moneyCents(Math.round(Number(bill.amount) * 100), bill.currency)}{history.length ? ` · ${seen} of ${history.length} in your money log over 12 months` : ''}</span>{endsLine && <span className="fine bills-ends-line">{endsLine}</span>}
      <label className="money-search-check"><input type="checkbox" checked={!!bill.autopay} onChange={e => onAutopay(e.target.checked)}/><span>Paid automatically</span></label>
      <button type="button" className="quiet" aria-expanded={editing} aria-label={`Edit ${bill.title}`} onClick={onEdit}>Edit</button></div>
    {history.length > 0 && <ol className="bill-tracker-history" aria-label={`${bill.title}: the last 12 months`}>{history.map(h => <li key={h.due} className={`is-${h.state}`}><span>{formatDate(h.due, {year: false})}</span> <span className="fine">{h.state === 'seen' ? 'paid' : 'not in your log'}</span></li>)}</ol>}
    {editing && <form className="bills-form bill-tracker-form" onSubmit={save} aria-label={`Edit ${bill.title}`}>
      <label className="field"><span>Name</span><input maxLength={80} value={title} onChange={e => setTitle(e.target.value)}/></label>
      <label className="field"><span>Amount ({bill.currency})</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <label className="field"><span>How often</span><select value={cadence} onChange={e => setCadence(e.target.value as BillCadence)}>{BILL_CADENCES.map(c => <option key={c} value={c}>{CADENCE[c]}</option>)}</select></label>
      <label className="field"><span>Next due</span><input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}/></label>
      <EndsFields choice={ends} onChange={setEndsChoice} nextDue={nextDue}/>
      <button type="submit" className="secondary">Save bill</button>
      {problem && <p role="alert">{problem}</p>}
    </form>}
  </li>;
}
