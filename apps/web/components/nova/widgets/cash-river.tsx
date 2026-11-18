'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {axMoney, cashRiver, spanWords} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead, AxmKey} from '../cards/ax/money-kit';
import {AxmRiver} from '../cards/ax/money-river';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Cash river" — what was logged coming in and going out over a period as two
 * bands on one time axis, income above the line and spending below it, by day, by week or (for a long period) by month.
 * The gap between them is said in words ("€1,938.01 more in than out"). The period is the question's (`period`), else
 * the last 90 days. A stretch with nothing logged pinches to the line and the table says "nothing logged"; the bands'
 * widths are on a square-root scale so a small week still shows beside a salary, and the figures are in the words.
 * One currency, never converted; only what was logged, nothing projected.
 */
const STEP = {day: 'each day', week: 'each week', month: 'each month'} as const;
export default function CashRiver({size, params}: AxProps) {
  return <MoneyLogSource>{(entries, today) => <River entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function River({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const view = useMemo(() => cashRiver(entries, widgetPeriod(params?.period, today, 'last-90-days')), [entries, params?.period, today]);
  const label = periodLabel(view.period, today), cur = view.currency, day = (date: string) => formatDate(date, {year: false});
  if (view.state !== 'live' || !cur) return <CardNotice kind="empty" ghost="trend" title={`Nothing logged ${label}`} href="/app/wealth#spending" action="Log income or spending">{view.lastDate ? `Your last entry is from ${day(view.lastDate)}.` : 'Log what comes in and what goes out on Wealth and it flows here.'}</CardNotice>;
  const net = view.netCents, width = (value: number | null) => value === null ? null : Math.sqrt(value / view.max);
  const head = net !== null ? {figure: axMoney(Math.abs(net), cur), label: `${net === 0 ? 'as much in as out' : net > 0 ? 'more in than out' : 'more out than in'} · ${label}`, note: `In ${view.income} · out ${view.spending}`}
    : view.incomeCents !== null ? {figure: view.income, label: `came in · ${label}`, note: 'Nothing logged as spent in this period'} : {figure: view.spending, label: `spent · ${label}`, note: 'No income logged in this period'};
  return <AxBody kind="cash-river" size={size}>
    <AxmHead {...head}/>
    {size !== 'S' && <AxmRiver upper={view.buckets.map(b => width(b.income))} lower={view.buckets.map(b => width(b.spending))} start={day(view.period.from)} end={day(view.period.to)} caption={`income above · spending below · ${STEP[view.step]}`}/>}
    {size === 'L' && <AxmKey items={[['in', 'Income (above the line)'], ['out', 'Spending (below the line)']]}/>}
    {size === 'L' && <AxmFacts rows={[['Came in', view.income], ['Went out', view.spending]]}/>}
    <CardFoot source="Your money log" asOf={`${label}${view.lastDate ? ` · last entry ${day(view.lastDate)}` : ''}`}/>
    <HoloTable caption={`Income and spending ${label}, ${STEP[view.step]}, in ${cur}`} rows={[
      [`Came in, ${spanWords(view.period.from, view.period.to)}`, view.income], ['Went out', view.spending], ['The gap', view.gap],
      ...view.buckets.map(b => [b.label, b.income === null && b.spending === null ? 'Nothing logged' : `in ${b.income === null ? 'nothing logged' : axMoney(b.income, cur)}, out ${b.spending === null ? 'nothing logged' : axMoney(b.spending, cur)}`] as const),
      ...(view.others.length ? [['Other currencies', `${view.others.join(', ')}, never converted`] as const] : []),
    ]}/>
  </AxBody>;
}
