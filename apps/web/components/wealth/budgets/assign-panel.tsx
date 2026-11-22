'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {assignView, averageSpent, budgetCsv, moveMoney, quickAssign, removeMove, setMonthAmount, setOptions, type AssignRow, type QuickAssign} from '../../../lib/budgets/assign';
import {budgetedIn} from '../../../lib/budgets/engine';
import {readMoneyAmount} from '../../../lib/money-log/form';
import {formatMonth} from '../../../lib/visual-format';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2 (money; YNAB's targets and assign mode, Monarch's flex budgeting, non-monthly budgets and groups,
 * Copilot and Rocket Money's suggested budgets): "Plan this month" under Budgets — Underfunded and Flexible left at the
 * top; quick-assign for every budget (fund what is underfunded, the same as last month, the average of the last three
 * months), each with Undo; per budget, this month's own amount, what it needs (a weekly, monthly or yearly target, with
 * snooze), its bucket and group, a starting balance or a non-monthly period; moving money between two budgets; the
 * month as a CSV file. Lazy, in Budgets' own place. Every amount in its own currency, never converted.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
const toCents = (raw: string) => { const v = readMoneyAmount(raw); return v ? Math.round(Number(v) * 100) : null; };
type Props = {record: BudgetsRecord; entries: readonly MoneyEntry[]; month: string; today: string; update: (fn: (r: BudgetsRecord) => BudgetsRecord) => unknown};
export default function AssignPanel({record, entries, month, today, update}: Props) {
  const id = useId(), view = useMemo(() => assignView(entries, record, month, today), [entries, record, month, today]);
  const [status, setStatus] = useState(''), [problem, setProblem] = useState(''), [open, setOpen] = useState<string | null>(null);
  const run = (fn: (r: BudgetsRecord) => BudgetsRecord, words: string) => {
    setProblem(''); setStatus('');
    // A change that cannot be made says why, and nothing is saved.
    try { fn(record); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); return; }
    void changeWithUndo(update, fn, words, {undone: 'Change undone.', undoLabel: 'Undo the change to your budgets'}).then(ok => { if (ok) setStatus(words); }, () => setProblem('Not saved on this device.'));
  };
  const quick = (how: QuickAssign, label: string) => {
    let changed = 0;
    try { changed = quickAssign(record, entries, month, today, how).changed; } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved.'); return; }
    if (!changed) { setStatus(how === 'underfunded' ? 'Nothing is underfunded this month.' : how === 'average' ? 'No budget has spending in the last three months to average.' : 'Every budget already has last month’s amount.'); return; }
    run(r => quickAssign(r, entries, month, today, how).record, `${label}: ${changed} ${changed === 1 ? 'budget' : 'budgets'} changed for ${formatMonth(`${month}-01`)}.`);
  };
  const csv = () => {
    const url = URL.createObjectURL(new Blob([budgetCsv(view)], {type: 'text/csv;charset=utf-8'})), a = document.createElement('a');
    a.href = url; a.download = `budgets-${month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`This month’s budgets were saved as a file (budgets-${month}.csv).`);
  };
  if (!view.rows.length) return null;
  const groups = [...new Set(view.rows.map(r => r.group ?? ''))].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b));
  return <section className="budgets-assign" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Plan {formatMonth(`${month}-01`)}</h4>
    <div className="budgets-assign-sums">
      <p><strong>Underfunded:</strong> {view.underfunded.length ? view.underfunded.map(u => money(u.cents, u.currency)).join(' · ') : 'nothing'}<span className="fine"> · what this month’s amounts fall short of your targets</span></p>
      {view.flexibleLeft.length > 0 && <p><strong>Flexible left:</strong> {view.flexibleLeft.map(f => `${money(f.cents, f.currency)} (${f.count} ${f.count === 1 ? 'budget' : 'budgets'})`).join(' · ')}</p>}
    </div>
    <div className="budgets-assign-quick" role="group" aria-label="Fill this month">
      <button type="button" className="secondary" onClick={() => quick('underfunded', 'Funded what was underfunded')}>Fund what is underfunded</button>
      <button type="button" className="secondary" onClick={() => quick('last-month', 'Same as last month')}>Same as last month</button>
      <button type="button" className="secondary" onClick={() => quick('average', 'The average of the last three months')}>Use the 3-month average</button>
      <button type="button" className="quiet" onClick={csv}>Download this month (CSV)</button>
    </div>
    {groups.map(g => <div key={g || 'none'} className="budgets-assign-group">
      {groups.length > 1 && <h5>{g || 'Not in a group'}</h5>}
      <ul className="budgets-assign-list">{view.rows.filter(r => (r.group ?? '') === g).map(r => <AssignLine key={r.id} row={r} record={record} entries={entries} month={month} open={open === r.id} onOpen={() => setOpen(o => o === r.id ? null : r.id)} run={run}/>)}</ul>
    </div>)}
    <MoveMoney record={record} entries={entries} month={month} today={today} rows={view.rows} run={run}/>
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
function AssignLine({row: r, record, entries, month, open, onOpen, run}: {row: AssignRow; record: BudgetsRecord; entries: readonly MoneyEntry[]; month: string; open: boolean; onOpen: () => void; run: (fn: (r: BudgetsRecord) => BudgetsRecord, words: string) => void}) {
  const b = record.budgets.find(x => x.id === r.id)!, avg = averageSpent(entries, r.category, r.currency, month);
  const [amount, setAmount] = useState(''), [kind, setKind] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>(b.need?.kind ?? 'none'), [needAmount, setNeedAmount] = useState(b.need?.amount ?? ''), [dueMonth, setDueMonth] = useState(b.need?.month ?? `${month.slice(0, 4)}-12`);
  const [bucket, setBucket] = useState(b.bucket ?? 'fixed'), [group, setGroup] = useState(b.group ?? ''), [start, setStart] = useState(b.start ?? ''), [every, setEvery] = useState<'0' | '3' | '6' | '12'>(b.period ? String(b.period.every) as '3' : '0'), [periodAmount, setPeriodAmount] = useState(b.period?.amount ?? '');
  const field = useRef<HTMLInputElement>(null);
  const saveMonth = (e: FormEvent) => { e.preventDefault(); const c = amount.trim() ? toCents(amount) : null; if (amount.trim() && c === null) { run(() => { throw new Error('Enter an amount above zero, with at most two decimals.'); }, ''); return; } run(x => setMonthAmount(x, r.id, month, c), c === null ? `${r.category}: back to ${money(Math.round(Number(b.monthly) * 100), r.currency)} this month.` : `${r.category}: ${money(c, r.currency)} for ${formatMonth(`${month}-01`)}.`); setAmount(''); };
  const saveOptions = (e: FormEvent) => {
    e.preventDefault();
    const needCents = kind === 'none' ? null : toCents(needAmount), periodCents = every === '0' ? null : toCents(periodAmount), startCents = start.trim() ? toCents(start) : null;
    if (kind !== 'none' && needCents === null) { run(() => { throw new Error('Enter what this budget needs, above zero.'); }, ''); return; }
    if (every !== '0' && periodCents === null) { run(() => { throw new Error('Enter the amount due every few months, above zero.'); }, ''); return; }
    if (start.trim() && startCents === null) { run(() => { throw new Error('Enter the starting balance above zero, or leave it empty.'); }, ''); return; }
    const fix = (c: number) => (c / 100).toFixed(2);
    run(x => setOptions(x, r.id, {need: kind === 'none' ? null : {kind, amount: fix(needCents!), ...(kind === 'yearly' ? {month: dueMonth} : {})}, bucket: every !== '0' ? 'non-monthly' : bucket === 'fixed' ? null : bucket, group: group || null, start: startCents ? fix(startCents) : null, period: every === '0' ? (b.period ? null : undefined) : {every: Number(every) as 3 | 6 | 12, amount: fix(periodCents!)}}), `${r.category} saved.`);
  };
  return <li className="budgets-assign-line">
    <div className="budgets-assign-head">
      <span><strong>{r.category}</strong> <span className="fine">· {money(r.budgeted, r.currency)}{r.own ? ' this month' : ' a month'}{r.period ? ` (${money(r.period.amount, r.currency)} every ${r.period.every} months)` : ''}{r.bucket !== 'fixed' ? ` · ${r.bucket}` : ''}{r.need ? ` · needs ${money(r.need.cents, r.currency)} (${r.need.words})` : ''}{r.snoozed ? ' · target snoozed this month' : ''}</span>
        {r.underfunded > 0 && <span className="budgets-underfunded"> · {money(r.underfunded, r.currency)} underfunded</span>}</span>
      <button type="button" className="quiet" aria-expanded={open} aria-label={`Plan ${r.category}`} onClick={() => { onOpen(); requestAnimationFrame(() => field.current?.focus()); }}>{open ? 'Close' : 'Plan'}</button>
    </div>
    {open && <div className="budgets-assign-edit">
      <form className="budgets-assign-form" onSubmit={saveMonth} aria-label={`${r.category} this month`}>
        <label className="field"><span>This month only ({r.currency}) — empty: {money(Math.round(Number(b.monthly) * 100), r.currency)}</span><input ref={field} inputMode="decimal" autoComplete="off" value={amount} placeholder={(budgetedIn(b, month) / 100).toFixed(2)} onChange={e => setAmount(e.target.value)}/></label>
        <button type="submit" className="secondary">Save for this month</button>
        {avg && <p className="fine">Suggested: {money(avg.cents, r.currency)}, your average over the last {avg.months} {avg.months === 1 ? 'month' : 'months'}. <button type="button" className="text-link" onClick={() => run(x => setMonthAmount(x, r.id, month, avg.cents), `${r.category}: ${money(avg.cents, r.currency)} for ${formatMonth(`${month}-01`)}, your average.`)}>Use it</button></p>}
      </form>
      <form className="budgets-assign-form" onSubmit={saveOptions} aria-label={`${r.category} target and options`}>
        <label className="field"><span>Target</span><select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="none">No target (or saving towards an amount, set in the row)</option><option value="weekly">An amount each week</option><option value="monthly">An amount each month</option><option value="yearly">An amount each year, by a month</option></select></label>
        {kind !== 'none' && <label className="field"><span>Amount ({r.currency})</span><input inputMode="decimal" autoComplete="off" value={needAmount} onChange={e => setNeedAmount(e.target.value)}/></label>}
        {kind === 'yearly' && <label className="field"><span>Due by</span><input type="month" value={dueMonth} onChange={e => setDueMonth(e.target.value)}/></label>}
        <label className="field"><span>Bucket</span><select value={bucket} onChange={e => setBucket(e.target.value as typeof bucket)} disabled={every !== '0'}><option value="fixed">Fixed</option><option value="flexible">Flexible</option><option value="non-monthly">Non-monthly</option></select></label>
        <label className="field"><span>Group — optional</span><input maxLength={40} value={group} placeholder="Everyday" onChange={e => setGroup(e.target.value)}/></label>
        <label className="field"><span>Due every</span><select value={every} onChange={e => setEvery(e.target.value as typeof every)}><option value="0">Month (as now)</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label>
        {every !== '0' && <label className="field"><span>Amount due then ({r.currency})</span><input inputMode="decimal" autoComplete="off" value={periodAmount} onChange={e => setPeriodAmount(e.target.value)}/></label>}
        {b.rollover && <label className="field"><span>Starting balance — optional</span><input inputMode="decimal" autoComplete="off" value={start} onChange={e => setStart(e.target.value)}/></label>}
        <button type="submit" className="secondary">Save options</button>
        {(b.need || b.target) && <button type="button" className="quiet" onClick={() => run(x => setOptions(x, r.id, {snooze: r.snoozed ? null : month}), r.snoozed ? `${r.category}: target counted again this month.` : `${r.category}: target snoozed for ${formatMonth(`${month}-01`)}.`)}>{r.snoozed ? 'Unsnooze the target' : 'Snooze the target this month'}</button>}
      </form>
    </div>}
  </li>;
}
function MoveMoney({record, entries, month, today, rows, run}: {record: BudgetsRecord; entries: readonly MoneyEntry[]; month: string; today: string; rows: readonly AssignRow[]; run: (fn: (r: BudgetsRecord) => BudgetsRecord, words: string) => void}) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [amount, setAmount] = useState('');
  const moves = (record.moves ?? []).filter(m => m.month === month), name = (id: string) => rows.find(r => r.id === id)?.category ?? 'a removed budget';
  if (rows.length < 2) return null;
  const save = (e: FormEvent) => { e.preventDefault(); const c = toCents(amount) ?? 0, fromRow = rows.find(r => r.id === from); run(x => moveMoney(x, entries, month, today, from, to, c, `mv_${crypto.randomUUID().slice(0, 12)}`, new Date().toISOString()), `${fromRow ? money(c, fromRow.currency) : ''} moved from ${name(from)} to ${name(to)}.`); setAmount(''); };
  return <details className="budgets-move"><summary>Move money between budgets</summary>
    <form className="budgets-assign-form" onSubmit={save} aria-label="Move money between budgets">
      <label className="field"><span>From</span><select value={from} onChange={e => setFrom(e.target.value)}><option value="">Choose…</option>{rows.map(r => <option key={r.id} value={r.id}>{r.category} ({money(Math.max(0, r.left), r.currency)} left)</option>)}</select></label>
      <label className="field"><span>To</span><select value={to} onChange={e => setTo(e.target.value)}><option value="">Choose…</option>{rows.filter(r => r.id !== from).map(r => <option key={r.id} value={r.id}>{r.category}</option>)}</select></label>
      <label className="field"><span>Amount</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <button type="submit" className="secondary" disabled={!from || !to}>Move</button>
    </form>
    {moves.length > 0 && <ul className="budgets-watch-list" aria-label="Moved this month">{moves.map(m => <li key={m.id}><span>{m.amount} from {name(m.from)} to {name(m.to)}</span><button type="button" className="quiet" aria-label={`Undo the move of ${m.amount} from ${name(m.from)} to ${name(m.to)}`} onClick={() => run(x => removeMove(x, m.id), 'Move removed.')}>Remove</button></li>)}</ul>}
  </details>;
}
