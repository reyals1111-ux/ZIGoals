import {marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from '../market-assets';
import {quoteIsStale,verifiedMarketQuote,type MarketQuote} from '../market-quotes';
import type {ProviderFailureCategory} from './provider-failure';
export type PairStatus='VERIFIED_FRESH'|'VERIFIED_STALE'|'PROVIDER_UNAVAILABLE'|'PROVIDER_THROTTLED'|'PROVIDER_MALFORMED'|'UNSUPPORTED'|'NOT_ATTEMPTED_BUDGET';
export type PairFailure={request:MarketQuoteRequest;category:ProviderFailureCategory};
export type MarketPairResult={request:MarketQuoteRequest;status:PairStatus;quote:MarketQuote|null;failure:ProviderFailureCategory|null};
export type MarketPairEnvelope={version:1;results:MarketPairResult[];quotes:MarketQuote[];complete:boolean;degraded:boolean;error:string|null};
const status=(category:ProviderFailureCategory):PairStatus=>category==='THROTTLED'?'PROVIDER_THROTTLED':category==='MALFORMED'?'PROVIDER_MALFORMED':category==='UNSUPPORTED'?'UNSUPPORTED':category==='LOCAL_BUDGET'?'NOT_ATTEMPTED_BUDGET':'PROVIDER_UNAVAILABLE';
/** Internal v1 adapter; public routes keep their existing {quotes,error} envelope.
 * Quote fields retain canonical provenance, exact units and original observation/fetch time.
 * Completeness means every requested pair has evidence; degradation also includes stale evidence.
 */
export function marketPairEnvelope(raw:readonly MarketQuoteRequest[],quotes:readonly MarketQuote[],failures:readonly PairFailure[],now:number):MarketPairEnvelope {
 const requests=uniqueMarketRequests(raw),keys=new Set(requests.map(marketRequestKey));
 const byKey=new Map<string,MarketQuote>();
 for(const rawQuote of quotes){const quote=verifiedMarketQuote(rawQuote,now);if(!quote.marketRef)throw Error('Canonical market reference required.');const key=marketRequestKey({marketRef:quote.marketRef,currency:quote.currency as 'USD'|'EUR'});if(!keys.has(key)||byKey.has(key))throw Error('Unexpected or duplicate market evidence.');const requested=requests.find(r=>marketRequestKey(r)===key)!;if(quote.marketRef.kind==='rwa'&&(requested.marketRef.kind!=='rwa'||requested.marketRef.assetType!==quote.marketRef.assetType))throw Error('Conflicting market identity.');byKey.set(key,quote);}
 const errors=new Map(failures.map(f=>[marketRequestKey(f.request),f.category]));
 const results=requests.map(request=>{const quote=byKey.get(marketRequestKey(request))??null;const failure=errors.get(marketRequestKey(request))??null;return {request,quote,failure:quote?failure:failure??'UNKNOWN',status:quote?(quoteIsStale(quote,now)?'VERIFIED_STALE':'VERIFIED_FRESH'):status(failure??'UNKNOWN')} as MarketPairResult;});
 const complete=results.every(r=>r.quote!==null),degraded=results.some(r=>r.status!=='VERIFIED_FRESH'||r.failure!==null);
 return {version:1,results,quotes:[...byKey.values()],complete,degraded,error:degraded?'CoinGecko market data unavailable.':null};
}
