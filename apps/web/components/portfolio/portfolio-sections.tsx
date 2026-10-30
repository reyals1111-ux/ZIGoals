'use client';
import {LAST_VISIT_KEY, readVisits, sinceChange, visitStep, type Seen} from '../../lib/portfolio/last-visit';
import {TransactionForm, type Run} from './transaction-form';
import Link from 'next/link';
import {useEffect, useMemo, useState, Fragment} from 'react';
import {AssetIcon} from '../platform/financial-ui';
import {Sparkline, sparklineWords} from '../markets/sparkline';
import {loadMarketCatalog} from '../../lib/market-catalog-client';
import {searchMarketAssets, type MarketAssetRef} from '../../lib/market-assets';
import {formatDate, formatDateTime, formatExactNumber, formatMoney, formatNumber, formatPrice, formatSignedMoney} from '../../lib/visual-format';
import {coinKey, type Portfolio, type PortfolioCoin, type PortfolioCurrency, type PortfolioTransaction} from '../../lib/portfolio/schema';
import {ordered, valueHolding, type Holding} from '../../lib/portfolio/math';
import {allocation, type AllTimeResult, type DayChange} from '../../lib/portfolio/performance';
import {FEATURED_COINS} from './coin-picker';
import {Change, compactAmount, compactMoney, direction, percent} from '../markets/market-format';
import '../markets/data-table.css';
export {Change, percent};
import type {CoinMarket, Price, Sizes} from './use-portfolio-market';
import {useScrollEdges} from '../ui/use-scroll-edges';

/** Session W Part 15: the pieces of Portfolio v2 and its coin page. Unknown is written as unknown, never as 0. */
export const KIND_LABEL = {real: 'Real holdings', hypothetical: 'Hypothetical'} as const;
import {RECEIPTS, RECEIPT_LABEL, receiptOf} from '../../lib/portfolio/receipts';
import {IMPORTS} from '../../lib/portfolio/wallet-import';
import {useDeviceRecord} from '../ai/use-device-record';
export const TX_LABEL: Record<PortfolioTransaction['kind'], string> = {buy: 'Buy', sell: 'Sell', 'transfer-in': 'Transfer in', 'transfer-out': 'Transfer out'};
export const coinHref = (coin: {ref: {id: string}}, portfolioId?: string) => `/app/portfolio/coin/${encodeURIComponent(coin.ref.id)}${portfolioId ? `?portfolio=${encodeURIComponent(portfolioId)}` : ''}`;

export type Row = {holding: Holding; coin: PortfolioCoin; market: CoinMarket; value?: string; unrealized?: string; unrealizedPct?: string};
export function rowsFor(portfolio: Portfolio, holdingsByCoin: Map<string, Holding>, marketOf: (coin: PortfolioCoin) => CoinMarket): Row[] {
  const coins = new Map(portfolio.coins.map(c => [coinKey(c.ref), c]));
  return [...holdingsByCoin.values()].map(holding => { const coin = coins.get(holding.coin)!, market = marketOf(coin); return {holding, coin, market, ...valueHolding(holding, market.price?.value)}; });
}

