/**
 * Session AK G2 (SESSION_AK_F8 proposal 5): a gate that opens once per page load, after the page has loaded and the
 * browser is first idle (or `cap` ms at most, so a busy page never waits forever). Heavy extras that only decorate,
 * like ZIGi's animated clip (358 KB), wait for it on a cold load, so they never compete with the page's own first
 * requests and work; once open it stays open, and later callers pass at once.
 */
export type IdleHost = {
  readyState: () => string;
  onLoad: (fn: () => void) => void;
  idle?: (fn: () => void, timeout: number) => void;
  timer: (fn: () => void, ms: number) => void;
};
export function createFirstIdle(host: IdleHost, {idleTimeout = 1500, cap = 4000}: {idleTimeout?: number; cap?: number} = {}) {
  let gate: Promise<void> | null = null, open = false;
  const wait = () => gate ??= new Promise<void>(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; open = true; resolve(); };
    host.timer(finish, cap);
    const afterLoad = () => host.idle ? host.idle(finish, idleTimeout) : host.timer(finish, 300);
    if (host.readyState() === 'complete') afterLoad(); else host.onLoad(afterLoad);
  });
  return {wait, isOpen: () => open};
}
const browserHost = (): IdleHost => ({
  readyState: () => document.readyState,
  onLoad: fn => window.addEventListener('load', fn, {once: true}),
  ...(typeof window.requestIdleCallback === 'function' ? {idle: (fn: () => void, timeout: number) => { window.requestIdleCallback(fn, {timeout}); }} : {}),
  timer: (fn, ms) => { window.setTimeout(fn, ms); },
});
let shared: ReturnType<typeof createFirstIdle> | null = null;
/** The page's own gate (browser only). */
export const firstIdle = () => (shared ??= createFirstIdle(browserHost())).wait();
