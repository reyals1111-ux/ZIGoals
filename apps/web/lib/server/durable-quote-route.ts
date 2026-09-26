import 'server-only';
import {marketRuntime,type MarketEnvironment} from './market-runtime';
import {boundedQuoteText} from '../market-quotes';
import {parseMarketPairWire} from '../market-pair-wire';
import type {MarketQuoteRequest} from '../market-assets';
import {marketPairEnvelope} from './market-pair-result';
export type QuoteEnvironment=MarketEnvironment;
/** Only explicit server configuration selects the new route. Enabled-but-unavailable
 * never falls back to per-process admission. Production config has no opt-in. */
export async function configuredDurableQuotes(requests:readonly MarketQuoteRequest[],loadEnv?:()=>Promise<QuoteEnvironment>){
 const runtime=await marketRuntime(loadEnv);
 if(runtime.mode==='development')return null;
 const unavailable=()=>marketPairEnvelope(requests,[],requests.map(request=>({request,category:'LOCAL_BUDGET' as const})),Date.now());
 if(runtime.mode!=='durable')return unavailable();
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,requests})}));if(!response.ok)return unavailable();return parseMarketPairWire(JSON.parse(await boundedQuoteText(response,1024*1024)),requests);}catch{return unavailable();}
}
