'use client';
import {useMemo} from 'react';
import {BUDGETS} from '../../../lib/budgets/schema';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {budgetsAsOf, budgetsCard, budgetsRows} from '../../../lib/nova/cards/budgets';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Fact, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/wealth-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Wealth): "Budgets" in gold: each monthly budget against what the money log
 * shows spent in its category this month, as meters (the Wealth page's own month view, lib/budgets/engine.ts monthView;
 * figures in lib/nova/cards/budgets.ts). The hero counts the budgets within plan ("3 of 4"); a budget above its amount
 * is striped and says so in words ("over by €40.00"). Each budget keeps its own currency; nothing is converted or added
 * across currencies. Facts from the log, no projection, no advice; its one link opens Wealth.
 * AM-2: the count beside a ring of the budgets within plan, each budget a row over a ticked meter with a white-hot
 * leading end (coral and striped once it is over).
 */
const SHOWN = {S: 0, M: 3, L: 5} as const;
export default function BudgetsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), budgets = useDeviceRecord(BUDGETS), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => budgetsCard(budgets.data, log.data.entries, today), [budgets.data, log.data.entries, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!budgets.loaded || !log.loaded) return <HoloReading/>;
  if (budgets.unreadable || log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No budget yet" href="/app/wealth?view=budgets" action="Set a budget">Give a category a monthly amount on Wealth and it fills here as you log.</CardNotice>;
  const top = card.lines.slice(0, SHOWN[size]), more = card.lines.length - top.length;
  return <div className="nc-body nc-budgets-card" data-size={size}>
    <div className="nc-budgets-top">
      {size !== 'S' && <Gauge share={card.count ? card.within / card.count : null} size={size === 'L' ? 76 : 50} spin={size === 'L'} decor className="nc-budgets-ring"/>}
      <Hero value={card.hero} label={`${card.count === 1 ? 'budget' : 'budgets'} within plan`}/>
    </div>
    {top.length > 0 && <div className="nc-budgets-bars">
      {size === 'L' && <p className="nc-budgets-caption">Spent this month · of each budget</p>}
      <Bars rows={top.map(l => ({key: l.id, label: l.category, share: l.share, over: l.over, value: size === 'L' ? `${l.spent} of ${l.available}` : l.words, ...(size === 'L' && (l.over || top.length <= 4) ? {note: l.words} : {})}))}/>
      {size === 'L' && more > 0 && <p className="nc-budgets-note">{more} more {more === 1 ? 'budget' : 'budgets'} on Wealth.</p>}
    </div>}
    {size === 'L' && (card.daysLeft !== null || card.unbudgeted.length > 0) && <div className="nc-facts">
      {card.daysLeft !== null && <Fact label="Left in this month" value={card.daysLeft === 1 ? 'the last day' : `${card.daysLeft} days`}/>}
      {card.unbudgeted.slice(0, 2).map(u => <Fact key={u.currency} label="Spent with no budget" value={u.text}/>)}
    </div>}
    <CardFoot source="Your Wealth records" asOf={budgetsAsOf(card)}/>
    <HoloTable caption="Budgets this month" rows={budgetsRows(card, Math.max(top.length, 3))}/>
  </div>;
}
