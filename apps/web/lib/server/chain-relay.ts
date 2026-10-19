/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): the limits of the address-free chain routes under /api/chain/*,
 * the pattern of lib/server/positions-relay.ts. One answer per key is kept 60 seconds and shared by every client (requests
 * arriving while it is read share the same read); a read that fails is not kept. Each client (its connecting address,
 * never logged) may start 10 chain reads a minute and this server 120; answers from the cache cost nothing. In memory only.
 *
 * Session AF chunk 3 (lane L2a): a relay may keep an answer for a time of its own (`ttl`, from the answer itself: the
 * proposals relay keeps 2 minutes, 30 seconds while a vote is open) and hold more keys (`entries`, the vote relay's
 * per-address answers). Both are optional; without them a relay behaves exactly as before.
 */
export const CHAIN_CACHE_MS = 60_000, CHAIN_CLIENT_READS_PER_MINUTE = 10, CHAIN_SERVER_READS_PER_MINUTE = 120, CHAIN_CACHE_ENTRIES = 50;
export const CHAIN_READS_LIMITED = 'Too many reads just now. Try again in a minute.';
export function chainRelay<T>({now = Date.now, read, ttl, entries = CHAIN_CACHE_ENTRIES}: {now?: () => number; read: (key: string) => Promise<T>; ttl?: (value: T) => number; entries?: number}) {
  const cache = new Map<string, {at: number; value: Promise<T>; keep: number}>(), clients = new Map<string, number[]>(), server: number[] = [];
  const recent = (times: number[], t: number) => { while (times.length && t - times[0]! >= 60_000) times.shift(); return times; };
  return async function answer(key: string, client: string): Promise<{value: T} | {retryAfter: number}> {
    const t = now(), hit = cache.get(key);
    if (hit && t - hit.at < hit.keep) return {value: await hit.value};
    if (hit) cache.delete(key);
    const mine = recent(clients.get(client) ?? [], t), all = recent(server, t);
    if (mine.length >= CHAIN_CLIENT_READS_PER_MINUTE || all.length >= CHAIN_SERVER_READS_PER_MINUTE) {
      const first = Math.min(mine.length >= CHAIN_CLIENT_READS_PER_MINUTE ? mine[0]! : Infinity, all.length >= CHAIN_SERVER_READS_PER_MINUTE ? all[0]! : Infinity);
      return {retryAfter: Math.max(1, Math.ceil((first + 60_000 - t) / 1000))};
    }
    mine.push(t); all.push(t); clients.delete(client); clients.set(client, mine);
    while (clients.size > CHAIN_CACHE_ENTRIES * 40) clients.delete(clients.keys().next().value!);
    const value = read(key), entry = {at: t, value, keep: CHAIN_CACHE_MS};
    cache.set(key, entry);
    value.then(answer => { if (ttl) { const keep = ttl(answer); entry.keep = Number.isFinite(keep) && keep >= 0 ? Math.min(keep, 10 * 60_000) : CHAIN_CACHE_MS; } }, () => { if (cache.get(key) === entry) cache.delete(key); });
    while (cache.size > entries) cache.delete(cache.keys().next().value!);
    return {value: await value};
  };
}
