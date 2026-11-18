'use client';
import {useMemo} from 'react';
import type {NetworthHistory} from '../../../lib/networth-history';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {netWorthRiver} from '../../../lib/nova/cards/ax/money-worth';
import {changeWords} from '../../../lib/nova/cards/net-worth';
import {historyMoney} from '../../../lib/nova/cards/net-worth-history';
import {formatDate, formatPercent} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {AxmRiver} from '../cards/ax/money-river';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable, HoloUnread} from '../holo/parts';
import {WorthSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Net worth river" — the net worth Wealth recorded, day by day, as one river band
 * (wider is more; the band's width runs between the lowest and the highest recorded day of the period, so the change
 * shows). The figure is the newest recorded day; the change is from the first to the last day with a known net worth,
 * in words. A day Wealth did not record is a gap in the river, never filled in and never a zero. The period is the
 * question's (`period`), else the last 90 days. Recorded values only: nothing is projected. One currency, never
 * converted; ZIGoals moves no money.
 */
const percent = (value: number) => formatPercent(value, {decimals: 1, signed: true});
export default function NetWorthRiver({size, params}: AxProps) {
  return <WorthSource>{(history, today) => <River history={history} today={today} size={size} params={params}/>}</WorthSource>;
}
function River({history, today, size, params}: {history: NetworthHistory; today: string} & AxProps) {
  const token = params?.period;
  const view = useMemo(() => { try { return netWorthRiver(history, widgetPeriod(token, today, 'last-90-days'), today); } catch { return null; } }, [history, token, today]);
  if (!view) return <HoloUnread what="Your net-worth history"/>;
  const label = periodLabel(view.period, today), on = (day: string) => formatDate(day, {year: !day.startsWith(today.slice(0, 4))}), latest = view.latest, cur = view.currency ?? '', money = (cents: bigint) => historyMoney(cents, cur);
  if (view.state !== 'live' || !latest) return <CardNotice kind="empty" ghost="trend" title={`No day recorded ${label}`} href="/app/wealth#wealth-history" action="Record today on Wealth">{view.since ? `The history starts ${on(view.since)}. ` : ''}Wealth records your net worth once on each day you open it.</CardNotice>;
  const known = latest.cents !== null ? {day: latest.day, cents: latest.cents} : view.latestKnown, change = view.change ? changeWords(view.change, money, percent, on) : null;
  const lo = view.low ? Number(view.low.cents) / 100 : 0, hi = view.high ? Number(view.high.cents) / 100 : 0, first = view.days.find(d => d.value !== null);
  return <AxBody kind="net-worth-river" size={size}>
    <AxmHead figure={known ? money(known.cents) : '—'} label={latest.cents !== null ? `net worth · ${on(latest.day)}` : known ? `last known · ${on(known.day)}` : 'net worth not known'} tone={latest.cents === null ? 'watch' : undefined}
      note={latest.cents === null ? `Not known on ${on(latest.day)}: no value for ${latest.missing.slice(0, 2).join(', ')}` : change ?? `One day with a known net worth ${label}, so no change to state`}/>
    {size !== 'S' && <AxmRiver breaks upper={view.days.map(d => d.value === null ? null : hi > lo ? 0.3 + 0.7 * (d.value - lo) / (hi - lo) : 0.6)} start={on(view.days[0]!.day)} end={on(view.days.at(-1)!.day)} caption={view.notRecorded ? 'recorded days · a gap was not recorded' : 'recorded days'}/>}
    {size === 'L' && view.high && view.low && <AxmFacts rows={[['Highest', `${money(view.high.cents)} · ${on(view.high.day)}`], ['Lowest', `${money(view.low.cents)} · ${on(view.low.day)}`], ['Days recorded', `${view.recorded}${view.notRecorded ? ` · ${view.notRecorded} not recorded` : ''}`]]}/>}
    <CardFoot source="Your Wealth records" asOf={`${label} · last recorded ${on(latest.day)}`}/>
    <HoloTable caption={`Recorded net worth in ${cur || 'your currency'}, ${label}`} rows={[
      [`Net worth on ${on(latest.day)}`, latest.cents === null ? `Not known: no value for ${latest.missing.join(', ')}` : money(latest.cents)],
      ...(latest.cents === null && view.latestKnown ? [[`Last known, ${on(view.latestKnown.day)}`, money(view.latestKnown.cents)] as const] : []),
      ...(first && first.day !== latest.day ? [[`Net worth on ${on(first.day)}`, historyMoney(BigInt(Math.round(first.value! * 100)), cur)] as const] : []),
      [`Change ${label}`, change ?? 'Fewer than two days with a known net worth, so no change to state'],
      ...(view.high && view.low && view.high.day !== view.low.day ? [['Highest', `${money(view.high.cents)} on ${on(view.high.day)}`] as const, ['Lowest', `${money(view.low.cents)} on ${on(view.low.day)}`] as const] : []),
      ['Days recorded', `${view.recorded}${view.notRecorded ? `; ${view.notRecorded} not recorded, shown as gaps` : ''}${view.unknownDays ? `; ${view.unknownDays} without a known value` : ''}`],
      ...(view.otherCurrencies.length ? [['Other currencies', `${view.otherCurrencies.join(', ')}, never converted`] as const] : []),
    ]}/>
  </AxBody>;
}
