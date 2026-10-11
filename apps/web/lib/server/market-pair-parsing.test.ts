import {test,expect} from 'vitest';
import {parseCoinQuoteResults,parseCoinQuotes,parseRwaQuoteResults} from '../market-quotes';
const pair=(id:string)=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const});
test('new batch result isolates invalid evidence while the strict parser keeps its atomic contract',()=>{
 const text='{"bitcoin":{"usd":0.1234567890123456789,"last_updated_at":1},"broken":{"usd":0,"last_updated_at":1}}';
 expect(()=>parseCoinQuotes(text,[pair('bitcoin'),pair('broken')],2000)).toThrow();
 const result=parseCoinQuoteResults(text,[pair('bitcoin'),pair('broken')],2000);expect(result.quotes[0]?.price).toBe('1234567890123456789');expect(result.failures).toEqual([pair('broken')]);
 expect(()=>parseCoinQuoteResults('{"other":{}}',[pair('bitcoin')],2000)).toThrow();expect(()=>parseCoinQuoteResults('{',[pair('bitcoin')],2000)).toThrow();
});
test('RWA batch isolates missing requested pairs but never unexpected or duplicate identities',()=>{
 const gold={marketRef:{provider:'coingecko' as const,kind:'rwa' as const,id:'gold',assetType:'commodity' as const},currency:'USD' as const};
 const missing={...gold,marketRef:{...gold.marketRef,id:'missing'}};
 const row={id:'gold',asset_type:'commodity',tokenized_market_data:{current_price:2}};
 expect(parseRwaQuoteResults(JSON.stringify([row]),[gold,missing],2000).failures).toEqual([missing]);expect(()=>parseRwaQuoteResults(JSON.stringify([row,row]),[gold],2000)).toThrow();
});
