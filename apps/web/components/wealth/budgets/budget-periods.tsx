'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showStatus, showUndo} from '../../ui/undo-toast';
import {moneyCents} from '../money-tools/format';
import {ACCOUNTS, isDebtKind} from '../../../lib/accounts/schema';
import {fromCents} from '../../../lib/money-log/engine';
import {minorUnits} from '../../../lib/money-split/parts';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import {BUDGET_PERIODS, applyFill, fillTotals, incomeToFill, periodRows, saveFill, setPeriods, type Every} from '../../../lib/budgets/periods';
import {formatDate} from '../../../lib/visual-format';
import {perDayWords} from '../../../lib/budgets/per-day';
import {budgetsInOrder} from '../../../lib/budgets/order';

/**
 * Session AV lane 2 (Money group N11, LEDGER #212, #213, #216; Goodbudget): Budgets → "Pay periods and fills", its own
 * chunk. Choose the day the budget month starts (payday) and a weekly or two-weekly period per budget; each budget then
 * shows its own period's amount, spent and left. Save how one paycheck splits over the budgets: when income is logged the
 * fill is offered with one tap (Undo puts the budgets back). Link a debt to a budget: payments recorded on the debt count
 * against it. Records only, one currency at a time; never advice.
 */
const EVERY_WORDS: Record<Every, string> = {month: 'Each month', week: 'Each week', fortnight: 'Every two weeks'};
export default function BudgetPeriodsPanel({record, entries, today, startsOn, onChange}: {record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; startsOn: 'monday' | 'sunday'; onChange: (change: (current: BudgetsRecord) => BudgetsRecord) => void}) {
  const plan = useDeviceRecord(BUDGET_PERIODS), accounts = useDeviceRecord(ACCOUNTS), id = useId();
  const debts = accounts.data.items.filter(a => isDebtKind(a.kind) && !a.archivedAt);
  const rows = useMemo(() => periodRows(entries, record, plan.data, today, {accounts: accounts.data.items, startsOn}), [entries, record, plan.data, today, accounts.data.items, startsOn]);
  const [fill, setFill] = useState<Record<string, string>>(() => Object.fromEntries((plan.data.fill?.items ?? []).map(i => [i.budgetId, i.amount])));
  const income = incomeToFill(entries, record, plan.data, today), totals = fillTotals(record, plan.data);
  const write = (fn: Parameters<typeof plan.update>[0], said: string) => {
    if (plan.unreadable) { showStatus('Your pay periods could not be read on this device, so nothing was written over them.', {tone: 'error'}); return; }
    try { plan.update(fn); showStatus(said); } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  const useFill = () => {
    if (!income) return;
    const beforeBudgets = record, beforePlan = plan.data, out = applyFill(record, plan.data, income.id);
    onChange(() => out.budgets); plan.update(() => out.plan);
    showUndo({message: `Fill used for the ${moneyCents(minorUnits(income.amount), income.currency)} of ${formatDate(income.date, {weekday: true, year: false})}: ${out.changed} ${out.changed === 1 ? 'budget' : 'budgets'} set.`, undone: 'The budgets are back as they were.', restore: () => { onChange(() => beforeBudgets); plan.update(() => beforePlan); }});
  };
  if (!plan.loaded) return null;
  const payday = plan.data.payday ?? 1;
  return <details className="budgets-periods" open={income ? true : undefined}>
    <summary>Pay periods and fills{payday !== 1 ? ` · month from day ${payday}` : ''}</summary>
    {income && <div className="notice budgets-fill-offer" role="status"><p>You logged {moneyCents(minorUnits(income.amount), income.currency)} income on {formatDate(income.date, {weekday: true, year: false})}. Use your fill{totals.length ? ` (${totals.map(t => moneyCents(t.cents, t.currency)).join(' + ')})` : ''} for it?</p>
      <p><button type="button" className="secondary" onClick={useFill}>Use the fill</button> <button type="button" className="quiet" onClick={() => write(p => ({...p, filled: [...(p.filled ?? []), income.id].slice(-50)}), 'Not used for this income.')}>Not for this one</button></p></div>}
    <div className="budgets-periods-fields">
      <label className="field"><span>My budget month starts on day</span><select value={payday} onChange={e => write(p => setPeriods(p, {payday: Number(e.target.value)}), Number(e.target.value) === 1 ? 'Budgets run by calendar month.' : `Budgets run from day ${e.target.value} of each month (payday).`)}>{Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d === 1 ? '1 (the calendar month)' : d}</option>)}</select></label>
    </div>
    {rows.length ? <ul className="budgets-periods-list" aria-label="Budgets in their own period">{rows.map(r => <li key={r.budget.id} data-over={r.over || undefined}>
      <span className="budgets-periods-what"><strong dir="auto">{r.budget.category}</strong><small>{formatDate(r.start, {year: false})} – {formatDate(r.end, {year: false})} · {moneyCents(r.amount, r.budget.currency)} · spent {moneyCents(r.spent, r.budget.currency)}{r.debtPaid ? ` · paid on debts ${moneyCents(r.debtPaid, r.budget.currency)}` : ''} · {r.left >= 0 ? `${moneyCents(r.left, r.budget.currency)} left` : `${moneyCents(-r.left, r.budget.currency)} over`}{/* Session AV lane 2, round 2 (Spendee): a day's amount left in its own period */ r.start <= today && today <= r.end && (d => d ? ` · ${d.charAt(0).toLowerCase()}${d.slice(1)}` : '')(perDayWords(r.left, Math.round((Date.parse(`${r.end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1, moneyCents, r.budget.currency))}</small></span>
      <label className="field"><span className="sr-only">Period of {r.budget.category}</span><select value={r.every} onChange={e => write(p => setPeriods(p, {every: {budgetId: r.budget.id, every: e.target.value as Every}}), `${r.budget.category}: ${EVERY_WORDS[e.target.value as Every].toLowerCase()}.`)}>{(Object.keys(EVERY_WORDS) as Every[]).map(k => <option key={k} value={k}>{EVERY_WORDS[k]}</option>)}</select></label>
    </li>)}</ul> : <p className="fine">Add a budget first; then choose here whether it runs by the month, the week or two weeks.</p>}
    {rows.length > 0 && <form className="budgets-fill" noValidate aria-labelledby={`${id}-fill`} onSubmit={e => { e.preventDefault(); write(p => saveFill(p, Object.entries(fill).map(([budgetId, amount]) => ({budgetId, amount}))), 'Fill saved: it is offered when you log income.'); }}>
      <h4 id={`${id}-fill`}>A paycheck fill</h4>
      <p className="fine">How one paycheck splits over your budgets. When you log income, the fill is offered with one tap; it sets those budgets’ amounts.</p>
      {budgetsInOrder(record.budgets).map(b => <label key={b.id} className="field">{/* Round 6 (#429): the person's own order */}<span>{b.category} ({b.currency})</span><input inputMode="decimal" autoComplete="off" value={fill[b.id] ?? ''} placeholder={fromCents(minorUnits(b.monthly))} onChange={e => setFill(f => ({...f, [b.id]: e.target.value}))} /></label>)}
      <button type="submit" className="secondary">Save the fill</button>
    </form>}
    {debts.length > 0 && rows.length > 0 && <div className="budgets-debts">
      <h4>Debts paid from a budget</h4>
      <p className="fine">Payments you record on a linked debt count against that budget in its period.</p>
      {debts.map(a => <label key={a.id} className="field"><span>{a.name}</span><select value={plan.data.debts?.[a.id] ?? ''} onChange={e => write(p => setPeriods(p, {debt: {accountId: a.id, budgetId: e.target.value || null}}), e.target.value ? `Payments on ${a.name} count against ${record.budgets.find(b => b.id === e.target.value)?.category}.` : `${a.name} is not linked to a budget.`)}>
        <option value="">No budget</option>{record.budgets.filter(b => b.currency === a.currency).map(b => <option key={b.id} value={b.id}>{b.category}</option>)}</select></label>)}
    </div>}
  </details>;
}
