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
  // Session AR (Part 2; the critics: "a small figure in dead space"): the months are the instrument at every size but the
  // smallest — six months of spending as columns that take the panel's height, this month's lit. This month's in and out
  // are one line under the figure; who the spending went to is one more line where the panel is tall (`data-extra`,
  // cards/tiers.css). Every payee and last month's figures stay in the table.
  const chart = <Columns values={card.months.map(m => m.spending === null ? null : m.spending / 100)} labels={card.months.map(m => m.label)} height={size === 'L' ? 120 : 72} mark={card.months.length - 1}/>;
  const payees = card.payees.slice(0, 2);
  return <div className="nc-body nx-card nx-flow" data-size={size} data-lay="chart">
    <div className="nx-top"><Hero value={card.net ?? '—'} label={card.netCents === null ? `Nothing logged in ${card.monthName}` : card.netCents === 0 ? `As much in as out · ${card.monthName}` : `More ${card.netCents > 0 ? 'in than out' : 'out than in'} · ${card.monthName}`}>
      {size !== 'S' && <p className="nx-note nx-flow-io"><span>In <b>{card.income ?? 'nothing logged'}</b></span><span>Out <b>{card.spending ?? 'nothing logged'}</b></span></p>}
      {size !== 'S' && payees.length > 0 && <p className="nx-note" data-extra="">Most to {payees.map(p => `${p.name} (${p.text})`).join(' and ')}.</p>}
      {size === 'L' && card.others.length > 0 && <p className="nx-note" data-extra="">Also logged in {card.others.join(', ')}: never converted, never added.</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main" data-keep="">
      <p className="nx-cap">Spent each month · {card.currency}</p>
      {chart}
    </div>}
    {foot}{table}
  </div>;
}
