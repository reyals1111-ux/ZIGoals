'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {detectBills, openCandidates, type BillCandidate} from '../../../lib/bills/detect';
import {addManualBill, billOccurrences, cancelReminders, confirmCandidate, dismissCandidate, manualBillIssue, monthlyEstimate, removeBill, setCancelNote, totalsByCurrency, type BillOccurrence} from '../../../lib/bills/store';
import {BILLS, BILL_CADENCES, type Bill, type BillCadence, type BillsRecord} from '../../../lib/bills/schema';
import './bills.css';

/**
 * Session AK (7.3, COMPETITORS M7): Upcoming bills. Bills come from the person: confirmed from a repeat the money log
 * shows, or added by hand. The next 30 or 60 days are listed with a total per currency (never converted) and an
 * estimated monthly figure. ZIGoals never pays or cancels anything; a note to self ("cancel before …") is a reminder.
 * Kept on this device (`zigoals:bills:v1`). Lazy-loaded by the Wealth page.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const CADENCE_LABEL: Record<BillCadence, string> = {weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly'};
export const money = (cents: number, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${currency}`; } };
const readAmount = (raw: string) => { const v = raw.trim().replace(/\s/g, '').replace(',', '.'); return /^\d{1,10}(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? Number(v).toFixed(2) : v; };

export type BillsViewProps = {
  record: BillsRecord; entries: readonly MoneyEntry[]; today: string; showcase?: boolean; unreadable?: boolean;
  onChange: (change: (current: BillsRecord) => BillsRecord) => void;
};
/** The view, from props only (the page passes the device records; tests render it directly). */
export function BillsView({record, entries, today, showcase = false, unreadable = false, onChange}: BillsViewProps) {
  const id = useId();
  const [days, setDays] = useState<30 | 60>(30), [status, setStatus] = useState(''), [problem, setProblem] = useState(''), [adding, setAdding] = useState(false);
  const occurrences = useMemo(() => billOccurrences(record, today, days), [record, today, days]);
  const candidates = useMemo(() => openCandidates(detectBills(entries, today), record), [entries, record, today]);
  const totals = totalsByCurrency(occurrences), monthly = monthlyEstimate(record), notes = cancelReminders(record, today);
  const change = (fn: (r: BillsRecord) => BillsRecord, done: string) => {
    setProblem('');
    try { onChange(fn); setStatus(done); } catch (cause) { setStatus(''); setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device. Nothing was changed.'); }
  };
  const confirm = (c: BillCandidate) => change(r => confirmCandidate(r, c, crypto.randomUUID(), new Date()), `${c.title} added to your bills.`);
  const dismiss = (c: BillCandidate) => change(r => dismissCandidate(r, c.key, today), `${c.title} will not be suggested again.`);
  const remove = (bill: Bill) => change(r => removeBill(r, bill.id), `${bill.title} removed from your bills.`);
  return <div className="bills-body">
    {showcase && <p className="fine">Fictional Showcase entries.</p>}
    {unreadable && <p role="alert">This device&rsquo;s bills could not be read; nothing was changed. New bills start a fresh list.</p>}
    <div className="bills-head">
      <div className="bills-window" role="radiogroup" aria-label="How far ahead">
        {([30, 60] as const).map(d => <label key={d} className="bills-chip"><input type="radio" name={`${id}-days`} checked={days === d} onChange={() => setDays(d)}/><span>Next {d} days</span></label>)}
      </div>
      <dl className="bills-totals">
        <div><dt>Due in the next {days} days</dt><dd>{totals.length ? totals.map(t => <span key={t.currency}>{money(t.cents, t.currency)}</span>) : <span>Nothing due</span>}</dd></div>
        <div><dt>A typical month <small>(an estimate)</small></dt><dd>{monthly.length ? monthly.map(t => <span key={t.currency}>{money(t.cents, t.currency)}</span>) : <span>No bills yet</span>}</dd></div>
      </dl>
    </div>
    {notes.length > 0 && <ul className="bills-notes" aria-label="Notes to self due soon">{notes.map(n => <li key={n.billId}><strong>{n.title}</strong> · {formatDate(n.cancelBy)}: {n.note}</li>)}</ul>}
    <section aria-labelledby={`${id}-list`}>
      <h3 id={`${id}-list`}>Upcoming</h3>
      {occurrences.length ? <ul className="bills-list">{occurrences.map(o => <BillRow key={`${o.billId}-${o.due}`} occurrence={o} bill={record.bills.find(b => b.id === o.billId)!} onRemove={remove} onNote={(bill, note, by) => change(r => setCancelNote(r, bill.id, note, by || undefined), note.trim() ? `Note saved for ${bill.title}.` : `Note removed from ${bill.title}.`)}/>)}</ul>
        : <p className="fine">{record.bills.length ? `No bill is due in the next ${days} days.` : 'No bills yet. Confirm one found in your spending below, or add one by hand (for example rent on the 1st).'}</p>}
    </section>
    {candidates.length > 0 && <section aria-labelledby={`${id}-found`}>
      <h3 id={`${id}-found`}>Found in your spending</h3>
      <p className="fine">These repeat in your money log. Confirm the ones that are bills; nothing is added until you do.</p>
      <ul className="bills-list">{candidates.slice(0, 8).map(c => <li key={c.key} className="bills-row">
        <span className="bills-what"><strong>{c.title}</strong><span className="fine"> · {CADENCE_LABEL[c.cadence].toLowerCase()} · {c.occurrences} payments · next about {formatDate(c.nextDue)} · {c.confidenceLabel} confidence</span></span>
        <span className="bills-amount">{c.variable ? 'about ' : ''}{money(c.amountCents, c.currency)}</span>
        <span className="bills-actions"><button type="button" className="secondary" onClick={() => confirm(c)} aria-label={`Confirm ${c.title} as a bill`}>Confirm</button><button type="button" className="quiet" onClick={() => dismiss(c)} aria-label={`${c.title} is not a bill`}>Not a bill</button></span>
      </li>)}</ul>
    </section>}
    {adding ? <ManualBillForm today={today} onCancel={() => setAdding(false)} onSave={input => { change(r => addManualBill(r, input, crypto.randomUUID(), new Date()), `${input.title.trim()} added to your bills.`); setAdding(false); }}/>
      : <button type="button" className="secondary bills-add" onClick={() => { setAdding(true); setStatus(''); }}>+ Add a bill by hand</button>}
    <p className="bills-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
    <p className="fine">Reminders only: ZIGoals never pays, cancels or moves money. Amounts stay in their own currency. Kept on this device.</p>
  </div>;
}

function BillRow({occurrence: o, bill, onRemove, onNote}: {occurrence: BillOccurrence; bill: Bill; onRemove: (b: Bill) => void; onNote: (b: Bill, note: string, by: string) => void}) {
  const [editing, setEditing] = useState(false), [note, setNote] = useState(bill.cancelNote ?? ''), [by, setBy] = useState(bill.cancelBy ?? '');
  return <li className="bills-row">
    <span className="bills-date">{formatDate(o.due, {weekday: true, year: false})}</span>
    <span className="bills-what"><strong>{o.title}</strong><span className="fine"> · {CADENCE_LABEL[o.cadence].toLowerCase()}{o.origin === 'detected' ? ' · from your spending' : ''}</span>{o.cancelNote && <span className="fine bills-note-line">Note: {o.cancelNote}{o.cancelBy ? ` (by ${formatDate(o.cancelBy)})` : ''}</span>}</span>
    <span className="bills-amount">{money(o.amountCents, o.currency)}</span>
    <span className="bills-actions">
      <button type="button" className="quiet" aria-expanded={editing} onClick={() => setEditing(!editing)} aria-label={`Note to self for ${o.title}`}>Note</button>
      <button type="button" className="quiet" onClick={() => onRemove(bill)} aria-label={`Remove ${o.title} from your bills`}>Remove</button>
    </span>
    {editing && <form className="bills-note-form" onSubmit={e => { e.preventDefault(); onNote(bill, note, by); setEditing(false); }}>
      <label className="field"><span>Note to self — for example &ldquo;cancel before the trial ends&rdquo;</span><input maxLength={300} value={note} onChange={e => setNote(e.target.value)}/></label>
      <label className="field"><span>Remind me on — optional</span><input type="date" value={by} onChange={e => setBy(e.target.value)}/></label>
      <button type="submit" className="secondary">Save note</button>
    </form>}
  </li>;
}

function ManualBillForm({today, onSave, onCancel}: {today: string; onSave: (input: {title: string; amount: string; currency: string; cadence: BillCadence; nextDue: string}) => void; onCancel: () => void}) {
  const [title, setTitle] = useState(''), [amount, setAmount] = useState(''), [currency, setCurrency] = useState('EUR'), [cadence, setCadence] = useState<BillCadence>('monthly'), [nextDue, setNextDue] = useState(today), [problem, setProblem] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = {title, amount: readAmount(amount), currency, cadence, nextDue}, issue = manualBillIssue(input);
    if (issue) { setProblem(issue); return; }
    onSave(input);
  };
  return <form className="bills-form" onSubmit={submit} aria-label="Add a bill by hand">
    <label className="field"><span>Name</span><input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Rent"/></label>
    <div className="bills-form-row">
      <label className="field"><span>Amount</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="9.99"/></label>
      <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>How often</span><select value={cadence} onChange={e => setCadence(e.target.value as BillCadence)}>{BILL_CADENCES.map(c => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}</select></label>
      <label className="field"><span>Next due</span><input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}/></label>
    </div>
    {problem && <p role="alert">{problem}</p>}
    <div className="bills-actions"><button type="submit" className="primary">Save bill</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
  </form>;
}

/** The section the Wealth page lazy-loads: the device records in, the view out. */
export default function UpcomingBills({showcase = false}: {showcase?: boolean}) {
  const bills = useDeviceRecord(BILLS), log = useDeviceRecord(MONEY_LOG), today = localDate();
  if (!bills.loaded || !log.loaded) return <p className="fine">Loading your bills…</p>;
  return <BillsView record={bills.data} entries={log.data.entries} today={today} showcase={showcase} unreadable={bills.unreadable} onChange={fn => { bills.update(fn); }}/>;
}
