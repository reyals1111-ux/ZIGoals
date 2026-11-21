'use client';
import {useId, useMemo, useState} from 'react';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {searchEntries, usedCategories, type MoneyQuery} from '../../../lib/money-log/search';
import {signedMoney, summarizeSelection} from '../../../lib/money-log/selection';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV (owner follow-up 1, F-MONEY-SEARCH; Copilot, Monarch, YNAB): "Search all your entries" under Spending —
 * words, spending or income, a category and a date range across the whole money log, newest first, with the total of
 * what was found per currency (never converted). Each found entry opens the same edit form as the week's list. Lazy.
 */
const SHOWN = 100, money = (cents: number, currency: string) => moneyCents(cents, currency);
export default function MoneySearch({entries, onEdit}: {entries: readonly MoneyEntry[]; onEdit: (e: MoneyEntry) => void}) {
  const id = useId(), [q, setQ] = useState<MoneyQuery>({text: '', kind: 'all', category: '', from: '', to: ''}), [more, setMore] = useState(false);
  const cats = useMemo(() => usedCategories(entries), [entries]);
  const asked = !!(q.text?.trim() || q.category || q.from || q.to || (q.kind && q.kind !== 'all'));
  const found = useMemo(() => asked ? searchEntries(entries, q) : [], [asked, entries, q]);
  const sum = useMemo(() => summarizeSelection(found, found.map(e => e.id)), [found]);
  const set = (patch: Partial<MoneyQuery>) => { setQ(x => ({...x, ...patch})); setMore(false); };
  const totals = sum.totals.map(t => signedMoney(t.cents, t.currency, money));
  return <div className="money-search">
    <form className="money-search-form" role="search" aria-label="Search all your entries" onSubmit={e => e.preventDefault()}>
      <label className="field money-search-text"><span>Words or an amount</span><input type="search" value={q.text} autoComplete="off" enterKeyHint="search" placeholder="café, rent, 12.50" onChange={e => set({text: e.target.value})}/></label>
      <label className="field"><span>Kind</span><select value={q.kind} onChange={e => set({kind: e.target.value as MoneyQuery['kind']})}><option value="all">Spending and income</option><option value="expense">Spending</option><option value="income">Income</option></select></label>
      <label className="field"><span>Category</span><select value={q.category} onChange={e => set({category: e.target.value})}><option value="">Any category</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>From</span><input type="date" value={q.from} onChange={e => set({from: e.target.value})}/></label>
      <label className="field"><span>To</span><input type="date" value={q.to} onChange={e => set({to: e.target.value})}/></label>
    </form>
    <p id={`${id}-total`} className="money-select-total" aria-live="polite">{!asked ? `Type a word or choose a filter to search all ${formatNumber(entries.length)} entries.` : found.length ? `${formatNumber(found.length)} found · ${totals.length === 1 ? totals[0] : `${totals.length} currencies: ${totals.slice(0, -1).join(', ')} and ${totals.at(-1)}`}${totals.length > 1 ? ', each on its own, never converted' : ''}` : 'Nothing found. Fewer words, or a wider date range, find more.'}</p>
    {found.length > 0 && <ul className="spending-entries money-search-results" aria-label="Entries found">{found.slice(0, more ? found.length : SHOWN).map(e => <li key={e.id}>
      <span className="spending-entry-what"><strong>{e.category}</strong>{e.note && <span className="fine"> · {e.note}</span>}<span className="fine"> · {formatDate(e.date)}</span></span>
      <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(Math.round(Number(e.amount) * 100), e.currency)}</span>
      <span className="spending-entry-actions"><button type="button" className="text-link spending-edit" aria-label={`Edit ${e.category} ${e.amount} ${e.currency} on ${e.date}`} onClick={() => onEdit(e)}>Edit</button></span>
    </li>)}</ul>}
    {found.length > SHOWN && !more && <p><button type="button" className="secondary" onClick={() => setMore(true)}>Show all {formatNumber(found.length)}</button></p>}
  </div>;
}
