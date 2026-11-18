'use client';
import {useMemo} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import {billTimeline} from '../../../lib/nova/cards/ax/money-bills';
import {NEAR_DAYS} from '../../../lib/nova/cards/bills';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {AxmTimeline} from '../cards/ax/money-timeline';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {BillsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Bills ahead" — the next bills on one time axis that starts at today: each bill
 * once, at its next due date, as a numbered node, and the same number in the list with its amount, its date and the
 * days to it in words. A bill whose date has passed stands at today's edge and its line says "overdue by …". The figure
 * is the days to the next bill. Reminders only: ZIGoals never pays or cancels anything.
 */
export default function BillTimeline({size}: AxProps) {
  return <BillsSource>{(bills, today) => <Line bills={bills} today={today} size={size}/>}</BillsSource>;
}
function Line({bills, today, size}: {bills: BillsRecord; today: string; size: AxProps['size']}) {
  const view = useMemo(() => billTimeline(bills, today, size === 'L' ? 6 : 4), [bills, today, size]), next = view.next;
  if (!next) return null;
  const days = Math.abs(next.days), more = view.more > 0 ? `+${view.more} more on the Wealth page` : null;
  return <AxBody kind="bill-timeline" size={size}>
    <AxmHead figure={String(days)} unit={days === 1 ? 'day' : 'days'} tone={view.overdue ? 'watch' : undefined} label={next.overdue ? `overdue · ${next.title}` : next.days === 0 ? 'the next bill is due today' : 'to the next bill'}
      note={`${next.title} ${next.amount} · ${next.date}${view.count > 1 ? ` · ${view.count - 1} more after it` : ''}`}/>
    {size !== 'S' && <AxmSplit stack rows={view.marks.length + (more ? 1 : 0)}>
      <AxmTimeline marks={view.marks.map(m => ({key: m.id, n: m.n, at: m.at, past: m.overdue, title: `${m.title} ${m.amount}: ${m.date}, ${m.when}`}))} end={view.endWords}/>
      <AxmLegend items={view.marks.map(m => ({key: m.id, n: m.n, name: m.title, value: m.amount, sub: `${m.date} · ${m.when}`, ...(m.overdue ? {tone: 'watch' as const} : {})}))} more={more}/>
    </AxmSplit>}
    {size === 'L' && <AxmFacts rows={view.month.map(m => [`Due in the next ${NEAR_DAYS} days${view.month.length > 1 ? ` in ${m.currency}` : ''}`, `${m.text} · ${m.count} ${m.count === 1 ? 'due date' : 'due dates'}`] as const)}/>}
    <CardFoot source="Your bill reminders" asOf={`as of today, ${formatDate(today, {year: false})}`}/>
    <HoloTable caption="The next bills, from today" rows={[
      ...view.marks.map((m, i) => [i === 0 ? `Next bill: ${m.title}` : m.title, `${m.amount}, due ${m.date}, ${m.when}`] as const),
      ...(view.more > 0 ? [['More bills', `${view.more} more on Wealth`] as const] : []),
      ...view.month.map(m => [`Due in the next ${NEAR_DAYS} days in ${m.currency}`, `${m.text} across ${m.count} ${m.count === 1 ? 'due date' : 'due dates'}`] as const),
    ]}/>
  </AxBody>;
}
