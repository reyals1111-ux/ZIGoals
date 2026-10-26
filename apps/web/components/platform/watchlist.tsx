'use client';
import type {LayoutAttrs} from '../layout-edit';
import {useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {marketRefKey,marketRequestKey} from '../../lib/market-assets';
import {marketCategory} from '../../lib/product-insights';
import {useMarketInsights} from './use-market-insights';
import {MarketMovement} from './market-movement';
import {addFavourite,removeFavourite,moveFavourite} from '../../lib/asset-management';
import {showToast} from '../ui/undo-toast';
import {quoteIsStale} from '../../lib/market-quotes';
import {AssetPicker} from './asset-picker';
import {AssetIcon,FreshnessBadge,Sheet} from './financial-ui';
import {amount} from './common';
import {formatPrice} from '../../lib/visual-format';
// Session X (first-week polish): the favourites bring their own styles. Portfolio shows them too (Session W Part 15)
// without loading this sheet, so its empty card was a bare grey button with 2.3:1 text.
import './wealth-product.css';
import {keepWords} from '../today/keep-words';
import {plainErrorMessage} from '../../lib/plain-error';
/** Gate C design review (copy): a tokenised asset's type in words, capitalised as the rest of the card ("VOO · ETF"). */
const ASSET_TYPE:Record<'stock'|'etf'|'commodity',string>={stock:'Stock',etf:'ETF',commodity:'Commodity'};
/** A no-break space on each side of the dot, so "GOLD · Commodity" never ends a line at its dot. */
const TYPE_SEP=String.fromCharCode(160)+'·'+String.fromCharCode(160);
/** Gate C design review (finding 4): whether the asset's orb shows letters (its symbol's first three, "ZIG", "SOL") rather
 *  than one glyph (₿, Ξ, a kind's mark) — the same choice AssetIcon makes — so the card can size its letters to the tile. */
const GLYPH_KINDS=new Set(['ETFs','Stocks','Stablecoins','Precious Metals','Precious metals','Property','Custom','Cash']);
const orbLetters=(kind:string,symbol:string)=>!GLYPH_KINDS.has(kind)&&symbol!=='BTC'&&symbol!=='ETH'&&symbol.slice(0,3).length>1;
export function Watchlist({compact=false,...layout}:LayoutAttrs&{compact?:boolean}){const store=usePlatform(),[adding,setAdding]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),saving=useRef(false);const market=useMarketQuotes(store.data.watchlist.map(a=>({marketRef:a.ref,currency:'USD' as const})));
 const insights=useMarketInsights(store.data.watchlist.map(a=>a.ref));
 function change(fn:Parameters<typeof store.update>[0],onSaved?:()=>void){if(saving.current)return;saving.current=true;setBusy(true);setError('');void store.update(fn).then(()=>onSaved?.()).catch(e=>setError(plainErrorMessage(e, 'Watchlist could not be changed.'))).finally(()=>{saving.current=false;setBusy(false);});}
 return <section {...layout} className={`market-watch ${compact?'compact-watch':''}`} aria-label="Favourite markets" aria-busy={busy}><header className="wealth-section-heading"><div><p className="eyebrow">{keepWords('MARKETS THAT MATTER TO YOU', ['TO YOU'])}</p><h2>{compact?'Your market watch':'Your favourites'}</h2>{!compact&&<p>Follow the price. Ownership is optional.</p>}</div><button type="button" className="secondary" onClick={()=>setAdding(true)} disabled={busy||!store.loaded||!!store.error}>+ Add favourite</button></header>{busy&&<p role="status">Saving favourites…</p>}{error&&<p role="alert">{error}</p>}<div className="watchlist-grid">{store.data.watchlist.map((a,i)=>{const key=marketRefKey(a.ref),q=market.quotes.find(q=>q.marketRef&&marketRefKey(q.marketRef)===key&&q.currency==='USD');const kind=marketCategory(a.ref,a.symbol),result=insights.results[marketRequestKey({marketRef:a.ref,currency:'USD'})],price=q?formatPrice(amount(q.price,q.priceDecimals),'USD'):null;return <article className="watch-card" key={key} data-orb={orbLetters(kind,a.symbol)?'letters':undefined} data-price={price?undefined:'missing'}><Link className="watch-card-link" href={`/app/wealth/asset/${encodeURIComponent(key)}`}><div className="owned-asset-heading"><AssetIcon symbol={a.symbol} kind={kind} logoUrl={result?.insight?.logoUrl}/><div><h3 title={a.name}>{a.name}</h3><p>{a.symbol.toUpperCase()}{TYPE_SEP}{a.ref.kind==='rwa'?ASSET_TYPE[a.ref.assetType]:'Crypto'}</p></div></div><strong className="watch-price" data-missing={price?undefined:''} style={price?{'--chars':price.length} as CSSProperties:undefined}>{price??'Price unavailable'}</strong>{/* Gate C design review (finding 5): a missing price is said once ("Price unavailable"): no 24h line and no "Needs value" chip under it. With a price, a missing 24h change is one line that names what is missing. */}{price&&(result?.insight?<MarketMovement compact={compact} result={result}/>:<p className="watch-change-missing">{result?.stale?'24h change not verified yet':'24h change unavailable'}</p>)}<span className="market-ownership" data-owned={store.data.positions.some(p=>!p.archivedAt&&p.marketRef&&marketRefKey(p.marketRef)===key)}>{store.data.positions.some(p=>!p.archivedAt&&p.marketRef&&marketRefKey(p.marketRef)===key)?'Owned + favourite':'Favourite only'}</span><div className="asset-card-source"><span>{a.ref.kind==='rwa'?'CoinGecko RWA reference':'CoinGecko'}</span>{q&&<FreshnessBadge state={quoteIsStale(q,market.now)?'stale':'fresh'}/>}</div></Link>{!compact&&<div className="watch-actions"><button className="quiet" disabled={busy||!store.loaded||!!store.error||i===0} aria-label={`Move ${a.name} earlier`} onClick={()=>change(s=>moveFavourite(s,key,-1))}>← Move earlier</button><button className="quiet" disabled={busy||!store.loaded||!!store.error} aria-label={`Remove ${a.name} favourite`} onClick={()=>change(s=>removeFavourite(s,key),()=>showToast({message:`${a.name} removed from your favourites.`,undo:()=>store.update(s=>s.watchlist.some(x=>marketRefKey(x.ref)===key)?s:{...s,watchlist:[...s.watchlist.slice(0,i),a,...s.watchlist.slice(i)]}),undone:`${a.name} is back in your favourites.`}))}>Remove</button></div>}</article>;})}{!store.data.watchlist.length&&<button className="watch-empty" type="button" disabled={busy||!store.loaded||!!store.error} onClick={()=>setAdding(true)}><span>✧</span><strong>Your first favourite awaits</strong><p>Bitcoin, Nvidia, Gold… follow what interests you.</p></button>}</div>{!compact&&<p className="fine">Favourites never count toward your wealth or Goal allocations.</p>}{adding&&<Sheet title="Add a favourite" onClose={()=>setAdding(false)}><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><AssetPicker onFavourite={a=>change(s=>addFavourite(s,a),()=>setAdding(false))}/></fieldset>{error&&<p role="alert">{error}</p>}</Sheet>}</section>;
}
