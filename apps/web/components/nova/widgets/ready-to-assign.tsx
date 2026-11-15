'use client';
import {useMemo} from 'react';
import {BUDGETS} from '../../../lib/budgets/schema';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {readyCard, readyRows} from '../../../lib/nova/cards/money-insights';
import {formatPercent} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Fact, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 3): "Ready to assign" in gold — this month's logged income
 * minus what the month's budgets hold, one currency at a time, with the Budgets view's own engine
 * (lib/budgets/ready-to-assign.ts; figures in lib/nova/cards/money-insights.ts). The ring is the share of the income the
 * budgets hold (decoration: the words carry it); more budgeted than logged reads as that, in words and in coral. No
 * income logged is said, never a zero. From records only: no forecast, no advice; nothing is assigned or moved from here.
 */
export default function ReadyToAssignWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), budgets = useDeviceRecord(BUDGETS), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => readyCard(log.data, budgets.data, today), [log.data, budgets.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!budgets.loaded || !log.loaded) return <HoloReading/>;
  if (budgets.unreadable || log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  const r = card.lead;
  if (card.state === 'empty' || !r) return <CardNotice kind="empty" ghost="ring" title="Nothing to assign yet" href="/app/wealth?view=budgets" action="Set a budget">Log this month’s income on Wealth and give your categories a monthly amount. What is left to assign shows here.</CardNotice>;
  const others = card.rows.filter(x => x !== r);
  const label = r.status === 'no-income' ? 'No income logged this month' : r.over ? 'More in budgets than income' : 'Ready to assign';
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={r.share} figure={r.share !== null ? formatPercent(r.share * 100) : '—'} caption="in budgets" tone={r.over ? 'over' : undefined} spin={size === 'L'}/>
    <NxHead label={size === 'S' ? label : `${label} · ${card.monthName}`} title={r.ready ?? '—'}/>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      <Bars rows={[
        {key: 'income', label: 'Logged as income', share: r.status === 'ok' ? 1 : null, value: r.income ?? 'Nothing logged'},
        {key: 'held', label: 'Your budgets hold', share: r.status === 'ok' ? r.share : null, value: r.held, over: r.over},
      ]}/>
      {size === 'L' && others.length > 0 && <div className="nc-facts">{others.slice(0, 3).map(o => <Fact key={o.currency} label={`In ${o.currency}`} value={o.status === 'ok' ? (o.over ? `${o.ready} over` : `${o.ready} ready`) : 'No income logged'}/>)}</div>}
      {size === 'L' && <p className="nx-note">From your money log and budgets only. What rolls over from earlier months is not counted again, and nothing is assigned or moved from here.</p>}
    </div>}
    <CardFoot source="Your Wealth records" asOf={`${card.monthName} so far`}/>
    <HoloTable caption="Ready to assign" rows={readyRows(card)}/>
  </div>;
}
