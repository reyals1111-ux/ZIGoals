import {createMarketDetailCache} from '../market-detail-cache';
import {coinGeckoProvider} from './market-service';
/** Direct development only: reuses the provider singleton and its admission, never another quota pool. */
export const serverMarketDetailCache=createMarketDetailCache(requests=>coinGeckoProvider.details(requests));
