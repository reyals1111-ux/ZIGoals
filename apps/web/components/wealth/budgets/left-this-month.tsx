'use client';
import {Suspense, lazy, useId, useMemo} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePlatform} from '../../platform/use-platform';
import {BILLS} from '../../../lib/bills/schema';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import {leftThisMonth, type LeftItem, type LeftThisMonth} from '../../../lib/budgets/left-this-month';
import {plannedContributions} from '../../../lib/cash-forecast/model';
import {plannedForForecast} from '../../../lib/cash-forecast/planned';
import {MONEY_MORE} from '../../../lib/money-more/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate, formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import '../../cash-forecast/planned.css';
const PlannedCosts = lazy(() => import('../../cash-forecast/planned-costs'));

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Leftover, LEDGER #291, #292): Budgets → "Left this month", one
 * currency at a time: the month's income, less what was spent, what the budgets still hold, the bills still due that no
 * budget covers, the Goal plans still to come and the planned one-off costs, each part listed (lib/budgets/left-this-month.ts;
 * spending and income are Wealth → Spending's own figures). A fact from the person's records, not advice. Its own chunk,
 * shown for the month still running in the personal space.
 */
const m = (cents: number, currency: string) => moneyCents(cents, currency);
export default function LeftThisMonthCard({entries, record, today, showcase = false}: {entries: readonly MoneyEntry[]; record: BudgetsRecord; today: string; showcase?: boolean}) {
  const id = useId(), bills = useDeviceRecord(BILLS), more = useDeviceRecord(MONEY_MORE), platform = usePlatform();
  const ready = bills.loaded && more.loaded && platform.loaded;
  const rows = useMemo(() => ready ? leftThisMonth({entries, budgets: record, bills: bills.unreadable ? null : bills.data, contributions: plannedContributions(platform.data.goals), planned: more.unreadable ? [] : plannedForForecast(more.data, entries, today), today}) : null,
    [ready, entries, record, bills.unreadable, bills.data, platform.data.goals, more.unreadable, more.data, today]);
  if (!rows) return null;
  const month = formatMonth(today.slice(0, 7)), planned = more.data.planned?.length ?? 0;
  return <section className="left-month" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Left this month</h4>
    {!rows.length ? <p className="fine">Nothing to work out yet for {month}. Log your income and spending in Wealth → Spending, and add budgets, bills or planned costs: this then says what is left after them, each part listed.</p>
      : rows.map(r => <Currency key={r.currency} r={r}/>)}
    <p className="fine">From your money log, budgets, bills, Goal plans and planned costs only. A figure, not advice.</p>
    <details><summary>Planned one-off costs{planned ? ` (${planned})` : ''}</summary>
      <Suspense fallback={<p className="fine" aria-busy="true">Loading…</p>}><PlannedCosts entries={entries} today={today} showcase={showcase}/></Suspense>
    </details>
  </section>;
}
function Items({items, c}: {items: readonly LeftItem[]; c: string}) {
  if (items.length < 2 && !items[0]?.date) return null;
  return <ul className="left-month-items">{items.map((i, k) => <li key={`${i.name}-${i.date ?? ''}-${k}`}>{i.name}{i.date ? ` · ${formatDate(i.date)}` : ''}: {m(i.cents, c)}</li>)}</ul>;
}
function Currency({r}: {r: LeftThisMonth}) {
  const c = r.currency, parts: {label: string; cents: number; items?: readonly LeftItem[]}[] = [
    {label: `Income logged${r.incomeEntries ? ` (${r.incomeEntries} ${r.incomeEntries === 1 ? 'entry' : 'entries'})` : ''}`, cents: r.income},
    {label: 'Spent so far', cents: -r.spent},
    ...(r.budgets.cents ? [{label: `Still in your budgets${r.budgets.items.length === 1 ? ` (${r.budgets.items[0]!.name})` : ` (${r.budgets.items.length})`}`, cents: -r.budgets.cents, items: r.budgets.items}] : []),
    ...(r.bills.cents ? [{label: `Bills still due, no budget covers them (${r.bills.items.length})`, cents: -r.bills.cents, items: r.bills.items}] : []),
    ...(r.goals.cents ? [{label: `Goal plans still to come (${r.goals.items.length})`, cents: -r.goals.cents, items: r.goals.items}] : []),
    ...(r.planned.cents ? [{label: `Planned costs (${r.planned.items.length})`, cents: -r.planned.cents, items: r.planned.items}] : []),
  ];
  return <div role="group" aria-label={`Left this month in ${c}`}>
    <p className="left-month-figure"><strong data-private-amount>{r.left < 0 ? `${m(-r.left, c)} more than came in` : m(r.left, c)}</strong>{r.left >= 0 ? ' left' : ''} · {c}</p>
    {!r.income && <p className="fine">No income logged in {c} this month yet, so this starts from zero.</p>}
    <ul className="left-month-parts">
      {parts.map(p => <li key={p.label}><span>{p.label}</span><span data-private-amount>{p.cents < 0 ? '−' : ''}{m(Math.abs(p.cents), c)}</span>{p.items && <Items items={p.items} c={c}/>}</li>)}
      <li className="left-month-total"><span>Left this month</span><span data-private-amount>{r.left < 0 ? '−' : ''}{m(Math.abs(r.left), c)}</span></li>
    </ul>
  </div>;
}
