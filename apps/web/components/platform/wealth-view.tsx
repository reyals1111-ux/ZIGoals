'use client';
import {HideAmountsToggle} from '../hide-amounts';
import {PriceAlertWatchGate} from '../price-alerts/watch-gate';
import {ProgressSlot} from '../progress/slot';
import {WealthTotal,CURRENCIES_APART,HeroNetWorth} from './wealth-total';
import {holdingsOf,netWorthTotal} from '../../lib/accounts/net-worth';
import {localDate} from '../../lib/local-date';
import {splitWealthTotals} from '../../lib/wealth-total';
import {LayoutLockButton,LayoutPage,LayoutRegion} from '../layout-edit';
import {SplitMoney} from './wealth-total';
import {amount as unitsText} from './common';
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
import './wealth-design-fixes.css';
import './intelligence.css';
import {Suspense,lazy,useEffect,useState,type ComponentType,type CSSProperties,type ReactNode} from 'react';
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
const WealthAllocationSection=later(()=>import('../bottom-wealth-allocation').then(m=>m.WealthAllocationSection));
// Session AF (L2b, Part 3, ADR-028 H16): the linked wallets' balances, read-only, in their own chunk (nothing renders until a wallet is linked).
const WalletHoldings=lazy(()=>import('../wallet/wallet-holdings'));
// Session AJ (item 36, D2b): a Bitcoin wallet watched by its public key (shown once one is watched or opened by #xpub).
const XpubWatch=lazy(()=>import('../wallet/xpub-watch'));
// Session AL Part 15 (GAP-023, C-TK-09): look up any public address on the chains ZIGoals reads; its own chunk.
const AddressLookup=lazy(()=>import('../wallet/address-lookup'));
// Session AI (B3, feature 5): the expense log with a weekly room to spend, loaded after the page (weights).
const SpendingBody=lazy(()=>import('../wealth/spending/spending-section'));
/** One DOM root for the layout item (a layout item with a fragment root is dropped), the body inside it. */
function SpendingSlot({showcase,onImport,...layout}:LayoutAttrs&{showcase:boolean;onImport:()=>void}){return <section {...layout} className="spending panel" id="spending" aria-labelledby="spending-title"><header className="wealth-section-heading"><div><p className="eyebrow">SPENDING · THIS WEEK</p><h2 id="spending-title">Room to spend</h2><p>What you spend and receive, logged in seconds, with a weekly budget if you want one.</p></div><button type="button" className="secondary" onClick={onImport}>Import from your bank</button></header><Suspense fallback={<p className="fine">Loading your spending…</p>}><SpendingBody showcase={showcase}/></Suspense></section>;}
// Session AK (Part 7, lane W): bills, category budgets, the target mix, what each asset is for and the contribution
// rhythm, each its own chunk and its own anchored section (/app/wealth?view=bills scrolls to #bills).
const UpcomingBills=lazy(()=>import('../wealth/bills/upcoming-bills'));
const BudgetsMonth=lazy(()=>import('../wealth/budgets/budgets-month'));
const TargetAllocation=lazy(()=>import('../wealth/allocation/target-allocation'));
const PurposeFlow=lazy(()=>import('../wealth/allocation/purpose-flow'));
// Session AK (F4, purpose staking): staked ZIG beside the purpose picture, with when it can be used; renders nothing without ZIG staking.
const StakedPurpose=lazy(()=>import('../zigchain-eco/staked-purpose'));
const ContributionAutopilot=lazy(()=>import('../wealth/allocation/contribution-autopilot'));
function WealthSlot({anchor,eyebrow,title,lede,children,...layout}:LayoutAttrs&{anchor:string;eyebrow:string;title:string;lede:string;children:ReactNode}){return <section {...layout} className="panel wealth-slot" id={anchor} aria-labelledby={`${anchor}-title`}><header className="wealth-section-heading"><div><p className="eyebrow">{eyebrow}</p><h2 id={`${anchor}-title`} tabIndex={-1}>{title}</h2><p>{lede}</p></div></header><Suspense fallback={<p className="fine">Loading…</p>}>{children}</Suspense></section>;}
/** `?view=` → the section's anchor (the notification plan links /app/wealth?view=bills). */
export const WEALTH_VIEWS:Readonly<Record<string,string>>={bills:'bills',budgets:'budgets',purpose:'purpose',target:'target-mix',rhythm:'contribution-rhythm'};
/** Scrolls to a section once it is on the page (a folded phone section opens on the hash) and moves focus to its heading. */
export function showSection(anchor:string,tries=60){
 const el=document.getElementById(anchor);
 if(!el){if(tries>0)requestAnimationFrame(()=>showSection(anchor,tries-1));return;}
 const state={...window.history.state};delete state.__NA;delete state._N;
 window.history.replaceState(state,'',`${location.pathname}${location.search}#${anchor}`);window.dispatchEvent(new HashChangeEvent('hashchange'));
 el.scrollIntoView({block:'start'});document.getElementById(`${anchor}-title`)?.focus({preventScroll:true});
}
import {ActionIntent} from '../action-intent';
import {GlassBar} from '../progress/glass-progress';
import {useMarketInsights} from './use-market-insights';
import {marketRequestKey,uniqueMarketRequests} from '../../lib/market-assets';
import {holdingUnitQuote,referencePriceLabel} from '../../lib/product-insights';
import {quoteIsStale,pricesFrozen} from '../../lib/market-quotes';
import './run92-gap-fixes.css';
import {PortfolioComposition} from './product-modules';
import {MarketMovement} from './market-movement';
import {useShowcase} from '../showcase-controls';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {cryptoPageShown} from '../../lib/chain-choice';
import Link from 'next/link';
import {usePlatform} from './use-platform';
import {useMarketQuotes} from './use-market-quotes';
import {useValuationHistory} from './use-valuation-history';
import {useEvidenceNow} from './use-evidence-now';
import {wealthMarketRequests,wealthOverview,marketPricesLine,ASSET_COLORS,STABLECOINS_AS_CASH_KEY,shownWealthClass} from '../../lib/wealth';
import {SceneArt} from '../scene-art';
import {AssetIcon,FreshnessBadge,Sheet} from './financial-ui';
import {ManualSourceCards} from './manual-source-cards';
import {useImportUndo} from '../import/use-import-undo';
import {ImportBanner} from '../import/import-banner'; // CI13: not the CSV steps
import {undoImport} from '../../lib/import/holdings';
// Session Z-Cloud Part 5 (weights, ADR-019 C39): the holdings import loads when the person opens it.
/** Session AO (D-055): the asset page's Edit asset form, loaded when a card's ⋯ → Edit opens it. */
const AssetEditor=lazy(()=>import('./asset-editor').then(m=>({default:m.AssetEditor})));
const HoldingsImportPanel=lazy(()=>import('../import/holdings-import').then(m=>({default:m.HoldingsImportPanel})));
// Session AK (A14, 7.1): a bank statement file or a CSV into the money log, from the same lazily loaded import sheet.
const MoneyImportPanel=lazy(()=>import('../import/holdings-import').then(m=>({default:m.MoneyImportPanel})));
import type {ImportRecord} from '../../lib/import/undo-schema';
import {PhoneFold} from '../phone/phone-fold';
import {restoreAsset} from '../../lib/asset-management';
import {PinToToday} from '../pin-to-today';
import {showStatus} from '../ui/undo-toast';
import {PillarHero} from '../pillar-hero';
import {OrbitArt} from '../header-art/orbit-art';
import {WealthGlyph} from '../header-art/glyphs/wealth';
import {EmptyState} from '../ui/empty-state';
import {assetQuantity,plainUnit,unitWord} from './asset-quantity';
import { formatDate, formatDateTime, formatExactNumber, formatQuantity, formatTime, isMoneyCurrency } from '../../lib/visual-format';
import { formatUnits } from '@zigoals/chain-config';
import {wealthMoney} from './wealth-money';
import {ShowcaseTag} from '../ui/showcase-tag';
import {isLivePriced} from '../../lib/numbers/counts';
import {plainErrorMessage} from '../../lib/plain-error';
export {wealthMoney};
/** Session AL (TK-127, W5): a value saved earlier under an invented code ("XYZ") needs the person's attention; it is shown, never converted. */
const unknownCurrency=(currency:string|undefined)=>!!currency&&!isMoneyCurrency(currency);
export function WealthView(){
 const accountsRecord=useDeviceRecord(ACCOUNTS);
 // Session AK X1 (RELEASE_REVIEW R22): Portfolio's link only while Portfolio shows, Earn's once the chain is chosen (the
 // pages view's money tools follow that choice, lib/chain-choice.ts).
 const pagesView=usePagesView(),portfolioShown=isShown(pagesView,'portfolio'),earnLink=cryptoPageShown(pagesView);
 const store=usePlatform(),[adding,setAdding]=useState(false),[importing,setImporting]=useState<false|'holdings'|'money'>(false),[filter,setFilter]=useState('All'),[error,setError]=useState(''),[editingAsset,setEditingAsset]=useState<string|null>(null);
 // W3: holdings from a CSV, with the undo ledger of this device.
 const imports=useImportUndo();const undoRecord=async(record:ImportRecord)=>{await store.update(s=>undoImport(record,{platform:s}).platform!);imports.forget(record.id);};const requests=uniqueMarketRequests([...wealthMarketRequests(store.data),...store.data.positions.flatMap(p=>p.marketRef&&!p.archivedAt&&(p.marketRef.kind!=='rwa'||(p.quoteCurrency??'USD')==='USD')?[{marketRef:p.marketRef,currency:p.quoteCurrency??'USD' as const}]:[])]),market=useMarketQuotes(requests);useValuationHistory(store,market);
 // Session AH (WE4, D-096): a refresh you asked for says how it went, beside its button.
 const [asked,setAsked]=useState(false),[refreshNote,setRefreshNote]=useState('');
 useEffect(()=>{if(!asked||market.loading)return;setAsked(false);setRefreshNote(market.error?'Prices could not be refreshed. The last good values stay, with their times.':`Prices updated at ${formatTime(new Date().toISOString())}.`);},[asked,market.loading,market.error]);
 const insights=useMarketInsights(/* Session AH (WE11, B-085): only the holdings priced from the market; a manually valued one sends nothing */store.data.positions.flatMap(p=>p.marketRef&&!p.archivedAt&&isLivePriced(p)?[p.marketRef]:[])),showcase=useShowcase(),phone=usePhoneActive(),holdings=usePhoneShowAll(4),classes=usePhoneShowAll(4);
 // Session AL (GAP-028, P-TK-83): "Count stablecoins as cash" groups them with Cash in the class view only; device-only choice.
 const [stablesAsCash,setStablesAsCash]=useState(false);useEffect(()=>{try{if(localStorage.getItem(STABLECOINS_AS_CASH_KEY)==='1')queueMicrotask(()=>setStablesAsCash(true));}catch{/* the default view */}},[]);
 const chooseStablesAsCash=(on:boolean)=>{setStablesAsCash(on);if(filter==='Stablecoins'&&on)setFilter('Cash');try{if(on)localStorage.setItem(STABLECOINS_AS_CASH_KEY,'1');else localStorage.removeItem(STABLECOINS_AS_CASH_KEY);}catch{/* kept for this visit */}};
 const now=useEvidenceNow(store.data,market.now),overview=wealthOverview(store.data,now,market.quotes,{stablecoinsAsCash:stablesAsCash});
 const holdsStables=overview.rows.some(r=>r.wealthClass==='Stablecoins');
 // Session AL (W9, TK-040): before the saved prices are read (the first paint), a badge says "Checking…" instead of flashing "Needs value".
 const checking=market.now===0||(market.loading&&!market.quotes.length);
 if(!store.loaded)return <div className="dashboard route-loading-reserve"><h1>Your Wealth</h1><p>Loading your private wealth…</p></div>;
 if(store.error)return <div className="dashboard"><h1>Your Wealth</h1><p role="alert">{store.error}</p></div>;
 // Session AH (TR6): live-priced by Wealth's own rule (lib/numbers/counts.ts), so Markets counts the same manual assets.
 const staleQuote=(r:(typeof overview.rows)[number])=>isLivePriced(r.position)&&r.valuationState==='stale';
 const automatic=overview.rows.filter(r=>isLivePriced(r.position)),fresh=automatic.filter(r=>r.valuationState==='fresh').length,attention=overview.rows.filter(r=>r.stale||r.value===undefined||r.balance.deficit!=='0'||unknownCurrency(r.currency));
 // Session AB-Design (owner request 24): one currency line per row (the base currency), the others as a chip, never converted.
 const lead=splitWealthTotals(overview.subtotals).primary?.currency;
 const metric=(key:'value'|'allocated'|'unallocated')=>overview.subtotals.length?<SplitMoney id={`wealth-${key}`} lead={lead} subtotals={overview.subtotals.map(s=>({currency:s.currency,value:s[key]}))}/>:<span>{overview.rows.length?'Needs valuation':key==='value'?'Start your wealth story':'—'}</span>;
 // Session AC (the owner's decision of 2026-10-15, "show each thing once"): the three holdings lists — What you have, Your
 // assets, Accounts, debts & net worth — are one list with one row of chips: All, Accounts, Debts, Assets, each asset class
 // and Needs attention. Every card, row, action and total is the same component as before; only the filter is shared.
 const liveAccounts=accountsRecord.loaded&&!accountsRecord.unreadable?accountsRecord.data.items.filter(a=>!a.archivedAt):[];
 // Session AL (TK-039, TK-132): the same net worth as Accounts, debts & net worth, stated under the holdings headline once an account or a debt exists.
 const worthRows=liveAccounts.length?netWorthTotal(accountsRecord.data,localDate(),holdingsOf(overview.rows)).rows:[];
 const holdingChips:[string,number][]=[['All',overview.rows.length+liveAccounts.length],['Accounts',liveAccounts.filter(a=>!isDebtKind(a.kind)).length],['Debts',liveAccounts.filter(a=>isDebtKind(a.kind)).length],['Assets',overview.rows.length],...overview.categories.filter(c=>c.items.length).map(c=>[c.assetClass,c.items.length] as [string,number]),['Needs attention',attention.length]];
 const showAccounts=filter==='All'||filter==='Accounts'||filter==='Debts',showAssets=!(filter==='Accounts'||filter==='Debts');
 const rows=overview.rows.filter(r=>filter==='All'||filter==='Assets'||filter==='Needs attention'&&attention.includes(r)||shownWealthClass(r.wealthClass,stablesAsCash)===filter);
 // On a phone the total follows the title, so the figure is on the first screen; elsewhere it keeps its place.
 const total=<div className="wealth-hero-total" role="group" aria-label={overview.incomplete?'Known tracked wealth':'Total tracked wealth'}>{overview.subtotals.some(s=>s.currency==='USD'||s.currency==='EUR')&&<PinToToday label="Tracked wealth" choices={overview.subtotals.filter(s=>s.currency==='USD'||s.currency==='EUR').map(s=>({kind:'wealth' as const,metric:s.currency,label:`${s.currency} wealth`}))}/>}<span>{overview.incomplete?'KNOWN TRACKED WEALTH':'TOTAL TRACKED WEALTH'}</span><WealthTotal identity="wealth-total" subtotals={overview.subtotals} empty={/* Session AL (MO-128): with accounts but no asset, never the first-run line above a net worth */overview.rows.length?'Needs valuation':liveAccounts.length?'No assets yet':'Start your wealth story'}/><small>{overview.rows.length}{` ${plural(overview.rows.length,'asset')} · `}{/* Session AL (DV-252c): accounts are counted too, so the header agrees with the list's "All" chip */}{liveAccounts.length>0&&`${liveAccounts.length} ${plural(liveAccounts.length,'account')} · `}{automatic.length} automatic · {overview.rows.length-automatic.length} manual</small>{/* Session AF Gate C (design critique 2): what this total counts and its date, beside net worth (accounts too) and the chart (recorded totals on past dates). */}{overview.rows.length>0&&<small className="wealth-total-scope">Your holdings, valued on {formatDate(now)}. Net worth adds your accounts and subtracts your debts (see Accounts, debts &amp; net worth).</small>}{/* Session AL (DV-251): one plain sentence each, nothing spliced */}{(line=>/* Session AL (DV-278, P-DV-115): a total that moved with market prices says when they were read; (A10-3) that time is only ever a market quote's, never a manual value's */line&&<small className="wealth-total-prices">{line.kind==='market'?`Market prices as of ${formatTime(line.at)}; the total follows them when prices are refreshed.`:line.kind==='own'?'No market price is current; the total counts your own values.':'No market price is current right now.'}</small>)(marketPricesLine(overview.rows))}{overview.subtotals.length>1&&<p className="wealth-total-fx">{CURRENCIES_APART}</p>}{worthRows.length>0&&<HeroNetWorth rows={worthRows}/>}</div>;
 // Session AO (RR-16, owner decision 13 Nov): on a computer or a tablet the analytic sections, bills, budgets and the calculator
 // fold to a labelled row by default (`desk`); the rows opened are remembered on this device. The hero, the pulse, What you
 // have and Spending stay open.
 // Session AK RB (RELEASE_REVIEW_2 R2-8): on a phone, until there are two assets, the analytic sections (and the
 // calculator) wait in one closed "More about your wealth" row, each still its own row inside it; from the second asset
 // each is its own row on the page again. Computers and tablets keep every section as before (and a saved order keeps
 // its place: the group's id is new and the sections keep theirs). An address into a section opens the rows around it.
 const few=overview.rows.length<2&&phone;
 const analytic=[
  {id:'wealth:composition',label:'The shape of your wealth',node:<PhoneFold desk='wealth:composition' label="The shape of your wealth"><PortfolioComposition overview={overview}/></PhoneFold>},
  {id:'wealth:mix',label:'Your wealth, in perspective',node:<PhoneFold desk='wealth:mix' label="Your wealth, in perspective"><section aria-label="Asset mix"><div className="wealth-section-heading"><div><p className="eyebrow">A PLACE FOR EVERY ASSET</p><h2>Your wealth, in perspective</h2></div>{holdsStables&&<label className="checkbox wealth-stables-cash"><input type="checkbox" checked={stablesAsCash} onChange={e=>chooseStablesAsCash(e.target.checked)}/>Count stablecoins as cash<small className="fine"> · this view only; totals and Goals unchanged</small></label>}</div><div className="asset-class-summaries" {...classes.listProps(overview.categories.length)}>{overview.categories.map(c=><button type="button" key={c.assetClass} className="class-summary" data-empty={!c.items.length} onClick={()=>{setFilter(c.assetClass);document.getElementById('holdings')?.scrollIntoView({behavior:'instant'});}}><div><span className="asset-swatch" style={{background:ASSET_COLORS[c.assetClass]}}/><strong>{c.assetClass}</strong><small>{c.items.length}{` ${plural(c.items.length,'asset')}`}</small></div><b>{c.subtotals.length?c.subtotals.map(t=>(text=><span key={t.currency} style={{'--chars':text.length} as import('react').CSSProperties}>{text}</span>)(wealthMoney(t.value,t.currency))):'—'}</b>{c.items.length>0&&<span className="class-summary-caption">{c.missingValue?`${c.items.filter(r=>r.value===undefined).length} without a value`:c.mixedCurrencies?'In more than one currency':c.items.slice(0,3).map(r=>plainUnit(r.position)?r.position.providerId:r.position.asset).join(' · ')}</span>}</button>)}</div>{classes.button(overview.categories.length,'asset classes')}</section></PhoneFold>},
  {id:'wealth:watchlist',label:'Markets that matter to you',node:<PhoneFold desk='wealth:watchlist' label="Your favourite markets"><Watchlist/></PhoneFold>},
  {id:'wealth:history',label:'Your wealth over time',node:<PhoneFold desk='wealth:history' label="Your wealth over time"><section className="wealth-history panel" id="wealth-history" aria-labelledby="wealth-history-title">{overview.history.some(h=>h.currency==='USD'||h.currency==='EUR')&&<PinToToday label="Recorded wealth history" choices={overview.history.filter(h=>h.currency==='USD'||h.currency==='EUR').map(h=>({kind:'wealth' as const,metric:`history-${h.currency}`,label:`Recorded ${h.currency} wealth`}))}/>}<div className="wealth-section-heading"><div><p className="eyebrow">YOUR RECORDED JOURNEY</p><h2 id="wealth-history-title">{overview.history.length?'Your wealth over time':'Tracking starts here'}</h2><p>{showcase?<><ShowcaseTag/>Fictional dated portfolio observations, separate from current public market prices.</>:'We record valid valuations going forward. Earlier performance is never invented.'}</p></div></div>{overview.history.length?<Suspense fallback={<p className="fine">Drawing your wealth over time…</p>}>{overview.history.map(h=><WealthHistoryChart key={h.currency} history={h} showcase={showcase} platform={store.data}/>)}</Suspense>:<p className="picker-mode-note">Your first complete valuation starts this chart. More saved observations will reveal your journey.</p>}</section></PhoneFold>},
  {id:'wealth:changes',label:'Explain recorded wealth change',node:<WealthChanges data={store.data}/>},
  {id:'wealth:evidence',label:'Evidence and returns',node:<PhoneFold desk='wealth:evidence' label="Evidence & returns"><FinancialEvidence data={store.data} update={store.update}/></PhoneFold>},
  store.data.positions.some(p=>p.archivedAt)&&{id:'wealth:archived',label:'Archived assets',node:<details className="panel"><summary>Archived assets</summary><p>Historical evidence is retained. Unarchiving an asset adds it back to current wealth without recreating allocations.</p>{store.data.positions.filter(p=>p.archivedAt).map(p=><div className="archived-row" key={p.id}>{/* Session AL (PR-053, P-PR-28): the name opens the asset's page, where it can be deleted for good */}<Link href={`/app/wealth/asset/${encodeURIComponent(p.id)}`}>{p.providerId}</Link><button className="secondary" onClick={()=>void store.update(s=>restoreAsset(s,p.id)).catch(e=>setError(plainErrorMessage(e,'Could not unarchive.')))}>Unarchive {p.providerId}</button></div>)}</details>},
  {id:'wealth:allocation',label:'Allocation and coverage',node:<PhoneFold desk='wealth:allocation' label="Allocation and coverage"><WealthAllocationSection overview={overview}/></PhoneFold>},
  {id:'wealth:target',label:'Your target mix',node:<PhoneFold desk='wealth:target' label="Your target mix"><WealthSlot anchor="target-mix" eyebrow="TARGET MIX · YOUR OWN" title="Your target mix" lede="The mix you aim for beside today’s, one currency at a time, with each share’s distance from your target."><TargetAllocation rows={overview.rows} snapshots={store.data.valuationSnapshots} now={now}/></WealthSlot></PhoneFold>},
  {id:'wealth:purpose',label:'What each asset is for',node:<PhoneFold desk='wealth:purpose' label="What each asset is for"><WealthSlot anchor="purpose" eyebrow="PURPOSE · WHERE IT GOES" title="What each asset is for" lede="Each asset, the Goals it is set aside for, and what is still available."><PurposeFlow rows={overview.rows} goals={store.data.goals} allocations={store.data.allocations}/><Suspense fallback={null}><StakedPurpose positions={store.data.positions} goals={store.data.goals} allocations={store.data.allocations}/></Suspense></WealthSlot></PhoneFold>},
  {id:'wealth:autopilot',label:'Your contribution rhythm',node:<PhoneFold desk='wealth:autopilot' label="Your contribution rhythm"><WealthSlot anchor="contribution-rhythm" eyebrow="CONTRIBUTIONS · YOUR RHYTHM" title="Your contribution rhythm" lede="When you usually contribute, from your own records, with a reminder or your usual amount filled in for you to check."><ContributionAutopilot platform={store.data}/></WealthSlot></PhoneFold>},
 ];
 // Session AK RB (R2-8): a row on a phone; inside "More about your wealth" while there are fewer than two assets.
 const calculator={id:'wealth:calculator',label:'Compound interest calculator',node:<PhoneFold desk='wealth:calculator' label="Compound interest calculator"><CalculatorCard/></PhoneFold>};
 const moreGroup={id:'wealth:more',label:'More about your wealth',node:<PhoneFold label="More about your wealth"><div className="wealth-more-group">{[...analytic,calculator].map(item=>item&&<div key={item.id}>{item.node}</div>)}</div></PhoneFold>};
 return <LayoutPage page="wealth"><div className="dashboard wealth-workspace wealth-product"><ActionIntent value="asset" onAction={()=>setAdding(true)}/>{Object.entries(WEALTH_VIEWS).map(([view,anchor])=><ActionIntent key={view} param="view" value={view} onAction={()=>showSection(anchor)}/>)}<PriceAlertWatchGate/>
 {/* Session AB-Design Phase 2 (ADR-024 P5; critique 8): the shared pillar header, unboxed like the other three; the totals follow in their own card with the holdings' two tools ("Manage assets", "Refresh prices"), moved from the header, never removed. */}
 <PillarHero pillar="wealth" titleId="wealth-title" className="wealth-heading" eyebrow="Your financial orbit" title="Wealth, with every source in view." lede="Everything you own. Everything you’re working toward. One clear view." about="wealth" buttons={<><button className="primary" onClick={()=>setAdding(true)}>+ Add asset</button><HideAmountsToggle className="secondary"/></>} art={<OrbitArt glyph={WealthGlyph} tone="wealth" spin={-34}/>}/>
 <section className="wealth-hero wealth-summary panel" aria-label="Your wealth in one view"><LayoutLockButton/><div className="wealth-hero-scene"><SceneArt scene="horizon"/></div><div className="wealth-orbit wealth-orbit-one"/><div className="wealth-orbit wealth-orbit-two"/>{total}<div className="wealth-summary-side"><dl className="wealth-split"><div><dt><span className="split-dot allocated"/>Allocated to Goals</dt><dd>{metric('allocated')}</dd></div><div><dt><span className="split-dot available"/>Available for Goals</dt><dd>{metric('unallocated')}</dd></div></dl><div className="wealth-summary-tools"><a className="secondary" href="#holdings">Manage assets</a><button className="secondary" onClick={()=>{setAsked(true);setRefreshNote('');void market.refresh();}} disabled={market.loading||!requests.length}>{market.loading?'Refreshing…':'↻ Refresh prices'}</button></div>{refreshNote&&<p className="fine wealth-refresh-note" role="status">{refreshNote}</p>}<p className="fine">{/* Session AL (Part 15, C-TK-15 / P-TK-84): the trust line says it plainly */}View-only · ZIGoals can’t move your money; your tracking stays private.</p>{(()=>{/* Session AL (Part 15, C-TK-12 / P-TK-81): "fast forward" this total in the calculator, as its starting amount (USD or EUR only, never converted) */const lead=overview.subtotals.find(t=>t.value>0n&&(t.currency==='USD'||t.currency==='EUR'));return lead&&<Link className="text-link wealth-fast-forward" href={/* Fix-up (CI 1539, holdings-import "leaks nothing"): the total rides in the fragment, which never leaves the device; in the query it went to the server with Next's prefetch and the page request. The calculator reads it from the hash (components/calculator/calculator.tsx, wealthPrefill). */`/app/wealth/calculator?from=wealth#${new URLSearchParams({start:unitsText(lead.value.toString(),2),currency:lead.currency})}`}>See where your {lead.currency} holdings could grow →</Link>;})()}</div></section>
 {market.error&&<p className="notice" role="status">Price refresh is unavailable. Last-good values stay visible with their timestamps.</p>}
 <ImportBanner imports={imports} kind="wealth" onUndo={undoRecord}/>
 <LayoutRegion region="body" items={phoneOrder(phone,[
  // Session AK RB (RELEASE_REVIEW_2 R2-8): with no asset yet there is no price to be current, so the pulse waits for the first.
  overview.rows.length>0&&{id:'wealth:pulse',label:'Portfolio pulse',node:<section className="portfolio-pulse" aria-label="Portfolio pulse"><div><span className="pulse-dot"/><strong>{/* Session AH (WE5; B-104, B-106, L-069): never "0 of 0"; the market-priced count and the reasons below agree */}{checking&&automatic.length?'Checking market prices…':automatic.length?`${fresh} of ${automatic.length} market ${automatic.length===1?'price':'prices'} current`:'No market-priced holdings: every value is your own'}</strong><span>Prices refresh when you ask; a price counts as current for 15 minutes.</span></div><button className="text-link" onClick={()=>{setFilter('Needs attention');document.getElementById('holdings')?.scrollIntoView({behavior:'instant'});}}>{attention.length?`${attention.length} need attention: ${[/* Session AL (PR-001, PR-048, PR-081): only a market-priced holding's stale quote is a "price older than 15 minutes" (it is also left out of "n of m current"); an observed or verified value read too long ago is said as such */[attention.filter(r=>staleQuote(r)).length,'price older than 15 minutes','prices older than 15 minutes'],[attention.filter(r=>r.stale&&!staleQuote(r)).length,'value that needs a fresh read','values that need a fresh read'],[attention.filter(r=>r.value===undefined).length,'without a value','without a value'],[attention.filter(r=>r.balance.deficit!=='0').length,'short of what Goals hold','short of what Goals hold'],[attention.filter(r=>unknownCurrency(r.currency)).length,'in a currency code ZIGoals doesn’t know','in currency codes ZIGoals doesn’t know']].filter(([n])=>Number(n)>0).map(([n,one,many])=>`${n} ${n===1?one:many}`).join(', ')} →`:'Nothing needs attention'}</button></section>},
  {id:'wealth:holdings',label:'What you have',node:<section id="holdings" className="wealth-holdings-one" aria-labelledby="holdings-title"><header className="wealth-section-heading"><div><p className="eyebrow">ACCOUNTS · ASSETS · DEBTS</p><h2 id="holdings-title">What you have</h2><p>Everything you track here, in one list: each asset with its market and Goals, each account and debt with its balance.{portfolioShown&&' Portfolio is a separate tracker for coins, kept apart from Wealth.'}{earnLink&&<> <Link className="text-link" href="/app/earn">Ways to earn on ZIGChain →</Link></>}</p></div><div className="wealth-holdings-actions"><button className="secondary" onClick={()=>setAdding(true)}>+ Add asset</button><Link className="text-link" href="/app/wealth/add-money">Add money →</Link>{portfolioShown&&<Link className="text-link" href="/app/portfolio">Open Portfolio →</Link>}</div></header><div className="picker-tabs holdings-filters" role="group" aria-label="Show">{holdingChips.map(([c,n])=><button key={c} type="button" aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c} <span className="what-you-have-count">{n}</span></button>)}</div>{showAssets&&<><div className="owned-assets-grid" {...holdings.listProps(rows.length)}><LayoutRegion region="holdings" grid allIds={overview.rows.map(x=>entityLayoutId(x.position.id))} items={rows.map(r=>{const unitQuote=holdingUnitQuote(r.position,market.quotes,now);return {id:entityLayoutId(r.position.id),label:r.position.providerId,node:<article className="owned-asset-card"><Link className="owned-card-link" href={`/app/wealth/asset/${encodeURIComponent(r.position.id)}`}><div className="owned-asset-heading"><AssetIcon symbol={r.position.asset} kind={r.wealthClass} logoUrl={/* Session AH (WE9, L-063): gold, silver and stocks are priced from tokenized references; they never wear the token's logo */r.position.marketRef&&r.position.marketRef.kind!=='rwa'?insights.results[marketRequestKey({marketRef:r.position.marketRef,currency:'USD'})]?.insight?.logoUrl:null}/><div><h3>{r.position.providerId==='native-zig'?`ZIG ${r.position.sourceType.replaceAll('_',' ').toLowerCase()}`:r.position.providerId}</h3><p>{plainUnit(r.position)?r.wealthClass:`${r.position.asset} · ${r.wealthClass}`}</p></div><span aria-hidden="true">↗</span></div><div className="owned-value"><strong style={{'--chars':(r.value===undefined?'Needs valuation':wealthMoney(r.value,r.currency!)).length} as CSSProperties}>{r.value===undefined?'Needs valuation':wealthMoney(r.value,r.currency!)}</strong><span title={formatExactNumber(formatUnits(r.position.quantity,r.position.decimals))}>{assetQuantity(formatQuantity(formatUnits(r.position.quantity,r.position.decimals)),r.position)}</span></div>{/* Session AF Gate C (design critique, Wealth's units): cash is its own unit, so it has no reference price. */}{/* Session AH (WE14, D-148): a property or your own measure has no market reference price either */}{r.assetClass!=='Cash'&&!plainUnit(r.position)&&<div className="holding-unit-price"><span>{r.position.marketRef?.kind==='rwa'?'Tokenized reference price':'Reference price'} <small>per {/* Session AL fifth pass (N-MO-17): a metal's weight unit, never its code */unitWord(r.position)}</small></span><strong>{unitQuote?referencePriceLabel(unitQuote):r.position.marketRef?'Unavailable':'Not linked'}</strong>{/* Session AL (TK-040, TK-121, W22): a hand-added or imported stock, ETF or metal says why it has no reference price and how to get one */}{!unitQuote&&!r.position.marketRef&&<small className="holding-unit-why">Added by hand, so no market price is followed. To follow a market reference price, add it again from its tab in Add asset (Crypto, Stocks, ETFs or Precious metals).</small>}{unitQuote&&<small>{pricesFrozen()?'Showcase price':quoteIsStale(unitQuote,now)?'Needs refresh':'Current'} · {unitQuote.currency}</small>}</div>}{r.position.marketRef&&<MarketMovement compact result={insights.results[marketRequestKey({marketRef:r.position.marketRef,currency:'USD'})]}/>}<GlassBar identity="holding-allocation" className="holding-allocation-track" value={r.value&&r.allocatedValue?Number(r.allocatedValue*10000n/r.value)/10000:0}/><div className="holding-allocation-labels"><span>In Goals <strong>{r.allocatedValue===undefined?'—':wealthMoney(r.allocatedValue,r.currency!)}</strong></span><span>Available <strong>{r.unallocatedValue===undefined?'—':wealthMoney(r.unallocatedValue,r.currency!)}</strong></span></div><div className="asset-card-source">{/* Session X P2.1: a manual value's badge already says so ("Manual value" twice). */}{!(r.valuationState==='manual'&&r.source==='Manual value')&&<span>{r.source??'Add a valuation'}</span>}<FreshnessBadge state={checking&&r.valuationState!=='manual'?'checking':r.valuationState}/></div>{r.valuedAt&&<time className="asset-updated" dateTime={r.valuedAt}>{formatDateTime(r.valuedAt)}</time>}</Link><Link className="text-link" href={`/app/wealth/asset/${encodeURIComponent(r.position.id)}`}>View & manage asset →</Link><PinToToday label={r.position.providerId} choices={[{kind:'asset',metric:'quantity',entity:r.position.id,label:`${r.position.providerId} quantity`,menu:'quantity'},{kind:'asset',metric:'value',entity:r.position.id,label:`${r.position.providerId} value`,menu:'value'},{kind:'asset',metric:'available',entity:r.position.id,label:`${r.position.providerId} available`,menu:'available'},{kind:'allocation',metric:'allocation',entity:r.position.id,label:`${r.position.providerId} allocations`,menu:'allocations'}]} extra={/* Session AO (D-055): the card's ⋯ also edits the asset, with the asset page's own Edit asset form (manual assets, as there) */r.position.sourceType==='MANUAL'&&!r.position.archivedAt?<button type="button" aria-label={`Edit ${r.position.providerId}`} onClick={()=>setEditingAsset(r.position.id)}>Edit</button>:undefined}/></article>};})}/></div>{holdings.button(rows.length,'assets')}{!rows.length&&(/* Session AL (RR-2): with accounts but no asset, "All" says what is there (its chip counts the accounts) and where they are listed */withAccounts=><EmptyState className="holdings-empty panel" title={filter==='Needs attention'?'Everything here is up to date':withAccounts?'No assets yet':filter==='All assets'?'Build your wealth picture':'No assets in this category yet'} action={<button className="primary" onClick={()=>setAdding(true)}>Add your first asset</button>}>{withAccounts?`Your ${liveAccounts.length} ${plural(liveAccounts.length,'account')} ${liveAccounts.length===1?'is':'are'} listed below, under Accounts, debts & net worth. A goal counts assets, not accounts: add cash, crypto, stocks, metals or another asset, and connect it to a Goal whenever you’re ready.`:'Add cash, crypto, stocks, metals or another asset. Connect it to a Goal whenever you’re ready.'}</EmptyState>)(filter==='All'&&liveAccounts.length>0)}</>}{showAccounts&&<PhoneFold label="Accounts, debts & net worth"><AccountsSection only={filter==='Accounts'?'accounts':filter==='Debts'?'debts':'all'}/></PhoneFold>}{showAssets&&<Suspense fallback={null}><WalletHoldings/></Suspense>}{showAssets&&<Suspense fallback={null}><XpubWatch/></Suspense>}{showAssets&&<Suspense fallback={null}><AddressLookup/></Suspense>}</section>},
  {id:'wealth:spending',label:'Spending and room to spend',node:<SpendingSlot showcase={showcase} onImport={()=>{setAdding(true);setImporting('money');}}/>},
  // Session AK RB (R2-8): the analytic sections, one row each on a phone (the composition too, 2,152 px of the Showcase's
  // phone page); while there are fewer than two assets they wait together in one closed fold (moreGroup).
  ...(few?[moreGroup]:analytic),
  // Session AK RB (R2-8): bills and budgets fold to a row on a phone (a ?view=bills or #budgets address opens its row).
  {id:'wealth:bills',label:'Upcoming bills',node:<PhoneFold desk='wealth:bills' label="Upcoming bills"><WealthSlot anchor="bills" eyebrow="BILLS · NEXT 30 DAYS" title="Upcoming bills" lede="What is due soon, from bills you confirm or add. A reminder only: ZIGoals never pays or cancels anything."><UpcomingBills showcase={showcase}/></WealthSlot></PhoneFold>},
  {id:'wealth:budgets',label:'Budgets by category',node:<PhoneFold desk='wealth:budgets' label="Budgets by category"><WealthSlot anchor="budgets" eyebrow="BUDGETS · THIS MONTH" title="Budgets by category" lede="A monthly amount per category against what your money log shows spent."><BudgetsMonth showcase={showcase}/></WealthSlot></PhoneFold>},
  // Session AB-Design (owner request 26): the compound interest calculator is Wealth's last section, right above the footer (saved layouts keep their own order).
  // Session AK RB (R2-8): a row on a phone; inside "More about your wealth" while there are fewer than two assets.
  ...(few?[]:[calculator]),
 ],PHONE_ORDER)}/>
 <div className="page-game-slot"><ProgressSlot page="wealth"/></div>
{error&&<p role="alert">{error}</p>}{(edited=>edited&&<Sheet title={`Edit ${edited.providerId}`} onClose={()=>setEditingAsset(null)}><Suspense fallback={null}><AssetEditor position={edited} platform={store.data} update={store.update} onSaved={saved=>{setEditingAsset(null);showStatus(`${saved?.providerId??edited.providerId} saved.`);}}/></Suspense></Sheet>)(editingAsset?store.data.positions.find(p=>p.id===editingAsset&&p.sourceType==='MANUAL'&&!p.archivedAt):undefined)}{adding&&<Sheet title={importing==='holdings'?'Import holdings':importing==='money'?'Import spending and income':'Add to your wealth'} onClose={()=>{setAdding(false);setImporting(false);}}>{importing==='holdings'?<Suspense fallback={null}><HoldingsImportPanel platform={store.data} update={store.update} imports={imports} onUndo={undoRecord} onClose={()=>setImporting(false)}/></Suspense>:importing==='money'?<Suspense fallback={null}><MoneyImportPanel onClose={()=>{setAdding(false);setImporting(false);}}/></Suspense>:<><ManualSourceCards update={store.update} onSaved={()=>setAdding(false)}/><section className="manual-source-selector import-entry" aria-label="Import from a file"><p>Have a spreadsheet of what you own? Read on this device only.</p><button type="button" className="secondary" onClick={()=>setImporting('holdings')}>Import from a CSV file</button><p>Spending and income from your bank, into your money log: a statement file or a CSV.</p><button type="button" className="secondary" onClick={()=>setImporting('money')}>Import from your bank</button></section></>}</Sheet>}
 </div></LayoutPage>;
}
