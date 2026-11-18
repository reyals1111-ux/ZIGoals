'use client';
import {periodLabel} from '../../../../lib/nova/cards/ax/calendar';
import type {MoneyRanks} from '../../../../lib/nova/cards/ax/money-spend';
import type {WidgetSize} from '../../../../lib/nova/store';
import {formatDate} from '../../../../lib/visual-format';
import {HoloTable} from '../../holo/parts';
import {CardFoot, CardNotice} from '../kit';
import {AxBody} from './kit';
import {AxmFacts, AxmHead} from './money-kit';
import {AxRanks} from './ranks';

/**
 * Session AS (ADR-042 Part 2, family 2 again: ranked bars): the body the two money rankings share — the categories of a
 * period by amount, the largest first, each bar with its amount and its share of the total as a whole percent. One
 * currency leads; another is named beside it, never converted and never added. A period with nothing logged says so and
 * draws no bar (never a zero). Compact: the total and its words. A hero lists up to eight categories.
 */
export function AxmRanksBody({id, view, today, size}: {id: string; view: MoneyRanks; today: string; size: WidgetSize}) {
  const label = periodLabel(view.period, today), income = view.kind === 'income', verb = income ? 'came in' : 'spent', day = (date: string) => formatDate(date, {year: !date.startsWith(today.slice(0, 4))});
  if (view.state !== 'live') return <CardNotice kind="empty" ghost="bars" title={income ? `No income logged ${label}` : `Nothing logged as spent ${label}`} href="/app/wealth#spending" action={income ? 'Log income' : 'Log what you spent'}>{view.lastDate ? `Your last entry is from ${day(view.lastDate)}.` : 'Log it on Wealth and it shows here.'}</CardNotice>;
  const cap = size === 'L' ? 8 : 5, shown = view.rows.slice(0, cap), more = view.rows.length - shown.length, lead = view.rows[0], apart = view.others.map(o => o.text).join(', ');
  return <AxBody kind={id} size={size}>
    <AxmHead figure={view.total} label={`${verb} · ${label}`} note={lead ? `Most ${income ? 'from' : 'on'} ${lead.label} (${lead.percent} of the total)${apart ? ` · also ${apart}, never converted` : ''}` : undefined}/>
    {size !== 'S' && <div className="axm-ranks"><AxRanks max={view.max} rows={shown.map(r => ({key: r.key, label: r.label, text: `${r.text} · ${r.percent}`, parts: [{mark: 'lit', value: r.cents}]}))} more={more > 0 ? `+${more} more on the Wealth page` : null}/></div>}
    {size === 'L' && <AxmFacts rows={[['Entries logged', String(view.entries)], [income ? 'Sources' : 'Categories', String(view.rows.length)]]}/>}
    <CardFoot source="Your money log" asOf={`${label}${view.lastDate ? ` · last entry ${day(view.lastDate)}` : ''}`}/>
    <HoloTable caption={`${income ? 'Income' : 'Spending'} by category, ${label}${view.currency ? `, in ${view.currency}` : ''}`} rows={[
      [`${income ? 'Came in' : 'Spent'} ${label}`, `${view.total} in ${view.entries} ${view.entries === 1 ? 'entry' : 'entries'}`],
      ...view.rows.map(r => [r.label, `${r.text}, ${r.percent} of the total`] as const),
      ...view.others.map(o => [`Also in ${o.currency}`, `${o.text}, never converted`] as const),
    ]}/>
  </AxBody>;
}
