import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {boundedQuoteText} from '../market-quotes';
import {parseMarketPairWire} from '../market-pair-wire';
import type {MarketQuoteRequest} from '../market-assets';
import {marketPairEnvelope} from './market-pair-result';
export type QuoteEnvironment={ZIGOALS_MARKET_QUOTES_MODE?:string;MARKET_QUOTES?:{fetch:(request:Request)=>Promise<Response>}};
async function runtimeEnvironment():Promise<QuoteEnvironment>{try{return getCloudflareContext().env as unknown as QuoteEnvironment;}catch{return {};}}
/** Only explicit server configuration selects the new route. Enabled-but-unavailable
 * never falls back to per-process admission. Production config has no opt-in. */
export async function configuredDurableQuotes(requests:readonly MarketQuoteRequest[],loadEnv=runtimeEnvironment){
 let env:QuoteEnvironment;try{env=await loadEnv();}catch{env={};}
 const mode=env.ZIGOALS_MARKET_QUOTES_MODE??process.env.ZIGOALS_MARKET_QUOTES_MODE;
 if(!mode)return null;
 const unavailable=()=>marketPairEnvelope(requests,[],requests.map(request=>({request,category:'LOCAL_BUDGET' as const})),Date.now());
 if(mode!=='durable-v1'||!env.MARKET_QUOTES)return unavailable();
 try{const response=await env.MARKET_QUOTES.fetch(new Request('https://market.internal/quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,requests})}));if(!response.ok)return unavailable();return parseMarketPairWire(JSON.parse(await boundedQuoteText(response,1024*1024)),requests);}catch{return unavailable();}
}
