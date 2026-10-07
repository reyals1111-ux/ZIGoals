'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {AssetIcon} from '../platform/financial-ui';
import {PriceChart} from '../platform/price-chart';
import {usePlatform} from '../platform/use-platform';
import {usePortfolios} from './use-portfolios';
import {usePortfolioMarket} from './use-portfolio-market';
import {Change, KIND_LABEL, MarketFacts, TransactionList} from './portfolio-sections';
import {TransactionForm} from './transaction-form';
import {FEATURED_COINS} from './coin-picker';
import {createCatalogLoader} from '../../lib/market-catalog-client';
import {marketAssetRefSchema, marketRefKey} from '../../lib/market-assets';
import {addFavourite, removeFavourite} from '../../lib/asset-management';
import {formatDateTime, formatExactNumber, formatMoney, formatPrice, formatSignedMoney} from '../../lib/visual-format';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {coinKey, type PortfolioCoin, type PortfolioData} from '../../lib/portfolio/schema';
import {HoldingsBelowZero, holdings, ordered, valueHolding} from '../../lib/portfolio/math';
import {realizedResults} from '../../lib/portfolio/performance';
import {PortfolioUnreadable, removeTransaction} from '../../lib/portfolio/store';
import {showcasePrices} from '../../lib/portfolio/showcase';
import './portfolio.css';

const loadCatalog = createCatalogLoader();
const DAY = 86400000;
type Lookup = {state: 'found'; coin: PortfolioCoin} | {state: 'loading' | 'unknown' | 'invalid'};

/**
 * A coin's page in Portfolio (Session W Part 15): its price and 1h/24h/7d change, its chart, the market figures CoinGecko
 * observed (only those), your position and transactions in the chosen portfolio (never added across portfolios) and the
 * shared Markets favourite. Reached from the holdings table or "Find a coin". The Showcase asks nothing: fixture prices.
 */