/** The header: value, the 24h change of what is held now, the all-time result and the cost basis, in the portfolio's currency. */
export function PortfolioSummary({portfolio, totals, day, allTime, stale}: {portfolio: Portfolio; totals: {knownValue: string; unpriced: number; costKnown: boolean; cost: string; held: number}; day: DayChange; allTime: AllTimeResult; stale: boolean}) {
  const currency = portfolio.currency;
  return <dl className="portfolio-totals" aria-label={`${portfolio.name} totals`}>
    {/* Unknown is never zero (Session X Part 14): with no held coin priced, there is no known value to show. */}
    <div><dt>{totals.unpriced && totals.unpriced < totals.held ? 'Known value' : 'Value'}</dt><dd>{!totals.held ? 'Nothing held yet' : totals.unpriced === totals.held ? 'Unknown' : formatMoney(totals.knownValue, currency)}</dd>{totals.unpriced > 0 && <small>{totals.unpriced} {totals.unpriced === 1 ? 'coin has' : 'coins have'} no price yet and {totals.unpriced === 1 ? 'is' : 'are'} not counted.</small>}{stale && <small>Includes prices that need a refresh.</small>}</div>
    <div><dt>24h change</dt><dd data-direction={direction(day.value)}>{day.value === undefined ? 'Unknown' : `${formatSignedMoney(day.value, currency)}${day.pct !== undefined ? ` (${percent(day.pct)})` : ''}`}</dd><small>{day.value === undefined ? (totals.held ? 'No 24h change is known for what you hold.' : 'Of what you hold now.') : day.counted < day.held ? `Of what you hold now: ${day.counted} of ${day.held} coins have a 24h change.` : 'Of what you hold now.'}</small></div>
    <div><dt>All-time result</dt><dd data-direction={direction(allTime.value)}>{allTime.value === undefined ? 'Unknown' : `${formatSignedMoney(allTime.value, currency)}${allTime.pct !== undefined ? ` (${percent(allTime.pct)})` : ''}`}</dd><small>{allTime.value !== undefined ? `Realized ${formatSignedMoney(allTime.realized!, currency)} · unrealized ${formatSignedMoney(allTime.unrealized!, currency)}` : allTime.reason === 'price' ? 'Needs a price for every coin you hold.' : allTime.reason === 'cost' ? 'A transfer in without a price has no known cost.' : 'From your transactions.'}</small></div>
    <div><dt>Cost basis</dt><dd>{!totals.held ? '—' : totals.costKnown ? formatMoney(totals.cost, currency) : 'Unknown'}</dd>{totals.held > 0 && !totals.costKnown && <small>A transfer in without a price has no known cost.</small>}{/* Session AH (WE21, T-050) */}{totals.held > 0 && totals.costKnown && <small>Average cost: what you paid, averaged over your buys (lots are not tracked).</small>}</div>
  </dl>;
}

/**
 * Session AH (WE22, N-082): the change since your last visit, from a device-only note (lib/portfolio/last-visit.ts). Only
 * with every held coin priced and current, never in the Showcase; the change includes what you bought or sold in between.
 */
export function SinceLastVisit({portfolio, value, ready}: {portfolio: Portfolio; value: string; ready: boolean}) {
  const [compare, setCompare] = useState<Seen | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    try {
      const visits = readVisits(localStorage.getItem(LAST_VISIT_KEY)), step = visitStep(visits[portfolio.id], {at: Date.now(), value, currency: portfolio.currency});
      setCompare(step.compare);
      if (step.next) localStorage.setItem(LAST_VISIT_KEY, JSON.stringify({...visits, [portfolio.id]: step.next}));
    } catch { setCompare(undefined); }
    // Once per visit: a price tick after the first known value does not move "last visit".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, portfolio.id, portfolio.currency]);
  if (!ready || !compare) return null;
  const change = sinceChange(compare, value);
  return <p className="portfolio-since" data-testid="portfolio-since">Since your last visit ({formatDateTime(new Date(compare.at).toISOString())}): <strong className="portfolio-since-value" data-direction={direction(change.value)}>{formatSignedMoney(change.value, portfolio.currency)}{change.pct !== undefined ? ` (${percent(change.pct)})` : ''}</strong>. <small>Includes anything you bought or sold since.</small></p>;
}

