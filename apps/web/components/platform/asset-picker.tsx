'use client';
import {isLivePriced} from '../../lib/numbers/counts';
import {useEffect,useState,type FormEvent} from 'react';
import type {MarketCatalogAsset} from '../../lib/market-assets';
import type {Platform,Position,AssetClass} from '../../lib/positions';
import {availableUnits} from '../../lib/wealth-goal-fit';
import {manualSourcePosition,type ManualSource} from '../../lib/manual-source';
import {automaticSourcePosition,automaticUnitLabel} from './asset-source';
/**
 * Session AD (weights): the market search is its own chunk, fetched as soon as this module loads (not in the page's first
 * scripts), so it is already here when a sheet opens and the sheet is drawn at its full height at once. Only a picker
 * opened before the chunk arrives shows a line for that moment.
 */
let AssetSearch:typeof import('./asset-search').AssetSearch|null=null;
const searchLoaded=import('./asset-search').then(m=>{AssetSearch=m.AssetSearch;});
import {AssetIcon} from './financial-ui';
import {useMarketInsights} from './use-market-insights';
import {marketRequestKey} from '../../lib/market-assets';
import {shownAmount} from './common';
import {plainErrorMessage} from '../../lib/plain-error';
import {isMoneyCurrency} from '../../lib/visual-format';
import {parseAmountInput} from '../../lib/amount-input';
import {typedNegative} from '../../lib/limits/amount-words';
import {parseNumberInput} from '../../lib/numbers/parse';
import {moneyUnitsIssue,quantityUnitsIssue,within} from '../../lib/limits/plausibility';
import {FieldError,useFormErrors} from '../primitives/field-error';
import {plausibilityWarning} from '../../lib/wealth-plausibility';
import {tagManualEtf} from '../../lib/wealth';
import {PlausibleCheck,usePlausibleCheck} from '../wealth/plausible-check';
/** Session AL (DV-145): a tokenized reference explained for what it follows (a stock or ETF, or a metal), before saving. */
export function referenceNote(assetType:'stock'|'etf'|'commodity',symbol:string):string{
 return assetType==='commodity'?`Enter how many reference units you hold. The price is a CoinGecko tokenized reference that follows ${symbol}; it is not a physical metal spot price. For bars or coins you hold, use a manual valuation with their weight.`
  :`Enter how many shares you hold. The price is a CoinGecko tokenized ${assetType==='etf'?'ETF':'stock'} price that follows ${symbol}; it is not your broker’s quote, and ZIGoals does not connect to your broker.`;
}
/** Asset names keep 100 characters (positionSchema). */
const NAME_MAX=100;
/** Session AL (TK-149): a paste that the field's limit cuts is said, never cut silently. */
export function pastedPastLimit(field:{value:string;selectionStart:number|null;selectionEnd:number|null},pasted:string,max:number):string|null{
 const kept=field.value.length-((field.selectionEnd??field.value.length)-(field.selectionStart??field.value.length));
 return kept+pasted.length>max?`Names keep ${max} characters, so the end of what you pasted was left out (${kept+pasted.length-max} ${kept+pasted.length-max===1?'character':'characters'}). Check the name before saving.`:null;
}
const categories=['Existing assets','Crypto','Stablecoins','Stocks','ETFs','Precious metals','Cash','Property','Custom'];
/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-1): a person who never chose the chain and tracks no crypto
 * sees everyday money first, and no Crypto or Stablecoins tab (lib/chain-choice.ts: crypto words only where chosen).
 */
