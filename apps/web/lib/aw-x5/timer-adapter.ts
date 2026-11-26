/**
 * Session AW (X5, LEDGER #449): the ONE place the cooking view starts a named timer. Round 7's #440 (group X1, branch
 * `aw/x1-due`) owns the timers: `startNamedTimer(name, seconds)` in `lib/timers/start.ts` writes its device record
 * (the timers record), and its strip shows every running timer on every page, with Pause, +1 min, Stop and a bell.
 *
 * Until X1 is merged this branch cannot name that module: a static `import('../timers/start')` of a file that does not
 * exist breaks the type check and the bundle, and a computed specifier would be fetched by the browser at run time. So
 * the loader below is `null` here, and every timer runs as a plain in-page countdown kept in memory for this cooking only
 * (nothing stored, nothing in a notification), listed in the cooking view with Stop.
 *
 * INTEGRATOR, after merging `aw/x1-due`: replace `null` in `X1_TIMERS` with `() => import('../timers/start')` (one line);
 * the type below is that module's shape, so the check then holds it to the real API. The in-page countdown stays as the
 * fallback for a device whose timer record cannot be written.
 */
export type NamedTimersModule = {startNamedTimer: (name: string, seconds: number) => unknown};
const X1_TIMERS: (() => Promise<NamedTimersModule>) | null = () => import('../timers/start'); // Session AW (integration): X1's named timers are merged
let load: (() => Promise<NamedTimersModule>) | null = X1_TIMERS;
/** Tests only: stand in for X1's module (or `null` for the in-page countdown). */
export function setNamedTimersLoader(next: (() => Promise<NamedTimersModule>) | null): void { load = next; }

export type PageTimer = {id: string; name: string; seconds: number; endsAt: number};
let pageTimers: readonly PageTimer[] = [];
const listeners = new Set<() => void>();
const tell = () => { for (const fn of listeners) fn(); };
/** For `useSyncExternalStore`: the in-page countdowns of this page, soonest end first. */
export const subscribePageTimers = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const pageTimersNow = (): readonly PageTimer[] => pageTimers;
export const EMPTY_TIMERS: readonly PageTimer[] = [];
export function stopPageTimer(id: string): void { pageTimers = pageTimers.filter(t => t.id !== id); tell(); }
let made = 0;
function startPageTimer(name: string, seconds: number, now: number): PageTimer {
  const timer = {id: `cook-${now.toString(36)}-${++made}`, name, seconds, endsAt: now + seconds * 1000};
  pageTimers = [...pageTimers, timer].sort((a, b) => a.endsAt - b.endsAt);
  tell();
  return timer;
}
/**
 * Starts a named timer: in Timers (#440's strip) where that module is present and the record can be written, else as an
 * in-page countdown. Several can run at once. Resolves to where it runs.
 */
export async function startCookingTimer(name: string, seconds: number, now = Date.now()): Promise<{where: 'timers'} | {where: 'page'; timer: PageTimer}> {
  const s = Math.max(1, Math.min(24 * 3600, Math.round(seconds)));
  if (load) {
    try { const timers = await load(); timers.startNamedTimer(name, s); return {where: 'timers'}; }
    catch { /* the timer record could not be written: the countdown runs in the page instead */ }
  }
  return {where: 'page', timer: startPageTimer(name, s, now)};
}
/** Whole seconds left on an in-page countdown (0 once it ended). */
export const pageSecondsLeft = (t: PageTimer, now: number) => Math.max(0, Math.min(t.seconds, Math.ceil((t.endsAt - now) / 1000)));
/** "8:59", "1:02:03". */
export function clockOf(seconds: number): string {
  const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
