'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_MORE} from '../../lib/money-more/schema';
import {EXPENSE_CATEGORIES, type MoneyEntry} from '../../lib/money-log/schema';
import {addPlanned, plannedIssue, plannedStates, removePlanned} from '../../lib/cash-forecast/planned';
import {readMoneyAmount} from '../../lib/money-log/form';
import {minorUnits} from '../../lib/money-split/parts';
import {formatDate} from '../../lib/visual-format';
import {removeWithUndo} from '../ui/remove-with-undo';
import {moneyCents} from '../wealth/money-tools/format';
import {useMoneyCurrency} from '../wealth/use-money-currency';
import {plainErrorMessage} from '../../lib/plain-error';
import './planned.css';

/**
 * Session AV lane 2, round 3 (money; Simplifi's planned spending, LEDGER #292): "Planned one-off costs" — a name, an
 * amount and a day ("Birthday present €60 on the 14th") — kept in `zigoals:money-more:v1` `planned`. Each one counts in
 * the cash forecast and in Budgets → "Left this month" until an entry in the money log matches it (it then says where it
 * was seen) or the person clears it (with Undo). Its own chunk, opened from the forecast card and from Left this month.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
export default function PlannedCosts({entries, today, showcase = false}: {entries: readonly MoneyEntry[]; today: string; showcase?: boolean}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), start = useMoneyCurrency(), heading = useRef<HTMLHeadingElement>(null);
  const states = useMemo(() => plannedStates(more.data.planned, entries, today), [more.data.planned, entries, today]);
  const [name, setName] = useState(''), [amount, setAmount] = useState(''), [currency, setCurrency] = useState<string | null>(null), [date, setDate] = useState(today), [category, setCategory] = useState('');
  const [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  if (!more.loaded) return <p className="fine" aria-busy="true">Loading your planned costs…</p>;
  if (more.unreadable) return <p role="alert">Your planned costs could not be read on this device. Nothing was changed.</p>;
  const cur = currency ?? start, open = states.filter(s => s.state === 'open'), seen = states.filter(s => s.state === 'seen');
  const save = (e: FormEvent) => {
    e.preventDefault(); setStatus('');
    const amt = readMoneyAmount(amount), input = {name, amount: amt ?? amount, currency: cur, date, ...(category ? {category} : {})}, issue = plannedIssue(input);
    if (issue) { setProblem(issue); return; }
    try {
      more.update(m => addPlanned(m, input, crypto.randomUUID()));
      setStatus(`${name.trim()}: ${moneyCents(minorUnits(input.amount), cur)} on ${formatDate(date)} is counted in your forecast and in Left this month until your money log shows it or you clear it.`);
      setName(''); setAmount(''); setCategory(''); setProblem('');
    } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); }
  };
  const clear = (pid: string, label: string) => { void removeWithUndo(more.update, m => removePlanned(m, pid), `${label} cleared.`, `${label} is back.`).then(() => { setStatus(`${label} cleared: it no longer counts.`); heading.current?.focus(); }, () => setProblem('Not saved on this device.')); };
  return <section className="planned-costs" aria-labelledby={`${id}-title`}>
    <h5 id={`${id}-title`} ref={heading} tabIndex={-1}>Planned one-off costs</h5>
    {showcase && <p className="fine">Showcase: what you add here stays in this Showcase tab.</p>}
    {!states.length ? <p className="fine">Nothing planned yet. Add a cost you expect once — a birthday present, a car service, a trip&rsquo;s train tickets — and it counts in the forecast and in Left this month until your money log shows it or you clear it.</p>
      : <>
        {open.length > 0 && <ul className="planned-list" aria-label="Still to come">{open.map(s => <li key={s.cost.id}>
          <span><strong>{s.cost.name}</strong> {moneyCents(minorUnits(s.cost.amount), s.cost.currency)} · {formatDate(s.cost.date)}{s.cost.category ? ` · ${s.cost.category}` : ''}{s.overdue ? <span className="planned-note"> · its day has passed; still counted until you log it or clear it</span> : null}</span>
          <button type="button" className="quiet" aria-label={`Clear ${s.cost.name}`} onClick={() => clear(s.cost.id, s.cost.name)}>Clear</button>
        </li>)}</ul>}
        {seen.length > 0 && <ul className="planned-list planned-seen" aria-label="Seen in your money log">{seen.map(s => <li key={s.cost.id}>
          <span><strong>{s.cost.name}</strong> {moneyCents(minorUnits(s.cost.amount), s.cost.currency)} · seen in your money log on {formatDate(s.entry!.date)}{s.entry!.note ? ` (${s.entry!.note})` : ''}, so it no longer counts</span>
          <button type="button" className="quiet" aria-label={`Clear ${s.cost.name} from the list`} onClick={() => clear(s.cost.id, s.cost.name)}>Clear</button>
        </li>)}</ul>}
      </>}
    <form className="planned-form" onSubmit={save} aria-label="Add a planned cost" noValidate>
      <label className="field"><span>What</span><input maxLength={60} value={name} placeholder="Birthday present" onChange={e => { setName(e.target.value); setProblem(''); }}/></label>
      <label className="field"><span>Amount</span><input inputMode="decimal" autoComplete="off" value={amount} placeholder="60" onChange={e => { setAmount(e.target.value); setProblem(''); }}/></label>
      <label className="field"><span>Currency</span><select value={cur} onChange={e => setCurrency(e.target.value)}>{[...new Set([cur, ...CURRENCIES])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>On</span><input type="date" value={date} onChange={e => setDate(e.target.value)}/></label>
      <label className="field"><span>Category — optional</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">None</option>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <button type="submit" className="secondary">Add planned cost</button>
      {problem && <p role="alert" className="field-error">{problem}</p>}
    </form>
    <p className="fine planned-status" role="status" aria-live="polite">{status || 'It is seen in your money log when an expense of about that amount, near its day, has its name or its category.'}</p>
  </section>;
}
