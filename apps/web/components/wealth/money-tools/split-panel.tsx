'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {addLocalDays, localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, MAX_PARTS, type MoneyEntry, type MoneyLog} from '../../../lib/money-log/schema';
import {MIN_SPLIT, evenSplit, fromMinor, isSplit, minorUnits, setSplit, splitIssue, type PartDraft} from '../../../lib/money-split/parts';
import {plainErrorMessage} from '../../../lib/plain-error';
import {useMoneyGoals} from './use-money-goals';
import {money} from './format';

/**
 * Session AK (lane M, item 22): split one entry into 2 to 5 parts, each with a category and/or a Goal. The parts must add
 * up to the entry exactly (in cents); the line under the parts says how far off they are. Category totals and budgets
 * then count each part in its own category. "Make a rule" starts a rule from the chosen entry. Lazy-loaded by Money tools.
 */
const readAmount = (raw: string) => raw.trim().replace(/\s/g, '').replace(',', '.');
const label = (e: MoneyEntry) => `${formatDate(e.date)} · ${e.kind === 'income' ? '+' : '−'}${money(e.amount, e.currency)} · ${e.note || e.category}${isSplit(e) ? ' · split' : ''}`;
export default function SplitPanel({log, onMakeRule}: {log: DeviceRecordState<MoneyLog>; onMakeRule: (entry: MoneyEntry) => void}) {
  const id = useId(), today = localDate(), {goals, nameOf} = useMoneyGoals();
  const recent = useMemo(() => { const from = addLocalDays(today, -89); return log.data.entries.filter(e => e.date >= from && e.date <= today).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 200); }, [log.data.entries, today]);
  const [chosenId, setChosenId] = useState(''), [parts, setParts] = useState<PartDraft[]>([]), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const entry = recent.find(e => e.id === chosenId);
  const choose = (next: string) => {
    setChosenId(next); setProblem(''); setStatus('');
    const e = recent.find(x => x.id === next);
    if (!e) return setParts([]);
    setParts(isSplit(e) ? e.parts!.map(p => ({amount: p.amount, category: p.category, goalId: p.goalId})) : evenSplit(e.amount, 2).map((amount, i) => ({amount, category: i === 0 ? e.category : undefined})));
  };
  const setPart = (i: number, patch: Partial<PartDraft>) => setParts(ps => ps.map((p, j) => j === i ? {...p, ...patch} : p));
  const sum = parts.reduce((s, p) => { const a = readAmount(p.amount); return /^\d{1,10}(\.\d{1,2})?$/.test(a) ? s + minorUnits(a) : s; }, 0);
  const left = entry ? minorUnits(entry.amount) - sum : 0;
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem(''); setStatus('');
    if (!entry) return;
    const drafts = parts.map(p => ({...p, amount: readAmount(p.amount)})), issue = splitIssue(entry, drafts);
    if (issue) return setProblem(issue);
    try { log.update(current => setSplit(current, entry.id, drafts)); setStatus(`Split into ${drafts.length} parts. Totals and budgets count each part in its own category.`); }
    catch (cause) { setProblem(plainErrorMessage(cause, 'The split could not be saved on this device.')); }
  };
  const unsplit = () => {
    if (!entry) return;
    try { log.update(current => setSplit(current, entry.id, null)); setStatus('The split is removed; the entry counts whole again.'); setParts(evenSplit(entry.amount, 2).map((amount, i) => ({amount, category: i === 0 ? entry.category : undefined}))); }
    catch (cause) { setProblem(plainErrorMessage(cause, 'Not changed on this device.')); }
  };
  if (!log.loaded) return <p className="fine">Loading…</p>;
  const categories = entry ? (entry.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES) : EXPENSE_CATEGORIES;
  return <section className="money-panel" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Split an entry</h4>
    {recent.length ? <label className="field"><span>Entry from the last 90 days</span>
      <select value={chosenId} onChange={e => choose(e.target.value)}><option value="">Choose an entry</option>{recent.map(e => <option key={e.id} value={e.id}>{label(e)}</option>)}</select></label>
      : <p className="fine">Nothing logged in the last 90 days yet. Log or import an entry, then split it here (for example one shop of groceries and household things).</p>}
    {entry && <form className="money-form" onSubmit={save} aria-label="Parts of the entry">
      <p className="fine">The parts must add up to {money(entry.amount, entry.currency)} exactly.</p>
      <ol className="money-parts">{parts.map((p, i) => <li key={i}>
        <fieldset className="money-fieldset"><legend>Part {i + 1}</legend><div className="money-grid">
          <label className="field"><span>Amount ({entry.currency})</span><input inputMode="decimal" value={p.amount} onChange={e => setPart(i, {amount: e.target.value})}/></label>
          <label className="field"><span>Category</span><select value={p.category ?? ''} onChange={e => setPart(i, {category: e.target.value || undefined})}><option value="">Same as the entry ({entry.category})</option>{[...new Set([...(p.category ? [p.category] : []), ...categories])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="field"><span>Goal — optional</span><select value={p.goalId ?? ''} onChange={e => setPart(i, {goalId: e.target.value || undefined})}><option value="">No Goal</option>{p.goalId && !goals.some(g => g.id === p.goalId) && <option value={p.goalId}>{nameOf(p.goalId) ?? 'A Goal'}</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          {parts.length > MIN_SPLIT && <button type="button" className="quiet" onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} aria-label={`Remove part ${i + 1}`}>Remove</button>}
        </div></fieldset>
      </li>)}</ol>
      <p className="money-sum" aria-live="polite">{left === 0 ? 'The parts add up exactly.' : left > 0 ? `${money(fromMinor(left), entry.currency)} still to place.` : `${money(fromMinor(-left), entry.currency)} too much.`}</p>
      <div className="money-actions">
        {parts.length < MAX_PARTS && <button type="button" className="secondary" onClick={() => setParts(ps => [...ps, {amount: left > 0 ? fromMinor(left) : '0.00'}])}>Add a part</button>}
        <button type="button" className="secondary" onClick={() => setParts(ps => evenSplit(entry.amount, ps.length).map((amount, i) => ({...ps[i], amount})))}>Split evenly</button>
      </div>
      {problem && <p role="alert">{problem}</p>}
      <div className="money-actions">
        <button type="submit" className="primary">Save the split</button>
        {isSplit(entry) && <button type="button" className="quiet" onClick={unsplit}>Remove the split</button>}
        <button type="button" className="quiet" onClick={() => onMakeRule(entry)}>Make a rule from this entry</button>
      </div>
    </form>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
  </section>;
}