const PLAIN_CATEGORIES=['Existing assets','Cash','Property','Stocks','ETFs','Precious metals','Custom'];
export const pickerCategories=(crypto:boolean):readonly string[]=>crypto?categories:PLAIN_CATEGORIES;
/** Values another part of the app hands to the manual form (ZIGi's pre-fill, ADR-012): shown as defaults the person reviews and saves. */
export type AssetDraft={category:string;name:string;quantity:string;currency:string;value?:string;symbol?:string;notes?:string};
/** `initialCurrency`: the currency a new manual asset starts in (a Goal's own, when funding it; Session X P2.1). */
export function AssetPicker({positions=[],onExisting,onDraft,onFavourite,initialCategory='Crypto',initialDraft,initialCurrency='USD',submitLabel='Use this asset',emptyText,crypto=true,platform,detail}:{/** Session AL (P-DVR-88, P-TK-51): with the record, each existing card says what is still available for Goals */ platform?:Platform;/** Session AL (P-TK-51, TK-194): the caller's own line for an existing card (such as availableWords); null keeps the default */ detail?:(p:Position)=>string|null;/** FR-1: false leaves out Crypto and Stablecoins (default: every category, as before) */ crypto?:boolean;/** Session AH (GO3, D-027): what to say when none of the listed assets fits, while others exist */ emptyText?:string;positions?:Position[];onExisting?:(p:Position)=>void;onDraft?:(p:Position)=>void;onFavourite?:(a:MarketCatalogAsset)=>void;initialCategory?:string;initialDraft?:AssetDraft;initialCurrency?:string;submitLabel?:string}){
 const [,setSearchReady]=useState(!!AssetSearch);useEffect(()=>{let live=true;if(!AssetSearch)void searchLoaded.then(()=>{if(live)setSearchReady(true);});return()=>{live=false;};},[]);
 const [category,setCategory]=useState(initialDraft&&categories.includes(initialDraft.category)?initialDraft.category:initialCategory),[manual,setManual]=useState(!!initialDraft),[selected,setSelected]=useState<MarketCatalogAsset>(),[error,setError]=useState(''),[currency,setCurrency]=useState(initialDraft?.currency??initialCurrency),[name,setName]=useState<string>(),form=useFormErrors(),check=usePlausibleCheck();
 const insights=useMarketInsights([...positions.flatMap(p=>p.marketRef&&isLivePriced(p)?[p.marketRef]:[]),...(selected?[selected.ref]:[])]);/* Session AH (WE11) */
 const automatic=!manual&&!['Existing assets','Cash','Property','Custom'].includes(category);
 function choose(c:string){setCategory(c);setSelected(undefined);setError('');setManual(false);setName(undefined);}
 // Session AL (TK-041, W7; TK-014): a refused amount or currency is said under its own field (marked, focused); Save never moves.
 function create(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');form.clear();let field='';try{const f=new FormData(e.currentTarget),get=(key:string)=>String(f.get(key)||'');let p:Position;
  if(!automatic){field='currency';if(!isMoneyCurrency(currency.trim().toUpperCase()))throw Error(currency.trim()?`“${currency.trim().toUpperCase()}” is not a currency code ZIGoals knows. Use one such as USD, EUR or GBP.`:'Enter the valuation currency, such as USD or EUR.');}
  // Session AL (DV-144): an empty or zero amount says what to enter, the same way for every category.
  field='name';if(!automatic&&category!=='Cash'&&!get('name').trim())throw Error('Name the asset.');
  field='symbol';if(!automatic&&['Crypto','Stablecoins','Stocks','ETFs'].includes(category)&&!get('symbol').trim())throw Error('Enter its symbol or ticker, such as BTC or AAPL.');
  field='quantity';const noun=category==='Cash'?'an amount':category==='Precious metals'?'a weight':'a quantity';if(!get('quantity').trim()&&!['Custom','Property'].includes(category))throw Error(`Enter ${noun}.`);
  if(get('quantity')){/* Session AL final pass (DV-144): "-50" says what "0" says */if(typedNegative(get('quantity')))throw Error(`Enter ${noun} above 0.`);const units=parseAmountInput(get('quantity'),18);if(units<=0n)throw Error(`Enter ${noun} above 0.`);within(quantityUnitsIssue(units,18));/* Session AL (TK-041, W7): cash past the trillion cap is refused under its own field, before any "check this?" step */if(category==='Cash'&&!automatic)within(moneyUnitsIssue(units,18));}
  field='value';if(['Custom','Property'].includes(category)&&!automatic&&!get('value').trim())throw Error(category==='Property'?'Enter the current property value.':'Enter the total holding value.');
  let shownValue=NaN;if(get('value')){const units=parseAmountInput(get('value'),2);within(moneyUnitsIssue(units,2));shownValue=Number(units)/100;}else if(category==='Cash'&&!automatic){const r=parseNumberInput(get('quantity'));shownValue=r.ok?r.value:NaN;}
  field='';
  // Session AL (P-TK-49, W6): a value of a billion or more asks once ("check this?"); keeping it saves it as typed.
  if(!automatic&&!check.ask(`${category}:${currency}:${shownValue}`,plausibilityWarning(shownValue,currency.trim().toUpperCase(),'value')))return;
  if(automatic&&selected)p=automaticSourcePosition({asset:selected,assetClass:(category==='ETFs'?'Stocks':category==='Precious metals'?'Precious Metals':category) as AssetClass,quantity:get('quantity'),currency:currency as 'USD'|'EUR',notes:get('notes')});
  else{p=manualSourcePosition({category:(category==='Custom'?'Custom asset':category==='ETFs'?'Stocks':category) as ManualSource['category'],name:get('name')||`${currency} Cash`,quantity:get('quantity'),currency,symbol:get('symbol'),metal:get('metal'),unit:get('unit'),value:get('value'),notes:get('notes')});/* Session AL (TK-010): an ETF added by hand shows under ETFs */if(category==='ETFs')p=tagManualEtf(p);}
  check.clear();onDraft?.(p);
 }catch(e){const text=plainErrorMessage(e, 'Check the asset details.');if(field)form.fail({[field]:text});else form.failForm(text);}}
 return <div className="asset-picker"><div className="picker-intro"><h3>{onFavourite?'Markets you care about':'Choose an asset'}</h3><p>{onFavourite?'Follow a price without adding it to your wealth.':'Use an asset you already track, or add something new.'}</p></div><div className="picker-tabs" role="group" aria-label="Asset categories">{pickerCategories(crypto).filter(c=>onDraft||onFavourite||c==='Existing assets').filter(c=>c!=='Existing assets'||!!onExisting).filter(c=>!onFavourite||!['Existing assets','Cash','Property','Custom'].includes(c)).map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>choose(c)}>{c}</button>)}</div>
 {category==='Existing assets'?<div className="picker-existing">{positions.filter(p=>!p.archivedAt).map(p=><button key={p.id} type="button" onClick={()=>onExisting?.(p)}><AssetIcon symbol={p.asset} kind={p.assetClass} logoUrl={p.marketRef?insights.results[marketRequestKey({marketRef:p.marketRef,currency:'USD'})]?.insight?.logoUrl:null}/><span><strong>{p.providerId}</strong><small>{(detail?detail(p):null)??(free=>free?free.deficit!=='0'?`${shownAmount(p.quantity,p.decimals)} ${p.asset} · all allocated, ${shownAmount(free.deficit,p.decimals)} short`:`${shownAmount(free.available,p.decimals)} available of ${shownAmount(p.quantity,p.decimals)} ${p.asset}`:`${shownAmount(p.quantity,p.decimals)} ${p.asset}`)(platform?availableUnits(platform,p.id):null)} · {p.valuation?.source==='MANUAL'||p.valuationMode==='manual'?'Manual value':p.marketRef&&p.valuationMode==='automatic'?'Automatic price':p.valuation?'Recorded value':'Needs valuation'}</small></span></button>)}{!positions.filter(p=>!p.archivedAt).length&&<p>{emptyText??'No assets yet. Choose a category to add your first.'}</p>}</div>:<>
 {automatic&&(AssetSearch?<AssetSearch category={category} selected={selected} onSelect={a=>{setSelected(a);setCurrency('USD');}} onManual={()=>setManual(true)}/>:<p className="fine" aria-live="polite">Loading the market search…</p>)}
 {onFavourite&&selected&&<button className="primary" type="button" onClick={()=>onFavourite(selected)}>Add {selected.name} to favourites</button>}
 {!onFavourite&&(!automatic||selected)&&<form className="picker-draft-form" noValidate onSubmit={create} key={`${category}:${manual}:${selected?.ref.id??''}`}>
 {selected&&automatic&&<div className="picker-selected wide"><AssetIcon symbol={selected.symbol} kind={category} logoUrl={insights.results[marketRequestKey({marketRef:selected.ref,currency:'USD'})]?.insight?.logoUrl}/><div><h3>{selected.name}</h3><p>{selected.symbol.toUpperCase()} · {category} · {selected.ref.kind==='rwa'?'CoinGecko tokenized reference':'CoinGecko'}</p></div></div>}
 {!automatic&&<><label className="field">Asset name<input name="name" required value={name??initialDraft?.name??(category==='Cash'?`${currency} Cash`:'')} onChange={e=>setName(e.target.value)} maxLength={NAME_MAX} onPaste={e=>{const message=pastedPastLimit(e.currentTarget,e.clipboardData.getData('text'),NAME_MAX);/* Session AL (TK-149): a real paste fires its input right after, and the field's input clears its message, so the note is set once that input has run. */setTimeout(()=>form.set('name',message),0);}} {...form.field('name')}/></label><FieldError className="wide" {...form.message('name')}/>{['Crypto','Stablecoins','Stocks','ETFs'].includes(category)&&<><label className="field">Symbol / ticker<input name="symbol" required maxLength={30} defaultValue={initialDraft?.symbol} {...form.field('symbol')}/></label><FieldError className="wide" {...form.message('symbol')}/></>}</>}
 <label className="field">{automatic&&selected?automaticUnitLabel(selected):category==='Cash'?'Cash amount':category==='Precious metals'?'Weight':'Quantity'}<input name="quantity" required inputMode="decimal" autoComplete="off" placeholder={category==='Cash'?'500.00':'0.00'} defaultValue={initialDraft?.quantity} {...form.field('quantity',category==='Cash'&&!automatic&&check.describedBy?{describedBy:check.describedBy}:{})} {...(category==='Cash'&&!automatic?{onInputCapture:check.clear}:{})}/></label><FieldError className="wide" {...form.message('quantity')}/>
 <div className="field">{automatic?'Quote currency':'Valuation currency'}<div className="picker-tabs" role="group" aria-label={automatic?'Quote currency':'Valuation currency'}>{['USD','EUR'].filter(c=>selected?.ref.kind!=='rwa'||c==='USD'||!automatic).map(c=><button type="button" key={c} onClick={()=>setCurrency(c)} aria-pressed={currency===c}>{c}</button>)}</div>{!automatic&&<input aria-label="Other valuation currency" value={currency} maxLength={3} autoComplete="off" onChange={e=>setCurrency(e.target.value.toUpperCase())} {...form.field('currency')}/>}</div>{!automatic&&<FieldError className="wide" {...form.message('currency')}/>}
 {!automatic&&category==='Precious metals'&&<><label className="field">Metal<input name="metal" required defaultValue="Gold"/></label><label className="field">Weight unit<select name="unit"><option>grams</option><option>kilograms</option><option>troy ounces</option></select></label></>}
 {!automatic&&category!=='Cash'&&<label className="field">Total holding value<input name="value" inputMode="decimal" autoComplete="off" required={['Custom','Property'].includes(category)} defaultValue={initialDraft?.value} {...form.field('value',check.describedBy?{describedBy:check.describedBy}:{})} onInput={check.clear}/></label>}{!automatic&&category!=='Cash'&&<FieldError className="wide" {...form.message('value')}/>}{!automatic&&<PlausibleCheck className="wide" id={check.id} warning={check.warning}/>}
 {!automatic&&category==='Property'&&<p className="picker-mode-note wide">{/* Session AL (TK-133) */}Owe something on it, such as a mortgage? Add the debt under Accounts, debts &amp; net worth on Wealth (Add an account or debt); net worth then takes it off.</p>}
 <label className="field wide">Note (optional)<textarea name="notes" maxLength={2000} defaultValue={initialDraft?.notes}/></label>
 <p className="picker-mode-note wide">{automatic?selected?.ref.kind==='rwa'?referenceNote(selected.ref.assetType,selected.symbol.toUpperCase()):'You enter the quantity; CoinGecko supplies the price. This does not connect a wallet or buy an asset.':'Your private record. No funds move and no currency conversion is assumed.'}</p>
 <button className="primary wide">{submitLabel}</button>{form.formError&&<p className="field-error wide" role="alert">{form.formError}</p>}{automatic&&<button className="text-link wide" type="button" onClick={()=>setManual(true)}>Use a manual valuation instead</button>}
 </form>}</>}{error&&<p role="alert">{error}</p>}</div>;
}
