'use client';
import {usePlatform} from '../../platform/use-platform';
import {useMarketQuotes} from '../../platform/use-market-quotes';
import {amount} from '../../platform/common';
import {marketRefKey} from '../../../lib/market-assets';
import {formatPrice, formatTime} from '../../../lib/visual-format';
import type {WidgetSize} from '../../../lib/nova/store';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Market watch" (only once the person chose markets): the markets they follow (Wealth's watch list) with each price and
 * its time, from the same quotes as Wealth. A price that has not arrived says so; it is never shown as zero.
 */
export default function MarketsWidget({size}: {size: WidgetSize}) {
  const store = usePlatform(), list = store.loaded && !store.error ? store.data.watchlist : [];
  const market = useMarketQuotes(list.map(a => ({marketRef: a.ref, currency: 'USD' as const})));
  if (!store.loaded) return <NovaReading/>;
  if (store.error) return <NovaUnread what="Your market watch"/>;
  if (!list.length) return <NovaEmpty pillar="wealth" ghost="wave" href="/app/markets" action="Follow a market">You follow no markets yet.</NovaEmpty>;
  return <ul className="nova-markets hw-markets">{list.slice(0, size === 'S' ? 2 : size === 'M' ? 4 : 8).map(a => {
    const key = marketRefKey(a.ref), q = market.quotes.find(x => x.marketRef && marketRefKey(x.marketRef) === key && x.currency === 'USD');
    return <li key={key} className="hw-row" data-priced={q ? '' : undefined}><span className="nova-market-name">{a.symbol || a.name}</span>{q ? <span className="nova-market-price">{formatPrice(amount(q.price, q.priceDecimals), 'USD')}{q.observedAt ? <small> · {formatTime(q.observedAt)}</small> : null}</span> : <small>Price not in yet</small>}</li>;
  })}</ul>;
}
