import 'server-only';
import {createCoinGeckoProvider} from './coingecko';
import {createMarketQuoteCache} from '../market-quote-cache';
/** Credentials are read only here, on the server, and passed only in the adapter header. */
export const coinGeckoProvider=createCoinGeckoProvider({key:()=>process.env.COINGECKO_DEMO_API_KEY});
export const serverMarketCache=createMarketQuoteCache(requests=>coinGeckoProvider.quoteResults(requests));
