'use client';
import {Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {amountIssue, dateIssue} from '../../../lib/limits/plausibility';
import {addEntry, byCategory, fromCents, monthOf, removeEntry, roomToSpend, totals, weekOf} from '../../../lib/money-log/engine';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, MONEY_LOG, amountText, type MoneyEntry} from '../../../lib/money-log/schema';
import './spending.css';
// Session AK (lane M): rules on new entries, the review mark, and Money tools (its own chunk, loaded after this body).
import {MONEY_RULES} from '../../../lib/money-rules/schema';
import {applyRules} from '../../../lib/money-rules/engine';
import {MONEY_REVIEW} from '../../../lib/money-review/review';
// Session AK (BUILD list 2 #1): a calm line while a note looks like recovery words or a key.
import {SecretGuard} from '../../secret-guard/secret-guard';
const MoneyTools = lazy(() => import('../money-tools/money-tools'));
// Session AK (BUILD list 2 #6, #7, #18, #19): recent categories first, Select with a running total, the spending map
// (its own chunk, on "Map"), and a calculator in the amount fields. Pure parts in lib/; nothing new is stored.
import {categoriesRecentFirst} from '../../../lib/recent-categories/recent';
import {selectionLine, summarizeSelection} from '../../../lib/money-log/selection';
import {evaluateAmount, isExpression, resolveAmountText} from '../../../lib/money-calc/expression';
import {CalcHint} from '../../money-calc/calc-hint';
import {MONEY_DRAFT_EVENT, type MoneyDraft} from '../../money-photos/draft-event';
import '../../money-select/money-select.css';
const SpendingMap = lazy(() => import('../../spending-map/spending-map'));

