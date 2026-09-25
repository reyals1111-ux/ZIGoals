import {expect,it} from 'vitest';
import {marketPairEnvelope} from './market-pair-result';
import {parseCoinQuotes,parseRwaQuotes} from '../market-quotes';
import type {MarketQuoteRequest} from '../market-assets';
const now=Date.parse('2026-09-20T12:00:00Z'),request:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
const quote=parseCoinQuotes('{"bitcoin":{"usd":1.23456789123456789,"last_updated_at":'+now/1000+'}}',[request],now)[0]!;
it('preserves exact canonical evidence and timestamps, with complete stale groups degraded',()=>{
 const result=marketPairEnvelope([request],[quote],[],now+900001);
 expect(result).toMatchObject({version:1,complete:true,degraded:true});expect(result.results[0]).toMatchObject({status:'VERIFIED_STALE',quote});
 expect(result.quotes[0]?.price).toBe('123456789123456789');
});
it.each([['LOCAL_BUDGET','NOT_ATTEMPTED_BUDGET'],['LOCAL_QUEUE','PROVIDER_UNAVAILABLE'],['UNSUPPORTED','UNSUPPORTED']] as const)('classifies %s without invented evidence', (category,status)=>{
 const result=marketPairEnvelope([request],[],[{request,category}],now);expect(result.results[0]).toEqual({request,quote:null,failure:category,status});expect(result.complete).toBe(false);
});
it('rejects unexpected, duplicate and conflicting RWA evidence',()=>{
 expect(()=>marketPairEnvelope([], [quote],[],now)).toThrow();
 expect(()=>marketPairEnvelope([request],[quote,quote],[],now)).toThrow();
 const gold:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'};
 const q=parseRwaQuotes('[{"id":"gold","asset_type":"commodity","tokenized_market_data":{"current_price":1}}]',[gold],now);
 expect(()=>marketPairEnvelope([{...gold,marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'stock'}}],q,[],now)).toThrow();
});
