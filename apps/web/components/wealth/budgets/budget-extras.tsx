'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {signedMoney} from '../../../lib/money-log/selection';
import {usedCategories, usedPayees} from '../../../lib/money-log/search';
import {addChallenge, challengeStates, payeeRows, removeChallenge, withPayee, withoutPayee, type ChallengeState} from '../../../lib/money-notices';
import {formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2 (money; Rocket Money's watchlist and challenges, YNAB's home tab): under Budgets — payees watched
 * this month against last, "spend less than last month in <category>" challenges, and the switch that shows what is left
 * in each budget on Today (off until the person turns it on). Lazy, in Budgets' own place. Every figure is the person's
 * own counted entries, per currency, never converted.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
const STATE_WORDS: Record<ChallengeState['state'], string> = {'on-track': 'on track', close: 'close to last month', over: 'past last month', won: 'done: less than last month', lost: 'ended above last month', 'no-last': 'nothing spent last month to beat'};
type Props = {record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; currencies: readonly string[]; onChange: (fn: (r: BudgetsRecord) => BudgetsRecord) => void};
export default function BudgetExtras(props: Props) {
  return <>
    <PayeeWatch {...props}/>
    <Challenges {...props}/>
    <OnToday {...props}/>
  </>;
}
function PayeeWatch({record, entries, today, currencies, onChange}: Props) {
  const id = useId(), rows = useMemo(() => payeeRows(record, entries, today), [record, entries, today]), payees = useMemo(() => usedPayees(entries.filter(e => e.kind === 'expense'), 100), [entries]);
  const input = useRef<HTMLInputElement>(null), [payee, setPayee] = useState(''), [currency, setCurrency] = useState(currencies[0] ?? 'EUR'), [problem, setProblem] = useState('');
  const add = (e: FormEvent) => { e.preventDefault(); try { onChange(r => withPayee(r, payee, currency)); setPayee(''); setProblem(''); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); } };
  return <section className="budgets-watch budgets-payees" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Watching payees</h4>
    {rows.length ? <ul className="budgets-watch-list">{rows.map(r => <li key={`${r.currency}-${r.payee}`}>
      <span><strong>{r.payee}</strong> <span className="fine">· {money(r.thisMonth, r.currency)} so far ({r.count} {r.count === 1 ? 'time' : 'times'}){r.lastBySameDay === null ? ' · nothing recorded last month to compare with' : ` · ${money(r.lastBySameDay, r.currency)} by this day last month (${signedMoney(r.difference!, r.currency, money)}) · ${money(r.lastMonth ?? 0, r.currency)} all of last month`}</span></span>
      <button type="button" className="quiet" aria-label={`Stop watching ${r.payee} in ${r.currency}`} onClick={() => { onChange(x => withoutPayee(x, r.payee, r.currency)); input.current?.focus(); }}>Stop watching</button>
    </li>)}</ul> : <p className="fine">Follow one shop, café or service: what you spent there this month against last month by the same day. Today says so when it is well above.</p>}
    <form className="budgets-watch-form" onSubmit={add} aria-label="Watch a payee" noValidate>
      <label className="field"><span>Payee</span><input ref={input} list={`${id}-payees`} maxLength={60} value={payee} onChange={e => { setPayee(e.target.value); setProblem(''); }} placeholder="Café Noël"/></label>
      <datalist id={`${id}-payees`}>{payees.map(p => <option key={p} value={p}/>)}</datalist>
      {currencies.length > 1 && <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <button type="submit" className="secondary">Watch payee</button>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </form>
  </section>;
}
function Challenges({record, entries, today, currencies, onChange}: Props) {
  const id = useId(), rows = useMemo(() => challengeStates(record, entries, today), [record, entries, today]), cats = useMemo(() => usedCategories(entries.filter(e => e.kind === 'expense')), [entries]);
  const month = today.slice(0, 7), input = useRef<HTMLSelectElement>(null);
  const [category, setCategory] = useState(''), [currency, setCurrency] = useState(currencies[0] ?? 'EUR'), [problem, setProblem] = useState('');
  const add = (e: FormEvent) => { e.preventDefault(); try { onChange(r => addChallenge(r, category, currency, month, `ch_${crypto.randomUUID().slice(0, 12)}`)); setCategory(''); setProblem(''); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); } };
  return <section className="budgets-watch budgets-challenges" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Challenges</h4>
    {rows.length ? <ul className="budgets-watch-list">{rows.map(c => <li key={c.id}>
      <span><strong>Spend less on {c.category} than last month</strong> <span className="fine">· {formatMonth(`${c.month}-01`)} · {money(c.spent, c.currency)} {c.daysLeft ? 'so far' : 'spent'} against {money(c.lastMonth, c.currency)}{c.state === 'on-track' || c.state === 'close' ? ` · ${money(c.left, c.currency)} to spare, ${c.daysLeft} ${c.daysLeft === 1 ? 'day' : 'days'} to go` : ''} · <span className={`budgets-challenge is-${c.state}`}>{STATE_WORDS[c.state]}</span></span></span>
      <button type="button" className="quiet" aria-label={`Remove the ${c.category} challenge of ${formatMonth(`${c.month}-01`)}`} onClick={() => { onChange(x => removeChallenge(x, c.id)); input.current?.focus(); }}>Remove</button>
    </li>)}</ul> : <p className="fine">Pick a category and try to spend less on it this month than last month. It is your own game: nothing is advised.</p>}
    <form className="budgets-watch-form" onSubmit={add} aria-label="Start a challenge" noValidate>
      <label className="field"><span>Category</span><select ref={input} value={category} onChange={e => { setCategory(e.target.value); setProblem(''); }}><option value="">Choose…</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      {currencies.length > 1 && <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <button type="submit" className="secondary" disabled={!category}>Start this month</button>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </form>
  </section>;
}
function OnToday({record, onChange}: Props) {
  const id = useId();
  if (!record.budgets.length) return null;
  return <section className="budgets-watch budgets-on-today" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>On Today</h4>
    <label className="money-search-check budgets-today-switch"><input type="checkbox" checked={!!record.onToday} onChange={e => { const on = e.target.checked; onChange(r => { const {onToday: _o, ...rest} = r; void _o; return on ? {...rest, onToday: true} : rest as BudgetsRecord; }); }}/><span>Show what is left in each budget on Today (one quiet line under Money)</span></label>
  </section>;
}
