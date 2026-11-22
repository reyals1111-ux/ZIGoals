'use client';
import {removeWithUndo} from '../../ui/remove-with-undo';
import {ShowcaseTag} from '../../ui/showcase-tag';
import {Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {EXPENSE_CATEGORIES, MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {budgetIssue, carriesInto, monthKey, monthView, removeBudget, setBudget, shiftMonth, startFresh, type BudgetRow} from '../../../lib/budgets/engine';
import {showUndo} from '../../ui/undo-toast';
import {BUDGETS, type BudgetsRecord} from '../../../lib/budgets/schema';
import {budgetPace, paceWords} from '../../../lib/budgets/pace';
import './budgets.css';
// Session AK (BUILD list 2 #19): a sum in the amount field ("300+45,50") is worked out and that amount is saved.
import {amountProblem, resolveAmountText} from '../../../lib/money-calc/expression';
import {CalcHint} from '../../money-calc/calc-hint';
import '../../money-select/money-select.css';
import {parseNumberInput} from '../../../lib/numbers/parse';
import {useMoneyCurrency} from '../use-money-currency';
import {categoryChoices} from '../../../lib/money-log/counted';
// Session AP (feature 3): Ready to assign, its own chunk.
const ReadyToAssign = lazy(() => import('./ready-to-assign'));
// Session AV lane 2, round 3 (money; PocketGuard's Leftover, LEDGER #291, #292): Left this month, each part listed (lazy).
const LeftThisMonth = lazy(() => import('./left-this-month'));
// Session AV (owner follow-up 1, F-WATCH): categories watched without a budget.
const WatchList = lazy(() => import('./watch-list'));
// Session AV lane 2 (Money N11, LEDGER #212, #213, #216; Goodbudget): pay periods, a paycheck fill, debts paid from a budget.
const BudgetPeriodsPanel = lazy(() => import('./budget-periods'));
// Session AV (follow-up 1, F-MONTH-RECAP): a month in short, loaded when its fold opens.
const MonthRecapView = lazy(() => import('./month-recap'));
// Session AV lane 2 (money): watched payees, challenges, budgets on Today, and the year in review (each lazy).
const BudgetExtras = lazy(() => import('./budget-extras'));
// Session AV lane 2 (money; YNAB's assign mode and targets, Monarch's flex and non-monthly budgets): "Plan <month>" (lazy).
const AssignPanel = lazy(() => import('./assign-panel'));
// Session AV lane 2, round 2 (money; Emma's Spaces): the business space's own budgets and entries.
import SpaceSwitch, {useMoneySpace} from '../spending/space-switch';
import {budgetsSpec, logSpec} from '../../../lib/money-more/spaces';
const YearRecapView = lazy(() => import('./year-recap'));
// Session AV lane 2, round 2 (money; Spendee, Wallet): your own budgets on a tag or chosen categories, each month or once (lazy).
const OwnBudgets = lazy(() => import('./own-budgets'));
import {perDayWords} from '../../../lib/budgets/per-day';

/**
 * Session AK (7.7): category budgets, one month at a time, against the money log. Each row is the month's amount, plus
 * what earlier months left unspent when rollover is on, minus what the log shows spent. Kept in its own device key
 * (`zigoals:budgets:v1`); the weekly room to spend above is unchanged. Information, not advice. Lazy-loaded.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const money = (cents: number, currency: string) => moneyCents(cents, currency); // Session AL (PRIMITIVES 3f)
const readAmount = (raw: string) => { const r = parseNumberInput(raw), v = r.ok ? r.text : raw.trim(); return /^\d{1,10}(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? Number(v).toFixed(2) : v; }; // Session AL (PRIMITIVES 3f): the one number reader (decimal commas, unambiguous grouping)

/**
 * Session AV (F-BUDGET-TARGETS): a budget's target in words, under its name. Information, not advice.
 * Session AV (fresh-agent check q2, rank 9): in the month still running, what is left is "left so far", not yet set
 * aside (the month has days to go); a finished month's is set aside.
 */
function TargetLine({row, current, onStop}: {row: BudgetRow; current: boolean; onStop: () => void}) {
  const t = row.target!, m = (c: number) => money(c, row.currency), goal = `${m(t.amount)} by ${formatMonth(t.by)}`, kept = current ? 'left so far' : 'set aside';
  const words = t.state === 'reached' ? `Target ${goal}: reached, ${m(t.setAside)} ${kept}.`
    : t.state === 'past' ? `Target ${goal}: that month has gone by; ${m(t.toGo)} was still to go.`
    : t.monthsLeft === 0 ? `Target ${goal}: this is the month; ${m(t.toGo)} still to go.`
    : `Target ${goal}: ${m(t.setAside)} ${kept}, ${m(t.toGo)} to go — ${m(t.perMonth)} a month from next month${t.state === 'on-track' ? ` (you budget ${m(row.budgeted)}: on track)` : ` (you budget ${m(row.budgeted)}: ${m(t.short)} a month short)`}.`;
  return <span className={`budgets-target is-${t.state}`}><small>{words}</small>{current && <button type="button" className="text-link budgets-target-stop" data-focus-key={`${row.id}-stop`} onClick={onStop}>Stop the target</button>}</span>;
}
/** Session AV (fresh-agent check q2, rank 9; YNAB adds a target to a category): a target added to a budget already kept. */
function AddTarget({row, thisMonth, onSave, onCancel}: {row: BudgetRow; thisMonth: string; onSave: (target: {amount: string; by: string}) => string | null; onCancel: () => void}) {
  const id = useId(), [open, setOpen] = useState(false), [amount, setAmount] = useState(''), [by, setBy] = useState(''), [problem, setProblem] = useState('');
  if (!open) return <button type="button" data-focus-key={`${row.id}-add`} className="text-link budgets-target-stop" aria-expanded={false} onClick={() => setOpen(true)} aria-label={`Add a target to the ${row.category} budget`}>Add a target</button>;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = onSave({amount: readAmount(resolveAmountText(amount) ?? amount), by});
    if (issue) { setProblem(issue); return; }
    setOpen(false);
  };
  return <form className="budgets-target-fields budgets-target-add" onSubmit={submit} aria-label={`Add a target to the ${row.category} budget`}>
    <label className="field"><span>Amount to reach</span><input inputMode="decimal" autoComplete="off" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="1200" aria-describedby={problem ? `${id}-problem` : undefined}/></label>
    <label className="field"><span>By the end of</span><input type="month" min={thisMonth} value={by} onChange={e => setBy(e.target.value)}/></label>
    <p className="fine">Rollover turns on, so what is left each month adds up.</p>
    {problem && <p role="alert" id={`${id}-problem`}>{problem}</p>}
    <div className="budgets-form-actions"><button type="submit" className="secondary">Save target</button><button type="button" className="quiet" onClick={() => { setOpen(false); setProblem(''); onCancel(); }}>Cancel</button></div>
  </form>;
}
export type BudgetsViewProps = {/** Session AV lane 2, round 2 (money; Emma's Spaces): the space shown. */ space?: 'personal' | 'business'; record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; showcase?: boolean; unreadable?: boolean; onChange: (change: (current: BudgetsRecord) => BudgetsRecord) => void; /** Session AV lane 2 (money): the categories offered, with the person's own. */ categories?: readonly string[]};
export function BudgetsView({space = 'personal', record, entries, today, showcase = false, unreadable = false, onChange, categories = EXPENSE_CATEGORIES}: BudgetsViewProps) {
  const id = useId(), thisMonth = monthKey(today);
  const [month, setMonth] = useState(thisMonth), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const startCurrency = useMoneyCurrency(); // Session AL (P-DVR-22): the one default currency, never a fixed EUR
  const [category, setCategory] = useState<string>('Groceries'), [picked, setCurrency] = useState<string | null>(null), currency = picked ?? startCurrency, [amount, setAmount] = useState(''), [rollover, setRollover] = useState(false);
  // Session AK RB (RELEASE_REVIEW_2 R2-8): the form opens from its button (an empty Wealth showed every form in full).
  const [adding, setAdding] = useState(false);
  // Session AV (follow-up 1, F-BUDGET-TARGETS): an optional amount to save towards by a month.
  const [wantTarget, setWantTarget] = useState(false), [targetAmount, setTargetAmount] = useState(''), [targetBy, setTargetBy] = useState('');
  const view = useMemo(() => monthView(entries, record, month, today), [entries, record, month, today]);
  // Session AV (fresh-agent check q2, rank 9): adding or stopping a target replaces the button pressed, so focus moves to
  // the control that takes its place ("Stop the target" or "Add a target") instead of dropping to the page.
  const [focusKey, setFocusKey] = useState<string | null>(null), table = useRef<HTMLTableElement>(null);
  useEffect(() => { if (!focusKey) return; const el = table.current?.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`); if (el) { el.focus(); setFocusKey(null); } }, [focusKey, view]);
  // Session AV (owner follow-up 1, F-MONTH-RECAP, F-FRESH-MONTH): last month (or the month shown) in short, and a fresh start.
  const [recapOpen, setRecapOpen] = useState(false), recapMonth = month === thisMonth ? shiftMonth(thisMonth, -1) : month;
  const [yearOpen, setYearOpen] = useState(false);
  const usedCurrencies = useMemo(() => { const count = new Map<string, number>(); for (const e of entries) count.set(e.currency, (count.get(e.currency) ?? 0) + 1); const used = [...count].sort((x, y) => y[1] - x[1]).map(([c]) => c); return used.length ? used : [currency]; }, [entries, currency]);
  const safeChange = (fn: (r: BudgetsRecord) => BudgetsRecord) => { try { onChange(fn); } catch { setProblem('Not saved on this device.'); } };
  // Session AV (fresh-agent check q2, rank 49): shown in the Showcase too (Undo is there); after the change the button is
  // gone, so focus moves to the month heading rather than dropping to the page.
  const canFresh = month === thisMonth && carriesInto(record, entries, thisMonth), heading = useRef<HTMLHeadingElement>(null);
  const fresh = () => { const before = record; change(r => startFresh(r, thisMonth), ''); setStatus(''); showUndo({message: `${formatMonth(thisMonth)} starts fresh: nothing earlier carries into it.`, undone: 'What earlier months left carries in again.', restore: () => onChange(() => before)}); heading.current?.focus(); };
  // Session AO (C-LS-20): Remove offers the app's one Undo toast (components/ui/remove-with-undo.ts).
  const change = (fn: (r: BudgetsRecord) => BudgetsRecord, done: string) => { setProblem(''); try { onChange(fn); setStatus(done); } catch (cause) { setStatus(''); setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); } };
  const save = (event: FormEvent) => {
    event.preventDefault();
    // Session AK lane EXF (EX-9): a sum's own reason, or "too large" for a plain amount above a billion.
    const sumIssue = amountProblem(amount);
    if (sumIssue) { setProblem(sumIssue); return; }
    const target = wantTarget ? {amount: readAmount(resolveAmountText(targetAmount) ?? targetAmount), by: targetBy} : undefined;
    const input = {category, currency, monthly: readAmount(resolveAmountText(amount) ?? amount), rollover: rollover || wantTarget, ...(target ? {target} : {})}, issue = budgetIssue(input);
    if (issue) { setProblem(issue); return; }
    if (target && target.by < thisMonth) { setProblem('Choose this month or a later one to reach it by.'); return; }
    change(r => setBudget(r, input, crypto.randomUUID(), thisMonth), `Budget for ${category} saved: ${money(Math.round(Number(input.monthly) * 100), currency)} a month${input.rollover ? ', with rollover' : ''}${target ? `, saving towards ${money(Math.round(Number(target.amount) * 100), currency)} by ${formatMonth(target.by)}` : ''}.`);
    setAmount(''); setAdding(false); setWantTarget(false); setTargetAmount(''); setTargetBy('');
  };
  return <div className="budgets-body">
    {showcase && <p className="fine"><ShowcaseTag/> Fictional Showcase entries.</p>}
    {unreadable && <p role="alert">This device&rsquo;s budgets could not be read; nothing was changed.</p>}
    <div className="budgets-month-nav" role="group" aria-label="Month">
      <button type="button" className="quiet" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
      <h3 id={`${id}-month`} ref={heading} tabIndex={-1} aria-live="polite">{formatMonth(month)}</h3>
      <button type="button" className="quiet" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
    </div>
    <Suspense fallback={null}><ReadyToAssign entries={entries} record={record} month={month} current={month === thisMonth}/></Suspense>
    {month === thisMonth && space === 'personal' && <Suspense fallback={null}><LeftThisMonth entries={entries} record={record} today={today} showcase={showcase}/></Suspense>}
    {view.totals.map(t => <p key={t.currency} className="budgets-total"><strong>{t.left >= 0 ? money(t.left, t.currency) : money(-t.left, t.currency)}</strong> {t.left >= 0 ? 'left' : 'over'} of {money(t.available, t.currency)} budgeted{view.daysLeft !== null ? ` · ${view.daysLeft === 1 ? 'last day of the month' : `${view.daysLeft} days to go`}` : ''}</p>)}
    {canFresh && <p className="budgets-fresh"><button type="button" className="quiet" onClick={fresh}>Start this month fresh</button> <small className="fine">What earlier months left stops carrying into {formatMonth(thisMonth)}; Undo brings it back.</small></p>}
    {/* Session AV (fresh-agent check q2, ranks 9 and 37): the pace and target lines, the target buttons and Remove sit in
        their own full-width row under each budget, so a phone's narrow Category cell never breaks a name or a sentence a
        word per line; amounts never wrap. */}
    {view.rows.length ? <div className="budgets-table-wrap"><table ref={table} className="budgets-table" aria-labelledby={`${id}-month`}>
      <thead><tr><th scope="col">Category</th><th scope="col">Spent</th><th scope="col">Available</th><th scope="col">Left</th></tr></thead>
      {view.rows.map(r => { const p = budgetPace(r, month, today), w = p && paceWords(p, `${money(r.left, r.currency)} left`), current = month === thisMonth; return <tbody key={r.id} className={r.over ? 'budgets-over' : undefined}><tr className="budgets-main">
        <th scope="row"><span className="budgets-cat">{r.category}</span><span className="budgets-bar" aria-hidden="true"><span style={{width: `${Math.round(r.share * 100)}%`}}/></span></th>
        <td className="budgets-num">{money(r.spent, r.currency)}</td>
        <td className="budgets-num">{money(r.available, r.currency)}{r.carried > 0 && <small className="fine"> incl. {money(r.carried, r.currency)} rolled over</small>}</td>
        <td className="budgets-num">{r.left >= 0 ? money(r.left, r.currency) : <>{money(-r.left, r.currency)} over</>}</td>
      </tr><tr className="budgets-detail"><td colSpan={4}>
        <span className="visually-hidden">{r.category}: </span>
        {w ? <small className={`budgets-pace is-${p!.state}`}>{w}</small> : null}{/* Session AV (F-BUDGET-PACE) */}
        {/* Session AV lane 2, round 2 (money; Spendee's daily amount left): on every row of the month still running with money left. */}
        {current && view.daysLeft !== null && p?.state !== 'near' && (d => d && <small className="budgets-per-day">{d}.</small>)(perDayWords(r.left, view.daysLeft, money, r.currency))}
        {r.target && <TargetLine row={r} current={current} onStop={() => { setFocusKey(`${r.id}-add`); change(x => setBudget(x, {category: r.category, currency: r.currency, monthly: (r.budgeted / 100).toFixed(2), rollover: r.rollover, target: null}, r.id, thisMonth), `The target for ${r.category} is off; the budget stays.`); }}/>}
        <span className="budgets-row-actions">
          {!r.target && current && <AddTarget row={r} thisMonth={thisMonth} onSave={target => { const input = {category: r.category, currency: r.currency, monthly: (r.budgeted / 100).toFixed(2), rollover: true, target}, issue = budgetIssue(input) ?? (target.by < thisMonth ? 'Choose this month or a later one to reach it by.' : null); if (issue) return issue; change(x => setBudget(x, input, r.id, thisMonth), `${r.category} now saves towards ${money(Math.round(Number(target.amount) * 100), r.currency)} by ${formatMonth(target.by)}, with rollover.`); setFocusKey(`${r.id}-stop`); return null; }} onCancel={() => setFocusKey(`${r.id}-add`)}/>}
          <button type="button" className="quiet" onClick={() => { setProblem(''); const said = `Budget for ${r.category} removed.`; void removeWithUndo(onChange, x => removeBudget(x, r.id), said, `The ${r.category} budget is back.`).then(() => setStatus(said), cause => { setStatus(''); setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }); }} aria-label={`Remove the ${r.category} budget in ${r.currency}`}>Remove</button>
        </span>
      </td></tr></tbody>; })}
    </table></div> : <p className="fine">No budgets for this month yet. Set one, for example Groceries at 300 a month.</p>}
    {view.unbudgeted.length > 0 && <p className="fine">Also spent this month, without a budget: {view.unbudgeted.slice(0, 6).map(u => `${u.category} ${money(u.spent, u.currency)}`).join(' · ')}.</p>}
    {!adding ? <p className="budgets-add"><button type="button" className="secondary" aria-expanded={false} onClick={() => { setAdding(true); setStatus(''); }}>+ Set a monthly budget</button></p>
    : <form className="budgets-form" onSubmit={save} aria-label="Set a monthly budget">
      <label className="field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>Each month</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300" aria-describedby={`${id}-calc`}/></label>
      <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <CalcHint value={amount} id={`${id}-calc`}/>
      <label className="budgets-check"><input type="checkbox" checked={rollover || wantTarget} disabled={wantTarget} onChange={e => setRollover(e.target.checked)}/><span>Roll over what is left unspent</span></label>
      <label className="budgets-check"><input type="checkbox" checked={wantTarget} onChange={e => setWantTarget(e.target.checked)} aria-controls={`${id}-target`}/><span>Save towards an amount by a month (rollover stays on, so what is left adds up)</span></label>
      {wantTarget && <div className="budgets-target-fields" id={`${id}-target`} role="group" aria-label="Target">
        <label className="field"><span>Amount to reach</span><input inputMode="decimal" autoComplete="off" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="1200"/></label>
        <label className="field"><span>By the end of</span><input type="month" min={thisMonth} value={targetBy} onChange={e => setTargetBy(e.target.value)}/></label>
      </div>}
      <div className="budgets-form-actions"><button type="submit" className="secondary">Save budget</button><button type="button" className="quiet" onClick={() => { setAdding(false); setProblem(''); }}>Cancel</button></div>
    </form>}
    {entries.length > 0 && <details className="budgets-recap-fold" onToggle={e => setYearOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>{today.slice(0, 4)} in review</summary>{yearOpen && <Suspense fallback={<p className="fine">Opening…</p>}><YearRecapView entries={entries} today={today}/></Suspense>}</details>}
    {(view.rows.length > 0 || entries.length > 0) && <details className="budgets-recap-fold" onToggle={e => setRecapOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>{formatMonth(`${recapMonth}-01`)} in short</summary>{recapOpen && <Suspense fallback={<p className="fine">Opening…</p>}><MonthRecapView entries={entries} record={record} month={recapMonth} today={today}/></Suspense>}</details>}
    <p className="budgets-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
    {!unreadable && space === 'personal' && <Suspense fallback={null}><BudgetPeriodsPanel record={record} entries={entries} today={today} startsOn="monday" onChange={onChange}/></Suspense>}
    {view.rows.length > 0 && month >= thisMonth && <Suspense fallback={null}><AssignPanel record={record} entries={entries} month={month} today={today} update={safeChange}/></Suspense>}
    <Suspense fallback={null}><WatchList record={record} entries={entries} today={today} currencies={usedCurrencies} onChange={safeChange}/></Suspense>
    <Suspense fallback={null}><OwnBudgets entries={entries} today={today} currencies={usedCurrencies} categories={categories} space={space}/></Suspense>
    <Suspense fallback={null}><BudgetExtras record={record} entries={entries} today={today} currencies={usedCurrencies} onChange={safeChange} space={space}/></Suspense>
    <p className="fine">From your own money log, in each currency apart. An overspend is never carried into the next month. Not financial advice.</p>
  </div>;
}
export default function BudgetsMonth({showcase = false}: {showcase?: boolean}) {
  const {space, ready} = useMoneySpace(), shown = showcase ? 'personal' : space;
  if (!ready) return <p className="fine" role="status">Loading your budgets…</p>;
  return <>{!showcase && <SpaceSwitch where="budgets"/>}<BudgetsSpace key={shown} showcase={showcase} space={shown}/></>;
}
function BudgetsSpace({showcase, space}: {showcase: boolean; space: 'personal' | 'business'}) {
  const budgets = useDeviceRecord(space === 'business' ? budgetsSpec('business') : BUDGETS), log = useDeviceRecord(space === 'business' ? logSpec('business') : MONEY_LOG), today = localDate();
  if (!budgets.loaded || !log.loaded) return <p className="fine" role="status">Loading your budgets…</p>;
  return <BudgetsView space={space} record={budgets.data} entries={log.data.entries} today={today} showcase={showcase} unreadable={budgets.unreadable} categories={categoryChoices(log.data, 'expense')} onChange={fn => { budgets.update(fn); }}/>;
}
