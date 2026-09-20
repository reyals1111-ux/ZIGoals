'use client';
import {useState,type FormEvent} from 'react';
import type {MarketCatalogAsset} from '../../lib/market-assets';
import type {Position,AssetClass} from '../../lib/positions';
import {manualSourcePosition,type ManualSource} from '../../lib/manual-source';
import {AssetSearch,automaticSourcePosition,automaticUnitLabel} from './asset-search';
import {AssetIcon} from './financial-ui';
import {amount} from './common';
const categories=['Existing assets','Crypto','Stablecoins','Stocks','ETFs','Precious metals','Cash','Property','Custom'];
export function AssetPicker({positions=[],onExisting,onDraft,onFavourite,initialCategory='Crypto',submitLabel='Use this asset'}:{positions?:Position[];onExisting?:(p:Position)=>void;onDraft?:(p:Position)=>void;onFavourite?:(a:MarketCatalogAsset)=>void;initialCategory?:string;submitLabel?:string}){
 const [category,setCategory]=useState(initialCategory),[manual,setManual]=useState(false),[selected,setSelected]=useState<MarketCatalogAsset>(),[error,setError]=useState(''),[currency,setCurrency]=useState('USD');
 const automatic=!manual&&!['Existing assets','Cash','Property','Custom'].includes(category);
 function choose(c:string){setCategory(c);setSelected(undefined);setError('');setManual(false);}
 function create(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');try{const f=new FormData(e.currentTarget),get=(key:string)=>String(f.get(key)||'');let p:Position;
  if(automatic&&selected)p=automaticSourcePosition({asset:selected,assetClass:(category==='ETFs'?'Stocks':category==='Precious metals'?'Precious Metals':category) as AssetClass,quantity:get('quantity'),currency:currency as 'USD'|'EUR',notes:get('notes')});
  else p=manualSourcePosition({category:(category==='Custom'?'Custom asset':category==='ETFs'?'Stocks':category) as ManualSource['category'],name:get('name')||`${currency} Cash`,quantity:get('quantity'),currency,symbol:get('symbol'),metal:get('metal'),unit:get('unit'),value:get('value'),notes:get('notes')});
  onDraft?.(p);
 }catch(e){setError(e instanceof Error?e.message:'Check the asset details.');}}
 return <div className="asset-picker"><div className="picker-intro"><h3>{onFavourite?'Markets you care about':'Choose an asset'}</h3><p>{onFavourite?'Follow a price without adding it to your wealth.':'Use an asset you already track, or add something new.'}</p></div><div className="picker-tabs" aria-label="Asset categories">{categories.filter(c=>onDraft||onFavourite||c==='Existing assets').filter(c=>c!=='Existing assets'||!!onExisting).filter(c=>!onFavourite||!['Existing assets','Cash','Property','Custom'].includes(c)).map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>choose(c)}>{c}</button>)}</div>
 {category==='Existing assets'?<div className="picker-existing">{positions.filter(p=>!p.archivedAt).map(p=><button key={p.id} type="button" onClick={()=>onExisting?.(p)}><AssetIcon symbol={p.asset} kind={p.assetClass}/><span><strong>{p.providerId}</strong><small>{amount(p.quantity,p.decimals)} {p.asset} · {p.marketRef?'Automatic price':'Manual value'}</small></span></button>)}{!positions.filter(p=>!p.archivedAt).length&&<p>No assets yet. Choose a category to add your first.</p>}</div>:<>
 {automatic&&<AssetSearch category={category} selected={selected} onSelect={a=>{setSelected(a);setCurrency('USD');}} onManual={()=>setManual(true)}/>}
 {onFavourite&&selected&&<button className="primary" type="button" onClick={()=>onFavourite(selected)}>Add {selected.name} to favourites</button>}
 {!onFavourite&&(!automatic||selected)&&<form className="picker-draft-form" onSubmit={create} key={`${category}:${manual}:${selected?.ref.id??''}`}>
 {selected&&automatic&&<div className="picker-selected wide"><AssetIcon symbol={selected.symbol} kind={category}/><div><h3>{selected.name}</h3><p>{selected.symbol.toUpperCase()} · {category} · {selected.ref.kind==='rwa'?'CoinGecko tokenized RWA reference':'CoinGecko'}</p></div></div>}
 {!automatic&&<><label className="field">Asset name<input name="name" required defaultValue={category==='Cash'?`${currency} Cash`:''} maxLength={100}/></label>{['Crypto','Stablecoins','Stocks','ETFs'].includes(category)&&<label className="field">Symbol / ticker<input name="symbol" required maxLength={30}/></label>}</>}
 <label className="field">{automatic&&selected?automaticUnitLabel(selected):category==='Cash'?'Cash amount':category==='Precious metals'?'Weight':'Quantity'}<input name="quantity" required inputMode="decimal" placeholder={category==='Cash'?'500.00':'0.00'}/></label>
 <div className="field">{automatic?'Quote currency':'Valuation currency'}<div className="picker-tabs">{['USD','EUR'].filter(c=>selected?.ref.kind!=='rwa'||c==='USD'||!automatic).map(c=><button type="button" key={c} onClick={()=>setCurrency(c)} aria-pressed={currency===c}>{c}</button>)}</div>{!automatic&&<input aria-label="Other valuation currency" value={currency} maxLength={3} onChange={e=>setCurrency(e.target.value.toUpperCase())}/>}</div>
 {!automatic&&category==='Precious metals'&&<><label className="field">Metal<input name="metal" required defaultValue="Gold"/></label><label className="field">Weight unit<select name="unit"><option>grams</option><option>kilograms</option><option>troy ounces</option></select></label></>}
 {!automatic&&category!=='Cash'&&<label className="field">Total holding value<input name="value" inputMode="decimal" required={['Custom','Property'].includes(category)}/></label>}
 <label className="field wide">Note (optional)<textarea name="notes" maxLength={2000}/></label>
 <p className="picker-mode-note wide">{automatic?selected?.ref.kind==='rwa'?'Enter tokenized reference units. This is a CoinGecko tokenized RWA reference, not physical metal spot or a broker price. Physical weights use manual entry.':'You enter the quantity; CoinGecko supplies the price. This does not connect a wallet or buy an asset.':'Your private record. No funds move and no currency conversion is assumed.'}</p>
 <button className="primary wide">{submitLabel}</button>{automatic&&<button className="text-link wide" type="button" onClick={()=>setManual(true)}>Use a manual valuation instead</button>}
 </form>}</>}{error&&<p role="alert">{error}</p>}</div>;
}
