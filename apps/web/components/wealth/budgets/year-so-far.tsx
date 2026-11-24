'use client';
import {useId, useMemo, useState} from 'react';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {differenceWord, yearSoFar, type YearRow} from '../../../lib/budgets/year-so-far';
import {formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import '../spending/money-r5.css';

/**
 * Session AV lane 2, round 5 (money; Tiller's Year-to-Date Comparison, LEDGER #385): Budgets → "<year> so far against
 * your budgets", its own chunk, opened from its fold: per budgeted category, this year's budgets so far beside what was
 * spent (lib/budgets/year-so-far.ts, by the shared rule's `countedBetween`), the difference as a fact, and each month of
 * one category on demand. Hide amounts blurs every amount.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
export const differenceText = (difference: number, currency: string) => { const w = differenceWord(difference); return w === 'even' ? 'exactly on budget so far' : `${money(Math.abs(difference), currency)} ${w} so far`; };
const span = (r: Pick<YearRow, 'from' | 'to'>) => r.from === r.to ? formatMonth(`${r.from}-01`, {year: false}) : `${formatMonth(`${r.from}-01`, {year: false})}–${formatMonth(`${r.to}-01`, {year: false})}`;
export default function YearSoFarView({record, entries, today}: {record: BudgetsRecord; entries: readonly MoneyEntry[]; today: string}) {
  const id = useId(), data = useMemo(() => yearSoFar(record, entries, today), [record, entries, today]), [open, setOpen] = useState<string | null>(null);
  if (!data.rows.length) return <p className="fine">No budgets yet. Once you set a budget, each month of {data.year} adds up here beside what you spent.</p>;
  const chosen = data.rows.find(r => r.id === open) ?? null;
  return <div className="money-ytd" role="group" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} className="visually-hidden">{data.year} so far against your budgets</h4>
    {data.totals.map(t => <p key={t.currency} className="money-ytd-total"><strong data-private-amount="">{money(t.spent, t.currency)}</strong> spent against <span data-private-amount="">{money(t.budgeted, t.currency)}</span> budgeted in {t.currency} — <span data-private-amount="">{differenceText(t.difference, t.currency)}</span> <span className="fine">({t.budgets} {t.budgets === 1 ? 'budget' : 'budgets'})</span>.</p>)}
    <div className="money-ytd-scroll"><table className="money-ytd-table">
      <caption>Each budget from January (or its first month) to {formatMonth(`${data.to}-01`)}; this month counts whole, as its budget does.</caption>
      <thead><tr><th scope="col">Category</th><th scope="col">Months</th><th scope="col">Budgeted</th><th scope="col">Spent</th><th scope="col">Difference</th></tr></thead>
      <tbody>{data.rows.map(r => <tr key={r.id}>
        <th scope="row"><button type="button" className="text-link money-ytd-open" aria-expanded={open === r.id} aria-controls={`${id}-months`} onClick={() => setOpen(o => o === r.id ? null : r.id)}>{r.category}</button>{data.totals.length > 1 ? <span className="fine"> {r.currency}</span> : null}</th>
        <td>{span(r)}</td><td data-private-amount="">{money(r.budgeted, r.currency)}</td><td data-private-amount="">{money(r.spent, r.currency)}</td><td data-private-amount="">{differenceText(r.difference, r.currency)}</td>
      </tr>)}</tbody>
    </table></div>
    <div id={`${id}-months`}>{chosen && <table className="money-ytd-table">
      <caption>{chosen.category} in {data.year}, month by month ({chosen.currency})</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Budgeted</th><th scope="col">Spent</th><th scope="col">Difference</th></tr></thead>
      <tbody>{chosen.months.map(m => <tr key={m.month}><th scope="row">{formatMonth(`${m.month}-01`)}</th><td data-private-amount="">{money(m.budgeted, chosen.currency)}</td><td data-private-amount="">{money(m.spent, chosen.currency)}</td><td data-private-amount="">{differenceText(m.budgeted - m.spent, chosen.currency).replace(' so far', '')}</td></tr>)}</tbody>
    </table>}</div>
    <p className="fine">Counted as your budgets count it: your share of a shared cost, a cost spread over months by its share each month, nothing for an entry left out or a transfer. Money carried from earlier months is not added again. Figures, not a target.</p>
  </div>;
}
