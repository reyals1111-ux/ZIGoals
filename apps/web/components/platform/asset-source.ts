import {parseAmountInput} from '../../lib/amount-input';
import {marketAssetRefSchema,type MarketCatalogAsset} from '../../lib/market-assets';
import {ASSET_CLASSES,positionSchema,type AssetClass,type Position} from '../../lib/positions';
import {quantityUnitsIssue,within} from '../../lib/limits/plausibility';

/** Session AD (weights): split from asset-search.tsx unchanged, so the picker can load the search itself on demand. */
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
 const marketRef=marketAssetRefSchema.parse(input.asset.ref),quantity=parseAmountInput(input.quantity,18);
 if(quantity<=0n)throw Error('Enter a positive quantity.');
 within(quantityUnitsIssue(quantity,18)); // Session AH (VA2, B3: 27-digit assets)
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