function PriceCell({price, currency}: {price?: Price; currency: string}) {
  if (!price) return <>No price yet</>;
  return <>{formatPrice(price.value, currency)}<small data-stale={price.stale || undefined}>{price.stale ? 'Needs refresh' : price.source}{price.at ? ` · ${formatDateTime(price.at)}` : ''}</small></>;
}
/**
 * The holdings table: one row per coin ever held, linking to its page. Narrow screens keep the coin, value and result.
 * Session AF Gate C (design critique, money pages 4): below 480 px each holding is one stacked card (as Earn's validator
 * list is on a phone): the coin across the top, then its 24h change, value and result, each under its column's name
 * (`data-label`), so no figure is clipped and nothing scrolls sideways inside the card. The roles are written out so the
 * cards stay a table to assistive tech when the phone's styles change how the rows are drawn.
 */
export function HoldingsTable({portfolio, rows, sort, onSort, onRemove}: {portfolio: Portfolio; rows: Row[]; sort: 'value' | 'name' | 'result'; onSort: (sort: 'value' | 'name' | 'result') => void; /** Session AB-Design (owner request 27): removes a transaction from the expanded row's transfers. */ onRemove?: (id: string) => void}) {
  const edges = useScrollEdges<HTMLDivElement>();
  const currency = portfolio.currency;
  const [open, setOpen] = useState<string | null>(null);
  const names = new Map(portfolio.coins.map(c => [coinKey(c.ref), c]));
  const sorted = [...rows].sort((a, b) => sort === 'name' ? a.coin.name.localeCompare(b.coin.name) : Number((sort === 'value' ? b.value : b.unrealized) ?? -Infinity) - Number((sort === 'value' ? a.value : a.unrealized) ?? -Infinity) || a.coin.name.localeCompare(b.coin.name));
  return <section className="portfolio-holdings-section" aria-labelledby={`holdings-${portfolio.id}`}>
    <header className="portfolio-section-head"><h3 id={`holdings-${portfolio.id}`}>Holdings</h3><label className="field portfolio-sort"><span>Sort holdings</span><select value={sort} onChange={event => onSort(event.target.value as typeof sort)}><option value="value">By value</option><option value="result">By result</option><option value="name">By name</option></select></label></header>
    <div ref={edges} className="data-table-wrap" role="region" aria-label={`${portfolio.name} holdings, scrolls sideways`} tabIndex={0}>
      <table className="data-table" role="table" aria-label={`${portfolio.name} holdings`}>
        <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Coin</th><th scope="col" role="columnheader" className="data-col-wide">Price</th><th scope="col" role="columnheader" className="data-col-optional">1h</th><th scope="col" role="columnheader">24h</th><th scope="col" role="columnheader" className="data-col-optional">7d</th><th scope="col" role="columnheader" className="data-col-optional">Last 7 days</th><th scope="col" role="columnheader" className="data-col-wide">Holdings</th><th scope="col" role="columnheader">Value</th><th scope="col" role="columnheader" className="data-col-optional">Average cost</th><th scope="col" role="columnheader">Result</th></tr></thead>
        <tbody role="rowgroup">{sorted.map(row => {
          const held = Number(row.holding.quantity) > 0;
          const expanded = open === row.holding.coin, detailId = `coin-detail-${portfolio.id}-${row.holding.coin}`.replace(/[^A-Za-z0-9_-]/g, '-');
          return <Fragment key={row.holding.coin}><tr role="row" data-closed={!held || undefined} data-expanded={expanded || undefined}>
            <th scope="row" role="rowheader"><button type="button" className="data-coin-toggle" aria-expanded={expanded} aria-controls={detailId} aria-label={`${expanded ? 'Hide' : 'Show'} ${row.coin.name} details`} onClick={() => setOpen(expanded ? null : row.holding.coin)}><AssetIcon symbol={row.coin.symbol} logoUrl={row.market.logoUrl} /><span><strong>{row.coin.name}</strong><small>{row.coin.symbol}</small></span><span className="data-coin-chevron" aria-hidden="true">›</span></button></th>
            <td role="cell" className="data-col-wide" data-label="Price"><PriceCell price={row.market.price} currency={currency} /></td>
            <td role="cell" className="data-col-optional" data-label="1h"><Change value={row.market.change1h} label="in 1 hour" /></td>
            <td role="cell" data-label="24h"><Change value={row.market.change24h} label="in 24 hours" /></td>
            <td role="cell" className="data-col-optional" data-label="7d"><Change value={row.market.change7d} label="in 7 days" /></td>
            <td role="cell" className="data-col-optional" data-label="Last 7 days">{row.market.sparkline ? <Sparkline prices={row.market.sparkline} label={sparklineWords(row.coin.name, row.market.sparkline, text => formatPrice(text, currency))} /> : <span className="data-unknown">Not provided</span>}</td>
            <td role="cell" className="data-col-wide" data-label="Holdings">{formatExactNumber(row.holding.quantity)} {row.coin.symbol}</td>
            <td role="cell" data-label="Value">{row.value === undefined ? held ? 'Value unknown' : '—' : formatMoney(row.value, currency)}</td>
            <td role="cell" className="data-col-optional" data-label="Average cost">{row.holding.averageCost === undefined ? held ? 'Unknown' : '—' : formatPrice(row.holding.averageCost, currency)}</td>
            {/* Session AF Gate C (design critique, copy): an unknown result says why in one phrase ("Unknown / cost unknown" had said it twice). */}
            <td role="cell" data-label="Result" data-direction={direction(row.unrealized)}>{!held ? 'Closed' : row.unrealized === undefined ? (row.holding.cost === undefined ? 'Cost unknown' : 'No price yet') : <>{formatSignedMoney(row.unrealized, currency)}{row.unrealizedPct ? <small>{percent(row.unrealizedPct)}</small> : null}</>}</td>
          </tr>
          {/* Session AB-Design (owner request 27): the coin's detail card — its figures, its transfers and its links — right under its row. */}
          {expanded && <tr className="data-detail-row" role="row"><td role="cell" colSpan={10}><div id={detailId} className="coin-detail" role="region" aria-label={`${row.coin.name} details`}>
            <dl className="portfolio-totals coin-detail-figures">
              <div><dt>Price</dt><dd><PriceCell price={row.market.price} currency={currency} /></dd></div>
              <div><dt>Holdings</dt><dd>{formatExactNumber(row.holding.quantity)} {row.coin.symbol}</dd><small>{row.value === undefined ? (held ? 'Value unknown until a price is known' : 'Nothing held now') : `${formatMoney(row.value, currency)} at the last price`}</small></div>
              <div><dt>Cost basis</dt><dd>{row.holding.cost === undefined ? (held ? 'Unknown' : '—') : formatMoney(row.holding.cost, currency)}</dd>{row.holding.averageCost !== undefined && <small>Average {formatPrice(row.holding.averageCost, currency)}</small>}{row.holding.cost === undefined && held && <small>A transfer in without a price has no known cost.</small>}</div>
              <div><dt>Unrealized result</dt><dd data-direction={direction(row.unrealized)}>{!held ? '—' : row.unrealized === undefined ? 'Unknown' : `${formatSignedMoney(row.unrealized, currency)}${row.unrealizedPct ? ` (${percent(row.unrealizedPct)})` : ''}`}</dd></div>
            </dl>
            {row.market.sparkline ? <div className="coin-detail-spark"><Sparkline prices={row.market.sparkline} label={sparklineWords(row.coin.name, row.market.sparkline, text => formatPrice(text, currency))} /><small>Last 7 days</small></div> : null}
            {(() => { const list = portfolio.transactions.filter(t => t.coin === row.holding.coin); return list.length ? <div className="coin-detail-transfers"><h4>Transfers and trades</h4><TransactionList portfolio={portfolio} list={list} names={names} onRemove={id => onRemove?.(id)} /></div> : <p className="fine">No transactions recorded for {row.coin.symbol} yet.</p>; })()}
            <div className="coin-detail-links"><Link className="text-link" href={coinHref(row.coin, portfolio.id)}>Open {row.coin.name} with its price chart →</Link><span className="fine">Goals are funded from Wealth; Portfolio stays apart from them.</span></div>
          </div></td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  </section>;
}

/** Colors validated as a set on the dark panel (dataviz six-slot dark palette, adjacent and wrap-around pairs); "Other" is neutral. */
export const SLICE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'], OTHER_COLOR = '#7d879c';
/** Allocation of the known value: a donut with 2 px gaps, a legend naming every slice with its share, and the exact table. */
export function AllocationDonut({portfolio, rows}: {portfolio: Portfolio; rows: Row[]}) {
  const {slices, total} = useMemo(() => allocation(rows.filter(r => Number(r.holding.quantity) > 0).map(r => ({key: r.holding.coin, label: r.coin.symbol, value: r.value}))), [rows]);
  const unpriced = rows.filter(r => Number(r.holding.quantity) > 0 && r.value === undefined).length;
  if (!slices.length) return null;
  const radius = 52, circumference = 2 * Math.PI * radius, gap = slices.length > 1 ? 2 : 0;
  const arcs = slices.map((s, i) => { const length = s.share * circumference, start = slices.slice(0, i).reduce((sum, previous) => sum + previous.share, 0) * circumference; return {key: s.key, color: s.key === 'other' ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length]!, dash: `${Math.max(0, length - gap)} ${circumference - Math.max(0, length - gap)}`, offset: -start}; });
  const share = (value: number) => `${formatNumber(value * 100, {maximumFractionDigits: 1})}%`;
  return <section className="portfolio-allocation" aria-labelledby={`allocation-${portfolio.id}`}>
    <header className="portfolio-section-head"><h3 id={`allocation-${portfolio.id}`}>Allocation</h3></header>
    <div className="portfolio-allocation-body">
      <svg className="portfolio-donut" viewBox="0 0 140 140" role="img" aria-label={`Allocation of ${formatMoney(total, portfolio.currency)} known value: ${slices.map(s => `${s.label} ${share(s.share)}`).join(', ')}`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--panel, #0d1629)" strokeWidth="18" />
        {arcs.map(a => <circle key={a.key} cx="70" cy="70" r={radius} fill="none" stroke={a.color} strokeWidth="18" strokeDasharray={a.dash} strokeDashoffset={a.offset} transform="rotate(-90 70 70)" />)}
      </svg>
      <ul className="portfolio-legend">{slices.map((s, i) => <li key={s.key}><span className="portfolio-swatch" style={{background: s.key === 'other' ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length]}} aria-hidden="true" /><strong>{s.label}</strong><span>{share(s.share)}</span><small>{formatMoney(s.value, portfolio.currency)}</small></li>)}</ul>
    </div>
    <p className="fine">Shares of the known value{unpriced ? `; ${unpriced} ${unpriced === 1 ? 'coin' : 'coins'} without a price ${unpriced === 1 ? 'has' : 'have'} no share` : ''}.</p>
  </section>;
}

/** Every transaction, newest first, 20 at a time, with the coin filter; removing one asks nothing more (the history is checked). */
export function AllTransactions({portfolio, onRemove, run}: {portfolio: Portfolio; onRemove: (id: string) => void; run?: Run}) {
  const [coin, setCoin] = useState(''), [shown, setShown] = useState(20);
  const names = new Map(portfolio.coins.map(c => [coinKey(c.ref), c]));
  const list = ordered(portfolio.transactions.filter(t => !coin || t.coin === coin)).reverse();
  if (!portfolio.transactions.length) return null;
  return <section className="portfolio-all-transactions" aria-labelledby={`transactions-${portfolio.id}`}>
    <header className="portfolio-section-head"><h3 id={`transactions-${portfolio.id}`}>Transactions</h3><label className="field"><span>Coin</span><select value={coin} onChange={event => { setCoin(event.target.value); setShown(20); }}><option value="">All coins</option>{portfolio.coins.map(c => <option key={coinKey(c.ref)} value={coinKey(c.ref)}>{c.name}</option>)}</select></label></header>
    <TransactionList portfolio={portfolio} list={list.slice(0, shown)} names={names} onRemove={onRemove} run={run} />
    {list.length > shown && <button type="button" className="quiet" onClick={() => setShown(shown + 20)}>Show 20 more ({list.length - shown} left)</button>}
  </section>;
}
export function TransactionList({portfolio, list, names, onRemove, run}: {portfolio: Portfolio; list: PortfolioTransaction[]; names: Map<string, PortfolioCoin>; onRemove: (id: string) => void; run?: Run}) {
  const currency = portfolio.currency, [editing, setEditing] = useState<string | null>(null), receipts = useDeviceRecord(RECEIPTS).data, imported = useDeviceRecord(IMPORTS).data.rows; // Session AI (J15, WE20)
  return <ol className="portfolio-transactions">{list.map(t => <li key={t.id} data-direction={t.kind === 'buy' || t.kind === 'transfer-in' ? 'in' : 'out'}>
    {/* Session AH (J17): what came in reads "+", in green; what went out "−" */}<span><strong>{(t.kind === 'transfer-in' && receiptOf(receipts, t.id) ? RECEIPT_LABEL[receiptOf(receipts, t.id)!] : null) ?? TX_LABEL[t.kind]}</strong> <span className="portfolio-tx-amount">{t.kind === 'buy' || t.kind === 'transfer-in' ? '+' : '−'}{formatExactNumber(t.quantity)}</span> {names.get(t.coin)?.symbol ?? ''}{t.price !== undefined ? ` at ${formatPrice(t.price, currency)}` : ' · no price'}{t.fee ? ` · fee ${formatMoney(t.fee, currency)}` : ''}</span>
    <small><time dateTime={t.date}>{formatDate(t.date)}</time>{t.note ? ` · ${t.note}` : ''}</small>
    {/* Session AH (WE2, N-146): a recorded transaction can be corrected, not only removed */}{imported[t.id] && <small className="portfolio-from-wallet">from wallet</small>}{run && names.get(t.coin) && !imported[t.id] && <button type="button" className="quiet" aria-expanded={editing === t.id} onClick={() => setEditing(editing === t.id ? null : t.id)}>Edit</button>}<button type="button" className="quiet" onClick={() => onRemove(t.id)}>Remove</button>
    {run && editing === t.id && names.get(t.coin) && <TransactionForm portfolio={portfolio} run={run} coin={names.get(t.coin)} edit={{transaction: t, onDone: () => setEditing(null)}} />}
  </li>)}</ol>;
}

type CoinRef = Extract<MarketAssetRef, {kind: 'coin'}>;
const loadCatalog = loadMarketCatalog; // Session AJ (WE16): the app's one shared catalog loader
/** Find any coin in the public catalog and open its page (featured coins when the catalog cannot load). */
export function CoinSearch({portfolioId}: {portfolioId?: string}) {
  const [query, setQuery] = useState(''), [catalog, setCatalog] = useState<PortfolioCoin[] | null>(null), [failed, setFailed] = useState(false), [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!asked) return;
    let active = true;
    void loadCatalog().then(assets => { if (active) setCatalog(assets.flatMap(a => a.ref.kind === 'coin' ? [{ref: a.ref as CoinRef, name: a.name.slice(0, 120), symbol: (a.symbol.trim() || a.ref.id).slice(0, 30).toUpperCase()}] : [])); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [asked]);
  const results = useMemo(() => {
    const text = query.trim();
    if (!text) return [];
    if (!catalog?.length) return FEATURED_COINS.filter(c => `${c.name} ${c.symbol}`.toLowerCase().includes(text.toLowerCase()));
    return searchMarketAssets(text, catalog.map(c => ({ref: c.ref, name: c.name, symbol: c.symbol}))).flatMap(a => a.ref.kind === 'coin' ? [{ref: a.ref as CoinRef, name: a.name, symbol: a.symbol}] : []).slice(0, 8);
  }, [query, catalog]);
  return <section className="panel portfolio-search" aria-labelledby="portfolio-search-title">
    <h2 id="portfolio-search-title">Find a coin</h2>
    <p>Open any coin&rsquo;s page: its price, changes and market figures, and your transactions in it.</p>
    <label className="field"><span>Coin name or symbol</span><input type="search" value={query} autoComplete="off" placeholder="Bitcoin, ETH, Solana…" onFocus={() => setAsked(true)} onChange={event => { setAsked(true); setQuery(event.target.value); }} /></label>
    {asked && catalog === null && !failed && <p className="fine" role="status">Loading the coin list…</p>}
    {asked && (failed || catalog?.length === 0) && <p className="fine" role="status">The full coin list is unavailable right now. Featured coins can still be found.</p>}
    {query.trim() && !results.length && <p className="fine">No coin in the list matches. ZIGoals does not guess from a ticker.</p>}
    {results.length > 0 && <ul className="portfolio-search-results" aria-label="Matching coins">{results.map(c => <li key={coinKey(c.ref)}><Link href={coinHref(c, portfolioId)}><strong>{c.name}</strong><span>{c.symbol}</span></Link></li>)}</ul>}
  </section>;
}

const FACTS: {key: keyof Sizes; label: string; money: boolean}[] = [{key: 'marketCap', label: 'Market cap', money: true}, {key: 'volume24h', label: '24h volume', money: true}, {key: 'circulatingSupply', label: 'Circulating supply', money: false}, {key: 'totalSupply', label: 'Total supply', money: false}, {key: 'maxSupply', label: 'Max supply', money: false}];
/** A coin's market figures, only as observed; "Not provided" otherwise (an older market service, a 0 or none at all). */
export function MarketFacts({coin, market, currency}: {coin: PortfolioCoin; market: CoinMarket; currency: PortfolioCurrency}) {
  const sizes = market.sizes;
  const note = market.details === 'showcase' ? 'Showcase fixture figures, not market data.' : market.details === 'not-provided' ? 'This market service does not provide these figures yet.' : market.details === 'loading' ? 'Loading market figures…' : market.details === 'unavailable' ? 'Market figures are unavailable right now.' : `CoinGecko${market.observedAt ? `, observed ${formatDateTime(market.observedAt)}` : ''}${market.details === 'stale' ? ' · needs a refresh' : ''}. CoinGecko reports no figure as 0; ZIGoals shows it as not provided.`;
  return <section className="panel portfolio-facts" aria-labelledby="coin-facts-title">
    <h2 id="coin-facts-title">Market figures</h2>
    <dl>{FACTS.map(f => { const value = sizes?.[f.key] ?? null; return <div key={f.key}><dt>{f.label}</dt><dd title={value ? (f.money ? formatMoney(value, currency) : `${formatExactNumber(value)} ${coin.symbol}`) : undefined}>{value === null ? 'Not provided' : f.money ? compactMoney(value, currency) : `${compactAmount(value)} ${coin.symbol}`}</dd></div>; })}</dl>
    <p className="fine" role={market.details === 'loading' ? 'status' : undefined}>{note}</p>
    {sizes && FACTS.some(f => sizes[f.key] !== null) && <details className="portfolio-exact"><summary>Exact figures</summary><table><caption>{coin.name} · {currency}</caption><tbody>{FACTS.map(f => { const value = sizes[f.key]; return <tr key={f.key}><th scope="row">{f.label}</th><td>{value === null ? 'Not provided' : f.money ? formatMoney(value, currency) : `${formatExactNumber(value)} ${coin.symbol}`}</td></tr>; })}</tbody></table></details>}
  </section>;
}
