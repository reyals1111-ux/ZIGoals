import {editAccount} from './accounts/net-worth';
import {accountsSchema, type Account, type Accounts} from './accounts/schema';
import {marketRefKey} from './market-assets';
import {platformSchema, type Platform} from './positions';

/**
 * Session AL (3e, A7): the reverses Wealth's Undo toasts run. Each reads the LATEST record (the store's own update hands
 * it in) and puts back only what the action took, so anything changed since is kept.
 */
/** An archived account counts again. */
export const unarchiveAccount = (id: string, at?: string) => (latest: Accounts): Accounts =>
  latest.items.some(a => a.id === id && a.archivedAt) ? editAccount(latest, id, {archived: false}, at ?? new Date().toISOString()) : latest;
/** A removed account comes back at its old place (unless it is already there). */
export const reinsertAccount = (account: Account, index: number) => (latest: Accounts): Accounts =>
  latest.items.some(a => a.id === account.id) ? latest : accountsSchema.parse({...latest, items: [...latest.items.slice(0, index), account, ...latest.items.slice(index)]});
/** A removed favourite comes back at its old place (unless it is already there, or the list is full). */
export const reinsertFavourite = (favourite: Platform['watchlist'][number], index: number) => (latest: Platform): Platform => {
  const key = marketRefKey(favourite.ref);
  if (latest.watchlist.some(a => marketRefKey(a.ref) === key)) return latest;
  return platformSchema.parse({...latest, watchlist: [...latest.watchlist.slice(0, index), favourite, ...latest.watchlist.slice(index)]});
};
