'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {categoryRanks, spendingCompare} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {AxTwins} from '../cards/ax/twins';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "This period and the one before" — what was logged as spent (`ref` "spending", the
 * default) or as income (`ref` "income") in a period, beside the same stretch of the period before, as two bars on one
 * scale with the difference in words (never a judgement). The period is the question's (`period`), else this month; a
 * month so far stands beside the same days of the month before. A side with nothing logged is an unlit dashed bar and
 * "nothing logged", never a zero. One currency, never converted.
 */
export default function SpendingCompare({size, params}: AxProps) {
  const kind = params?.ref === 'income' ? 'income' as const : 'expense' as const;
  return <MoneyLogSource kind={kind}>{(entries, today) => <Twins entries={entries} today={today} kind={kind} size={size} params={params}/>}</MoneyLogSource>;
}
function Twins({entries, today, kind, size, params}: {entries: readonly MoneyEntry[]; today: string; kind: 'expense' | 'income'} & AxProps) {
  const period = useMemo(() => widgetPeriod(params?.period, today, 'this-month'), [params?.period, today]);
  const view = useMemo(() => spendingCompare(entries, kind, period, today), [entries, kind, period, today]), lead = useMemo(() => categoryRanks(entries, kind, period).rows[0], [entries, kind, period]);
  const label = periodLabel(period, today), income = kind === 'income', verb = income ? 'came in' : 'spent', was = view.beforeWords ?? 'the period before', day = (date: string) => formatDate(date, {year: false});
  if (view.state !== 'live') return <CardNotice kind="empty" ghost="bars" title={income ? `No income logged ${label}` : `Nothing logged as spent ${label}`} href="/app/wealth#spending" action={income ? 'Log income' : 'Log what you spent'}>Nothing was logged in {was} either{view.lastDate ? `; your last entry is from ${day(view.lastDate)}` : ''}.</CardNotice>;
  const apart = view.others.map(o => o.text).join(', ');
  return <AxBody kind="spending-compare" size={size}>
    <AxmHead figure={view.nowCents === null ? '—' : view.now} label={`${verb} · ${label}`} note={`${view.delta} (${was})${apart ? ` · also ${apart}, never converted` : ''}`}/>
    {size !== 'S' && <AxTwins now={{label, text: view.now, value: view.nowCents}} before={{label: was, text: view.was, value: view.beforeCents}} delta={null}/>}
    {size === 'L' && lead && <AxmFacts rows={[[income ? 'Most from' : 'Most on', `${lead.label} · ${lead.text}`]]}/>}
    <CardFoot source="Your money log" asOf={`${label}${view.lastDate ? ` · last entry ${day(view.lastDate)}` : ''}`}/>
    <HoloTable caption={`${income ? 'Income' : 'Spending'} ${label} beside ${was}${view.currency ? `, in ${view.currency}` : ''}`} rows={[
      [`${income ? 'Came in' : 'Spent'} ${label}`, view.nowCents === null ? 'Nothing logged' : view.now], [`${income ? 'Came in' : 'Spent'} in ${was}`, view.beforeCents === null ? 'Nothing logged' : view.was], ['The difference', view.delta],
      ...view.others.map(o => [`Also in ${o.currency}`, `${o.text}, never converted`] as const),
    ]}/>
  </AxBody>;
}
