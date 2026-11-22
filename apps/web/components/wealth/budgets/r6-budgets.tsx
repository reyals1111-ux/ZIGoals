'use client';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {showStatus, showUndo} from '../../ui/undo-toast';
import {moneyCents} from '../money-tools/format';
import {addLocalDays, localWeekday} from '../../../lib/local-date';
import {formatDate, formatMonth, formatWeekdayLong} from '../../../lib/visual-format';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {fromCents} from '../../../lib/money-log/engine';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import {budgetsInOrder, clearOrder, hasOwnOrder, moveBudget, moveBudgetTo} from '../../../lib/budgets/order';
import {aheadRows, setAside} from '../../../lib/budgets/set-aside';
import {readyToAssign} from '../../../lib/budgets/ready-to-assign';
import {shiftMonth} from '../../../lib/budgets/engine';
import {BUDGET_PERIODS, isDay} from '../../../lib/budgets/periods';
import {nextFortnightPayday, paycheckMonth, removePaycheck, revertPaychecks, savePaycheck, setLine, type Paycheck} from '../../../lib/budgets/paychecks';
import {BILLS} from '../../../lib/bills/schema';
import {parseNumberInput} from '../../../lib/numbers/parse';
import '../spending/money-r6.css';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity; LEDGER #426, #428, #429): Budgets in your own order, money set
 * aside for next month, and each paycheck's plan. Their own chunk, loaded when a fold opens. The person's own amounts only;
 * no suggested amount and no advice. Each currency apart, never converted.
 */
type Change = (change: (current: BudgetsRecord) => BudgetsRecord) => void;
const readAmount = (raw: string) => { const r = parseNumberInput(raw); return r.ok ? r.text : raw.trim(); };

/** #429: "Reorder budgets": up and down (keyboard and touch), or drag with a mouse; kept, with Undo. */
export default function ReorderBudgets({record, onChange}: {record: BudgetsRecord; onChange: Change}) {
  const list = useMemo(() => budgetsInOrder(record.budgets), [record.budgets]), [focus, setFocus] = useState<string | null>(null), box = useRef<HTMLOListElement>(null), [drag, setDrag] = useState<string | null>(null);
  useEffect(() => { if (!focus) return; const el = box.current?.querySelector<HTMLElement>(`[data-focus-key="${focus}"]`) ?? box.current?.querySelector<HTMLElement>('button:not([disabled])'); el?.focus(); setFocus(null); }, [focus, list]);
  const move = (id: string, by: -1 | 1, name: string) => {
    setFocus(`${id}-${by < 0 ? 'up' : 'down'}`);
    void changeWithUndo(onChange, r => moveBudget(r, id, by), `${name} moved ${by < 0 ? 'up' : 'down'}.`, {undone: 'Order put back.', undoLabel: `Undo moving ${name}`}).catch(() => showStatus('This could not be saved on this device. Nothing was changed.', {tone: 'error'}));
  };
  const drop = (target: number) => { const id = drag; setDrag(null); if (!id) return; const name = list.find(b => b.id === id)?.category ?? 'The budget'; void changeWithUndo(onChange, r => moveBudgetTo(r, id, target), `${name} moved.`, {undone: 'Order put back.', undoLabel: `Undo moving ${name}`}).catch(() => showStatus('This could not be saved on this device. Nothing was changed.', {tone: 'error'})); };
  if (list.length < 2) return <p className="fine">With two budgets or more, put them in your own order here (rent first, fun last).</p>;
  return <div className="money-r6">
    <p className="fine">Your order is used on Budgets, in each month and in the paycheck fill; each currency stays apart.</p>
    <ol ref={box} className="money-order-list" aria-label="Your budgets in order">{list.map((b, i) => <li key={b.id} draggable onDragStart={() => setDrag(b.id)} onDragOver={e => { if (drag) e.preventDefault(); }} onDrop={e => { e.preventDefault(); drop(i); }} onDragEnd={() => setDrag(null)}>
      <span><strong>{b.category}</strong> <span className="fine">{b.currency}</span></span>
      <button type="button" className="quiet" data-focus-key={`${b.id}-up`} disabled={i === 0} aria-label={`Move ${b.category} (${b.currency}) up`} onClick={() => move(b.id, -1, b.category)}>↑</button>
      <button type="button" className="quiet" data-focus-key={`${b.id}-down`} disabled={i === list.length - 1} aria-label={`Move ${b.category} (${b.currency}) down`} onClick={() => move(b.id, 1, b.category)}>↓</button>
    </li>)}</ol>
    {hasOwnOrder(record.budgets) && <p><button type="button" className="quiet" onClick={() => { setFocus('none'); void changeWithUndo(onChange, clearOrder, 'Back to the usual order: the most spent first.', {undone: 'Your order is back.', undoLabel: 'Undo: keep my order'}).catch(() => showStatus('This could not be saved on this device.', {tone: 'error'})); }}>Back to the usual order</button></p>}
  </div>;
}

