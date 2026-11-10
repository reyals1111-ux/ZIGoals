'use client';
import type {LayoutAttrs} from './layout-edit';
import type {Platform} from '../lib/positions';
import {assetCounts} from '../lib/numbers/counts';
import {formatNumber} from '../lib/visual-format';
import {Shell} from './bottom-section-frame';

const SOURCES=[
 ['Crypto prices','CoinGecko, only when you ask. A price older than 15 minutes is marked as needing a refresh.'],
 ['Stocks, ETFs and metals','Tokenized RWA market references, which can differ from the underlying market.'],
 ['Manual values','Values you enter, kept with the date you recorded them.'],
 ['Public ZIG positions','A read-only relay checks official chain data at one block height, when you request it.'],
] as const;
/** Markets and Positions: what is tracked and where values come from. No prices are shown here. */
export function ValueSources({variant,platform,...layout}:LayoutAttrs&{variant:'markets'|'positions';platform:Platform}){
 // Session AH (TR6): "Manual assets" is Wealth's count (lib/numbers/counts.ts: not live-priced); positions typed in by hand
 // are a different thing and say so.
 const owned=platform.positions.filter(p=>!p.archivedAt),linked=owned.filter(p=>p.marketRef).length,manual=assetCounts(platform).manual,typed=owned.filter(p=>p.sourceType==='MANUAL'||p.network==='manual').length,observed=owned.filter(p=>p.sourceType!=='MANUAL'&&p.network!=='manual').length;
 // Session AL (P-PR-39; PR-080, BUG-041): "observed" is only what a public chain read returned (a real network, never the
 // Showcase's fictional rewards row); everything else was entered by hand, across all of Wealth, not only this page's cards.
 const counts=variant==='markets'?[['Favourite markets',platform.watchlist.length],['Owned assets with a market reference',linked],['Manual assets',manual]] as const:[['Observed public positions',observed],['Positions entered by hand (all of Wealth)',typed],['Allocations to Goals',platform.allocations.length]] as const;
 return <Shell layout={layout} id={`bottom-${variant}-sources`} eyebrow="WHERE VALUES COME FROM" title={<>What’s tracked, and how.</>} lede="Every value keeps its source and time. When the price service is unavailable, no new price appears; the last verified value keeps its timestamp.">
  <dl className="bottom-counts">{counts.map(([label,n])=><div key={label}><dt>{label}</dt><dd>{formatNumber(n)}</dd></div>)}</dl>
  <ul className="bottom-sources">{SOURCES.map(([title,body])=><li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ul>
  <p className="bottom-note">No trading, return forecast or advice is implied. Nothing is bought or sold here; only native staking and votes sign, in your own wallet.</p>
 </Shell>;
}
