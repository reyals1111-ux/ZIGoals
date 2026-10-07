'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {createMarketHistoryCache, fetchPublicMarketHistory, formatHistoryValue, type MarketHistoryResult} from '../../lib/market-history';
import {formatDate, formatDateTime, formatMoney, formatSignedMoney} from '../../lib/visual-format';
import {coinKey, type Portfolio} from '../../lib/portfolio/schema';
import {PortfolioDecimal} from '../../lib/portfolio/math';
import {VALUE_RANGES, coinsInWindow, rangeWindow, valueSeries, type PricePoint, type ValueRange} from '../../lib/portfolio/performance';
import {showcasePrices} from '../../lib/portfolio/showcase';
import {percent} from './portfolio-sections';
import './value-chart.css';

const cache = createMarketHistoryCache((request, refresh) => fetchPublicMarketHistory(request, refresh));
const LABEL: Record<ValueRange, string> = {'24h': '24H', '7d': '7D', '30d': '30D', '90d': '90D', '1y': '1Y', all: 'All'};
/** At most this many coins are charted, so one view never asks the market service for more than ten histories. */
export const MAX_CHART_COINS = 10;
const W = 760, H = 220, TOP = 16, BOTTOM = 196, LEFT = 8, RIGHT = 752;

/**
 * Value over time (Session W Part 15): what the portfolio held at each moment times each coin's observed price then,
 * from CoinGecko's dated history (one history per coin, asked one after another), or the Showcase's labelled fixture
 * line. A moment with a held coin but no observed price is a gap. The scale fits the values; it does not start at 0.
 */
