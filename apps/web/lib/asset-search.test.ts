import {expect,it} from 'vitest';
import type {MarketCatalogAsset} from './market-assets';
import {automaticSourcePosition,automaticUnitLabel,type AutomaticSourceInput} from '../components/platform/asset-search';

const coin:MarketCatalogAsset={
 ref:{provider:'coingecko',kind:'coin',id:'usd-coin',platform:'ethereum',contractAddress:'0xa0b8'},
 name:'USD Coin',symbol:'USDC',platforms:{ethereum:'0xa0b8'},
};
const gold:MarketCatalogAsset={
 ref:{provider:'coingecko',kind:'rwa',id:'tokenized-gold',assetType:'commodity'},
 name:'Tokenized Gold',symbol:'GOLD',
};

it('stores the exact selected market identity and user classification without assuming a peg',()=>{
 const position=automaticSourcePosition({asset:coin,assetClass:'Stablecoins',quantity:'40000',currency:'EUR',notes:'Explicitly classified by me'},'auto-usdc','2026-09-20T09:00:00.000Z');
 expect(position).toMatchObject({
  id:'auto-usdc',providerId:'USD Coin',sourceType:'MANUAL',asset:'USDC',assetClass:'Stablecoins',
  quantity:'40000000000000000000000',decimals:18,valuationMode:'automatic',quoteCurrency:'EUR',
  marketRef:coin.ref,verification:'MANUAL',sync:'MANUAL',
 });
 expect(position).not.toHaveProperty('valuation');
 expect(position.provenance).toContain('usd-coin');
 expect(()=>automaticSourcePosition({asset:coin,quantity:'1',currency:'USD'} as AutomaticSourceInput,'missing-class')).toThrow('classification');
});

it('keeps tokenized RWA units distinct from physical metal weight and refuses unsupported EUR quotes',()=>{
 expect(automaticUnitLabel(gold)).toBe('CoinGecko tokenized RWA reference units');
 expect(()=>automaticSourcePosition({asset:gold,assetClass:'Precious Metals',quantity:'100',currency:'EUR'},'gold-eur')).toThrow('USD');
 expect(()=>automaticSourcePosition({asset:gold,assetClass:'Property',quantity:'1',currency:'USD'},'gold-property')).toThrow('Property');
});

it('uses bounded display metadata when a valid catalog identity has no usable symbol',()=>{
 const asset:MarketCatalogAsset={ref:{provider:'coingecko',kind:'coin',id:'-11'},name:'A very long provider asset name beyond thirty characters',symbol:''};
 expect(automaticSourcePosition({asset,assetClass:'Crypto',quantity:'1',currency:'USD'},'blank-symbol')).toMatchObject({asset:'A VERY LONG PROVIDER ASSET NAM',marketRef:asset.ref});
});
