import {createMarketInsightsCache} from '../market-insights-cache';
import {coinGeckoProvider} from './market-service';
/** Reuses the existing provider singleton and its global admission, never creates another quota pool. */
export const serverMarketInsightsCache=createMarketInsightsCache(requests=>coinGeckoProvider.insights(requests));
