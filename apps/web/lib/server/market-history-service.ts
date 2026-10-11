import {createMarketHistoryCache} from '../market-history';
import {coinGeckoProvider} from './market-service';
/** Shares the provider singleton so charts cannot multiply catalog/quote admission. */
export const serverMarketHistoryCache=createMarketHistoryCache(request=>coinGeckoProvider.history(request));
