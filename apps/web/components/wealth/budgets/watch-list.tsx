'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import {watchRows, withWatch, withoutWatch} from '../../../lib/budgets/watch';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {signedMoney} from '../../../lib/money-log/selection';
import {usedCategories} from '../../../lib/money-log/search';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV (owner follow-up 1, F-WATCH; Rocket Money's Watchlist): "Watching" under Budgets — a category followed
 * without a budget, this month so far against last month by the same day (each currency on its own), with a form to
 * watch one more and Stop watching on each. Lazy, in Budgets' own place.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
export default function WatchList({record, entries, today, currencies, onChange}: {record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; currencies: readonly string[]; onChange: (fn: (r: BudgetsRecord) => BudgetsRecord) => void}) {
  const id = useId(), rows = useMemo(() => watchRows(record, entries, today), [record, entries, today]);
  const cats = useMemo(() => usedCategories(entries.filter(e => e.kind === 'expense')), [entries]);
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(''), [currency, setCurrency] = useState(currencies[0] ?? 'EUR'), [problem, setProblem] = useState('');
  const add = (e: FormEvent) => {
    e.preventDefault();
    try { onChange(r => withWatch(r, category, currency)); setCategory(''); setProblem(''); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); }
  };
  return <section className="budgets-watch" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Watching</h4>
    {rows.length ? <ul className="budgets-watch-list">{rows.map(r => <li key={`${r.currency}-${r.category}`}>
      <span><strong>{r.category}</strong> <span className="fine">· {money(r.thisMonth, r.currency)} so far{r.lastBySameDay === null ? ' · nothing recorded last month to compare with' : ` · ${money(r.lastBySameDay, r.currency)} by this day last month (${signedMoney(r.difference!, r.currency, money)}) · ${money(r.lastMonth ?? 0, r.currency)} all of last month`}</span></span>
      <button type="button" className="quiet" aria-label={`Stop watching ${r.category} in ${r.currency}`} onClick={() => { onChange(x => withoutWatch(x, r.category, r.currency)); input.current?.focus(); }}>Stop watching</button>
    </li>)}</ul> : <p className="fine">Follow a category without giving it a budget: this month so far against last month by the same day.</p>}
    <form className="budgets-watch-form" onSubmit={add} aria-label="Watch a category" noValidate>
      <label className="field"><span>Category</span><input ref={input} list={`${id}-cats`} maxLength={40} value={category} onChange={e => { setCategory(e.target.value); setProblem(''); }} placeholder="Dining"/></label>
      <datalist id={`${id}-cats`}>{cats.map(c => <option key={c} value={c}/>)}</datalist>
      {currencies.length > 1 && <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <button type="submit" className="secondary">Watch</button>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </form>
  </section>;
}
