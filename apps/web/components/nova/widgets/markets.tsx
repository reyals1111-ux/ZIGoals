'use client';
import {usePlatform} from '../../platform/use-platform';
import {useMarketQuotes} from '../../platform/use-market-quotes';
import {amount} from '../../platform/common';
import {marketRefKey} from '../../../lib/market-assets';
import {formatPrice, formatTime} from '../../../lib/visual-format';
import type {WidgetSize} from '../../../lib/nova/store';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {WholeRows} from '../cards/whole-rows';
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
  // Session AM-2 (whole rows only): the markets that fit, then "+N more on the Markets page".
  const shown = list.slice(0, size === 'S' ? 2 : size === 'M' ? 4 : 8);
  // Round 4: each market is a tile (its symbol, its price as a figure, the price's time); a price that is not in is "—" on
  // an unlit tile, and when none is in the panel says so once (never one "Price not in yet" a row).
  const quote = (a: (typeof list)[number]) => { const key = marketRefKey(a.ref); return market.quotes.find(x => x.marketRef && marketRefKey(x.marketRef) === key && x.currency === 'USD'); };
  const none = !shown.some(quote);
  return <div className="hw-markets-box" data-size={size}>
    <WholeRows wrapClassName="hw-markets-rows" className="nova-markets hw-markets" extra={list.length - shown.length} min={1} more={(hidden, rows) => moreWords(hidden, {shown: rows, where: 'the Markets page'})}>{shown.map(a => {
      const q = quote(a);
      return <li key={marketRefKey(a.ref)} className="hw-row" data-priced={q ? '' : undefined}><span className="nova-market-name">{a.symbol || a.name}</span>
        {q ? <><span className="nova-market-price">{formatPrice(amount(q.price, q.priceDecimals), 'USD')}</span>{q.observedAt ? <small>{formatTime(q.observedAt)}</small> : null}</>
          : <><span className="nova-market-price" aria-hidden="true">—</span><small className={none ? 'sr-only' : undefined}>Price not in yet</small></>}</li>;
    })}</WholeRows>
    {none && <p className="hw-markets-note" aria-hidden="true">Prices are not in yet. Each shows here with its time once it arrives.</p>}
  </div>;
}
