'use client';
import Link from 'next/link';
import {AssetIcon, FreshnessBadge} from '../platform/financial-ui';
import {Sparkline, sparklineWords} from './sparkline';
import {Change, compactMoney} from './market-format';
import {formatMoney, formatPrice} from '../../lib/visual-format';
import './data-table.css';

export type MarketTableRow = {
  key: string; name: string; symbol: string; category: string; href: string; logoUrl: string | null;
  /** Plain decimal text, or null with a note saying why ("Price not loaded", "Price unavailable"). */
  price: string | null; priceNote: string; freshness: 'fresh' | 'stale' | 'missing';
  change1h: string | null; change24h: string | null; change7d: string | null;
  sparkline: {value: string; decimals: number}[] | null; marketCap: string | null; favourite: boolean;
};
/**
 * Markets as a table (Session W Part 16), sharing Portfolio's table, change and sparkline: price with its freshness,
 * 1h / 24h / 7d change, the 7-day line, market cap (as CoinGecko observed it; "Not provided" otherwise) and the shared
 * favourite star. Phones keep the market, its 24h change, price and star.
 */
export function MarketTable({rows, currency, label, onToggle, disabled}: {rows: readonly MarketTableRow[]; currency: 'USD' | 'EUR'; label: string; onToggle: (row: MarketTableRow) => void; disabled: boolean}) {
  return <div className="data-table-wrap" role="region" aria-label={`${label}, scrolls sideways`} tabIndex={0}>
    <table className="data-table market-table" aria-label={label}>
      <thead><tr><th scope="col">Market</th><th scope="col">Price</th><th scope="col" className="data-col-optional">1h</th><th scope="col">24h</th><th scope="col" className="data-col-optional">7d</th><th scope="col" className="data-col-optional">Last 7 days</th><th scope="col" className="data-col-wide">Market cap</th><th scope="col"><span className="sr-only">Favourite</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}>
        <th scope="row"><Link className="data-coin-link" href={row.href}><AssetIcon symbol={row.symbol} kind={row.category} logoUrl={row.logoUrl} /><span><strong>{row.name}</strong><small>{row.symbol.toUpperCase()} · {row.category}</small></span></Link></th>
        <td>{row.price === null ? <span className="data-unknown">{row.priceNote}</span> : <>{formatPrice(row.price, currency)}<small><FreshnessBadge state={row.freshness} /></small></>}</td>
        <td className="data-col-optional"><Change value={row.change1h} label="in 1 hour" /></td>
        <td><Change value={row.change24h} label="in 24 hours" /></td>
        <td className="data-col-optional"><Change value={row.change7d} label="in 7 days" /></td>
        <td className="data-col-optional">{row.sparkline ? <Sparkline prices={row.sparkline} label={sparklineWords(row.name, row.sparkline, text => formatPrice(text, currency))} /> : <span className="data-unknown">Not provided</span>}</td>
        <td className="data-col-wide">{row.marketCap === null ? <span className="data-unknown">Not provided</span> : <span title={formatMoney(row.marketCap, currency)}>{compactMoney(row.marketCap, currency)}</span>}</td>
        <td><button type="button" className="market-favourite" aria-label={`${row.favourite ? 'Remove' : 'Add'} ${row.name} favourite`} aria-pressed={row.favourite} disabled={disabled} onClick={() => onToggle(row)}>{row.favourite ? '★' : '☆'}</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
