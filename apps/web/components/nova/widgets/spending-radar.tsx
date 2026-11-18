'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {spanWords, spendingRadar} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmHead, AxmKey, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {AxmRadar} from '../cards/ax/money-radar';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Spending radar" — the categories of a period as spokes, this period as the lit
 * polygon and the same stretch of the period before as a dim dashed one; eight spokes at most, the rest summed as
 * "Other". The period is the question's (`period`), else this month. When nothing was logged in the period before, no
 * second polygon is drawn and the words say so (unknown, never zero). The money log's own amounts, one currency.
 */
export default function SpendingRadar({size, params}: AxProps) {
  return <MoneyLogSource kind="expense">{(entries, today) => <Radar entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function Radar({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const view = useMemo(() => spendingRadar(entries, widgetPeriod(params?.period, today, 'this-month'), today), [entries, params?.period, today]);
  const label = periodLabel(view.period, today), lead = view.spokes[0], known = view.beforeCents !== null, was = view.before ? spanWords(view.before.from, view.before.to) : 'the period before';
  if (view.state !== 'live' || !lead) return <CardNotice kind="empty" ghost="ring" title={`Nothing logged as spent ${label}`} href="/app/wealth#spending" action="Log what you spent">{view.lastDate ? `Your last entry is from ${formatDate(view.lastDate, {year: !view.lastDate.startsWith(today.slice(0, 4))})}.` : 'Log it on Wealth and it shows here.'}</CardNotice>;
  return <AxBody kind="spending-radar" size={size}>
    <AxmHead figure={view.total} label={`spent · ${label}`} note={`Most on ${lead.label} (${lead.percent}) · ${known ? `${view.beforeTotal} in ${was}` : `nothing logged in ${was}`}`}/>
    {size !== 'S' && <AxmSplit rows={size === 'L' ? view.spokes.length : 0}>
      <AxmRadar spokes={view.spokes} max={view.max} before={known}/>
      {size === 'L' && <AxmLegend items={view.spokes.map(s => ({key: s.key, name: s.label, value: `${s.nowText}${s.now ? ` · ${s.percent}` : ''}`, ...(known ? {sub: `before: ${s.beforeText}`} : {})}))}/>}
    </AxmSplit>}
    {size === 'L' && <AxmKey items={[['now', label], ...(known ? [['before', was] as const] : [])]}/>}
    <CardFoot source="Your money log" asOf={`${label}${view.lastDate ? ` · last entry ${formatDate(view.lastDate, {year: false})}` : ''}`}/>
    <HoloTable caption={`Spending by category, ${label} beside ${was}${view.currency ? `, in ${view.currency}` : ''}`} rows={[
      [`Spent ${label}`, `${view.total} in ${view.entries} ${view.entries === 1 ? 'entry' : 'entries'}`],
      [`Spent in ${was}`, known ? view.beforeTotal! : 'Nothing logged'],
      ...view.spokes.map(s => [s.label === 'Other' && view.folded ? `Other (${view.folded} categories)` : s.label, `${s.nowText}${s.now ? `, ${s.percent} of the total` : ''}; before: ${s.beforeText}`] as const),
      ...view.others.map(o => [`Also in ${o.currency}`, `${o.text}, never converted`] as const),
    ]}/>
  </AxBody>;
}
