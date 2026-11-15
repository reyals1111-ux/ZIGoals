'use client';
import {useMemo} from 'react';
import {currenciesOf, topPayees} from '../../../../lib/money-insights/cash-flow';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AP (feature 1): where this month's spending went, most first, beside last month, one currency at a time. A
 * payee is the entry's note, read as Upcoming bills reads it; an entry without a note counts under its category. Last
 * month with nothing logged in the currency reads "No records", never zero.
 */
export default function TopPayeesView({entries, today}: InsightProps) {
  const views = useMemo(() => currenciesOf(entries, today).map(c => topPayees(entries, c, today)).filter(v => v.payees.length), [entries, today]);
  if (!views.length) return <p className="fine">No spending logged this month yet.</p>;
  return <>{views.map(v => <section key={v.currency} className="money-insights-currency" aria-label={`Top payees in ${v.currency}`}>
    <h4>Top payees · {v.currency}</h4>
    <table className="money-insights-table">
      <caption>{monthName(v.month)} beside {monthName(v.previous)}, in {v.currency}</caption>
      <thead><tr><th scope="col">Payee</th><th scope="col">{monthName(v.month)}</th><th scope="col">{monthName(v.previous)}</th></tr></thead>
      <tbody>{v.payees.map(p => <tr key={p.key}><th scope="row">{p.name}</th><td>{money(p.thisMonth, v.currency)}</td><td>{p.lastMonth === null ? 'No records' : money(p.lastMonth, v.currency)}</td></tr>)}</tbody>
    </table>
  </section>)}
  <p className="fine">The payee is the note on each entry; entries without a note count under their category.</p></>;
}
