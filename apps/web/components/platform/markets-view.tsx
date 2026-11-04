'use client';
import {useRememberedChoice} from '../ui/use-remembered-choice';
import {PriceAlertWatchGate} from '../price-alerts/watch-gate';
import {showStatus,showUndo} from '../ui/undo-toast';
import {reinsertFavourite} from '../../lib/wealth-undo';
import {ProgressSlot} from '../progress/slot';
import {ValueSources} from '../bottom-sections';
import {LayoutLockButton,LayoutPage,LayoutRegion} from '../layout-edit';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {useMarketInsights} from './use-market-insights';
import {marketUniverse,marketCategory,FEATURED_MARKETS,type MarketRow} from '../../lib/product-insights';
import {marketRefKey,marketRequestKey,type MarketAssetRef} from '../../lib/market-assets';
import {addFavourite,removeFavourite} from '../../lib/asset-management';
import {formatPrice} from '../../lib/visual-format';
import {amount} from './common';
import {AssetIcon,FreshnessBadge,Sheet} from './financial-ui';
import {MarketMovement} from './market-movement';
import {quoteIsStale} from '../../lib/market-quotes';
import {AssetPicker} from './asset-picker';
import {HeaderArtCorner,OrbitArt} from '../header-art/orbit-art';
import {MarketsGlyph} from '../header-art/glyphs/markets';
import './wealth-product.css';
import './markets-pagination.css';
import {NebulaFlow} from '../nebula-flow';
import {FilterChips} from '../markets/filter-chips';
import {MarketTable,type MarketSortKey,type MarketTableRow} from '../markets/market-table';
import {formatTime} from '../../lib/visual-format';
import {useMarketDetails} from './use-market-detail';
import {amountText} from '../../lib/market-detail';
import {plainErrorMessage} from '../../lib/plain-error';
const PAGE_SIZE=24;
const VIEWS=['All markets','Owned','Favourites','Crypto','Stablecoins','Stocks','ETFs','Precious Metals'];
/** Session W Part 16: cards (as before) or the shared market table; the table also asks for each coin's 1h/7d change and market cap. */
const LAYOUTS=[{value:'cards',label:'Cards'},{value:'table',label:'Table'}] as const;
// Session AL (N-TK-24): "As listed" says what it is: what you own, then your favourites, then other markets.
const SORTS={listed:'As listed (owned, favourites, then others)',name:'Name',price:'Price','change24h':'24h change',marketCap:'Market cap'} as const;
export function MarketsView(){
 const store=usePlatform(),[layout,setLayout]=useRememberedChoice<'cards'|'table'>('markets-layout','cards',['cards','table']),[sort,setSort]=useState<MarketSortKey>('listed'),[filter,setFilter]=useRememberedChoice<string>('markets-view','All markets',VIEWS)/* Session AL (TK-033, M6): the chosen view survives Back */,[query,setQuery]=useState(''),[adding,setAdding]=useState(false),[error,setError]=useState(''),[page,setPage]=useState(0),[selectedRefs,setSelectedRefs]=useState<MarketAssetRef[]|null>(null);
 const known=marketUniverse(store.data),listed:MarketRow[]=[...known,...FEATURED_MARKETS.filter(a=>!known.some(r=>r.key===marketRefKey(a.ref))).map(a=>({...a,key:marketRefKey(a.ref),category:marketCategory(a.ref,a.symbol),favourite:false,positionIds:[]}))];
 // Session AL (TK-117, N-TK-07): a row stays where it was while this page is open; a star moves nothing under the pointer.
 // The order is taken once the saved favourites are read (owned, favourites, then others), then kept.
 const seen=useRef<string[]>([]);if(store.loaded)for(const r of listed)if(!seen.current.includes(r.key))seen.current.push(r.key);
 const rows=store.loaded?[...listed].sort((a,b)=>seen.current.indexOf(a.key)-seen.current.indexOf(b.key)):listed;
 const full=store.data.watchlist.length>=8,fullText='Your favourites are full (8 of 8). Remove one to add another.';
 // Search filters local identities only. Acquisition changes on explicit views/pages or loading prices.
 const matchingFirst=(view:string)=>rows.filter(r=>(view==='All markets'||view==='Owned'&&r.positionIds.length||view==='Favourites'&&r.favourite||view===r.category));
 const acquiredRefs=selectedRefs??(store.loaded?matchingFirst(filter).slice(0,PAGE_SIZE).map(r=>r.ref):[]),acquiredKeys=new Set(acquiredRefs.map(marketRefKey));
 const market=useMarketQuotes(acquiredRefs.map(marketRef=>({marketRef,currency:'USD'}))),insights=useMarketInsights(acquiredRefs),details=useMarketDetails(layout==='table'?acquiredRefs:[]);
 const matching=(view:string)=>rows.filter(r=>(view==='All markets'||view==='Owned'&&r.positionIds.length||view==='Favourites'&&r.favourite||view===r.category)&&`${r.name} ${r.symbol} ${r.ref.id}`.toLowerCase().includes(query.toLowerCase().trim()));
 const matches=matching(filter),lastPage=Math.max(0,Math.ceil(matches.length/PAGE_SIZE)-1),currentPage=Math.min(page,lastPage),visible=matches.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE),unselected=visible.some(r=>!acquiredKeys.has(r.key));
 function selectView(view:string){setFilter(view);setPage(0);setSelectedRefs(matching(view).slice(0,PAGE_SIZE).map(r=>r.ref));}
 function selectPage(next:number){setPage(next);setSelectedRefs(matches.slice(next*PAGE_SIZE,(next+1)*PAGE_SIZE).map(r=>r.ref));}
 // Session AL (TK-205, M9): a refresh you asked for says how it went, beside its button, as Wealth's does.
 const [asked,setAsked]=useState(false),[refreshNote,setRefreshNote]=useState('');
 const busy=market.loading||insights.loading||(layout==='table'&&details.loading);
 useEffect(()=>{if(!asked||busy)return;setAsked(false);setRefreshNote(market.error||insights.error?'Some market data could not be refreshed. The last good values stay, with their times.':`Market data updated at ${formatTime(new Date().toISOString())}.`);},[asked,busy,market.error,insights.error]);
 function loadPrices(){setRefreshNote('');setAsked(true);if(unselected)setSelectedRefs(visible.map(r=>r.ref));else{void market.refresh();void insights.refresh();if(layout==='table')void details.refresh();}}
 function tableRows(list:MarketRow[]):MarketTableRow[]{
  const rows=list.map(r=>{const q=market.quotes.find(q=>q.marketRef&&marketRefKey(q.marketRef)===r.key&&q.currency==='USD'),requestKey=marketRequestKey({marketRef:r.ref,currency:'USD'}),insight=insights.results[requestKey]?.insight??null,detail=details.results[requestKey]?.detail??null;
   return {key:r.key,name:r.name,symbol:r.symbol,category:r.category,href:`/app/wealth/asset/${encodeURIComponent(r.positionIds[0]??r.key)}`,logoUrl:r.ref.kind==='rwa'?null:insight?.logoUrl??null/* Session AL (TK-203, M10): no token logo for a metal or a stock */,price:q?amount(q.price,q.priceDecimals):null,priceNote:acquiredKeys.has(r.key)||insight?'Price unavailable':'Price not loaded',freshness:q?quoteIsStale(q,market.now)?'stale' as const:'fresh' as const:'missing' as const,change1h:detail?.change1h??null,change24h:insight?.change24h??detail?.change24h??null,change7d:detail?.change7d??null,sparkline:insight?.sparkline?.prices??null,marketCap:detail?.marketCap?amountText(detail.marketCap):null,favourite:r.favourite};});
  const number=(value:string|null)=>value===null?-Infinity:Number(value);
  const by=(r:MarketTableRow)=>sort==='change24h'?r.change24h:sort==='price'?r.price:r.marketCap;
  return sort==='listed'?rows:[...rows].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):number(by(b))-number(by(a))||a.name.localeCompare(b.name));
 }
 function toggle(row:MarketRow){setError('');if(!row.favourite&&full){showStatus(`${row.name} was not added. ${fullText}`);return;}
  // Session AL (N-TK-07): removing a favourite says so, with an Undo that puts it back in its place.
  const at=store.data.watchlist.findIndex(a=>marketRefKey(a.ref)===row.key),was=store.data.watchlist[at];
  void store.update(s=>row.favourite?removeFavourite(s,row.key):addFavourite(s,{ref:row.ref,name:row.name,symbol:row.symbol})).then(()=>{if(row.favourite&&was)showUndo({message:`${row.name} removed from your favourites.`,restore:()=>store.update(reinsertFavourite(was,at)),undone:`${row.name} is back in your favourites.`});}).catch(e=>{const text=plainErrorMessage(e, 'Could not update favourite.');setError(text);/* Session AH (WE12, L-064): said where the star was tapped, not only at the top */showStatus(text,{tone:'error'});});}
 return <LayoutPage page="markets"><div className="dashboard markets-page"><PriceAlertWatchGate/><section className="markets-hero"><LayoutLockButton/><div className="markets-hero-copy header-art-host"><p className="eyebrow page-eyebrow financial-orbit"><NebulaFlow identity="markets-eyebrow">YOUR FINANCIAL ORBIT</NebulaFlow></p><h1><NebulaFlow identity="markets-title">A wider view.<br/>Your markets.</NebulaFlow></h1><p className="page-lede">Follow the assets that interest you. Bring the ones you own into your wealth picture.</p><HeaderArtCorner><OrbitArt glyph={MarketsGlyph} tone="wealth" spin={-10}/></HeaderArtCorner></div><div className="markets-intro-card"><strong>{store.data.watchlist.length}<span> of 8</span></strong><p>Your favourites{/* Session AH (WE12, N-024) */}{store.data.watchlist.length>=8?' (full: remove one to add another)':''}</p><button className="primary" disabled={!store.loaded||!!store.error} onClick={()=>setAdding(true)}>+ Find a market</button><small>Watching an asset never adds it to your wealth.</small></div></section>
 <LayoutRegion region="body" items={[{id:'markets:explorer',label:'Explore markets',node:<section className="market-explorer" aria-label="Explore markets"><div className="market-toolbar"><label className="market-search">Search this market view<input type="search" value={query} placeholder="Bitcoin, Nvidia, Gold…" onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><button className="secondary" disabled={!visible.length||market.loading||insights.loading} aria-busy={asked&&busy} onClick={loadPrices}>{asked&&busy?'Refreshing…':unselected?'Load prices for this view':'↻ Refresh market data'}</button></div>{refreshNote&&<p className="fine market-refresh-note" role="status">{refreshNote}</p>}<FilterChips label="Market views" options={VIEWS.map(c=>({value:c,label:c}))} value={filter} onChange={selectView}/><div className="market-layout-row"><FilterChips className="picker-tabs market-layout" label="Show markets as" options={LAYOUTS} value={layout} onChange={setLayout}/>{layout==='table'&&<label className="field market-sort"><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value as MarketSortKey)}>{(Object.keys(SORTS) as (keyof typeof SORTS)[]).map(k=><option key={k} value={k}>{SORTS[k]}</option>)}</select></label>}</div>{(error||store.error)&&<p role="alert">{error||store.error}</p>}{(market.error||insights.error)&&<p className="notice" role="status">Some market data could not refresh. Last verified values retain their timestamps.</p>}
 <div className="market-pagination"><p aria-live="polite">{matches.length?`Showing ${currentPage*PAGE_SIZE+1}–${currentPage*PAGE_SIZE+visible.length} of ${matches.length} markets`:'No matching markets'}</p>{matches.length>PAGE_SIZE&&<nav aria-label="Market pages"><button className="secondary" disabled={currentPage===0} onClick={()=>selectPage(currentPage-1)}>Previous</button><span>Page {currentPage+1} of {lastPage+1}</span><button className="secondary" disabled={currentPage===lastPage} onClick={()=>selectPage(currentPage+1)}>Next</button></nav>}</div>{unselected&&<p className="fine">Search updates instantly using known markets. Choose “Load prices for this view” for fresh evidence; cached values remain visible.</p>}
 {layout==='table'?<MarketTable rows={tableRows(visible)} currency="USD" label="Markets" loading={details.loading||insights.loading} sort={sort} onSort={setSort} fullText={full?fullText:undefined} disabled={!store.loaded||!!store.error} onToggle={row=>{const source=visible.find(r=>r.key===row.key);if(source)toggle(source);}}/>:<div className="markets-grid">{visible.map(r=>{const q=market.quotes.find(q=>q.marketRef&&marketRefKey(q.marketRef)===r.key&&q.currency==='USD'),result=insights.results[marketRequestKey({marketRef:r.ref,currency:'USD'})],href=`/app/wealth/asset/${encodeURIComponent(r.positionIds[0]??r.key)}`;return <article className="market-product-card" key={r.key}><header><AssetIcon symbol={r.symbol} kind={r.category} logoUrl={r.ref.kind==='rwa'?null:result?.insight?.logoUrl}/><div><h2><Link href={href}>{r.name}</Link></h2><p>{r.symbol.toUpperCase()} · {r.category}</p></div><button className="market-favourite" aria-label={`${r.favourite?'Remove':'Add'} ${r.name} favourite`} aria-pressed={r.favourite} aria-disabled={!r.favourite&&full?true:undefined} title={!r.favourite&&full?fullText:undefined} disabled={!store.loaded||!!store.error} onClick={()=>toggle(r)}>{r.favourite?'★':'☆'}</button></header><div className="market-card-price"><strong>{q?formatPrice(amount(q.price,q.priceDecimals),'USD'):acquiredKeys.has(r.key)||result?'Price unavailable':'Price not loaded'}</strong><FreshnessBadge state={q?quoteIsStale(q,market.now)?'stale':'fresh':'missing'}/></div><MarketMovement result={result} notRequested={!result&&!acquiredKeys.has(r.key)}/><footer><span className="market-ownership" data-owned={!!r.positionIds.length}>{r.positionIds.length?'Owned asset':r.favourite?'Favourite only':'Market reference'}</span><Link className="text-link" href={href}>Explore →</Link></footer></article>;})}</div>}{!visible.length&&<div className="panel"><h2>No matches in this view</h2><p>Try another name or browse the full CoinGecko catalog.</p><button className="secondary" onClick={()=>setAdding(true)}>Find a market</button></div>}</section>},{id:'markets:sources',label:'What’s tracked, and how',node:<ValueSources variant="markets" platform={store.data}/>}]}/>
 <div className="page-game-slot"><ProgressSlot page="markets"/></div><p className="market-method-note">Crypto prices use CoinGecko. Stocks, ETFs and metals use tokenized RWA references, which can differ from the underlying market. Seven-day sequences have no individual timestamps. No trading or return forecast is implied. {/* Session AL (MO-119, P-MO-84): what the price lookups send (lib/market-quote-client.ts; the route refuses anything more, lib/market-quotes-route.test.ts) */}To show prices, this page sends only which markets it shows and their currency to the ZIGoals server, which asks CoinGecko; never your amounts or records.</p>{adding&&<Sheet title="Find a market" onClose={()=>setAdding(false)}><AssetPicker onFavourite={a=>void store.update(s=>addFavourite(s,a)).then(()=>setAdding(false)).catch(e=>setError(plainErrorMessage(e,'Could not add the favourite.')))}/>{error&&<p role="alert">{error}</p>}</Sheet>}</div></LayoutPage>;
}
