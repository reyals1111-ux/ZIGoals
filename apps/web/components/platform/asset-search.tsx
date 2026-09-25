'use client';
import './asset-search.css';
import {createCatalogLoader} from '../../lib/market-catalog-client';
import {parseUnits} from '@zigoals/chain-config';
import {useEffect,useMemo,useState} from 'react';
import {useMarketInsights} from './use-market-insights';
import {FEATURED_MARKETS,marketCategory} from '../../lib/product-insights';
import {marketRequestKey} from '../../lib/market-assets';
import {AssetIcon} from './financial-ui';
import {marketAssetRefSchema,searchMarketAssets,type MarketCatalogAsset} from '../../lib/market-assets';
import {ASSET_CLASSES,positionSchema,type AssetClass,type Position} from '../../lib/positions';

export type AutomaticSourceInput={
 asset:MarketCatalogAsset;
 assetClass:AssetClass;
 quantity:string;
 currency:'USD'|'EUR';
 notes?:string;
};

const AUTOMATIC_CLASSES=ASSET_CLASSES.filter(assetClass=>!['Property','Cash'].includes(assetClass));

/** A provider quote values the user-entered quantity. It never verifies ownership or quantity. */
export function automaticSourcePosition(input:AutomaticSourceInput,id=crypto.randomUUID(),observedAt=new Date().toISOString()):Position{
 if(!AUTOMATIC_CLASSES.includes(input.assetClass))throw Error(input.assetClass==='Property'?'Property remains manual in Beta.':'Choose an explicit asset classification.');
 if(input.asset.ref.kind==='rwa'&&input.currency!=='USD')throw Error('CoinGecko tokenized RWA references are available in USD only.');
 const marketRef=marketAssetRefSchema.parse(input.asset.ref),quantity=parseUnits(input.quantity,18);
 if(quantity<=0n)throw Error('Enter a positive quantity.');
 const asset=(input.asset.symbol.trim()||input.asset.name.trim()||input.asset.ref.id).slice(0,30).toUpperCase();
 return positionSchema.parse({
  id,providerId:input.asset.name.trim().slice(0,250),sourceType:'MANUAL',network:'manual',account:'local',
  asset,denom:`market:${marketRef.provider}:${marketRef.kind}:${marketRef.id}`,quantity:quantity.toString(),decimals:18,
  assetClass:input.assetClass,marketRef,valuationMode:'automatic',quoteCurrency:input.currency,
  verification:'MANUAL',sync:'MANUAL',liquidity:'UNKNOWN',observedAt,
  provenance:`Manual quantity; automatic ${marketRef.kind==='rwa'?'CoinGecko tokenized RWA reference':'CoinGecko market quote'} for ${marketRef.id}`,
  notes:input.notes??'',
 });
}

export function automaticUnitLabel(asset:MarketCatalogAsset):string{
 return asset.ref.kind==='rwa'?'CoinGecko tokenized RWA reference units':'Asset quantity';
}

const loadCatalog=createCatalogLoader();

const typeLabel=(asset:MarketCatalogAsset)=>asset.ref.kind==='rwa'?asset.ref.assetType==='etf'?'ETF':asset.ref.assetType[0]!.toUpperCase()+asset.ref.assetType.slice(1):'Crypto';
const displaySymbol=(asset:MarketCatalogAsset)=>(asset.symbol.trim()||asset.name.trim()||asset.ref.id).slice(0,12).toUpperCase();
const identityLabel=(asset:MarketCatalogAsset)=>asset.ref.kind==='rwa'
 ? `${typeLabel(asset)} · CoinGecko ID ${asset.ref.id}`
 : `${asset.ref.platform?`${asset.ref.platform} contract · `:'Coin · '}CoinGecko ID ${asset.ref.id}`;

