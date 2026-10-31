'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatMonth} from '../../../lib/visual-format';
import {fromCents} from '../../../lib/money-log/engine';
import {EXPENSE_CATEGORIES, MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {budgetIssue, monthKey, monthView, removeBudget, setBudget, shiftMonth} from '../../../lib/budgets/engine';
import {BUDGETS, type BudgetsRecord} from '../../../lib/budgets/schema';
import './budgets.css';

/**
 * Session AK (7.7): category budgets, one month at a time, against the money log. Each row is the month's amount, plus
 * what earlier months left unspent when rollover is on, minus what the log shows spent. Kept in its own device key
 * (`zigoals:budgets:v1`); the weekly room to spend above is unchanged. Information, not advice. Lazy-loaded.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const money = (cents: number, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(cents / 100); } catch { return `${fromCents(cents)} ${currency}`; } };
const readAmount = (raw: string) => { const v = raw.trim().replace(/\s/g, '').replace(',', '.'); return /^\d{1,10}(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? Number(v).toFixed(2) : v; };

export type BudgetsViewProps = {record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; showcase?: boolean; unreadable?: boolean; onChange: (change: (current: BudgetsRecord) => BudgetsRecord) => void};
export function BudgetsView({record, entries, today, showcase = false, unreadable = false, onChange}: BudgetsViewProps) {
  const id = useId(), thisMonth = monthKey(today);
  const [month, setMonth] = useState(thisMonth), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const [category, setCategory] = useState<string>('Groceries'), [currency, setCurrency] = useState('EUR'), [amount, setAmount] = useState(''), [rollover, setRollover] = useState(false);
  const view = useMemo(() => monthView(entries, record, month, today), [entries, record, month, today]);
  const change = (fn: (r: BudgetsRecord) => BudgetsRecord, done: string) => { setProblem(''); try { onChange(fn); setStatus(done); } catch (cause) { setStatus(''); setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); } };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const input = {category, currency, monthly: readAmount(amount), rollover}, issue = budgetIssue(input);
    if (issue) { setProblem(issue); return; }
    change(r => setBudget(r, input, crypto.randomUUID(), thisMonth), `Budget for ${category} saved: ${money(Math.round(Number(input.monthly) * 100), currency)} a month${rollover ? ', with rollover' : ''}.`);
    setAmount('');
  };
  return <div className="budgets-body">
    {showcase && <p className="fine">Fictional Showcase entries.</p>}
    {unreadable && <p role="alert">This device&rsquo;s budgets could not be read; nothing was changed.</p>}
    <div className="budgets-month-nav" role="group" aria-label="Month">
      <button type="button" className="quiet" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
      <h3 id={`${id}-month`} aria-live="polite">{formatMonth(month)}</h3>
      <button type="button" className="quiet" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
    </div>
    {view.totals.map(t => <p key={t.currency} className="budgets-total"><strong>{t.left >= 0 ? money(t.left, t.currency) : money(-t.left, t.currency)}</strong> {t.left >= 0 ? 'left' : 'over'} of {money(t.available, t.currency)} budgeted{view.daysLeft !== null ? ` · ${view.daysLeft === 1 ? 'last day of the month' : `${view.daysLeft} days to go`}` : ''}</p>)}
    {view.rows.length ? <table className="budgets-table" aria-labelledby={`${id}-month`}>
      <thead><tr><th scope="col">Category</th><th scope="col">Spent</th><th scope="col">Available</th><th scope="col">Left</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
      <tbody>{view.rows.map(r => <tr key={r.id} className={r.over ? 'budgets-over' : undefined}>
        <th scope="row"><span className="budgets-cat">{r.category}</span><span className="budgets-bar" aria-hidden="true"><span style={{width: `${Math.round(r.share * 100)}%`}}/></span></th>
        <td>{money(r.spent, r.currency)}</td>
        <td>{money(r.available, r.currency)}{r.carried > 0 && <small className="fine"> incl. {money(r.carried, r.currency)} rolled over</small>}</td>
        <td>{r.left >= 0 ? money(r.left, r.currency) : <>{money(-r.left, r.currency)} over</>}</td>
        <td><button type="button" className="quiet" onClick={() => change(x => removeBudget(x, r.id), `Budget for ${r.category} removed.`)} aria-label={`Remove the ${r.category} budget in ${r.currency}`}>Remove</button></td>
      </tr>)}</tbody>
    </table> : <p className="fine">No budgets for this month yet. Set one below, for example Groceries at 300 a month.</p>}
    {view.unbudgeted.length > 0 && <p className="fine">Also spent this month, without a budget: {view.unbudgeted.slice(0, 6).map(u => `${u.category} ${money(u.spent, u.currency)}`).join(' · ')}.</p>}
    <form className="budgets-form" onSubmit={save} aria-label="Set a monthly budget">
      <label className="field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>Each month</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300"/></label>
      <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="budgets-check"><input type="checkbox" checked={rollover} onChange={e => setRollover(e.target.checked)}/><span>Roll over what is left unspent</span></label>
      <button type="submit" className="secondary">Save budget</button>
    </form>
    <p className="budgets-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
    <p className="fine">From your own money log, in each currency apart. An overspend is never carried into the next month. Not financial advice.</p>
  </div>;
}
export default function BudgetsMonth({showcase = false}: {showcase?: boolean}) {
  const budgets = useDeviceRecord(BUDGETS), log = useDeviceRecord(MONEY_LOG), today = localDate();
  if (!budgets.loaded || !log.loaded) return <p className="fine">Loading your budgets…</p>;
  return <BudgetsView record={budgets.data} entries={log.data.entries} today={today} showcase={showcase} unreadable={budgets.unreadable} onChange={fn => { budgets.update(fn); }}/>;
}