/** #428: "Set aside for next month", from this month's ready money. */
export function SetAsideNext({record, entries, month, onChange}: {record: BudgetsRecord; entries: readonly MoneyEntry[]; month: string; onChange: Change}) {
  const id = useId(), next = shiftMonth(month, 1), rows = useMemo(() => aheadRows(record, month), [record, month]);
  const ready = useMemo(() => readyToAssign(entries, record, month), [entries, record, month]);
  const mine = useMemo(() => new Map((record.ahead ?? []).filter(a => a.from === month).map(a => [a.budgetId, a.amount])), [record.ahead, month]);
  const [draft, setDraft] = useState<Record<string, string>>({}), [problem, setProblem] = useState('');
  if (!rows.length) return <p className="fine">Once a budget runs in {formatMonth(next)}, part of this month’s ready money can be set aside for it here.</p>;
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const amounts = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, readAmount(v)]));
    const left = new Map(ready.filter(r => r.status === 'ok').map(r => [r.currency, r.status === 'ok' ? r.ready : 0]));
    try {
      setAside(record, month, amounts, left, new Date().toISOString(), () => 'x'); // check first, in words
      void changeWithUndo(onChange, r => setAside(r, month, amounts, left, new Date().toISOString(), () => `a_${crypto.randomUUID().slice(0, 12)}`), `Set aside for ${formatMonth(next)}: those budgets start covered.`, {undone: 'Nothing set aside any more.', undoLabel: 'Undo setting aside'}).then(() => setDraft({}));
    } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }
  };
  return <form className="money-r6" noValidate onSubmit={save} aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Set aside for {formatMonth(next)}</h4>
    <p className="fine">Give part of this month’s ready money to next month’s budgets now. It is held this month and covers them in {formatMonth(next)}, so that month does not ask for it again. Up to each budget’s own amount.</p>
    {ready.map(r => <p key={r.currency} className="fine">{r.status === 'ok' ? `Ready to assign now in ${r.currency}: ${moneyCents(Math.max(0, r.ready), r.currency)}${r.ready < 0 ? ' (your budgets hold more than the income logged)' : ''}.` : `No income logged this month in ${r.currency}, so nothing can be set aside in it yet.`}</p>)}
    <fieldset className="money-r6-group"><legend>Amounts for {formatMonth(next)}</legend>
      {rows.map(r => <label key={r.budget.id} className="money-r6-field"><span>{r.budget.category} ({r.budget.currency}) — its amount there {moneyCents(r.next, r.budget.currency)}{r.covered ? `, ${moneyCents(r.covered, r.budget.currency)} set aside` : ''}</span>
        <input inputMode="decimal" autoComplete="off" value={draft[r.budget.id] ?? (mine.get(r.budget.id) ?? '')} placeholder="0" onChange={e => setDraft(d => ({...d, [r.budget.id]: e.target.value}))} aria-describedby={problem ? `${id}-p` : undefined}/></label>)}
    </fieldset>
    {problem && <p role="alert" id={`${id}-p`}>{problem}</p>}
    <p><button type="submit" className="secondary">Set aside</button></p>
  </form>;
}