export function AssetSearch({selected,onSelect,onManual,disabled=false,category}:{category?:string;selected?:MarketCatalogAsset;onSelect:(asset:MarketCatalogAsset)=>void;onManual:()=>void;disabled?:boolean}){
 // Fixed featured identities plus an explicit selection; search keystrokes never acquire logos.
 const insights=useMarketInsights([...FEATURED_MARKETS.map(a=>a.ref),...(selected?[selected.ref]:[])]);
 const [query,setQuery]=useState(''),[catalog,setCatalog]=useState<MarketCatalogAsset[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void loadCatalog().then(assets=>{if(active)setCatalog(assets);}).catch(()=>{if(active)setError('Automatic market catalog is unavailable right now.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[attempt]);
 const results=useMemo(()=>searchMarketAssets(query,catalog.filter(a=>!category||(['Crypto','Stablecoins'].includes(category)?a.ref.kind==='coin':category==='Stocks'?a.ref.kind==='rwa'&&a.ref.assetType==='stock':category==='ETFs'?a.ref.kind==='rwa'&&a.ref.assetType==='etf':category==='Precious metals'?a.ref.kind==='rwa'&&a.ref.assetType==='commodity':true))),[query,catalog,category]);
 return <section className="asset-search" aria-labelledby="asset-search-title">
  <div className="asset-search-heading"><div><p className="eyebrow">Public market catalog</p><h4 id="asset-search-title">Find your asset</h4></div><span className="asset-search-provider">CoinGecko</span></div>
  <p className="fine">Explore crypto, stocks, ETFs and metals. Prices by CoinGecko. Your holdings stay private.</p>
  <label className="field">Search assets<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Try BTC, Apple, or gold" autoComplete="off" disabled={disabled||loading}/></label>
  {loading&&<div className="asset-search-state" role="status"><span className="asset-search-loader" aria-hidden="true"/>Loading the public market catalog…</div>}
  {!loading&&error&&<div className="asset-search-state asset-search-error" role="alert"><strong>Automatic prices are unavailable</strong><span>Your manual assets and values still work.</span><div><button type="button" className="secondary" onClick={()=>setAttempt(value=>value+1)}>Try catalog again</button><button type="button" className="text-link" onClick={onManual}>Use manual entry</button></div></div>}
  {!loading&&!error&&!catalog.length&&<div className="asset-search-state"><strong>No automatic assets are available.</strong><button type="button" className="secondary" onClick={onManual}>Use manual entry</button></div>}
  {!loading&&!error&&catalog.length>0&&query.trim()&&!results.length&&<div className="asset-search-state"><strong>No exact catalog matches.</strong><span>Try a full name or provider ID. ZIGoals will not guess from a ticker.</span><button type="button" className="secondary" onClick={onManual}>Add it manually</button></div>}
  {!loading&&!error&&catalog.length>0&&!query.trim()&&<p className="asset-search-prompt">Start typing to find a crypto asset, tokenized stock, ETF, Gold, or Silver reference.</p>}
  {!!results.length&&<ul className="asset-search-results" aria-label="Market assets">{results.map(asset=>{
   const key=`${asset.ref.provider}:${asset.ref.kind}:${asset.ref.id}:${asset.ref.kind==='coin'?asset.ref.platform??'base':asset.ref.assetType}`;
   const active=selected&&JSON.stringify(selected.ref)===JSON.stringify(asset.ref);
   return <li key={key}><button type="button" aria-pressed={!!active} onClick={()=>onSelect(asset)} disabled={disabled}><AssetIcon symbol={displaySymbol(asset)} kind={marketCategory(asset.ref,asset.symbol)} logoUrl={insights.results[marketRequestKey({marketRef:asset.ref,currency:'USD'})]?.insight?.logoUrl}/><span className="asset-result-copy"><strong>{asset.name}</strong><small>{identityLabel(asset)}</small>{asset.ref.kind==='coin'&&asset.ref.contractAddress&&<small className="asset-result-contract">{asset.ref.contractAddress}</small>}</span><span className="asset-result-action">{active?'Selected':'Choose'}</span></button></li>;
  })}</ul>}
 </section>;
}
