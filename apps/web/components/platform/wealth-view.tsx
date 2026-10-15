'use client';
import {ProgressSlot} from '../progress/slot';
import {WealthTotal,BaseCurrencySwitch} from './wealth-total';
import {LayoutLockButton,LayoutPage,LayoutRegion} from '../layout-edit';
import {SplitMoney} from './wealth-total';
// Gate C weights: the chart is its own chunk (Wealth sat 4 kB over its budget with it inline; budgets are never raised).
const WealthHistoryChart=lazy(()=>import('../wealth/wealth-history-chart').then(m=>({default:m.WealthHistoryChart})));
import {usePhoneActive} from '../phone/use-phone-layout';
import {usePhoneShowAll} from '../phone/phone-show-all';
import {plural} from '../../lib/plural';
import {phoneOrder} from '../phone/phone-order';
import {AccountsSection} from '../wealth/accounts-section';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS, isDebtKind} from '../../lib/accounts/schema';
/** On a phone the holdings come right after the total, then the shape of the portfolio and the favourites. */
// Session AA-Cloud Part 1 (PAGE_ORDER_AA.md): the tracker row, then the items (holdings and accounts), then the tools
// that put them in perspective, and the history, evidence and archive at the end. A phone shows the holdings first.
const PHONE_ORDER=['wealth:pulse','wealth:holdings'];
import {entityLayoutId} from '../../lib/page-layout';
import './wealth.css';
import './wealth-product.css';
import './intelligence.css';
import {Suspense,lazy,useState,type ComponentType,type CSSProperties} from 'react';
import type {LayoutAttrs} from '../layout-edit';
/**
 * Phase 2 (weights, never a raised budget): Wealth's sections below the fold load as their own chunks. Each stays one
 * layout item: while its code arrives, a quiet placeholder carries the item's layout attributes (one DOM root, so the
 * layout region keeps it in place), then the section itself does.
 */