export function PortfolioCoinView({id, portfolioId}: {id: string; portfolioId?: string}) {
  const store = usePortfolios(), parsed = marketAssetRefSchema.safeParse({provider: 'coingecko', kind: 'coin', id});
  const key = parsed.success ? coinKey(parsed.data) : null;
  const known = useMemo(() => key ? store.data.portfolios.flatMap(p => p.coins).find(c => coinKey(c.ref) === key) ?? FEATURED_COINS.find(c => coinKey(c.ref) === key) ?? null : null, [key, store.data.portfolios]);
  const [catalogCoin, setCatalogCoin] = useState<PortfolioCoin | null | undefined>(undefined);
  useEffect(() => {
    if (!key || known || !store.loaded) return;
    let active = true;
    void loadCatalog().then(assets => { const asset = assets.find(a => a.ref.kind === 'coin' && coinKey(a.ref) === key); if (active) setCatalogCoin(asset && asset.ref.kind === 'coin' ? {ref: asset.ref, name: asset.name.slice(0, 120), symbol: (asset.symbol.trim() || asset.ref.id).slice(0, 30).toUpperCase()} : null); }).catch(() => { if (active) setCatalogCoin(null); });
    return () => { active = false; };
  }, [key, known, store.loaded]);
  const lookup: Lookup = !parsed.success ? {state: 'invalid'} : known ? {state: 'found', coin: known} : catalogCoin ? {state: 'found', coin: catalogCoin} : catalogCoin === null ? {state: 'unknown'} : {state: 'loading'};
  const holders = key ? store.data.portfolios.filter(p => p.coins.some(c => coinKey(c.ref) === key)) : [];
  const portfolio = store.data.portfolios.find(p => p.id === portfolioId) ?? holders[0] ?? store.data.portfolios[0];
  const coin = lookup.state === 'found' ? lookup.coin : null, currency = portfolio?.currency ?? 'USD';
  const market = usePortfolioMarket(coin ? [coin] : [], currency, store.showcase, !!coin && store.loaded);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const run = (change: (data: PortfolioData) => PortfolioData, done: string, fallback: string) => {
    setError(''); setMessage('');
    try { store.update(change); setMessage(done); return true; } catch (cause) { setError(cause instanceof HoldingsBelowZero || cause instanceof PortfolioUnreadable ? cause.message : storageMessageOr(cause, fallback)); return false; }
  };
  // The Showcase's fixture line, drawn to the moment the page opened (labelled; nothing is asked).
  const [opened] = useState(() => Date.now()), showcaseUsd = store.showcase && currency === 'USD';
  const fixturePoints = useMemo(() => showcaseUsd && key ? showcasePrices(key, opened - 365 * DAY, opened, 6 * 3600000).map(p => ({at: new Date(p.at).toISOString(), value: p.price.replace('.', '').replace(/^0+(?=\d)/, ''), decimals: 2})) : undefined, [showcaseUsd, key, opened]);
  if (lookup.state === 'invalid') return <div className="dashboard portfolio-page"><BackLink /><h1>Coin not found</h1><p>This address does not name a coin.</p></div>;
  if (!store.loaded || lookup.state === 'loading') return <div className="dashboard portfolio-page"><BackLink /><p role="status">Loading the coin…</p></div>;
  if (lookup.state === 'unknown' || !coin) return <div className="dashboard portfolio-page"><BackLink /><h1>Coin not found</h1><p>This coin is not in the coin list, or the list is unavailable right now. ZIGoals does not guess from a name.</p></div>;
  const info = market.of(coin), held = portfolio && holders.includes(portfolio) ? holdings(portfolio).get(key!) : undefined;
  const position = held ? {...valueHolding(held, info.price?.value), realized: realizedResults(portfolio!).get(key!)} : null;
  const list = portfolio ? ordered(portfolio.transactions.filter(t => t.coin === key)).reverse() : [];
  return <div className="dashboard portfolio-page portfolio-coin-page">
    <BackLink />
    <section className="portfolio-hero portfolio-coin-hero" aria-labelledby="coin-title">
      <div className="portfolio-coin-name"><AssetIcon symbol={coin.symbol} logoUrl={info.logoUrl} /><div><p className="eyebrow page-eyebrow"><NebulaFlow identity="portfolio-coin-eyebrow">{coin.symbol}</NebulaFlow></p><h1 id="coin-title"><NebulaFlow identity="portfolio-coin-title">{coin.name}</NebulaFlow></h1></div></div>
      <p className="portfolio-coin-price"><strong>{info.price ? formatPrice(info.price.value, currency) : 'No price yet'}</strong> <small data-stale={info.price?.stale || undefined}>{info.price ? `${info.price.stale ? 'Needs refresh' : info.price.source}${info.price.at ? ` · ${formatDateTime(info.price.at)}` : ''}` : currency}</small></p>
      <dl className="portfolio-coin-changes"><div><dt>1h</dt><dd><Change value={info.change1h} label="in 1 hour" /></dd></div><div><dt>24h</dt><dd><Change value={info.change24h} label="in 24 hours" /></dd></div><div><dt>7d</dt><dd><Change value={info.change7d} label="in 7 days" /></dd></div></dl>
      {store.showcase && <p className="portfolio-note" role="note">Showcase: fixture prices and figures. These are not market data.</p>}
    </section>
    {message && <p role="status" className="portfolio-message">{message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {portfolio && <section className="panel portfolio-position" aria-labelledby="coin-position-title">
      <header className="portfolio-panel-head"><div><p className="eyebrow">{KIND_LABEL[portfolio.kind]} · {currency}</p><h2 id="coin-position-title">Your {coin.symbol} in {portfolio.name}</h2></div></header>
      {holders.length > 1 && <nav className="portfolio-switcher" aria-label="Portfolios holding this coin">{holders.map(p => <Link key={p.id} className="secondary" aria-current={p.id === portfolio.id ? 'page' : undefined} href={`/app/portfolio/coin/${encodeURIComponent(coin.ref.id)}?portfolio=${encodeURIComponent(p.id)}`}><strong>{p.name}</strong><small>{KIND_LABEL[p.kind]} · {p.currency}</small></Link>)}</nav>}
      {held && position ? <dl className="portfolio-totals" aria-label={`Your ${coin.symbol} in ${portfolio.name}`}>
        <div><dt>Holdings</dt><dd>{formatExactNumber(held.quantity)} {coin.symbol}</dd></div>
        <div><dt>Value</dt><dd>{position.value === undefined ? 'Value unknown' : formatMoney(position.value, currency)}</dd></div>
        <div><dt>Average cost</dt><dd>{held.averageCost === undefined ? Number(held.quantity) > 0 ? 'Unknown' : '—' : formatPrice(held.averageCost, currency)}</dd></div>
        <div><dt>Unrealized result</dt><dd>{Number(held.quantity) === 0 ? '—' : position.unrealized === undefined ? 'Unknown' : formatSignedMoney(position.unrealized, currency)}</dd></div>
        <div><dt>Realized result</dt><dd>{position.realized === undefined ? 'Unknown' : formatSignedMoney(position.realized, currency)}</dd>{position.realized === undefined && <small>A sale of coins whose cost was unknown.</small>}</div>
      </dl> : <p>You have no {coin.symbol} in {portfolio.name} yet.</p>}
      {list.length > 0 && <TransactionList portfolio={portfolio} list={list} names={new Map([[key!, coin]])} onRemove={tid => run(data => removeTransaction(data, portfolio.id, tid), 'Transaction removed.', 'The transaction was not removed.')} />}
      <TransactionForm key={portfolio.id} portfolio={portfolio} run={run} coin={coin} />
    </section>}
    {!portfolio && <section className="panel"><h2>No portfolio yet</h2><p>Create a portfolio on the <Link href="/app/portfolio">Portfolio page</Link> to record {coin.symbol}.</p></section>}
    <PriceChart marketRef={coin.ref} currency={currency} title={`${coin.name} price`} offline={store.showcase} localPoints={fixturePoints} />
    <MarketFacts coin={coin} market={info} currency={currency} />
    <FavouriteToggle coin={coin} />
  </div>;
}

function BackLink() { return <p className="portfolio-back"><Link href="/app/portfolio">← Portfolio</Link></p>; }

/** The shared Markets favourites (at most 8): follow or stop following this coin. */
function FavouriteToggle({coin}: {coin: PortfolioCoin}) {
  const platform = usePlatform(), [problem, setProblem] = useState(''), [busy, setBusy] = useState(false);
  if (!platform.loaded || platform.error) return null;
  const key = marketRefKey(coin.ref), favourite = platform.data.watchlist.some(f => marketRefKey(f.ref) === key), full = !favourite && platform.data.watchlist.length >= 8;
  return <section className="panel portfolio-favourite" aria-label="Favourite markets">
    <p>{favourite ? `${coin.name} is one of your favourite markets.` : full ? 'You already follow eight favourite markets, the most there can be. Remove one on Markets to follow this coin.' : 'Follow this coin among your favourite markets on Markets, Wealth and Portfolio.'}</p>
    <button type="button" className="secondary" disabled={busy || full} onClick={() => { setBusy(true); setProblem(''); void platform.update(s => favourite ? removeFavourite(s, key) : addFavourite(s, {ref: coin.ref, name: coin.name, symbol: coin.symbol})).catch(e => setProblem(e instanceof Error ? e.message : 'Could not update favourites.')).finally(() => setBusy(false)); }}>{favourite ? 'Remove from favourites' : 'Add to favourites'}</button>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
