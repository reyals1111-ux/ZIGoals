'use client';
import {useMemo} from 'react';
import {priceAlertsCard, priceAlertsRows} from '../../../lib/nova/cards/money-more';
import {PRICE_ALERTS} from '../../../lib/price-alerts/schema';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Price alerts" in gold — the alerts the person set on Markets: which are waiting,
 * which have fired and when (lib/price-alerts; figures in lib/nova/cards/money-more.ts). A read-only list in each
 * alert's own words: this widget asks no price and checks nothing (alerts are checked where prices are read, on the
 * app's own pages), sets no alert and trades nothing. Like Market watch it reads under Wealth's switch and shows only
 * while Markets is in use.
 */
const SHOWN = {S: 0, M: 2, L: 6} as const;
export default function PriceAlertsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), record = useDeviceRecord(PRICE_ALERTS);
  const card = useMemo(() => { try { return priceAlertsCard(record.data); } catch { return null; } }, [record.data]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!record.loaded) return <HoloReading/>;
  if (record.unreadable || !card) return <HoloUnread what="Your price alerts"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="No price alerts yet" href="/app/markets" action="Set a price alert">Set an alert on Markets for a price you want to hear about. It waits here until it fires.</CardNotice>;
  const day = (at: string) => formatDate(at.slice(0, 10), {year: false}), lines = card.lines.slice(0, SHOWN[size]);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={String(card.waiting)} unit="waiting" label={size === 'S' ? 'Price alerts' : `Price alerts · ${card.fired} fired`}>
      {size !== 'S' && card.unseen > 0 && <p className="nx-note" data-tone="watch">{card.unseen} fired and not seen yet</p>}
    </Hero></div>
    {lines.length > 0 && <div className="nx-main" data-fit="rows">
      <NxRows label="Your price alerts" where="the Markets page" extra={card.lines.length - lines.length} rows={lines.map(l => ({key: l.id, name: l.words, value: l.stateWords, sub: l.at ? `Fired ${day(l.at)}` : null}))}/>
    </div>}
    {size === 'L' && card.last && <p className="nx-note">Last fired, {day(card.last.at)}: {card.last.text}</p>}
    {size === 'L' && <p className="nx-note">A read-out of your alerts. Nothing here asks a price, sets an alert or trades.</p>}
    <CardFoot source="Your price alerts" asOf="as kept on this device"/>
    <HoloTable caption="Price alerts" rows={priceAlertsRows(card, day, Math.max(SHOWN[size], 3))}/>
  </div>;
}
