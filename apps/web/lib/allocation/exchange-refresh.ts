/**
 * Session AK (7.2): when to read a connected exchange's balances again, pure. While ZIGoals is open, visible and online,
 * every 15 minutes; never while the page is hidden or offline (nothing runs in the background); after a failed read
 * the wait doubles (15, 30, 60 minutes, then stays at 60) so a refused key is not asked again and again. The relay
 * (lib/server/exchange-relay.ts) is stateless and has no limit of its own, so the floor is ours: never two reads of one
 * exchange within 60 seconds, the "Refresh now" button included — far below Kraken's, Coinbase's and Binance's own
 * private-API limits for one balance call. (Lane W placed this here; the lead may move it to lib/exchanges/.)
 */
export const AUTO_EVERY_MS = 15 * 60_000, MIN_GAP_MS = 60_000, MAX_BACKOFF_MS = 60 * 60_000;
export type RefreshPlan = {at: number | null; reason: 'hidden' | 'offline' | 'due' | 'wait'};
const time = (value: string | number | null | undefined) => typeof value === 'number' ? value : value ? Date.parse(value) : NaN;
/** The wait after `failures` failed reads in a row (0 = the normal 15 minutes). */
export const backoff = (failures: number) => Math.min(MAX_BACKOFF_MS, AUTO_EVERY_MS * 2 ** Math.max(0, Math.min(failures, 8)));
/**
 * The next automatic read: null while hidden or offline; `now` when it is due (never read, or the wait has passed);
 * otherwise the moment it will be. A last read "in the future" (a clock moved back) counts as now.
 */
export function nextRefresh(lastReadAt: string | number | null | undefined, now: number, visible: boolean, online: boolean, failures = 0): RefreshPlan {
  if (!visible) return {at: null, reason: 'hidden'};
  if (!online) return {at: null, reason: 'offline'};
  const last = time(lastReadAt);
  if (!Number.isFinite(last)) return {at: now, reason: 'due'};
  const at = Math.min(last, now) + backoff(failures);
  return at <= now ? {at: now, reason: 'due'} : {at, reason: 'wait'};
}
/** Whether "Refresh now" may read now, and if not, in how many seconds. */
export function canRefreshNow(lastAttemptAt: string | number | null | undefined, now: number): {ok: boolean; inSeconds: number} {
  const last = time(lastAttemptAt);
  if (!Number.isFinite(last)) return {ok: true, inSeconds: 0};
  const wait = Math.min(last, now) + MIN_GAP_MS - now;
  return wait <= 0 ? {ok: true, inSeconds: 0} : {ok: false, inSeconds: Math.ceil(wait / 1000)};
}
/** "Last synced just now / 4 min ago / 2 h ago / 3 days ago", or "Not synced yet". A relative time, not a date. */
export function lastSyncedText(lastReadAt: string | number | null | undefined, now: number): string {
  const last = time(lastReadAt);
  if (!Number.isFinite(last)) return 'Not synced yet';
  const minutes = Math.max(0, Math.floor((now - last) / 60_000));
  if (minutes < 1) return 'Last synced just now';
  if (minutes < 60) return `Last synced ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Last synced ${hours} h ago`;
  return `Last synced ${Math.floor(hours / 24)} days ago`;
}