export function PortfolioValueChart({portfolio, showcase}: {portfolio: Portfolio; showcase: boolean}) {
  const id = useId(), [range, setRange] = useState<ValueRange>('30d'), [now, setNow] = useState(() => Date.now()), [inspect, setInspect] = useState<number | null>(null);
  const span = useMemo(() => rangeWindow(range, portfolio.transactions, now), [range, portfolio.transactions, now]);
  const coins = useMemo(() => coinsInWindow(portfolio, span.start), [portfolio, span.start]);
  const refs = useMemo(() => new Map(portfolio.coins.map(c => [coinKey(c.ref), c.ref])), [portfolio.coins]);
  const [histories, setHistories] = useState<{key: string; results: Map<string, MarketHistoryResult>} | null>(null);
  const requestKey = `${portfolio.currency}:${span.history}:${coins.join(',')}`, tooMany = coins.length > MAX_CHART_COINS;
  useEffect(() => {
    if (showcase || tooMany || !coins.length) return;
    let active = true;
    void (async () => {
      const results = new Map<string, MarketHistoryResult>();
      for (const coin of coins) {
        const ref = refs.get(coin);
        if (!ref || ref.kind !== 'coin') continue;
        results.set(coin, await cache.load({marketRef: ref, currency: portfolio.currency, range: span.history}));
        if (!active) return;
        setHistories({key: requestKey, results: new Map(results)});
      }
    })();
    return () => { active = false; };
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const loaded = histories?.key === requestKey ? histories.results : null;
  const prices = useMemo(() => {
    const map = new Map<string, PricePoint[]>();
    for (const coin of coins) {
      if (showcase) { if (portfolio.currency === 'USD') map.set(coin, showcasePrices(coin, span.start - 3600000, now, Math.max(300000, Math.round((now - span.start) / 240)))); continue; }
      const history = loaded?.get(coin)?.history;
      if (history) map.set(coin, history.points.map(p => ({at: Date.parse(p.at), price: formatHistoryValue(p)})));
    }
    return map;
  }, [coins, showcase, loaded, portfolio.currency, span.start, now]);
  const series = useMemo(() => valueSeries(portfolio, prices, {start: span.start, end: span.end, steps: 96}), [portfolio, prices, span.start, span.end]);
  const known = series.points.filter(p => p.value !== null), loading = !showcase && !tooMany && coins.length > 0 && (!loaded || loaded.size < coins.length);
  const failed = !showcase && loaded ? coins.filter(coin => !loaded.get(coin)?.history).length : 0;
  const values = known.map(p => Number(p.value)), min = Math.min(...values), max = Math.max(...values);
  const x = (at: number) => LEFT + (at - span.start) / Math.max(1, span.end - span.start) * (RIGHT - LEFT);
  const y = (value: number) => max === min ? (TOP + BOTTOM) / 2 : BOTTOM - (value - min) / (max - min) * (BOTTOM - TOP);
  const segments: string[] = [];
  let current: string[] = [];
  for (const p of series.points) { if (p.value === null) { if (current.length > 1) segments.push(current.join(' ')); current = []; } else current.push(`${x(p.at).toFixed(1)},${y(Number(p.value)).toFixed(1)}`); }
  if (current.length > 1) segments.push(current.join(' '));
  const shown = (inspect !== null ? series.points[inspect] : null) ?? known.at(-1) ?? null, first = known[0], last = known.at(-1);
  const change = first && last && first !== last ? new PortfolioDecimal(last.value!).minus(first.value!).toFixed() : null;
  const changePct = change !== null && new PortfolioDecimal(first!.value!).greaterThan(0) ? new PortfolioDecimal(change).dividedBy(first!.value!).times(100).toFixed() : null;
  const currency = portfolio.currency;
  if (!portfolio.transactions.length) return null;
  return <section className="portfolio-value-chart" aria-labelledby={`${id}-title`}>
    <header className="portfolio-section-head"><h3 id={`${id}-title`}>Value over time</h3>
      <div className="portfolio-ranges" role="group" aria-label="Chart range">{VALUE_RANGES.map(r => <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setInspect(null); setNow(Date.now()); }}>{LABEL[r]}</button>)}</div>
    </header>
    {tooMany ? <p className="fine" role="note">The chart covers portfolios of up to {MAX_CHART_COINS} coins in a range; this one has {coins.length}. Each coin&rsquo;s own chart is on its page.</p> : <>
      {shown && shown.value !== null && <p className="portfolio-chart-quote"><strong>{formatMoney(shown.value, currency)}</strong> <span><time dateTime={new Date(shown.at).toISOString()}>{formatDateTime(new Date(shown.at).toISOString())}</time>{change !== null && inspect === null ? <> · <span data-direction={Number(change) > 0 ? 'up' : Number(change) < 0 ? 'down' : 'flat'}>{formatSignedMoney(change, currency)}{changePct !== null ? ` (${percent(changePct)})` : ''}</span> in this range, buys and sells included</> : null}</span></p>}
      {segments.length ? <svg className="portfolio-chart-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-desc`} tabIndex={0}
        onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(), at = span.start + Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * W - LEFT) / (RIGHT - LEFT))) * (span.end - span.start); let best = 0; series.points.forEach((p, i) => { if (p.value !== null && Math.abs(p.at - at) < Math.abs(series.points[best]!.at - at)) best = i; }); setInspect(series.points[best]!.value === null ? null : best); }}
        onPointerLeave={() => setInspect(null)}
        onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const indexes = series.points.flatMap((p, i) => p.value === null ? [] : [i]), at = inspect === null ? indexes.length - 1 : indexes.indexOf(inspect), next = event.key === 'Home' ? 0 : event.key === 'End' ? indexes.length - 1 : Math.max(0, Math.min(indexes.length - 1, at + (event.key === 'ArrowLeft' ? -1 : 1))); setInspect(indexes[next] ?? null); }}>
        <desc id={`${id}-desc`}>{portfolio.name}: value in {currency} from {formatDate(new Date(span.start).toISOString())} to {formatDate(new Date(span.end).toISOString())}, {known.length} moments, from {first ? formatMoney(first.value!, currency) : '—'} to {last ? formatMoney(last.value!, currency) : '—'}. Exact values in the table below. Arrow keys move along the line.</desc>
        {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map(gy => <line key={gy} x1={LEFT} x2={RIGHT} y1={gy} y2={gy} className="portfolio-chart-grid" />)}
        {segments.map((points, i) => <polyline key={i} points={points} className="portfolio-chart-line" fill="none" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
        {shown && shown.value !== null && <circle cx={x(shown.at)} cy={y(Number(shown.value))} r="4" className="portfolio-chart-dot" />}
      </svg> : <p className="portfolio-chart-empty" role={loading ? 'status' : undefined}>{loading ? 'Loading observed prices…' : 'No observed prices for this range yet. Earlier values are not assumed.'}</p>}
      <div className="portfolio-chart-axis"><time dateTime={new Date(span.start).toISOString()}>{formatDate(new Date(span.start).toISOString())}</time><time dateTime={new Date(span.end).toISOString()}>{formatDate(new Date(span.end).toISOString())}</time></div>
      <p className="fine">{showcase ? 'The Showcase\u2019s fixture prices, not market data.' : 'From CoinGecko’s dated prices and your transactions; a transaction counts from the start of its date (UTC).'} The scale fits these values; it does not start at zero.{!series.complete && known.length ? ' Gaps are moments where a coin you held had no observed price.' : ''}{span.clipped ? ' Market history goes back one year, so "All" starts there.' : ''}{failed ? ` History is unavailable for ${failed} ${failed === 1 ? 'coin' : 'coins'} right now.` : ''}</p>
      {known.length > 0 && <details className="portfolio-exact"><summary>View exact values <span>{known.length} moments</span></summary><div className="portfolio-exact-wrap" role="region" aria-label="Exact values" tabIndex={0}><table><caption>{portfolio.name} · {currency}</caption><thead><tr><th scope="col">Moment (UTC)</th><th scope="col">Value ({currency})</th></tr></thead><tbody>{series.points.map(p => <tr key={p.at}><td><time dateTime={new Date(p.at).toISOString()}>{new Date(p.at).toISOString().replace('T', ' ').slice(0, 16)} UTC</time></td><td>{p.value === null ? 'No observed price' : formatMoney(p.value, currency)}</td></tr>)}</tbody></table></div></details>}
    </>}
  </section>;
}
