import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {MarketMovement} from '../components/platform/market-movement';
import type {MarketInsightResult} from './market-insights';
it.each(['coin','tokenized'] as const)('gives the %s seven-day chart an exact numeric text alternative, separate from24h',marketBasis=>{
 const result:MarketInsightResult={error:null,stale:false,insight:{marketRef:marketBasis==='coin'?{provider:'coingecko',kind:'coin',id:'bitcoin'}:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD',source:marketBasis==='coin'?'CoinGecko':'CoinGecko tokenized RWA reference',marketBasis,logoUrl:null,change24h:'-5',observedAt:'2026-09-21T00:00:00Z',fetchedAt:'2026-09-21T00:00:00Z',sparkline:{range:'7d',timestamps:'unavailable',fetchedAt:'2026-09-21T00:00:00Z',prices:[{value:'123',decimals:8},{value:'9',decimals:6},{value:'1',decimals:7},{value:'234567891234567891',decimals:23}]}}};
 const html=renderToStaticMarkup(createElement(MarketMovement,{result,compact:true}));const label=html.match(/<svg[^>]+aria-label="([^"]+)"/)?.[1]??'';
 expect(label).toContain('4 samples');expect(label).toContain('First 0.00000123 USD');expect(label).toContain('last 0.00000234567891234567891 USD');expect(label).toContain('minimum 0.0000001 USD');expect(label).toContain('maximum 0.000009 USD');expect(label).toContain('rose');expect(label).toContain('Individual sample dates unavailable');expect(label).not.toContain('-5');if(marketBasis==='tokenized')expect(label).toContain('tokenized');
});
