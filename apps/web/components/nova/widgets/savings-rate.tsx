'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {savingsRate} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatDate, formatPercent} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmArc} from '../cards/ax/money-gauge';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Share of income not spent" — the income logged in a period less what was logged
 * as spent, as a share of that income, on one arc. Figures from the money log and nothing else: it is not advice and not
 * a judgement, and it counts only what was logged (money moved to savings is not an entry here). With no income logged
 * it says so and draws an unlit gauge; when more went out than came in, the arc is empty and the words say by how much.
 * The period is the question's (`period`), else this month. One currency, never converted.
 */
export default function SavingsRate({size, params}: AxProps) {
  return <MoneyLogSource>{(entries, today) => <Rate entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function Rate({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const view = useMemo(() => savingsRate(entries, widgetPeriod(params?.period, today, 'this-month')), [entries, params?.period, today]);
  const label = periodLabel(view.period, today), live = view.state === 'live' && view.rate !== null, beyond = live && view.keptCents! < 0, figure = live ? formatPercent(Math.abs(view.rate!)) : '—';
  const head = live ? {label: `${beyond ? 'of income spent beyond it' : 'of income not spent'} · ${label}`, note: `${view.income} in · ${view.spending} out · ${view.kept} ${beyond ? 'more out than in' : 'not spent'}`}
    : view.state === 'no-income' ? {label: `no income logged · ${label}`, note: view.spendingCents === null ? 'Nothing logged as spent either' : `${view.spending} logged as spent, so no share to state`}
    : {label: `nothing logged as spent · ${label}`, note: `${view.income} came in, so no share to state`};
  return <AxBody kind="savings-rate" size={size}>
    <AxmHead figure={figure} {...head}/>
    {size !== 'S' && <div className="axm-solo axm-inst" aria-hidden="true"><AxmArc size="solo" share={live ? Math.max(0, view.rate! / 100) : null} over={beyond} figure={figure} marks={[25, 50, 75]}/></div>}
    {size === 'L' && <AxmFacts rows={[['Came in', view.income], ['Went out', view.spending]]}/>}
    {size === 'L' && <p className="axm-note">Counted from your money log alone. A figure, not advice.</p>}
    <CardFoot source="Your money log" asOf={`${label}${view.lastDate ? ` · last entry ${formatDate(view.lastDate, {year: false})}` : ''}`}/>
    <HoloTable caption={`Income and spending ${label}${view.currency ? `, in ${view.currency}` : ''}`} rows={[
      ['Income logged', view.income], ['Logged as spent', view.spending],
      ...(live ? [[beyond ? 'More out than in' : 'Not spent', view.kept] as const, [beyond ? 'Spent beyond the income, as a share of it' : 'Share of the income not spent', figure] as const] : [['Share of the income not spent', view.state === 'no-income' ? 'No income logged, so no share to state' : 'Nothing logged as spent, so no share to state'] as const]),
      ...(view.others.length ? [['Other currencies', `${view.others.join(', ')}, never converted`] as const] : []),
    ]}/>
  </AxBody>;
}
