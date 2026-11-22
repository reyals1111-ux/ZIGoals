'use client';
import {useMemo} from 'react';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import {monthRecap} from '../../../lib/budgets/recap';
import {formatDate, formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV (owner follow-up 1, F-MONTH-RECAP; Copilot's monthly review): Budgets by category → "<Month> in short":
 * spent and came in, against the month before, the three largest categories, the largest single expense and the
 * budgets kept — per currency, from the money log. Its own chunk, loaded when the fold opens.
 */
export default function MonthRecapView({entries, record, month, today}: {entries: readonly MoneyEntry[]; record: BudgetsRecord; month: string; today: string}) {
  const recaps = useMemo(() => monthRecap(entries, record, month, today), [entries, record, month, today]);
  if (!recaps.length) return <p className="fine">Nothing was logged in {formatMonth(`${month}-01`)}.</p>;
  return <div className="budgets-recap">{recaps.map(r => { const m = (c: number) => moneyCents(c, r.currency), diff = r.spent - r.previousSpent; return <dl key={r.currency} className="budgets-recap-list">
    <div><dt>Spent</dt><dd>{m(r.spent)}{r.previousSpent ? <small> · {diff === 0 ? 'the same as the month before' : `${m(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the month before`}</small> : null}</dd></div>
    <div><dt>Came in</dt><dd>{m(r.income)}</dd></div>
    {r.top.length > 0 && <div><dt>Largest categories</dt><dd>{r.top.map(t => `${t.category} ${m(t.cents)}`).join(' · ')}</dd></div>}
    {r.largest && <div><dt>Largest single expense</dt><dd dir="auto">{r.largest.note}, {m(r.largest.cents)} on {formatDate(r.largest.date, {weekday: true, year: false})}</dd></div>}
    {r.budgets.of > 0 && <div><dt>Budgets</dt><dd>{r.budgets.kept} of {r.budgets.of} kept within their amount</dd></div>}
  </dl>; })}</div>;
}
