import type {Page, TestInfo} from '@playwright/test';

/**
 * Session AK CI-W (diagnostic only; asserts nothing): records each document view transition the page starts — when it
 * started, when the browser called its update (the navigation commits there), when it was ready and finished, the size
 * of every element that carried a transition name, and whether a modal was open — so a WebKit run that stalls a
 * navigation says where the time went. `attachTransitionTiming` adds the record to a failed test's report and does nothing on a pass.
 */
export const recordTransitionTiming = (page: Page) => page.addInitScript(() => {
  type Entry = {start: number; update?: number; ready?: number; finished?: number; error?: string; url: string; named: string[]; modal?: boolean};
  const log: Entry[] = [];
  (window as unknown as {__zgVtLog: Entry[]}).__zgVtLog = log;
  const proto = Document.prototype as unknown as {startViewTransition?: (arg?: unknown) => {ready: Promise<unknown>; finished: Promise<unknown>}};
  const original = proto.startViewTransition;
  if (typeof original !== 'function') return;
  const ms = () => Math.round(performance.now());
  proto.startViewTransition = function (this: Document, arg?: unknown) {
    const entry: Entry = {start: ms(), url: location.href, named: []};
    log.push(entry);
    try { entry.modal = !!document.querySelector(':modal'); } catch { /* no :modal */ }
    try {
      for (const el of document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
        const r = el.getBoundingClientRect();
        entry.named.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    } catch { /* measuring is best effort */ }
    const wrap = (update: (...a: unknown[]) => unknown) => (...a: unknown[]) => { entry.update = ms(); return update(...a); };
    const next = typeof arg === 'function' ? wrap(arg as (...a: unknown[]) => unknown)
      : arg && typeof arg === 'object' && typeof (arg as {update?: unknown}).update === 'function' ? {...arg, update: wrap((arg as {update: (...a: unknown[]) => unknown}).update)} : arg;
    const transition = original.call(this, next);
    transition.ready.then(() => { entry.ready = ms(); }, (e: unknown) => { entry.error = String((e as Error)?.message ?? e); });
    const done = () => { entry.finished = ms(); };
    transition.finished.then(done, done); // never an unhandled rejection of its own
    return transition;
  };
});

/** On a failed test that recorded them, attaches the recorded transitions (times in ms since the page loaded) and the page's clock. */
export async function attachTransitionTiming(page: Page, testInfo: TestInfo) {
  if (testInfo.status === testInfo.expectedStatus) return;
  const record = await page.evaluate(() => ({now: Math.round(performance.now()), url: location.href, transitions: (window as unknown as {__zgVtLog?: unknown[]}).__zgVtLog ?? null})).catch(() => null);
  if (!record?.transitions) return; // only the tests that called recordTransitionTiming
  await testInfo.attach('view-transition-timing', {body: JSON.stringify(record, null, 1), contentType: 'application/json'});
}
