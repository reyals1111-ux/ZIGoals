'use client';
import {useId, useState, type FormEvent} from 'react';
import {centsText, countdownWords, firstPaymentMonth, parseCents, addMonths, type PlanComparison, type PlanDebt, type PlanProgress, type PlanResult, type Strategy} from '../../lib/debt-planner/plan';
import {formatMonth} from '../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-DEBT-PLAN; Undebt.it): the debt planner's own order, one-off extra payments, the plan
 * month by month, and the kept plan against what is recorded — parts of components/wealth/debt-planner.tsx (the
 * planner's lazy chunk). Words say what is an estimate; nothing moves money; 44 px targets; no motion.
 */
export type DraftLump = {month: string; amount: string};
export const STRATEGY_WORDS: Record<Strategy, string> = {snowball: 'Snowball', avalanche: 'Avalanche', custom: 'Your order'};
export const countdownLine = (r: PlanResult) => r.months === null ? null : `in ${countdownWords(r.months)}`;

/** "Your order": the debts in the order the extra goes to, each with Move up / Move down. */
export function OrderEditor({debts, order, onChange}: {debts: readonly PlanDebt[]; order: readonly string[] | null; onChange: (order: string[] | null) => void}) {
  const list = order ? [...order.flatMap(id => debts.filter(d => d.id === id)), ...debts.filter(d => !order.includes(d.id))] : [...debts];
  const move = (i: number, step: -1 | 1) => { const ids = list.map(d => d.id), j = i + step; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j]!, ids[i]!]; onChange(ids); };
  return <details className="debt-plan-fold" open={order ? true : undefined}>
    <summary>Your own order{order ? ' · in use' : ''}</summary>
    <p className="fine">Choose which debt the extra goes to first, for example the one that weighs on you most. It is worked out beside snowball and avalanche as &ldquo;Your order&rdquo;.</p>
    {!order ? <button type="button" className="secondary" onClick={() => onChange(debts.map(d => d.id))}>Set my own order</button> : <>
      <ol className="debt-plan-order-list" aria-label="Your order, first paid first">
        {list.map((d, i) => <li key={d.id}><span>{d.name}</span>
          <span className="debt-plan-order-moves"><button type="button" className="text-link" aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button type="button" className="text-link" aria-label={`Move ${d.name} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button></span></li>)}
      </ol>
      <button type="button" className="quiet" onClick={() => onChange(null)}>Stop using my own order</button>
    </>}
  </details>;
}

/** One-off extra payments by month (a bonus, a tax refund): on top of that month's budget, in every plan but minimums only. */
export function LumpsEditor({lumps, today, currency, money, onChange}: {lumps: readonly DraftLump[]; today: string; currency: string; money: (cents: bigint) => string; onChange: (lumps: DraftLump[]) => void}) {
  const id = useId(), first = firstPaymentMonth(today), [month, setMonth] = useState(first), [amount, setAmount] = useState(''), [problem, setProblem] = useState('');
  const add = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseCents(amount);
    if (!/^\d{4}-\d{2}$/.test(month) || month < first) return setProblem(`Choose ${formatMonth(first)} or a later month.`);
    if (cents === null || cents <= 0n) return setProblem('Enter the amount as a number above zero, for example 500.');
    if (lumps.length >= 24) return setProblem('Up to 24 one-off payments.');
    onChange([...lumps, {month, amount: centsText(cents)}].sort((a, b) => a.month.localeCompare(b.month))); setAmount(''); setProblem('');
  };
  return <details className="debt-plan-fold" open={lumps.length ? true : undefined}>
    <summary>One-off extra payments{lumps.length ? ` · ${lumps.length}` : ''}</summary>
    <p className="fine">A bonus or a tax refund paid off in one go. It goes where the extra goes, in that month only.</p>
    {lumps.length > 0 && <ul className="debt-plan-lumps" aria-label="One-off extra payments">
      {lumps.map((l, i) => <li key={`${l.month}-${i}`}><span>{formatMonth(l.month)}: {money(parseCents(l.amount) ?? 0n)}{l.month < first ? ' (passed, not counted)' : ''}</span>
        <button type="button" className="text-link" aria-label={`Remove the one-off payment of ${formatMonth(l.month)}`} onClick={() => onChange(lumps.filter((_, k) => k !== i))}>Remove</button></li>)}
    </ul>}
    <form className="debt-plan-lump-form" onSubmit={add} aria-label="Add a one-off extra payment" noValidate>
      <label className="field"><span>Month</span><input type="month" min={first} value={month} onChange={e => { setMonth(e.target.value); setProblem(''); }}/></label>
      <label className="field"><span>Amount ({currency})</span><input inputMode="decimal" autoComplete="off" enterKeyHint="done" value={amount} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-problem` : undefined} onChange={e => { setAmount(e.target.value); setProblem(''); }} placeholder="500"/></label>
      <button type="submit" className="secondary">Add payment</button>
      {problem && <p id={`${id}-problem`} className="field-error" role="alert">{problem}</p>}
    </form>
  </details>;
}

const SCHEDULE_ROWS = 360;
/** The plan month by month: what goes to each debt, the interest added and what is left, for the plan chosen. */
export function Schedule({c, shown, onShow, names, money, today, plan}: {c: PlanComparison; shown: Strategy; onShow: (s: Strategy) => void; names: ReadonlyMap<string, string>; money: (cents: bigint) => string; today: string; /** The chosen plan with its schedule. */ plan: (s: Strategy) => PlanResult}) {
  const id = useId(), [open, setOpen] = useState(false), pick: Strategy = shown === 'custom' && !c.custom ? 'avalanche' : shown;
  // Worked out only while the fold is open (up to 1,200 months × 50 debts).
  const r = open ? plan(pick) : (pick === 'custom' ? c.custom! : c[pick]);
  const rows = r.schedule ?? [], start = firstPaymentMonth(today);
  return <details className="debt-plan-fold debt-plan-schedule" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Month by month</summary>
    <fieldset className="debt-plan-pick"><legend>Show</legend>
      {(['avalanche', 'snowball', ...(c.custom ? ['custom' as const] : [])] as const).map(s => <label key={s}><input type="radio" name={`${id}-plan`} checked={pick === s} onChange={() => onShow(s)}/> {STRATEGY_WORDS[s]}</label>)}
    </fieldset>
    {r.months === null ? <p className="fine">With these payments the debts are not cleared within 100 years, so there is no schedule to show.</p> : <>
      <p className="fine">{STRATEGY_WORDS[pick]}: {rows.length} payment {rows.length === 1 ? 'month' : 'months'}, an estimate from today&rsquo;s balances and your rates. &ldquo;Paid&rdquo; is the minimum plus the extra that month.</p>
      <div className="money-table-wrap" role="region" tabIndex={0} aria-label={`Table: ${STRATEGY_WORDS[pick]} month by month`}>
        <table className="money-table debt-plan-table"><caption className="sr-only">{STRATEGY_WORDS[pick]}, month by month: paid and left for each debt</caption>
          <thead><tr><th scope="col">Month</th>{r.order.map(d => <th key={d} scope="col">{names.get(d) ?? 'A debt'}<span className="sr-only">: paid, then left</span></th>)}<th scope="col">Interest</th><th scope="col">Left in all</th></tr></thead>
          <tbody>{rows.slice(0, SCHEDULE_ROWS).map(row => <tr key={row.month}>
            <th scope="row">{formatMonth(addMonths(start, row.month - 1))}{row.lump > 0n ? <small> + {money(row.lump)} once</small> : null}</th>
            {row.paid.map((p, k) => <td key={k}>{row.left[k] === 0n && p === 0n ? '—' : <>{money(p)}<small> · {money(row.left[k]!)} left</small></>}</td>)}
            <td>{money(row.interest.reduce((t, i) => t + i, 0n))}</td><td>{money(row.left.reduce((t, l) => t + l, 0n))}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {rows.length > SCHEDULE_ROWS && <p className="fine">The first {SCHEDULE_ROWS / 12} years are shown; the plan runs {countdownWords(rows.length)}.</p>}
    </>}
  </details>;
}

/** The plan kept on "Track this plan" against what the accounts show now. */
export function Progress({tracked, progress, money, onStop}: {tracked: {on: string; strategy: Strategy}; progress: PlanProgress; money: (cents: bigint) => string; onStop: () => void}) {
  const since = formatMonth(tracked.on.slice(0, 7)), first = formatMonth(addMonths(tracked.on.slice(0, 7), 1));
  return <section className="debt-plan-progress" aria-label="Your plan against what you recorded">
    <h4>Your plan against what you recorded</h4>
    {progress.months === 0 ? <p>You started tracking {STRATEGY_WORDS[tracked.strategy]} in {since}. Its first payment month is {first}; after it, this compares the plan with the balances you record.</p>
      : <p>After {countdownWords(progress.months)} of payments, {STRATEGY_WORDS[tracked.strategy]} (tracked since {since}) expected {money(progress.expected)} owed in all. Your accounts show {money(progress.actual)}: <strong>{progress.ahead > 0n ? `${money(progress.ahead)} ahead of the plan` : progress.ahead < 0n ? `${money(-progress.ahead)} behind the plan` : 'right on the plan'}</strong>.</p>}
    <p className="fine">The plan is worked out from its own figures on the day you started it. The balances are the ones you record under Accounts, debts &amp; net worth; a debt no longer there, or at zero, counts as paid off.</p>
    <button type="button" className="quiet" onClick={onStop}>Stop tracking this plan</button>
  </section>;
}
