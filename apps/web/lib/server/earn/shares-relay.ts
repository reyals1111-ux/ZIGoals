import 'server-only';
import type {SharesWire} from '../../earn/shares';

/**
 * Session AH (AF3): /api/earn/shares' own limits, the positions relay's (lib/server/positions-relay.ts): one answer per
 * address kept 60 seconds in this server's memory (requests meanwhile share it; a failed read is never kept); each client
 * may start 10 reads a minute and the server 120; a cached answer costs nothing. Never stored, never logged.
 */
export const SHARES_CACHE_MS = 60_000, SHARES_CLIENT_PER_MINUTE = 10, SHARES_SERVER_PER_MINUTE = 120, SHARES_ENTRIES = 500;
type Read = (address: string) => Promise<SharesWire>;
export function sharesRelay({read, now = Date.now}: {read: Read; now?: () => number}) {
  const cache = new Map<string, {at: number; value: Promise<SharesWire>}>(), clients = new Map<string, number[]>(), server: number[] = [];
  const recent = (times: number[], t: number) => { while (times.length && t - times[0]! >= 60_000) times.shift(); return times; };
  return async function answer(address: string, client: string): Promise<{shares: SharesWire} | {retryAfter: number}> {
    const t = now(), hit = cache.get(address);
    if (hit && t - hit.at < SHARES_CACHE_MS) return {shares: await hit.value};
    if (hit) cache.delete(address);
    const mine = recent(clients.get(client) ?? [], t), all = recent(server, t);
    if (mine.length >= SHARES_CLIENT_PER_MINUTE || all.length >= SHARES_SERVER_PER_MINUTE) {
      const first = Math.min(mine.length >= SHARES_CLIENT_PER_MINUTE ? mine[0]! : Infinity, all.length >= SHARES_SERVER_PER_MINUTE ? all[0]! : Infinity);
      return {retryAfter: Math.max(1, Math.ceil((first + 60_000 - t) / 1000))};
    }
    mine.push(t); all.push(t); clients.delete(client); clients.set(client, mine);
    while (clients.size > SHARES_ENTRIES * 4) clients.delete(clients.keys().next().value!);
    const value = read(address), entry = {at: t, value};
    cache.set(address, entry);
    value.catch(() => { if (cache.get(address) === entry) cache.delete(address); });
    while (cache.size > SHARES_ENTRIES) cache.delete(cache.keys().next().value!);
    return {shares: await value};
  };
}
