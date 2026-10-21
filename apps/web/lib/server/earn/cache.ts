import 'server-only';
import {liveUnavailable, type LiveEnvelope, type LiveOk, type LiveSource} from '../../earn/live/envelope';

/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): one cache and one set of limits per /api/earn/* route, in this
 * server's memory only (never stored, no address kept), on the positions relay's pattern.
 *
 * - A good answer is served for `ttlMs` (2–30 minutes by source); requests arriving while it is being read share that read.
 * - When a refresh fails, the last good answer is served for up to `staleMs` with `stale: true` and the reason; past that,
 *   the honest `unavailable`. A failure is remembered for `failMs` so a down source is not asked again on every request.
 * - Each client (its connecting address group, never stored) may ask `clientPerMinute` times a minute: past that, HTTP 429
 *   with an `unavailable` RATE_LIMITED body and Retry-After. A local runtime has no client group and no client limit.
 * - This server starts at most `loadsPerMinute` upstream reads a minute for the route; past that it serves the last good
 *   answer (stale) or `unavailable` RATE_LIMITED with HTTP 200 (the source is unread, the person did nothing wrong).
 */
export type RelayAnswer<T> = {status: 200 | 429; body: LiveEnvelope<T>; retryAfter?: number};
export type RelayOptions = {ttlMs: number; staleMs: number; failMs?: number; clientPerMinute?: number; loadsPerMinute?: number; now?: () => number};
type Entry<T> = {good?: LiveOk<T>; goodAt: number; failedAt?: number; failure?: LiveEnvelope<T>; flight?: Promise<LiveEnvelope<T>>};
export const MAX_CLIENTS = 4000;
export function earnRelay<T>({ttlMs, staleMs, failMs = 15_000, clientPerMinute = 60, loadsPerMinute = 30, now = Date.now}: RelayOptions) {
  const entries = new Map<string, Entry<T>>(), clients = new Map<string, number[]>(), loads: number[] = [];
  const recent = (times: number[], t: number) => { while (times.length && t - times[0]! >= 60_000) times.shift(); return times; };
  const stale = (entry: Entry<T>, t: number, failed: LiveEnvelope<T>): LiveEnvelope<T> => entry.good && t - entry.goodAt < staleMs ? {...entry.good, stale: true, ...(failed.status === 'unavailable' ? {reason: failed.reason} : {})} : failed;
  return async function answer(key: string, client: string | null, source: LiveSource, load: () => Promise<LiveEnvelope<T>>): Promise<RelayAnswer<T>> {
    const t = now();
    if (client) {
      const mine = recent(clients.get(client) ?? [], t);
      if (mine.length >= clientPerMinute) return {status: 429, retryAfter: Math.max(1, Math.ceil((mine[0]! + 60_000 - t) / 1000)), body: liveUnavailable(source, 'RATE_LIMITED', new Date(t).toISOString()) as LiveEnvelope<T>};
      mine.push(t); clients.delete(client); clients.set(client, mine);
      while (clients.size > MAX_CLIENTS) clients.delete(clients.keys().next().value!);
    }
    const entry = entries.get(key) ?? {goodAt: 0};
    entries.set(key, entry);
    if (entry.good && t - entry.goodAt < ttlMs) return {status: 200, body: entry.good};
    if (entry.failure && entry.failedAt !== undefined && t - entry.failedAt < failMs) return {status: 200, body: stale(entry, t, entry.failure)};
    if (!entry.flight) {
      if (recent(loads, t).length >= loadsPerMinute) return {status: 200, body: stale(entry, t, liveUnavailable(source, 'RATE_LIMITED', new Date(t).toISOString()))};
      loads.push(t);
      const flight = load().then(result => {
        const at = now();
        if (result.status === 'ok') { entry.good = result; entry.goodAt = at; entry.failure = undefined; entry.failedAt = undefined; }
        else { entry.failure = result; entry.failedAt = at; }
        return result;
      }).finally(() => { if (entry.flight === flight) entry.flight = undefined; });
      entry.flight = flight;
    }
    const result = await entry.flight;
    return {status: 200, body: result.status === 'ok' ? result : stale(entry, now(), result)};
  };
}
