/**
 * Session AK F0 (A12 intermittents, `zigi-memory:188`): a full document load of the page the person is on, as an
 * ordinary navigation instead of `location.reload()`.
 *
 * Why: "Return to my data" must drop every store hook of the Showcase, so it loads the page again. `location.reload()`
 * re-requests the document in reload mode, and WebKit then revalidates every script, style and image of the page with
 * the server while it is still cancelling the old page's router prefetches; in CI that burst is where WebKit's document
 * request stalled (the click never finished, the page never came back). A navigation to the same path and query is a
 * normal load: the hashed files come from the browser's cache (and the app's service worker), so the new page asks the
 * server for its document and little else. `replace` keeps history as a reload does (no extra Back step).
 *
 * The fragment is left out on purpose: a navigation to the same address *with* a fragment is a jump within the page, not
 * a load, so the stores would stay. Nothing is written; the caller changes what it must before calling.
 */
type Here = Pick<Location, 'pathname' | 'search'>;
/** The address a full load of this page goes to: its path and query, never its fragment. */
export function fullLoadTarget(here: Here): string {
  const path = here.pathname.startsWith('/') && !here.pathname.startsWith('//') ? here.pathname : '/app';
  return path + (here.search.startsWith('?') && here.search.length > 1 ? here.search : '');
}
/** Loads the current page again as a navigation (see above). */
export function fullLoad(win: {location: Here & Pick<Location, 'replace'>} = window): void {
  win.location.replace(fullLoadTarget(win.location));
}
