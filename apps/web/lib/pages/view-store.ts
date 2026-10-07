import {PAGES_VIEW, type Pages, type PagesView} from './schema';
import {defaultView, everythingView, sameView, viewOf} from './visibility';
import {readDeviceRecord} from '../device-record';
import {getAppStorage, isShowcase} from '../showcase-storage';

/**
 * The visible pages for every part of the shell at once (Session W Part 2). The shell tells this store what the private
 * settings hold (components/shell.tsx); until they open, the device's mirror (`zigoals:pages-view:v1`) answers, so the
 * sidebar, phone top bar and tab bar show the person's own pages from the first client render instead of flashing hidden
 * ones; on the server (and before hydration) they show the defaults. Unreadable settings show everything.
 *
 * The mirror is a display cache, not a record of its own: it is written only when the synced choice differs from what
 * the device holds, and removed when the choice is back to the defaults, so a person who never hides anything never has
 * it, and viewing a page never writes. In Showcase it lives in the tab's session storage, like every Showcase record.
 */
export type SyncedPages = {state: 'pending'} | {state: 'ready'; pages: Pages | undefined} | {state: 'unreadable'};
let synced: SyncedPages = {state: 'pending'}, syncedView: PagesView | null = null;
let mirrorCache: {raw: string | null; showcase: boolean; view: PagesView} | null = null;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const SERVER_VIEW = defaultView(false);

function mirrorView(): PagesView {
  let raw: string | null = null, showcase = false;
  try { showcase = isShowcase(); raw = getAppStorage().getItem(PAGES_VIEW.key); } catch { /* storage refused: the defaults */ }
  if (mirrorCache && mirrorCache.raw === raw && mirrorCache.showcase === showcase) return mirrorCache.view;
  let view = defaultView(showcase);
  if (raw !== null) { const read = readDeviceRecord({getItem: () => raw}, PAGES_VIEW); if (!read.unreadable) view = read.data; }
  mirrorCache = {raw, showcase, view};
  return view;
}
/** The view the shell shows now (a stable object while nothing changes, as useSyncExternalStore needs). */
export function pagesViewSnapshot(): PagesView {
  if (synced.state === 'ready') return syncedView!;
  if (synced.state === 'unreadable') return syncedView!;
  return mirrorView();
}
export const serverPagesView = (): PagesView => SERVER_VIEW;
export function subscribePagesView(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the mirror (a choice made there before this tab's settings re-read).
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(PAGES_VIEW.key)) listener(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
export const syncedPagesState = (): SyncedPages['state'] => synced.state;

/** Brings the device's mirror in line with the synced choice: written only when it differs, removed at the defaults. */
function keepMirror(view: PagesView): void {
  try {
    const storage = getAppStorage(), showcase = isShowcase(), raw = storage.getItem(PAGES_VIEW.key);
    if (sameView(view, defaultView(showcase))) { if (raw !== null) storage.removeItem(PAGES_VIEW.key); return; }
    const next = JSON.stringify(PAGES_VIEW.schema.parse(view));
    if (raw !== next) storage.setItem(PAGES_VIEW.key, next);
  } catch { /* the mirror is a convenience: a full or refused storage only costs the first paint */ }
}
/** The shell's report of the private settings; returns true when the view may have changed. */
export function setSyncedPages(next: SyncedPages): boolean {
  if (next.state === synced.state && (next.state !== 'ready' || (synced.state === 'ready' && synced.pages === next.pages))) return false;
  synced = next;
  if (next.state === 'ready') {
    const view = viewOf(next.pages, isShowcase());
    if (!syncedView || !sameView(view, syncedView)) syncedView = view;
    keepMirror(view);
  } else syncedView = next.state === 'unreadable' ? everythingView() : null;
  notify();
  return true;
}
/** Tests only: forget the shell's report and the mirror cache. */
export function resetPagesViewForTests(): void { synced = {state: 'pending'}; syncedView = null; mirrorCache = null; listeners.clear(); }
