'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {formatHistoryValue, type HistoryRange} from '../../lib/market-history';
import {portfolioHistoryCache as cache} from './history-cache';
import {coinKey, type Portfolio} from '../../lib/portfolio/schema';
import type {PricePoint} from '../../lib/portfolio/performance';
import {holdings} from '../../lib/portfolio/math';
import {showcasePrices} from '../../lib/portfolio/showcase';
import {portfolioOn, timeMachineBounds} from '../../lib/portfolio/time-machine';
import {formatDate, formatExactNumber, formatMoney, formatPrice, formatSignedMoney} from '../../lib/visual-format';
import {localDate, addLocalDays} from '../../lib/local-date';

/**
 * Session AV lane 2 (money; CoinStats' Time Machine): "On a past day" under a portfolio's Analysis — pick a day in the
 * last year and see what the portfolio held at the end of it, each coin's price and value then (the same market history
 * the value chart reads; nothing new is asked of any service), the cost of what was held and the result then, beside
 * its value now. The Showcase uses its own labelled example prices. Lazy.
 */
const rangeFor = (days: number): HistoryRange => days <= 29 ? '30d' : days <= 89 ? '90d' : '1y';
export default function TimeMachine({portfolio, showcase, valueNow}: {portfolio: Portfolio; showcase: boolean; valueNow: string | null}) {
  const id = useId(), today = localDate(), [now] = useState(() => Date.now()), bounds = timeMachineBounds(portfolio, today, now);
  // Session AV lane 2 (CI run 2007): the first day offered is 29 days back, the last whole day inside the value chart's own
  // 30D history (rangeFor), so opening Analysis asks for nothing the chart has not (30 days back needed 90 days of history).
  const [date, setDate] = useState(() => { const d = addLocalDays(today, -29); return d < bounds.min ? bounds.min : d; });
  const day = date >= bounds.min && date <= bounds.max ? date : null;
  const coins = useMemo(() => day ? [...holdings({transactions: portfolio.transactions.filter(t => t.date <= day)}).values()].filter(h => Number(h.quantity) > 0).map(h => h.coin) : [], [portfolio.transactions, day]);
  const refs = useMemo(() => new Map(portfolio.coins.map(c => [coinKey(c.ref), c])), [portfolio.coins]);
  const [loaded, setLoaded] = useState<{key: string; prices: Map<string, PricePoint[]>; failed: number} | null>(null);
  const days = day ? Math.round((now - Date.parse(`${day}T12:00:00Z`)) / 86_400_000) : 0, key = `${portfolio.currency}:${rangeFor(days)}:${coins.join(',')}`;
  useEffect(() => {
    if (showcase || !coins.length) return;
    let live = true;
    void (async () => {
      const prices = new Map<string, PricePoint[]>(); let failed = 0;
      for (const coin of coins) {
        const ref = refs.get(coin)?.ref;
        if (!ref || ref.kind !== 'coin') { failed++; continue; }
        const result = await cache.load({marketRef: ref, currency: portfolio.currency, range: rangeFor(days)});
        if (!live) return;
        if (result.history) prices.set(coin, result.history.points.map(p => ({at: Date.parse(p.at), price: formatHistoryValue(p)}))); else failed++;
      }
      if (live) setLoaded({key, prices, failed});
    })();
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const prices = useMemo(() => {
    if (showcase) { const m = new Map<string, PricePoint[]>(); if (portfolio.currency === 'USD') for (const c of coins) m.set(c, showcasePrices(c, now - 366 * 86_400_000, now, 6 * 3_600_000)); return m; }
    return loaded?.key === key ? loaded.prices : null;
  }, [showcase, coins, now, loaded, key, portfolio.currency]);
  const then = useMemo(() => day && prices ? portfolioOn(portfolio, day, prices) : null, [portfolio, day, prices]);
  const cur = portfolio.currency, name = (coin: string) => refs.get(coin)?.symbol ?? coin;
  return <section className="portfolio-time-machine" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>On a past day</h3>
    <label className="field"><span>Day</span><input type="date" value={date} min={bounds.min} max={bounds.max} onChange={e => setDate(e.target.value)}/></label>
    {!day ? <p className="fine">Choose a day from {formatDate(bounds.min)} to today: the market history this app reads reaches back a year, and nothing was held before your first transaction.</p>
      : !coins.length ? <p className="fine">Nothing was held at the end of {formatDate(day)}.</p>
      : !then ? <p className="fine" aria-busy="true">Reading the prices of {formatDate(day)}…</p>
      : <>
        <p role="status">At the end of {formatDate(day)}: {then.total !== undefined ? <strong>{formatMoney(then.total, cur)}</strong> : <strong>value unknown</strong>}{then.result !== undefined ? <> · result then {formatSignedMoney(then.result, cur)}</> : null}{valueNow !== null && then.total !== undefined ? <> · now {formatMoney(valueNow, cur)}</> : null}.</p>
        <ul className="portfolio-time-machine-list" aria-label={`Held at the end of ${formatDate(day)}`}>{then.rows.map(r => <li key={r.coin}><strong>{name(r.coin)}</strong> {formatExactNumber(r.quantity)} <span className="fine">· {r.price !== undefined ? `${formatPrice(r.price, cur)} each, ${formatMoney(r.value!, cur)}` : 'no price observed then'}</span></li>)}</ul>
        {then.unpriced > 0 && <p className="fine">{then.unpriced} {then.unpriced === 1 ? 'coin has' : 'coins have'} no observed price within two days before then, so the total is left unknown.</p>}
        {!showcase && loaded?.failed ? <p className="fine">The market history of {loaded.failed} {loaded.failed === 1 ? 'coin' : 'coins'} could not be read now.</p> : null}
        <p className="fine">{showcase ? 'Showcase: fictional example prices.' : 'Prices by CoinGecko, as the value chart reads them.'} Your own transactions; information, not advice.</p>
      </>}
  </section>;
}