/**
 * Session AI (B3 competitor gap; feature 5's numbers): the expense and income log with a weekly "room to spend". Logged
 * here by hand, from ZIGi's card or from a quick line; kept on this device, in Export everything and the backup. Every
 * figure is the person's own entries in their own currency, never converted; no advice and no projection.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const money = (cents: number, currency: string) => new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(cents / 100);
const readAmount = (raw: string): string | null => { const resolved = resolveAmountText(raw); if (resolved === null) return null; const v = resolved.trim().replace(/\s/g, '').replace(',', '.'); return amountText.safeParse(v).success ? Number(v).toFixed(2) : null; };
/** Session AK (#19): why a typed sum cannot be saved, in its own words; null when it is not a sum. */
const sumProblem = (raw: string): string | null => { if (!isExpression(raw)) return null; const out = evaluateAmount(raw); return out.ok ? null : out.reason; };
export default function SpendingSection({showcase = false}: {showcase?: boolean}) {
  const log = useDeviceRecord(MONEY_LOG), today = localDate(), id = useId(), rules = useDeviceRecord(MONEY_RULES), review = useDeviceRecord(MONEY_REVIEW);
  const toReview = useMemo(() => new Set(review.data.ids), [review.data.ids]);
  const [kind, setKind] = useState<'expense' | 'income'>('expense'), [amount, setAmount] = useState(''), [category, setCategory] = useState<string>('Food & drink');
  const [note, setNote] = useState(''), [date, setDate] = useState(today), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const [undo, setUndo] = useState<MoneyEntry | null>(null), [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const currency = log.data.currency ?? log.data.budget?.currency ?? 'EUR';
  const [cur, setCur] = useState<string | null>(null), chosen = cur ?? currency;
  const room = useMemo(() => roomToSpend(log.data, today), [log.data, today]);
  const week = weekOf(today, log.data.weekStartsOn), month = monthOf(today);
  const weekEntries = useMemo(() => log.data.entries.filter(e => e.date >= week.start && e.date <= today).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [log.data.entries, week.start, today]);
  const monthCats = useMemo(() => byCategory(log.data.entries, month.start, month.end), [log.data.entries, month.start, month.end]);
  const monthTotals = useMemo(() => totals(log.data.entries, month.start, month.end), [log.data.entries, month.start, month.end]);
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem(''); setStatus('');
    const value = readAmount(amount);
    if (!value) return setProblem(sumProblem(amount) ?? 'Enter an amount above zero, with at most two decimals (for example 12.50).');
    const issue = amountIssue(Number(value)) ?? dateIssue(date, today);
    if (issue) return setProblem(issue);
    const typed: MoneyEntry = {id: crypto.randomUUID(), kind, amount: value, currency: chosen, category, ...(note.trim() ? {note: note.trim().slice(0, 200)} : {}), date, createdAt: new Date().toISOString(), source: 'form'};
    // Session AK (lane M, item 1): the person's rules run on a new entry too (first match wins); the status names it.
    const ruled = applyRules([typed], rules.data.rules), entry = ruled.entries[0]!, byRule = ruled.changes.length > 0;
    try { log.update(current => addEntry(current, entry)); } catch { return setProblem('This could not be saved on this device. Nothing was changed.'); }
    setAmount(''); setNote(''); setStatus(`${kind === 'expense' ? 'Spent' : 'Received'} ${money(Math.round(Number(value) * 100), chosen)} · ${entry.category} · saved${byRule ? ' (set by one of your rules)' : ''}.`);
  };
  const remove = (entry: MoneyEntry) => { try { log.update(current => removeEntry(current, entry.id)); setUndo(entry); setStatus('Removed.'); } catch { setStatus('This could not be removed on this device.'); } };
  const undoRemove = () => { if (!undo) return; try { log.update(current => addEntry(current, undo)); setStatus('Put back.'); } catch { setStatus('This could not be put back.'); } setUndo(null); };
  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    const raw = budgetDraft ?? '';
    if (!raw.trim()) { log.update(current => { const {budget: _drop, ...rest} = current; void _drop; return rest; }); setBudgetDraft(null); setStatus('Weekly budget removed.'); return; }
    const value = readAmount(raw); if (!value) return setProblem(sumProblem(raw) ?? 'Enter the weekly budget as an amount above zero.');
    log.update(current => ({...current, budget: {weekly: value, currency: chosen}})); setBudgetDraft(null); setStatus(`Weekly budget set: ${money(Math.round(Number(value) * 100), chosen)}.`);
  };
  const share = room ? Math.max(0, Math.min(1, room.spent / Math.max(1, room.budget))) : 0, r = 46, circumference = 2 * Math.PI * r;
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  // Session AK (#6): the three most used in the last 30 days first, then the usual order (counted, never stored).
  const ordered = useMemo(() => categoriesRecentFirst(log.data.entries, kind, categories, today), [log.data.entries, kind, categories, today]);
  // Session AK (#7): Select mode on this week's list, with the running total of the picked entries.
  const [selecting, setSelecting] = useState(false), [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const pickedSummary = useMemo(() => summarizeSelection(weekEntries, picked), [weekEntries, picked]);
  const togglePick = (entryId: string) => setPicked(current => { const next = new Set(current); if (!next.delete(entryId)) next.add(entryId); return next; });
  // Session AK (#18): this month as a list (as before) or as a map.
  const [monthView, setMonthView] = useState<'list' | 'map'>('list');
  // Session AK (#10): a draft from a receipt photo (Money tools → Receipt photos) fills this form; nothing is saved until Save.
  const amountField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const take = (event: Event) => {
      const d = (event as CustomEvent<MoneyDraft>).detail ?? {};
      setKind('expense'); setProblem('');
      if (d.amount) setAmount(d.amount);
      if (d.date) setDate(d.date);
      if (d.payee) setNote(d.payee.slice(0, 200));
      if (d.currency) setCur(d.currency);
      setStatus('A draft from your receipt photo is in the form. Check it, then Save.');
      amountField.current?.focus();
    };
    window.addEventListener(MONEY_DRAFT_EVENT, take);
    return () => window.removeEventListener(MONEY_DRAFT_EVENT, take);
  }, []);
  if (!log.loaded) return <p className="fine">Loading your spending…</p>;
  return <div className="spending-body">
    {showcase && <p className="fine spending-showcase">Fictional Showcase entries.</p>}
    {log.unreadable && <p role="alert">This device&rsquo;s spending log could not be read; new entries start a fresh one.</p>}
    <div className="spending-top">
      <div className="spending-room" role="group" aria-label="Room to spend this week">
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false" className="spending-ring">
          <circle cx="60" cy="60" r={r} className="spending-ring-track"/>
          {room && <circle cx="60" cy="60" r={r} className={`spending-ring-fill${room.left < 0 ? ' spending-ring-over' : ''}`} strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 60 60)"/>}
        </svg>
        <div className="spending-room-text">
          {room ? <><strong>{room.left >= 0 ? money(room.left, room.currency) : money(-room.left, room.currency)}</strong>
            <span>{room.left >= 0 ? `left of ${money(room.budget, room.currency)} this week` : `over this week's ${money(room.budget, room.currency)}`}</span>
            <span className="fine">{room.daysLeft === 1 ? 'Last day of the week' : `${room.daysLeft} days to go`} · spent {money(room.spent, room.currency)}</span></>
            : <><strong>No weekly budget</strong><span className="fine">Set one below to see your room to spend.</span></>}
        </div>
      </div>
      <form className="spending-form" onSubmit={save} aria-label="Log spending or income">
        <div className="spending-kind" role="radiogroup" aria-label="Kind">
          {(['expense', 'income'] as const).map(k => <label key={k} className="spending-chip"><input type="radio" name={`${id}-kind`} checked={kind === k} onChange={() => { setKind(k); setCategory(k === 'expense' ? 'Food & drink' : 'Salary'); }}/><span>{k === 'expense' ? 'Spent' : 'Received'}</span></label>)}
        </div>
        <div className="spending-row">
          <label className="field"><span>Amount</span><input ref={amountField} inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="12.50" aria-describedby={`${id}-calc`}/></label>
          <label className="field spending-currency"><span>Currency</span><select value={chosen} onChange={e => setCur(e.target.value)}>{[...new Set([currency, ...CURRENCIES])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="field"><span>Date</span><input type="date" value={date} max={today} min="1990-01-01" onChange={e => setDate(e.target.value)}/></label>
        </div>
        <CalcHint value={amount} id={`${id}-calc`}/>
        <fieldset className="spending-cats"><legend>Category</legend>{ordered.recent > 0 && <span className="fine spending-recent-note">Your most used lately come first.</span>}{ordered.chips.map(c => <label key={c} className="spending-chip"><input type="radio" name={`${id}-cat`} checked={category === c} onChange={() => setCategory(c)}/><span>{c}</span></label>)}</fieldset>
        <label className="field"><span>Note — optional</span><input maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="Lunch with Sam"/></label>
        <SecretGuard text={note} onRemove={() => setNote('')}/>
        {problem && <p role="alert">{problem}</p>}
        <button type="submit" className="primary">Save</button>
      </form>
    </div>
    <p className="spending-status" role="status" aria-live="polite">{status}{undo && <> <button type="button" className="text-link" onClick={undoRemove}>Undo</button></>}</p>
    <div className="spending-lists">
      <section aria-labelledby={`${id}-week`}>
        <div className="money-select-head"><h3 id={`${id}-week`}>This week</h3>
          {weekEntries.length > 0 && <span className="money-select-actions">
            {selecting && <button type="button" className="quiet" onClick={() => setPicked(picked.size === weekEntries.length ? new Set() : new Set(weekEntries.map(e => e.id)))}>{picked.size === weekEntries.length ? 'Clear' : 'Select all'}</button>}
            {/* A toggle keeps one name; its pressed state says whether Select mode is on (press it again to leave). */}
            <button type="button" className="quiet" aria-pressed={selecting} onClick={() => { setSelecting(v => !v); setPicked(new Set()); }}>Select</button>
          </span>}
        </div>
        {weekEntries.length ? <ul className={`spending-entries${selecting ? ' money-selecting' : ''}`}>{weekEntries.map(e => <li key={e.id}>
          {selecting && <label className="money-select-check"><input type="checkbox" checked={picked.has(e.id)} onChange={() => togglePick(e.id)} aria-label={`Select ${e.category} ${e.amount} ${e.currency} on ${formatDate(e.date)}`}/></label>}
          <span className="spending-entry-what">{toReview.has(e.id) && <span className="spending-review-dot" title="To review"><span className="visually-hidden">To review: </span></span>}<strong>{e.category}</strong>{e.note && <span className="fine"> · {e.note}</span>}<span className="fine"> · {e.date}</span></span>
          <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(Math.round(Number(e.amount) * 100), e.currency)}</span>
          <button type="button" className="text-link spending-remove" aria-label={`Remove ${e.category} ${e.amount} ${e.currency} on ${e.date}`} onClick={() => remove(e)}>Remove</button>
        </li>)}</ul> : <p className="fine">Nothing logged this week yet.</p>}
        {selecting && weekEntries.length > 0 && <p className="money-select-total" aria-live="polite">{selectionLine(pickedSummary, money)}{pickedSummary.totals.length > 1 ? <span className="fine"> · each currency on its own, never converted</span> : null}</p>}
      </section>
      <section aria-labelledby={`${id}-month`}>
        <div className="money-select-head"><h3 id={`${id}-month`}>This month by category</h3>
          {monthCats.length > 0 && <span className="money-select-actions" role="group" aria-label="Show this month as">
            <button type="button" className="quiet" aria-pressed={monthView === 'list'} onClick={() => setMonthView('list')}>List</button>
            <button type="button" className="quiet" aria-pressed={monthView === 'map'} onClick={() => setMonthView('map')}>Map</button>
          </span>}
        </div>
        {monthView === 'map' && monthCats.length > 0 ? <Suspense fallback={<p className="fine" aria-busy="true">Drawing the map…</p>}><SpendingMap entries={log.data.entries} from={month.start} to={month.end}/></Suspense> : monthCats.length ? <ul className="spending-bars">{monthCats.slice(0, 8).map(c => { const max = monthCats.filter(x => x.currency === c.currency)[0]!.total; return <li key={`${c.currency}-${c.category}`}>
          <span className="spending-bar-label">{c.category}</span><span className="spending-bar" aria-hidden="true"><span style={{width: `${Math.max(4, Math.round(100 * c.total / max))}%`}}/></span><span className="spending-amount">{money(c.total, c.currency)}</span></li>; })}</ul>
          : <p className="fine">No spending logged this month.</p>}
        {monthTotals.map(t => <p key={t.currency} className="fine">This month in {t.currency}: spent {money(t.expenses, t.currency)}, received {money(t.income, t.currency)}.</p>)}
      </section>
    </div>
    <form className="spending-budget" onSubmit={saveBudget} aria-label="Weekly budget">
      <label className="field"><span>Weekly budget ({chosen}) — leave empty for none</span><input inputMode="decimal" value={budgetDraft ?? (log.data.budget ? fromCents(Math.round(Number(log.data.budget.weekly) * 100)) : '')} onChange={e => setBudgetDraft(e.target.value)} aria-describedby={`${id}-budget-calc`}/></label>
      <CalcHint value={budgetDraft ?? ''} id={`${id}-budget-calc`}/>
      <label className="field"><span>Week starts on</span><select value={log.data.weekStartsOn} onChange={e => log.update(current => ({...current, weekStartsOn: e.target.value as 'monday' | 'sunday'}))}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
      <button type="submit" className="secondary">Save budget</button>
    </form>
    <p className="fine">Your own entries, kept on this device and in Export everything; amounts are never converted between currencies. Not financial advice.</p>
    {/* Session AK (lane M): buffer days, To review, Rules, Split an entry and the emergency sheet. */}
    {/* Session AK X1 (verification): while its chunk loads, Money tools says so (aria-busy, as Wealth's later parts do), so
        a reader of the page never takes the page without it for the whole page. */}
    <Suspense fallback={<div className="money-tools-loading" aria-busy="true" hidden/>}><MoneyTools showcase={showcase}/></Suspense>
  </div>;
}
