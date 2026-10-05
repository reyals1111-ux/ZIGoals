import {boundedQuoteText,cleanupMarketBody} from '../market-quotes';
import {isJsonMediaType} from '../json-media-type';
import {ProviderTransportError,ProviderValidationError} from '../provider-validation';
import {ProviderFailure,providerHttpFailure} from './provider-failure';
import {PROVIDER_USER_AGENT} from './provider-user-agent';
export type MarketCommand=(command:unknown)=>Promise<Record<string,unknown>>;
export type ChargedOperation='quote'|'catalog'|'history'|'insights'|'token'|'rwa';
const paths:Record<ChargedOperation,RegExp>={quote:/^\/api\/v3\/simple\/price$/,catalog:/^\/api\/v3\/(coins|rwas)\/list$/,history:/^\/api\/v3\/coins\/[a-z0-9_-]+\/market_chart$/,insights:/^\/api\/v3\/(coins|rwas)\/markets$/,token:/^\/api\/v3\/simple\/token_price\/ethereum$/,rwa:/^\/api\/v3\/rwas\/markets$/};
/** One provider read of an internally constructed CoinGecko URL, made only after its attempt was dispatched by the
 * account (market-batch.ts). A failure after dispatch remains charged, including a lost or failed body stream.
 * No retry or fallback is hidden in this function. */
export async function providerText(url:URL,operation:ChargedOperation,limit:number,{key,fetcher=fetch,signal}:{key?:string;fetcher?:typeof fetch;signal?:AbortSignal}):Promise<string>{
 if(!key?.trim())throw new ProviderFailure('AUTHENTICATION');
 if(url.origin!=='https://api.coingecko.com'||!paths[operation].test(url.pathname))throw new ProviderFailure('UNSUPPORTED');
 const response=await fetcher(url.href,{method:'GET',headers:{Accept:'application/json','User-Agent':PROVIDER_USER_AGENT,'x-cg-demo-api-key':key.trim()},credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});
 const failure=response.redirected?new ProviderFailure('UNKNOWN'):!response.ok?providerHttpFailure(response.status):!isJsonMediaType(response.headers.get('content-type'))?new ProviderFailure('MALFORMED'):null;
 if(failure){await cleanupMarketBody(()=>response.body?.cancel()??Promise.resolve());throw failure;}
 return boundedQuoteText(response,limit);
}
/** The sanitized category of a failed read: the caller's abort is a local queue outcome, never a provider fault. */
export function providerFailure(error:unknown,signal?:AbortSignal):ProviderFailure{
 return signal?.aborted?new ProviderFailure('LOCAL_QUEUE'):error instanceof ProviderFailure?error:new ProviderFailure(error instanceof ProviderValidationError?'MALFORMED':error instanceof ProviderTransportError?error.category:error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'TIMEOUT':error instanceof TypeError?'NETWORK':'UNKNOWN');
}
