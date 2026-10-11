import {marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from '../market-assets';
import {quoteIsStale,verifiedMarketQuote,type MarketQuote} from '../market-quotes';
import type {ProviderFailureCategory} from './provider-failure';
export type PairStatus='VERIFIED_FRESH'|'VERIFIED_STALE'|'PROVIDER_UNAVAILABLE'|'PROVIDER_THROTTLED'|'PROVIDER_MALFORMED'|'UNSUPPORTED'|'NOT_ATTEMPTED_BUDGET';
export type PairFailure={request:MarketQuoteRequest;category:ProviderFailureCategory};
export type MarketPairResult={request:MarketQuoteRequest;status:PairStatus;quote:MarketQuote|null;failure:ProviderFailureCategory|null};
export type MarketPairEnvelope={version:1;results:MarketPairResult[];quotes:MarketQuote[];complete:boolean;degraded:boolean;error:string|null};
const status=(category:ProviderFailureCategory):PairStatus=>category==='THROTTLED'?'PROVIDER_THROTTLED':category==='MALFORMED'?'PROVIDER_MALFORMED':category==='UNSUPPORTED'?'UNSUPPORTED':category==='LOCAL_BUDGET'?'NOT_ATTEMPTED_BUDGET':'PROVIDER_UNAVAILABLE';
/** Version 1 is used by the opt-in durable quote route; default routes retain legacy.
 * Quote fields retain canonical provenance, exact units and original observation/fetch time.
 * Completeness means every requested pair has evidence; degradation also includes stale evidence.
 */
export function marketPairEnvelope(raw:readonly MarketQuoteRequest[],quotes:readonly MarketQuote[],failures:readonly PairFailure[],now:number):MarketPairEnvelope {
 const requests=uniqueMarketRequests(raw),keys=new Set(requests.map(marketRequestKey));
 const byKey=new Map<string,MarketQuote>();
 for(const rawQuote of quotes){const quote=verifiedMarketQuote(rawQuote,now);if(!quote.marketRef)throw Error('Canonical market reference required.');const key=marketRequestKey({marketRef:quote.marketRef,currency:quote.currency as 'USD'|'EUR'});if(!keys.has(key)||byKey.has(key))throw Error('Unexpected or duplicate market evidence.');const requested=requests.find(r=>marketRequestKey(r)===key)!;if(quote.marketRef.kind==='rwa'&&(requested.marketRef.kind!=='rwa'||requested.marketRef.assetType!==quote.marketRef.assetType))throw Error('Conflicting market identity.');byKey.set(key,quote);}
 // Stable precedence, low to high: uncertainty/unsupported/local denial/transport/
 // server/throttle/entitlement/authentication/integrity. Input ordering is irrelevant.
 const precedence:ProviderFailureCategory[]=['UNKNOWN','UNSUPPORTED','LOCAL_QUEUE','LOCAL_BUDGET','NETWORK','TIMEOUT','UPSTREAM_5XX','THROTTLED','ENTITLEMENT','AUTHENTICATION','MALFORMED'];
 const errors=new Map<string,ProviderFailureCategory>();
 for(const failure of failures){const key=marketRequestKey(failure.request);if(!keys.has(key)||!precedence.includes(failure.category))throw Error('Unexpected market failure.');const old=errors.get(key);if(!old||precedence.indexOf(failure.category)>precedence.indexOf(old))errors.set(key,failure.category);}
 const results=requests.map(request=>{const quote=byKey.get(marketRequestKey(request))??null;const failure=errors.get(marketRequestKey(request))??null;return {request,quote,failure:quote?failure:failure??'UNKNOWN',status:quote?(quoteIsStale(quote,now)?'VERIFIED_STALE':'VERIFIED_FRESH'):status(failure??'UNKNOWN')} as MarketPairResult;});
 const complete=results.every(r=>r.quote!==null),degraded=results.some(r=>r.status!=='VERIFIED_FRESH'||r.failure!==null);
 return {version:1,results,quotes:results.flatMap(r=>r.quote?[r.quote]:[]),complete,degraded,error:degraded?'CoinGecko market data unavailable.':null};
}