function later<P extends object>(load:()=>Promise<ComponentType<P&LayoutAttrs>>,min=180){
 const Part=lazy(()=>load().then(c=>({default:c})));
 return function LaterPart(props:P&LayoutAttrs){const {'data-layout-item':item,'data-layout-region':region}=props;return <Suspense fallback={<div data-layout-item={item} data-layout-region={region} className="panel wealth-later" aria-busy="true" style={{minHeight:min}}/>}><Part {...props}/></Suspense>;};
}
const WealthChanges=later(()=>import('./wealth-changes').then(m=>m.WealthChanges));
const FinancialEvidence=later(()=>import('./financial-evidence').then(m=>m.FinancialEvidence));
const Watchlist=later(()=>import('./watchlist').then(m=>m.Watchlist),120);
const CalculatorCard=later(()=>import('../calculator/calculator-card').then(m=>m.CalculatorCard));
const WealthAllocationSection=later(()=>import('../bottom-sections').then(m=>m.WealthAllocationSection));
import {ActionIntent} from '../action-intent';
import {GlassBar} from '../progress/glass-progress';
import {useMarketInsights} from './use-market-insights';
import {marketRequestKey,uniqueMarketRequests} from '../../lib/market-assets';
import {holdingUnitQuote,referencePriceLabel} from '../../lib/product-insights';
import {quoteIsStale} from '../../lib/market-quotes';
import './run92-gap-fixes.css';
import {PortfolioComposition} from './product-modules';
import {MarketMovement} from './market-movement';
import {useShowcase} from '../showcase-controls';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {useValuationHistory} from './use-valuation-history';
import {useEvidenceNow} from './use-evidence-now';
import {shownAmount} from './common';
import {wealthMarketRequests,wealthOverview,ASSET_COLORS} from '../../lib/wealth';
import {SceneArt} from '../scene-art';
import {AssetIcon,FreshnessBadge,Sheet} from './financial-ui';
import {ManualSourceCards} from './manual-source-cards';
import {useImportUndo} from '../import/use-import-undo';
import {ImportBanner} from '../import/csv-import-steps';
import {undoImport} from '../../lib/import/holdings';
// Session Z-Cloud Part 5 (weights, ADR-019 C39): the holdings import loads when the person opens it.
const HoldingsImportPanel=lazy(()=>import('../import/holdings-import').then(m=>({default:m.HoldingsImportPanel})));
import type {ImportRecord} from '../../lib/import/undo-schema';
import {PhoneFold} from '../phone/phone-fold';
import {restoreAsset} from '../../lib/asset-management';
import {PinToToday} from '../pin-to-today';
import {PillarHero} from '../pillar-hero';
import {EmptyState} from '../ui/empty-state';
import {assetQuantity} from './asset-quantity';
import { formatDateTime } from '../../lib/visual-format';
import {wealthMoney} from './wealth-money';
import {ShowcaseTag} from '../ui/showcase-tag';
export {wealthMoney};
export function WealthView(){
 const accountsRecord=useDeviceRecord(ACCOUNTS);
 const store=usePlatform(),[adding,setAdding]=useState(false),[importing,setImporting]=useState(false),[filter,setFilter]=useState('All'),[error,setError]=useState('');
 // W3: holdings from a CSV, with the undo ledger of this device.
 const imports=useImportUndo();const undoRecord=async(record:ImportRecord)=>{await store.update(s=>undoImport(record,{platform:s}).platform!);imports.forget(record.id);};const requests=uniqueMarketRequests([...wealthMarketRequests(store.data),...store.data.positions.flatMap(p=>p.marketRef&&!p.archivedAt&&(p.marketRef.kind!=='rwa'||(p.quoteCurrency??'USD')==='USD')?[{marketRef:p.marketRef,currency:p.quoteCurrency??'USD' as const}]:[])]),market=useMarketQuotes(requests);useValuationHistory(store,market);
 const insights=useMarketInsights(store.data.positions.flatMap(p=>p.marketRef&&!p.archivedAt?[p.marketRef]:[])),showcase=useShowcase(),phone=usePhoneActive(),holdings=usePhoneShowAll(4),classes=usePhoneShowAll(4);
 const now=useEvidenceNow(store.data,market.now),overview=wealthOverview(store.data,now,market.quotes);
 if(!store.loaded)return <div className="dashboard"><h1>Your Wealth</h1><p>Loading your private wealth…</p></div>;
 if(store.error)return <div className="dashboard"><h1>Your Wealth</h1><p role="alert">{store.error}</p></div>;
 const automatic=overview.rows.filter(r=>r.position.valuationMode==='automatic'||r.source?.startsWith('CoinGecko')),fresh=automatic.filter(r=>r.valuationState==='fresh').length,attention=overview.rows.filter(r=>r.stale||r.value===undefined||r.balance.deficit!=='0');
 // Session AB-Design (owner request 24): one currency line per row (the base currency), the others as a chip, never converted.
 const metric=(key:'value'|'allocated'|'unallocated')=>overview.subtotals.length?<SplitMoney id={`wealth-${key}`} subtotals={overview.subtotals.map(s=>({currency:s.currency,value:s[key]}))}/>:<span>{overview.rows.length?'Needs valuation':key==='value'?'Start your wealth story':'—'}</span>;
 // Session AC (the owner's decision of 2026-10-15, "show each thing once"): the three holdings lists — What you have, Your
 // assets, Accounts, debts & net worth — are one list with one row of chips: All, Accounts, Debts, Assets, each asset class
 // and Needs attention. Every card, row, action and total is the same component as before; only the filter is shared.
 const liveAccounts=accountsRecord.loaded&&!accountsRecord.unreadable?accountsRecord.data.items.filter(a=>!a.archivedAt):[];
 const holdingChips:[string,number][]=[['All',overview.rows.length+liveAccounts.length],['Accounts',liveAccounts.filter(a=>!isDebtKind(a.kind)).length],['Debts',liveAccounts.filter(a=>isDebtKind(a.kind)).length],['Assets',overview.rows.length],...overview.categories.filter(c=>c.items.length).map(c=>[c.assetClass,overview.rows.filter(r=>r.assetClass===c.assetClass).length] as [string,number]),['Needs attention',attention.length]];
 const showAccounts=filter==='All'||filter==='Accounts'||filter==='Debts',showAssets=!(filter==='Accounts'||filter==='Debts');
 const rows=overview.rows.filter(r=>filter==='All'||filter==='Assets'||filter==='Needs attention'&&attention.includes(r)||r.assetClass===filter);
 // On a phone the total follows the title, so the figure is on the first screen; elsewhere it keeps its place.
 const total=<div className="wealth-hero-total" role="group" aria-label={overview.incomplete?'Known tracked wealth':'Total tracked wealth'}>{overview.subtotals.some(s=>s.currency==='USD'||s.currency==='EUR')&&<PinToToday label="Tracked wealth" choices={overview.subtotals.filter(s=>s.currency==='USD'||s.currency==='EUR').map(s=>({kind:'wealth' as const,metric:s.currency,label:`${s.currency} wealth`}))}/>}<span>{overview.incomplete?'KNOWN TRACKED WEALTH':'TOTAL TRACKED WEALTH'}</span><WealthTotal identity="wealth-total" subtotals={overview.subtotals} empty={overview.rows.length?'Needs valuation':'Start your wealth story'}/><small>{overview.rows.length}{` ${plural(overview.rows.length,'asset')} · `}{automatic.length} automatic · {overview.rows.length-automatic.length} manual</small>{overview.subtotals.length>1&&<p className="wealth-total-fx">Currency totals stay separate. No FX assumed.</p>}</div>;
 return <LayoutPage page="wealth"><div className="dashboard wealth-workspace wealth-product"><ActionIntent value="asset" onAction={()=>setAdding(true)}/>
 {/* Session AB-Design Phase 2 (ADR-024 P5; critique 8): the shared pillar header, unboxed like the other three; the totals follow in their own card with the holdings' two tools ("Manage assets", "Refresh prices"), moved from the header, never removed. */}
 <PillarHero pillar="wealth" titleId="wealth-title" className="wealth-heading" eyebrow="Your financial orbit" title="Wealth, with every source in view." lede="Everything you own. Everything you’re working toward. One clear view." about="wealth" buttons={<button className="primary" onClick={()=>setAdding(true)}>+ Add asset</button>}/>
 <section className="wealth-hero wealth-summary panel" aria-label="Your wealth in one view"><LayoutLockButton/><div className="wealth-hero-scene"><SceneArt scene="horizon"/></div><div className="wealth-orbit wealth-orbit-one"/><div className="wealth-orbit wealth-orbit-two"/>{total}<div className="wealth-summary-side"><dl className="wealth-split"><div><dt><span className="split-dot allocated"/>Allocated to Goals</dt><dd>{metric('allocated')}</dd></div><div><dt><span className="split-dot available"/>Available for Goals</dt><dd>{metric('unallocated')}</dd></div></dl><div className="wealth-summary-tools"><a className="secondary" href="#holdings">Manage assets</a><button className="secondary" onClick={()=>void market.refresh()} disabled={market.loading||!requests.length}>{market.loading?'Refreshing…':'↻ Refresh prices'}</button><BaseCurrencySwitch/></div><p className="fine">Private tracking · no funds move.</p></div></section>
 {market.error&&<p className="notice" role="status">Price refresh is unavailable. Last-good values stay visible with their timestamps.</p>}
 <ImportBanner imports={imports} kind="wealth" onUndo={undoRecord}/>
 <LayoutRegion region="body" items={phoneOrder(phone,[
  {id:'wealth:pulse',label:'Portfolio pulse',node:<section className="portfolio-pulse" aria-label="Portfolio pulse"><div><span className="pulse-dot"/><strong>{fresh} of {automatic.length} automatic values current</strong><span>Prices refresh when you ask; a price counts as current for 15 minutes.</span></div><button className="text-link" onClick={()=>{setFilter('Needs attention');document.getElementById('holdings')?.scrollIntoView({behavior:'instant'});}}>{attention.length} need attention →</button></section>},
  {id:'wealth:holdings',label:'What you have',node:<section id="holdings" className="wealth-holdings-one" aria-labelledby="holdings-title"><header className="wealth-section-heading"><div><p className="eyebrow">ACCOUNTS · ASSETS · DEBTS</p><h2 id="holdings-title">What you have</h2><p>Everything you track here, in one list: each asset with its market and Goals, each account and debt with its balance. Portfolio is a separate tracker for coins, kept apart from Wealth.</p></div><div className="wealth-holdings-actions"><button className="secondary" onClick={()=>setAdding(true)}>+ Add asset</button><Link className="text-link" href="/app/portfolio">Open Portfolio →</Link></div></header><div className="picker-tabs holdings-filters" role="group" aria-label="Show">{holdingChips.map(([c,n])=><button key={c} type="button" aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c} <span className="what-you-have-count">{n}</span></button>)}</div>{showAssets&&<><div className="owned-assets-grid" {...holdings.listProps(rows.length)}><LayoutRegion region="holdings" grid allIds={overview.rows.map(x=>entityLayoutId(x.position.id))} items={rows.map(r=>{const unitQuote=holdingUnitQuote(r.position,market.quotes,now);return {id:entityLayoutId(r.position.id),label:r.position.providerId,node:<article className="owned-asset-card"><Link className="owned-card-link" href={`/app/wealth/asset/${encodeURIComponent(r.position.id)}`}><div className="owned-asset-heading"><AssetIcon symbol={r.position.asset} kind={r.position.marketRef?.kind==='rwa'&&r.position.marketRef.assetType==='etf'?'ETFs':r.assetClass} logoUrl={r.position.marketRef?insights.results[marketRequestKey({marketRef:r.position.marketRef,currency:'USD'})]?.insight?.logoUrl:null}/><div><h3>{r.position.providerId==='native-zig'?`ZIG ${r.position.sourceType.replaceAll('_',' ').toLowerCase()}`:r.position.providerId}</h3><p>{r.position.asset} · {r.assetClass}</p></div><span aria-hidden="true">↗</span></div><div className="owned-value"><strong style={{'--chars':(r.value===undefined?'Needs valuation':wealthMoney(r.value,r.currency!)).length} as CSSProperties}>{r.value===undefined?'Needs valuation':wealthMoney(r.value,r.currency!)}</strong><span>{assetQuantity(shownAmount(r.position.quantity,r.position.decimals),r.position)}</span></div><div className="holding-unit-price"><span>Reference price <small>per {r.position.asset}</small></span><strong>{unitQuote?referencePriceLabel(unitQuote):'Unavailable'}</strong>{unitQuote&&<small>{quoteIsStale(unitQuote,now)?'Needs refresh':'Current'} · {unitQuote.currency}</small>}</div>{r.position.marketRef&&<MarketMovement compact result={insights.results[marketRequestKey({marketRef:r.position.marketRef,currency:'USD'})]}/>}<GlassBar identity="holding-allocation" className="holding-allocation-track" value={r.value&&r.allocatedValue?Number(r.allocatedValue*10000n/r.value)/10000:0}/><div className="holding-allocation-labels"><span>In Goals <strong>{r.allocatedValue===undefined?'—':wealthMoney(r.allocatedValue,r.currency!)}</strong></span><span>Available <strong>{r.unallocatedValue===undefined?'—':wealthMoney(r.unallocatedValue,r.currency!)}</strong></span></div><div className="asset-card-source">{/* Session X P2.1: a manual value's badge already says so ("Manual value" twice). */}{!(r.valuationState==='manual'&&r.source==='Manual value')&&<span>{r.source??'Add a valuation'}</span>}<FreshnessBadge state={r.valuationState}/></div>{r.valuedAt&&<time className="asset-updated" dateTime={r.valuedAt}>{formatDateTime(r.valuedAt)}</time>}</Link><Link className="text-link" href={`/app/wealth/asset/${encodeURIComponent(r.position.id)}`}>View & manage asset →</Link><PinToToday label={r.position.providerId} choices={[{kind:'asset',metric:'quantity',entity:r.position.id,label:`${r.position.providerId} quantity`},{kind:'asset',metric:'value',entity:r.position.id,label:`${r.position.providerId} value`},{kind:'asset',metric:'available',entity:r.position.id,label:`${r.position.providerId} available`},{kind:'allocation',metric:'allocation',entity:r.position.id,label:`${r.position.providerId} allocations`}]}/></article>};})}/></div>{holdings.button(rows.length,'assets')}{!rows.length&&<EmptyState className="holdings-empty panel" title={filter==='Needs attention'?'Everything here is up to date':filter==='All assets'?'Build your wealth picture':'No assets in this category yet'} action={<button className="primary" onClick={()=>setAdding(true)}>Add your first asset</button>}>Add cash, crypto, stocks, metals or another asset. Connect it to a Goal whenever you’re ready.</EmptyState>}</>}{showAccounts&&<PhoneFold label="Accounts, debts & net worth"><AccountsSection only={filter==='Accounts'?'accounts':filter==='Debts'?'debts':'all'}/></PhoneFold>}</section>},
  {id:'wealth:composition',label:'The shape of your wealth',node:<PortfolioComposition overview={overview}/>},
  {id:'wealth:mix',label:'Your wealth, in perspective',node:<PhoneFold label="Your wealth, in perspective"><section aria-label="Asset mix"><div className="wealth-section-heading"><div><p className="eyebrow">A PLACE FOR EVERY ASSET</p><h2>Your wealth, in perspective</h2></div></div><div className="asset-class-summaries" {...classes.listProps(overview.categories.length)}>{overview.categories.map(c=><button type="button" key={c.assetClass} className="class-summary" data-empty={!c.items.length} onClick={()=>{setFilter(c.assetClass);document.getElementById('holdings')?.scrollIntoView({behavior:'instant'});}}><div><span className="asset-swatch" style={{background:ASSET_COLORS[c.assetClass]}}/><strong>{c.assetClass}</strong><small>{c.items.length}{` ${plural(c.items.length,'asset')}`}</small></div><b>{c.subtotals.length?c.subtotals.map(t=><span key={t.currency}>{wealthMoney(t.value,t.currency)}</span>):'—'}</b>{c.items.length>0&&<span className="class-summary-caption">{c.incomplete?'Some values need review':c.items.slice(0,3).map(r=>r.position.asset).join(' · ')}</span>}</button>)}</div>{classes.button(overview.categories.length,'asset classes')}</section></PhoneFold>},
  {id:'wealth:watchlist',label:'Markets that matter to you',node:<PhoneFold label="Your favourite markets"><Watchlist/></PhoneFold>},
  {id:'wealth:history',label:'Your wealth over time',node:<PhoneFold label="Your wealth over time"><section className="wealth-history panel" id="wealth-history" aria-labelledby="wealth-history-title">{overview.history.some(h=>h.currency==='USD'||h.currency==='EUR')&&<PinToToday label="Recorded wealth history" choices={overview.history.filter(h=>h.currency==='USD'||h.currency==='EUR').map(h=>({kind:'wealth' as const,metric:`history-${h.currency}`,label:`Recorded ${h.currency} wealth`}))}/>}<div className="wealth-section-heading"><div><p className="eyebrow">YOUR RECORDED JOURNEY</p><h2 id="wealth-history-title">{overview.history.length?'Your wealth over time':'Tracking starts here'}</h2><p>{showcase?<><ShowcaseTag/>Fictional dated portfolio observations, separate from current public market prices.</>:'We record valid valuations going forward. Earlier performance is never invented.'}</p></div></div>{overview.history.length?<Suspense fallback={<p className="fine">Drawing your wealth over time…</p>}>{overview.history.map(h=><WealthHistoryChart key={h.currency} history={h} showcase={showcase}/>)}</Suspense>:<p className="picker-mode-note">Your first complete valuation starts this chart. More saved observations will reveal your journey.</p>}</section></PhoneFold>},
  {id:'wealth:changes',label:'Explain recorded wealth change',node:<WealthChanges data={store.data}/>},
  {id:'wealth:evidence',label:'Evidence and returns',node:<PhoneFold label="Evidence & returns"><FinancialEvidence data={store.data} update={store.update}/></PhoneFold>},
  store.data.positions.some(p=>p.archivedAt)&&{id:'wealth:archived',label:'Archived assets',node:<details className="panel"><summary>Archived assets</summary><p>Historical evidence is retained. Restoring an asset adds it back to current wealth without recreating allocations.</p>{store.data.positions.filter(p=>p.archivedAt).map(p=><div className="archived-row" key={p.id}><span>{p.providerId}</span><button className="secondary" onClick={()=>void store.update(s=>restoreAsset(s,p.id)).catch(e=>setError(String(e)))}>Restore {p.providerId}</button></div>)}</details>},
  {id:'wealth:allocation',label:'Allocation and coverage',node:<PhoneFold label="Allocation and coverage"><WealthAllocationSection overview={overview}/></PhoneFold>},
  // Session AB-Design (owner request 26): the compound interest calculator is Wealth's last section, right above the footer (saved layouts keep their own order).
  {id:'wealth:calculator',label:'Compound interest calculator',node:<CalculatorCard/>},
 ],PHONE_ORDER)}/>
 <div className="page-game-slot"><ProgressSlot page="wealth"/></div>
{error&&<p role="alert">{error}</p>}{adding&&<Sheet title={importing?'Import holdings':'Add to your wealth'} onClose={()=>{setAdding(false);setImporting(false);}}>{importing?<Suspense fallback={null}><HoldingsImportPanel platform={store.data} update={store.update} imports={imports} onUndo={undoRecord} onClose={()=>setImporting(false)}/></Suspense>:<><ManualSourceCards update={store.update} onSaved={()=>setAdding(false)}/><section className="manual-source-selector import-entry" aria-label="Import from a file"><p>Have a spreadsheet of what you own? Read on this device only.</p><button type="button" className="secondary" onClick={()=>setImporting(true)}>Import from a CSV file</button></section></>}</Sheet>}
 </div></LayoutPage>;
}
