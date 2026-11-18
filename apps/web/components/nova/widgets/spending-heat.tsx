'use client';
import {useMemo} from 'react';
import {HEAT_WEEKS, axMoney, spanWords, spendingHeat} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmHeat} from '../cards/ax/money-heat';
import {AxmFacts, AxmHead, AxmKey} from '../cards/ax/money-kit';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Spending heat" — the last thirteen weeks, a cell a day, lit by what was logged as
 * spent that day in the leading currency (brighter is more, in four steps). A day with nothing logged is an unlit
 * outline (unknown, never zero). The figure is the thirteen weeks' total; the largest day is named. The money log's own
 * amounts; another currency is named apart, never converted.
 */
export default function SpendingHeat({size}: AxProps) {
  return <MoneyLogSource kind="expense">{(entries, today) => <Heat entries={entries} today={today} size={size}/>}</MoneyLogSource>;
}
function Heat({entries, today, size}: {entries: readonly MoneyEntry[]; today: string; size: AxProps['size']}) {
  const view = useMemo(() => spendingHeat(entries, today), [entries, today]), day = (date: string) => formatDate(date, {weekday: true, year: false}), cur = view.currency;
  if (view.state !== 'live' || !cur) return <CardNotice kind="empty" ghost="lattice" title={`Nothing logged as spent in the last ${HEAT_WEEKS} weeks`} href="/app/wealth#spending" action="Log what you spent">The days you log light up here, brighter for more.</CardNotice>;
  const peak = view.peak;
  return <AxBody kind="spending-heat" size={size}>
    <AxmHead figure={view.total} label={`spent · the last ${HEAT_WEEKS} weeks`} note={`On ${view.daysWith} of ${view.days} days${peak ? ` · most on ${day(peak.date)} (${peak.text})` : ''}`}/>
    {size !== 'S' && <AxmHeat weeks={view.weeks} months={view.months} peak={peak?.date ?? null}/>}
    {size === 'L' && <AxmKey items={[['now', 'Spent that day (brighter is more)'], ['none', 'Nothing logged'], ['today', 'Today']]}/>}
    {size === 'L' && peak && <AxmFacts rows={[['Largest day', `${peak.text} · ${day(peak.date)}`], ['Days with spending', `${view.daysWith} of ${view.days}`]]}/>}
    <CardFoot source="Your money log" asOf={`${spanWords(view.from, view.to)}${view.lastDate ? ` · last entry ${formatDate(view.lastDate, {year: false})}` : ''}`}/>
    <HoloTable caption={`Spending by day, the last ${HEAT_WEEKS} weeks, in ${cur}`} rows={[
      [`Spent, ${spanWords(view.from, view.to)}`, view.total], ['Days with spending', `${view.daysWith} of ${view.days}`],
      ...(peak ? [['Largest day', `${peak.text} on ${day(peak.date)}`] as const] : []),
      ...view.weeks.map(week => { const hit = week.filter(c => c.cents !== null); return [spanWords(week[0]!.date, week.at(-1)!.date), hit.length ? hit.map(c => `${formatWeekday(c.date)} ${axMoney(c.cents!, cur)}`).join(', ') : 'Nothing logged'] as const; }),
      ...(view.others.length ? [['Other currencies', `${view.others.join(', ')}, never converted`] as const] : []),
    ]}/>
  </AxBody>;
}
