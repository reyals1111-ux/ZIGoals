'use client';
import {useMemo} from 'react';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {spendingAsOf, spendingCard, spendingRows} from '../../../lib/nova/cards/spending';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Fact, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/wealth-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Wealth): "Spending" in gold: what the person logged as spent in the range (this
 * month so far unless the request names a range), from their own money log with the log's own sums (Wealth → Spending;
 * lib/nova/cards/spending.ts). The hero is the total of the leading currency; the categories are meters by their share
 * of that total; the largest single entry is one line. Another currency is named apart, never converted, never added.
 * Nothing logged is said as such, never as a zero. Its one link opens Wealth; nothing here moves money.
 */
const SHOWN = {S: 0, M: 3, L: 5} as const;
export default function SpendingWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), log = useDeviceRecord(MONEY_LOG), today = useLocalToday(), range = params?.range;
  const card = useMemo(() => spendingCard(log.data, today, range), [log.data, today, range]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!log.loaded) return <HoloReading/>;
  if (log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" title="Nothing logged yet" href="/app/wealth#spending" action="Log what you spent">Log what you spend on Wealth and it adds up here by category.</CardNotice>;
  if (card.state === 'quiet') return <div className="nc-body nc-spending-card" data-size={size}>
    <CardNotice kind="empty" title={`Nothing logged as spent ${card.window.words}`} href="/app/wealth#spending" action="Log what you spent">Your last entry is from {card.lastDate ? formatDate(card.lastDate, {year: !card.lastDate.startsWith(today.slice(0, 4))}) : 'earlier'}.</CardNotice>
    <CardFoot source="Your Wealth records" asOf={spendingAsOf(card)}/>
    <HoloTable caption="Spending" rows={spendingRows(card)}/>
  </div>;
  const top = card.categories.slice(0, SHOWN[size]), more = card.categories.length - top.length;
  return <div className="nc-body nc-spending-card" data-size={size}>
    <Hero value={card.total} label={size === 'L' ? `Spent ${card.window.words}` : card.window.words.replace(/^in /, '')}>
      {size !== 'S' && card.others.length > 0 && <p className="nc-spending-note">{card.others.map(o => `+ ${o.text} in ${o.currency}`).join(' · ')} · never converted</p>}
    </Hero>
    {top.length > 0 && <div className="nc-spending-bars">
      {size === 'L' && <p className="nc-spending-caption">By category · share of the total</p>}
      <Bars rows={top.map(c => ({key: c.category, label: c.category, share: c.share, value: `${c.text} · ${c.percent}`}))}/>
      {size === 'L' && more > 0 && <p className="nc-spending-note">{more} more {more === 1 ? 'category' : 'categories'} on Wealth.</p>}
    </div>}
    {size === 'L' && <div className="nc-facts">
      {card.largest && <Fact label="Largest entry" value={`${card.largest.text} · ${formatDate(card.largest.date, {year: false})}`}/>}
      {card.largest && <p className="nc-spending-what">{card.largest.what}</p>}
      <Fact label="Entries logged" value={String(card.entries)}/>
    </div>}
    <CardFoot source="Your Wealth records" asOf={spendingAsOf(card)}>{size === 'S' && card.others.length > 0 ? <span className="nc-spending-apart">+ spent in {card.others.map(o => o.currency).join(', ')}, never converted</span> : null}</CardFoot>
    <HoloTable caption={`Spending ${card.window.words}${card.currency ? `, in ${card.currency}` : ''}`} rows={spendingRows(card, Math.max(top.length, 3))}/>
  </div>;
}
