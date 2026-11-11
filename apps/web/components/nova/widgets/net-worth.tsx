'use client';
import {useMemo} from 'react';
import {uniqueMarketRequests} from '../../../lib/market-assets';
import {NET_WORTH_RANGE, changeWords, netWorthAsOf, netWorthCard, netWorthRows} from '../../../lib/nova/cards/net-worth';
import {wealthHud} from '../../../lib/nova/holo/wealth';
import {formatDate, formatPercent, formatTime} from '../../../lib/visual-format';
import {marketPricesLine, wealthMarketRequests, wealthOverview} from '../../../lib/wealth';
import {useEvidenceNow} from '../../platform/use-evidence-now';
import {useMarketQuotes} from '../../platform/use-market-quotes';
import {usePlatform} from '../../platform/use-platform';
import {wealthMoney} from '../../platform/wealth-money';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Delta, Fact, Hero, TrendArea, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/wealth-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Wealth): "Net worth" in gold. The hero is the tracked wealth of the headline
 * currency exactly as the wealth HUD words it (lib/nova/holo/wealth.ts wealthHud over the Wealth page's own overview and
 * quotes; "known so far" while a holding has no value yet, other currencies named apart and never converted). Under it,
 * the change between the first and the last *recorded* valuation in the range (only with two of them, with its date) and
 * the recorded-valuation line, a day at its own place. The foot names the newest valuation and, where the total follows
 * market prices, their time (lib/wealth.ts marketPricesLine, as the Wealth page says it). ZIGoals never moves money; this
 * only reads, and its one link opens Wealth. Figures: lib/nova/cards/net-worth.ts.
 */
/** The wealth HUD's figures (the same requests and quotes as `useWealthHud`), with the time of the market prices behind the total. */
function useNetWorth() {
  const store = usePlatform();
  const requests = useMemo(() => store.loaded && !store.error ? uniqueMarketRequests([...wealthMarketRequests(store.data), ...store.data.positions.flatMap(p => p.marketRef && !p.archivedAt && (p.marketRef.kind !== 'rwa' || (p.quoteCurrency ?? 'USD') === 'USD') ? [{marketRef: p.marketRef, currency: p.quoteCurrency ?? 'USD' as const}] : [])]) : false, [store.loaded, store.error, store.data]);
  const market = useMarketQuotes(requests), now = useEvidenceNow(store.data, market.now);
  const read = useMemo(() => {
    if (!store.loaded || store.error) return null;
    try { const overview = wealthOverview(store.data, now, market.quotes); return {hud: wealthHud(overview), prices: marketPricesLine(overview.rows)}; } catch { return null; }
  }, [store.loaded, store.error, store.data, now, market.quotes]);
  return {read, loaded: store.loaded, error: !!store.error || (store.loaded && !read)};
}
const day = (at: string, today: string) => { try { return formatDate(at, {year: !at.startsWith(today.slice(0, 4))}); } catch { return '—'; } };
const percent = (value: number) => formatPercent(value, {decimals: 1, signed: true});

export default function NetWorthWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), {read, loaded, error} = useNetWorth(), today = useLocalToday();
  const range = params?.range ?? NET_WORTH_RANGE;
  const card = useMemo(() => read ? netWorthCard(read.hud, today, range) : null, [read, today, range]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !read || !card) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" title="Nothing tracked yet" href="/app/wealth?add=asset" action="Add an asset">Add what you own on Wealth and its recorded valuations draw here.</CardNotice>;
  const cur = card.currency ?? '', money = (cents: bigint) => wealthMoney(cents, cur), on = (at: string) => day(at, today);
  const first = card.points[0], last = card.points.at(-1);
  return <div className="nc-body nc-networth-card" data-size={size}>
    <Hero value={card.total === null ? '—' : money(card.total)} label={card.knownSoFar ? (size === 'S' ? 'Known so far' : 'Tracked wealth · known so far') : 'Tracked wealth'}>
      {card.total === null && <p className="nc-networth-note">Not valued yet: your holdings have no known value.</p>}
      {size !== 'S' && card.otherCurrencies.length > 0 && <p className="nc-networth-note">+ held in {card.otherCurrencies.join(', ')} · never converted</p>}
      {size !== 'S' && card.change && <Delta text={changeWords(card.change, money, percent, on)} direction={card.change.direction} good={card.change.direction === 'up' ? true : card.change.direction === 'down' ? false : null}/>}
    </Hero>
    {size !== 'S' && (card.points.length > 1 && first && last
      ? <div className="nc-networth-line">
        {size === 'L' && <p className="nc-networth-caption">Recorded valuations · {card.rangeWords}</p>}
        <TrendArea values={card.series} height={size === 'L' ? 112 : 44} labels={[on(first.at), on(last.at)]}
          {...(size === 'L' && card.high && card.low && card.high.cents !== card.low.cents ? {maxLabel: money(card.high.cents), minLabel: money(card.low.cents)} : {})}/>
      </div>
      : <p className="nc-networth-note">{card.points.length === 1 && first ? `One valuation recorded in ${card.rangeWords} (${on(first.at)}). A change shows once there are two.` : `No valuation recorded in ${card.rangeWords}, so there is no change to show.`}</p>)}
    {size === 'L' && <div className="nc-facts">
      {card.high && card.low && card.points.length > 1 && <><Fact label="Highest recorded" value={`${money(card.high.cents)} · ${on(card.high.at)}`}/><Fact label="Lowest recorded" value={`${money(card.low.cents)} · ${on(card.low.at)}`}/></>}
      {last && card.points.length > 1 && last.cents !== card.high?.cents && last.cents !== card.low?.cents && <Fact label="Last recorded" value={`${money(last.cents)} · ${on(last.at)}`}/>}
      {last && card.points.length === 1 && <Fact label="Recorded" value={`${money(last.cents)} · ${on(last.at)}`}/>}
      {card.points.length > 1 && <Fact label="Valuations recorded" value={String(card.points.length)}/>}
    </div>}
    {size === 'L' && card.knownSoFar && <p className="nc-networth-note">A holding without a value is not counted as zero: this total is what is known so far.</p>}
    <CardFoot source="Your Wealth records" asOf={netWorthAsOf(card.lastAt, size === 'S' ? undefined : read.prices, on, formatTime)}>{size === 'S' && card.otherCurrencies.length > 0 ? <span className="nc-networth-apart">+ held in {card.otherCurrencies.join(', ')}, never converted</span> : null}</CardFoot>
    <HoloTable caption={`Net worth in ${cur || 'your currency'}, ${card.rangeWords}`} rows={netWorthRows(card, money, percent, on)}/>
  </div>;
}
