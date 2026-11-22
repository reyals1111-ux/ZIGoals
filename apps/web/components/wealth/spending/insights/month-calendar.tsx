'use client';
import {useId, useMemo, useState} from 'react';
import {calendarCurrencies, calendarMonths, monthCalendar, type CalendarDay} from '../../../../lib/money-insights/month-days';
import {formatDate, formatMonth, formatWeekday, formatWeekdayLong} from '../../../../lib/visual-format';
import type {InsightProps} from './spending-insights';
import {money} from './format';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's calendar, LEDGER #338): the month as a calendar — each day's spending
 * and income in one currency at a time (never converted), a quiet shade for the larger days, today ringed, paged month by
 * month back to the log's first. A day with entries opens them in "Search all your entries" (`openDay`). On a phone a
 * cell is too narrow for an amount or a 44 px button, so the cells show a dot and the days are listed under the grid as
 * buttons (the bills calendar's pattern). Hide amounts blurs every amount (`data-private-amount`). No motion.
 * Figures: lib/money-insights/month-days.ts (`totals` for income, the shared rule's `budgetDayParts` for spending).
 */
export default function MonthCalendarView({entries, today, openDay, weekStartsOn = 'monday'}: InsightProps) {
  const id = useId(), months = useMemo(() => calendarMonths(entries, today), [entries, today]);
  const [at, setAt] = useState(months.length - 1), month = months[Math.min(at, months.length - 1)]!;
  const currencies = useMemo(() => calendarCurrencies(entries, month), [entries, month]);
  const [picked, setPicked] = useState(''), currency = currencies.includes(picked) ? picked : currencies[0] ?? '';
  const cal = useMemo(() => currency ? monthCalendar(entries, month, currency, today, weekStartsOn) : null, [entries, month, currency, today, weekStartsOn]);
  if (!entries.length) return <p className="fine">Nothing logged yet. Each day you log spending or income shows here on a calendar of the month.</p>;
  const first = at <= 0, last = at >= months.length - 1, title = formatMonth(`${month}-01`);
  const page = (step: -1 | 1) => { const next = at + step; if (next >= 0 && next < months.length) setAt(next); };
  const words = (d: CalendarDay) => `${formatDate(d.date, {weekday: true})}: ${d.spent ? `spent ${money(d.spent, currency)}` : 'nothing spent'}${d.received ? `, received ${money(d.received, currency)}` : ''}${d.count ? ` (${d.count} ${d.count === 1 ? 'entry' : 'entries'})` : ''}`;
  const open = (d: CalendarDay) => openDay?.(d.date);
  const days = cal ? cal.weeks.flat().filter(d => d.inMonth && (d.count > 0 || d.spent > 0)) : [];
  return <section className="money-insights-currency money-cal" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>A calendar of the month</h4>
    <div className="money-cal-pager">
      <button type="button" className="quiet" aria-disabled={first || undefined} onClick={() => page(-1)} aria-label={first ? 'Earlier month (this is the first month in your log)' : `Earlier month: ${formatMonth(`${months[at - 1]}-01`)}`}>‹</button>
      <strong aria-live="polite">{title}</strong>
      <button type="button" className="quiet" aria-disabled={last || undefined} onClick={() => page(1)} aria-label={last ? 'Later month (this is the current month)' : `Later month: ${formatMonth(`${months[at + 1]}-01`)}`}>›</button>
    </div>
    {currencies.length > 1 && <div className="money-insights-views" role="group" aria-label="Currency">{currencies.map(c => <button key={c} type="button" className="quiet" aria-pressed={c === currency} onClick={() => setPicked(c)}>{c}</button>)}</div>}
    {!cal ? <p className="fine">Nothing logged in {title}.</p> : <>
      <p className="money-cal-total">{title} in {currency}: spent <strong data-private-amount>{money(cal.spent, currency)}</strong>, received <strong data-private-amount>{money(cal.received, currency)}</strong>{cal.largest ? <> · the largest day {formatDate(cal.largest.date)}, <span data-private-amount>{money(cal.largest.spent, currency)}</span></> : null}.</p>
      <table className="money-cal-grid">
        <caption className="sr-only">Spending and income each day of {title} in {currency}, by week</caption>
        <thead><tr>{cal.weeks[0]!.map(d => <th key={d.date} scope="col" abbr={formatWeekdayLong(d.date)}>{formatWeekday(d.date)}</th>)}</tr></thead>
        <tbody>{cal.weeks.map(week => <tr key={week[0]!.date}>{week.map(d => { const button = d.count > 0 && !!openDay; return !d.inMonth ? <td key={d.date} className="is-out" aria-hidden="true"/> : <td key={d.date} className={[`level-${d.level}`, d.today ? 'is-today' : '', d.count ? 'has-entries' : '', button ? 'has-button' : ''].filter(Boolean).join(' ')} {...(button ? {} : {'aria-label': words(d)})}>
          {button && <button type="button" className="money-cal-cell" aria-label={`${words(d)}. Open these entries in search`} onClick={() => open(d)}><Cell d={d} currency={currency}/></button>}
          <span className="money-cal-plain" aria-hidden="true">{button ? <span className="money-cal-day">{d.day}</span> : <Cell d={d} currency={currency}/>}{d.count > 0 && <span className="money-cal-dot"/>}</span>
        </td>; })}</tr>)}</tbody>
      </table>
      <p className="money-insights-legend" aria-hidden="true"><span><i className="money-cal-key level-1"/>Smaller days</span><span><i className="money-cal-key level-3"/>The larger days</span></p>
      {days.length > 0 && <ul className="money-cal-list" aria-label={`Days with entries in ${title}`}>{days.map(d => <li key={d.date}>
        {openDay ? <button type="button" className="quiet" onClick={() => open(d)}><span>{formatDate(d.date, {weekday: true})}</span> <span data-private-amount>{d.spent ? `−${money(d.spent, currency)}` : ''}{d.received ? ` +${money(d.received, currency)}` : ''}</span></button>
          : <span>{words(d)}</span>}
      </li>)}</ul>}
      {days.length === 0 && <p className="fine">Nothing logged in {currency} in {title}.</p>}
      <p className="fine">Spending counts your share of a shared cost, and a cost spread over months counts its share on its day each month, as your budgets do. Entries left out and transfers are not counted. A day without entries is empty, not zero.{openDay ? ' Tap a day to see its entries.' : ''}</p>
    </>}
  </section>;
}
function Cell({d, currency}: {d: CalendarDay; currency: string}) {
  return <>
    <span className="money-cal-day" aria-hidden="true">{d.day}</span>
    {d.spent > 0 && <small className="money-cal-out" aria-hidden="true" data-private-amount>−{money(d.spent, currency)}</small>}
    {d.received > 0 && <small className="money-cal-in" aria-hidden="true" data-private-amount>+{money(d.received, currency)}</small>}
  </>;
}
