'use client';
import {useMemo} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import {BILL_DAYS, billGrid} from '../../../lib/nova/cards/ax/money-bills';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmBillGrid} from '../cards/ax/money-heat';
import {AxmHead, AxmKey, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {BillsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Bills on the calendar" — the next 31 days from today as a grid, the days a bill
 * falls due lit (a weekly bill each time it comes); today is ringed. The figure counts the due dates; what they come to
 * is said per currency, never added across. The bills are reminders the person keeps on Wealth: ZIGoals never pays or
 * cancels anything.
 */
export default function BillCalendar({size}: AxProps) {
  return <BillsSource>{(bills, today) => <Grid bills={bills} today={today} size={size}/>}</BillsSource>;
}
function Grid({bills, today, size}: {bills: BillsRecord; today: string; size: AxProps['size']}) {
  const view = useMemo(() => billGrid(bills, today), [bills, today]), n = view.due.length, next = view.next, cap = size === 'L' ? 6 : 3, listed = view.due.slice(0, cap), more = n - listed.length;
  const sums = view.totals.map(t => t.text).join(' · ');
  return <AxBody kind="bill-calendar" size={size}>
    <AxmHead figure={String(n)} unit={n === 1 ? 'bill' : 'bills'} label={`due in the next ${BILL_DAYS} days`} tone={n ? undefined : 'clear'}
      note={n ? `${sums}${next ? ` · next: ${next.title}, ${next.date}` : ''}` : next ? `Next: ${next.title} ${next.amount}, ${next.date} (${next.when})` : 'No bill has a due date ahead'}/>
    {size !== 'S' && <AxmSplit stack rows={listed.length + (more > 0 ? 1 : 0)}>
      <AxmBillGrid weekdays={view.weekdays} weeks={view.weeks}/>
      {listed.length > 0 && <AxmLegend items={listed.map(d => ({key: `${d.id}-${d.date}`, n: Number(d.date.slice(8, 10)), name: d.title, value: d.amount, sub: `${d.dateWords} · ${d.when}`}))} more={more > 0 ? `+${more} more due dates on the Wealth page` : null}/>}
    </AxmSplit>}
    {size === 'L' && <AxmKey items={[['due', 'A bill falls due'], ['today', 'Today']]}/>}
    <CardFoot source="Your bill reminders" asOf={`${view.span} · as of today, ${formatDate(today, {year: false})}`}/>
    <HoloTable caption={`Bills due in the next ${BILL_DAYS} days, ${view.span}`} rows={[
      ['Due dates', `${n} on ${view.dueDays} ${view.dueDays === 1 ? 'day' : 'days'}`],
      ...view.due.map(d => [d.title, `${d.amount}, due ${d.dateWords}, ${d.when}`] as const),
      ...view.totals.map(t => [`Due in ${t.currency}`, `${t.text} across ${t.count} ${t.count === 1 ? 'due date' : 'due dates'}`] as const),
      ...(n || !next ? [] : [['Next bill', `${next.title}, ${next.amount}, due ${next.date}, ${next.when}`] as const]),
      ...view.overdue.map(l => [`Overdue: ${l.title}`, `${l.amount}, ${l.when}`] as const),
    ]}/>
  </AxBody>;
}
