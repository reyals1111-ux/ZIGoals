'use client';
import {useMemo} from 'react';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {cashFlowCard, cashFlowRows} from '../../../lib/nova/cards/money-more';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Columns, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2; ADR-040 Part 6): "Cash flow" in gold — what the person logged coming in and going out
 * this month, the last six months of spending as columns, and at Large who this month's spending went to, beside last
 * month (Wealth → Spending → Month by month and Top payees' own engine, lib/money-insights/cash-flow.ts; figures in
 * lib/nova/cards/money-more.ts). One currency at a time, never converted; a month without a record is an empty slot,
 * never a zero; nothing is projected. Read only: nothing here moves money.
 */
export default function CashFlowWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => cashFlowCard(log.data, today), [log.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!log.loaded) return <HoloReading/>;
  if (log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="columns" title="Nothing logged yet" href="/app/wealth#spending" action="Log income or spending">Log what comes in and what goes out on Wealth. Each month then stands here beside the others.</CardNotice>;
  const foot = <CardFoot source="Your Wealth records" asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption={`Cash flow${card.currency ? `, in ${card.currency}` : ''}`} rows={cashFlowRows(card)}/>;
  const chart = <Columns values={card.months.map(m => m.spending === null ? null : m.spending / 100)} labels={card.months.map(m => m.label)} height={size === 'L' ? 84 : 48} mark={card.months.length - 1}/>;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={card.net ?? '—'} label={card.netCents === null ? `Nothing logged in ${card.monthName}` : card.netCents === 0 ? `As much in as out · ${card.monthName}` : `More ${card.netCents > 0 ? 'in than out' : 'out than in'} · ${card.monthName}`}>
      {size !== 'S' && card.income && card.spending && <p className="nx-note">{card.income} in · {card.spending} out</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">Spent each month · {card.currency}</p>}
      {chart}
      {/* One column for the chart and the payees under it (two columns of their own lay over each other in a wide Large panel: round 3). */}
      {size === 'L' && card.payees.length > 0 && <p className="nx-cap">Paid to, this month</p>}
      {size === 'L' && card.payees.length > 0 && <NxRows label="This month’s payees" where="the Wealth page" min={0} rows={card.payees.map(p => ({key: p.key, name: p.name, value: p.text, sub: p.last === null ? 'Last month holds no record' : `Last month ${p.last}`}))}/>}
    </div>}
    {size === 'L' && card.others.length > 0 && <p className="nx-note">Also logged in {card.others.join(', ')}: never converted, never added.</p>}
    {foot}{table}
  </div>;
}