const EVERY: Record<Paycheck['every'], string> = {month: 'Every month', week: 'Every week', fortnight: 'Every two weeks'};
const weekdayName = (d: number) => formatWeekdayLong(addLocalDays('2024-01-07', d)); // 7 Jan 2024 was a Sunday
const whenWords = (p: Paycheck) => p.every === 'month' ? `${EVERY.month}, day ${p.day}` : `${EVERY[p.every]}, ${weekdayName(p.day)}${p.every === 'fortnight' && p.from ? ` (paid ${formatDate(p.from, {year: false})})` : ''}`;

/** #426: each paycheck's own plan for the month shown: what it holds, what is set against it, what is left. */
export function PaycheckPlan({record, month, today, currencies}: {record: BudgetsRecord; month: string; today: string; currencies: readonly string[]}) {
  const id = useId(), plan = useDeviceRecord(BUDGET_PERIODS), bills = useDeviceRecord(BILLS), head = useRef<HTMLHeadingElement>(null);
  const view = useMemo(() => paycheckMonth(record, bills.data, plan.data, month, today), [record, bills.data, plan.data, month, today]);
  const [name, setName] = useState(''), [every, setEvery] = useState<Paycheck['every']>('month'), [day, setDay] = useState(1), [amount, setAmount] = useState(''), [currency, setCurrency] = useState(currencies[0] ?? 'EUR'), [problem, setProblem] = useState('');
  const [payday, setPayday] = useState(''); // Review B6O-7: a two-weekly paycheck's next payday, which says which week it is paid
  if (!plan.loaded) return null;
  const items = plan.data.paychecks?.items ?? [], lines = plan.data.paychecks?.lines ?? {};
  const shownPayday = payday && isDay(payday) ? payday : nextFortnightPayday(5, today); // B6O-7: as paydays fell before, until chosen
  const write = (fn: Parameters<typeof plan.update>[0], said: string, undo = true) => {
    if (plan.unreadable) { showStatus('Your pay periods could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    let before = plan.data, after = plan.data;
    try { after = plan.update(latest => { before = latest; return fn(latest); }); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; }
    // Review B6O-12: Undo reverts only what this change made, into the latest record, keeping every change since.
    if (undo) showUndo({message: said, undone: 'Put back as it was.', restore: () => { plan.update(latest => revertPaychecks(latest, before, after)); }}); else showStatus(said);
    return true;
  };
  const add = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const from = every === 'fortnight' ? shownPayday : undefined;
    if (write(p => savePaycheck(p, {name, every, day, amount: readAmount(amount), currency, ...(from ? {from} : {})}, `p_${crypto.randomUUID().slice(0, 12)}`), `Paycheck “${name.trim()}” added.`)) { setName(''); setAmount(''); setPayday(''); }
  };
  const all = [...view.plans.flatMap(p => p.lines), ...view.unset];
  return <div className="money-r6" role="group" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`} ref={head} tabIndex={-1}>Each paycheck’s plan, {formatMonth(month)}</h4>
    <p className="fine">Paid more than once a month? Add each paycheck with what it brings in, then set each budget and bill against the paycheck that pays it. Your own amounts only.</p>
    {view.plans.length ? <ul className="money-r6-list" aria-label="Your paychecks this month">{view.plans.map(p => <li key={p.paycheck.id}>
      <span className="money-r6-what"><strong>{p.paycheck.name}</strong><span className="fine"> · {whenWords(p.paycheck)} · {p.dates.length ? p.dates.map(d => formatDate(d, {weekday: true, year: false})).join(', ') : 'not this month'}</span><br/>
        <span data-private-amount="">holds {moneyCents(p.holds, p.paycheck.currency)} · set against it {moneyCents(p.covered, p.paycheck.currency)} ({p.lines.length} {p.lines.length === 1 ? 'line' : 'lines'}) · {p.left >= 0 ? `${moneyCents(p.left, p.paycheck.currency)} left once they are covered` : `${moneyCents(-p.left, p.paycheck.currency)} more set against it than it holds`}</span></span>
      <span className="money-r6-actions"><button type="button" className="quiet" aria-label={`Remove the paycheck ${p.paycheck.name}`} onClick={() => { write(x => removePaycheck(x, p.paycheck.id), `Paycheck “${p.paycheck.name}” removed; its lines are set against none.`); requestAnimationFrame(() => head.current?.focus()); }}>Remove</button></span>
    </li>)}</ul> : <p className="fine">No paychecks yet. Add one for each payday, such as “1st of the month” and “15th”.</p>}
    {items.length > 0 && all.length > 0 && <fieldset className="money-r6-group"><legend>Paid from</legend>
      {all.map(l => <label key={l.key} className="money-r6-field"><span>{l.kind === 'bill' ? 'Bill' : 'Budget'}: {l.name} · {moneyCents(l.cents, l.currency)}{l.due ? ` · due ${l.due.map(d => formatDate(d, {year: false})).join(', ')}` : ''}</span>
        <select value={lines[l.key] ?? ''} onChange={e => write(x => setLine(x, l.key, e.target.value || null), e.target.value ? `${l.name}: paid from ${items.find(p => p.id === e.target.value)?.name ?? 'that paycheck'}.` : `${l.name}: set against no paycheck.`, false)}>
          <option value="">No paycheck</option>{items.filter(p => p.currency === l.currency).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}
    </fieldset>}
    {view.unset.length > 0 && items.length > 0 && <p className="fine">Not set against a paycheck yet: {view.unset.map(l => `${l.name} ${moneyCents(l.cents, l.currency)}`).join(' · ')}.</p>}
    {items.length < 6 && <form className="money-r6-group" noValidate onSubmit={add} aria-label="Add a paycheck">
      <label className="money-r6-field"><span>Name</span><input value={name} maxLength={40} autoComplete="off" placeholder="1st of the month" onChange={e => setName(e.target.value)}/></label>
      <label className="money-r6-field"><span>Comes in</span><select value={every} onChange={e => { const v = e.target.value as Paycheck['every']; setEvery(v); setDay(v === 'month' ? 1 : 5); }}>{(['month', 'week', 'fortnight'] as const).map(k => <option key={k} value={k}>{EVERY[k]}</option>)}</select></label>
      {every === 'month' ? <label className="money-r6-field"><span>Day of the month</span><select value={day} onChange={e => setDay(Number(e.target.value))}>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        : every === 'fortnight' ? <label className="money-r6-field"><span>Next payday</span><input type="date" value={shownPayday} min={addLocalDays(today, -366)} max={addLocalDays(today, 366)} aria-describedby={`${id}-payday`} onChange={e => setPayday(e.target.value)}/><span className="fine" id={`${id}-payday`}>Every other {weekdayName(localWeekday(shownPayday))} from this day, before and after it.</span></label>
        : <label className="money-r6-field"><span>Weekday</span><select value={day} onChange={e => setDay(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{weekdayName(d)}</option>)}</select></label>}
      <label className="money-r6-field"><span>What it brings in</span><input inputMode="decimal" autoComplete="off" value={amount} placeholder={fromCents(125000)} onChange={e => setAmount(e.target.value)}/></label>
      <label className="money-r6-field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{[...new Set([...currencies, 'EUR', 'USD', 'GBP', 'CHF'])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      {problem && <p role="alert">{problem}</p>}
      <p><button type="submit" className="secondary">Add the paycheck</button></p>
    </form>}
  </div>;
}
