import 'server-only';
import {createCoinGeckoProvider} from './coingecko';
import {createMarketQuoteCache} from '../market-quote-cache';
import {directMarketDevelopment} from './market-runtime';
/** Credentials are read only here, on the server, and passed only in the adapter header. */
export const coinGeckoProvider=createCoinGeckoProvider({key:()=>directMarketDevelopment()?process.env.COINGECKO_DEMO_API_KEY?.trim():undefined});
export const serverMarketCache=createMarketQuoteCache(requests=>coinGeckoProvider.quoteResults(requests));
/** Only direct local development reads a provider key. Every hosted runtime gets prices from the market coordinator
 * binding (configuredDurableQuotes), so a key in a hosted app's environment is never read (Session S). */
export const directMarketKeyConfigured=()=>directMarketDevelopment()&&Boolean(process.env.COINGECKO_DEMO_API_KEY?.trim());
