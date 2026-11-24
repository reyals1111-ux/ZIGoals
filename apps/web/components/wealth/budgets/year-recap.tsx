'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {BILLS} from '../../../lib/bills/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {yearRecap} from '../../../lib/money-notices';
import {formatMonth, formatNumber} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2 (money; Copilot's Year in Review): "<year> in review" under Budgets — the year so far (or a past
 * year), per currency: spent, came in, against the same part of the year before, the five largest categories, the
 * largest expense, the busiest and quietest month, and the bills due in it. From the person's own counted entries and
 * tracked bills; no judgement. Lazy, opened from its fold.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
export default function YearRecapView({entries, today}: {entries: readonly MoneyEntry[]; today: string}) {
  const id = useId(), bills = useDeviceRecord(BILLS), years = useMemo(() => [...new Set(entries.map(e => e.date.slice(0, 4)))].filter(y => y <= today.slice(0, 4)).sort().reverse(), [entries, today]);
  const [year, setYear] = useState(today.slice(0, 4));
  const rows = useMemo(() => yearRecap(entries, bills.loaded && !bills.unreadable ? bills.data : null, year, today), [entries, bills.loaded, bills.unreadable, bills.data, year, today]);
  return <div className="budgets-year" aria-labelledby={`${id}-title`} role="group">
    <h4 id={`${id}-title`} className="visually-hidden">{year} in review</h4>
    {years.length > 1 && <label className="field budgets-year-pick"><span>Year</span><select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>}
    {!rows.length ? <p className="fine">Nothing logged in {year} yet. As you log what you spend and receive, the year adds up here.</p> : rows.map(r => {
      const change = r.previousSpent ? Math.round(100 * (r.spent - r.previousSpent) / r.previousSpent) : null;
      return <section key={r.currency} className="budgets-year-card" aria-label={`${year} in ${r.currency}`}>
        <p><strong>{money(r.spent, r.currency)}</strong> spent{year === today.slice(0, 4) ? ' so far' : ''}, <strong>{money(r.income, r.currency)}</strong> came in{change !== null ? ` · ${change === 0 ? 'the same as' : `${Math.abs(change)}% ${change > 0 ? 'more than' : 'less than'}`} the same months of ${Number(year) - 1}` : ''}.</p>
        {r.top.length > 0 && <p className="fine">Largest categories: {r.top.map(t => `${t.category} ${money(t.cents, r.currency)}`).join(' · ')}.</p>}
        {r.largest && <p className="fine">Largest expense: {r.largest.note} {money(r.largest.cents, r.currency)} ({r.largest.date}).</p>}
        {r.busiest && <p className="fine">Busiest month: {formatMonth(`${r.busiest}-01`)}{r.quietest ? `; quietest: ${formatMonth(`${r.quietest}-01`)}` : ''}.</p>}
        {r.bills.count > 0 && <p className="fine">Bills you track: {money(r.bills.cents, r.currency)} over {formatNumber(r.bills.count)} due dates.</p>}
        <ul className="budgets-year-months" aria-label={`Spent by month in ${year}, ${r.currency}`}>{r.months.filter(m => m.spent || m.income).map(m => { const max = Math.max(1, ...r.months.map(x => x.spent)); return <li key={m.month}><span className="budgets-year-month">{formatMonth(`${m.month}-01`)}</span><span className="spending-bar" aria-hidden="true"><span style={{width: `${Math.max(2, Math.round(100 * m.spent / max))}%`}}/></span><span className="spending-amount">{money(m.spent, r.currency)}</span></li>; })}</ul>
      </section>; })}
  </div>;
}
