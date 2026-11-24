import {createMarketHistoryCache, fetchPublicMarketHistory} from '../../lib/market-history';

/**
 * Session AV lane 2 (CI run 2007): the one market history cache of a portfolio's Analysis — the value chart and the Time
 * Machine read the same histories, so a history one of them has read (or is reading) is never asked for again by the
 * other ("the same market history the value chart reads; nothing new is asked of any service"). Tab-local, as before.
 */
export const portfolioHistoryCache = createMarketHistoryCache((request, refresh) => fetchPublicMarketHistory(request, refresh));
