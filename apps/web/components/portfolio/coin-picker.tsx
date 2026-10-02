'use client';
import {useEffect, useMemo, useState} from 'react';
import {createCatalogLoader} from '../../lib/market-catalog-client';
import {searchMarketAssets, type MarketAssetRef, type MarketCatalogAsset} from '../../lib/market-assets';
import {FEATURED_MARKETS} from '../../lib/product-insights';
import {coinKey, type PortfolioCoin} from '../../lib/portfolio/schema';

const loadCatalog = createCatalogLoader();
type CoinRef = Extract<MarketAssetRef, {kind: 'coin'}>;
const isCoin = (ref: MarketAssetRef): ref is CoinRef => ref.kind === 'coin';
/** The coins Markets already features (BTC, ETH, ZIG, USDC, SOL): offered when the full catalog cannot load (owner decision g). */
export const FEATURED_COINS: PortfolioCoin[] = FEATURED_MARKETS.flatMap(m => isCoin(m.ref) ? [{ref: m.ref, name: m.name, symbol: m.symbol}] : []);
const asCoin = (asset: MarketCatalogAsset & {ref: CoinRef}): PortfolioCoin => ({ref: asset.ref, name: asset.name.slice(0, 120), symbol: (asset.symbol.trim() || asset.ref.id).slice(0, 30).toUpperCase()});

/** Choose a coin from the public catalog; never free text. Without the catalog, the featured coins remain. */
export function CoinPicker({value, onChange}: {value: PortfolioCoin | null; onChange: (coin: PortfolioCoin) => void}) {
  const [catalog, setCatalog] = useState<PortfolioCoin[] | null>(null), [failed, setFailed] = useState(false), [query, setQuery] = useState('');
  useEffect(() => {
    let active = true;
    void loadCatalog().then(assets => { if (active) setCatalog(assets.flatMap(a => isCoin(a.ref) ? [asCoin({...a, ref: a.ref})] : [])); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const fallback = failed || (catalog !== null && catalog.length === 0);
  const results = useMemo(() => {
    if (fallback || catalog === null) return FEATURED_COINS.filter(c => !query.trim() || `${c.name} ${c.symbol}`.toLowerCase().includes(query.trim().toLowerCase()));
    return query.trim() ? searchMarketAssets(query, catalog.map(c => ({ref: c.ref, name: c.name, symbol: c.symbol}))).flatMap(a => isCoin(a.ref) ? [asCoin({...a, ref: a.ref})] : []) : FEATURED_COINS;
  }, [fallback, catalog, query]);
  return <fieldset className="portfolio-coin-picker">
    <legend>Coin</legend>
    {value && <p className="portfolio-coin-chosen">Chosen: <strong>{value.name}</strong> <span>{value.symbol}</span></p>}
    <label className="field"><span>Find a coin</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Bitcoin, ETH, Solana…" autoComplete="off" /></label>
    {catalog === null && !failed && <p className="fine" role="status">Loading the coin list…</p>}
    {fallback && <p className="fine" role="status">The full coin list is unavailable right now. These featured coins can be added.</p>}
    {!results.length && <p className="fine">No coin in the list matches. ZIGoals does not guess from a ticker.</p>}
    {!!results.length && <ul className="portfolio-coin-results" aria-label="Coins">{results.slice(0, 20).map(coin => <li key={coinKey(coin.ref)}><button type="button" aria-pressed={!!value && coinKey(value.ref) === coinKey(coin.ref)} onClick={() => onChange(coin)}><strong>{coin.name}</strong><span>{coin.symbol}</span></button></li>)}</ul>}
  </fieldset>;
}
