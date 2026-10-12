import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Recent searches (Session AA-Cloud Part 4, `[TIER 3] (storage)`): the last eight queries the person chose a result
 * for, on this device only (loose, versioned, its own key, never synced; #32–#37 never read it). "Clear" empties it.
 */
export const SEARCH_RECENT_KEY = 'zigoals:search-recent:v1';
export const MAX_RECENT = 8;
export const searchRecentSchema = z.looseObject({version: z.literal(1), queries: z.array(z.string().trim().min(1).max(80)).max(MAX_RECENT)});
export type SearchRecent = z.infer<typeof searchRecentSchema>;
export const emptySearchRecent = (): SearchRecent => ({version: 1, queries: []});
export const SEARCH_RECENT: DeviceRecordSpec<SearchRecent> = {key: SEARCH_RECENT_KEY, schema: searchRecentSchema, empty: emptySearchRecent};

/** Puts the query first (once, whatever its case), keeping the newest eight. */
export function rememberQuery(state: SearchRecent, query: string): SearchRecent {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!q) return state;
  return searchRecentSchema.parse({...state, queries: [q, ...state.queries.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT)});
}
export const clearRecent = (state: SearchRecent): SearchRecent => ({...state, queries: []});
