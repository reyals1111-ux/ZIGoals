import {PAGES_VIEW, type Pages, type PagesView} from './schema';
import {defaultView, everythingView, sameView, viewOf} from './visibility';
import {readDeviceRecord} from '../device-record';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {LINKED_WALLETS_KEY} from '../linked-wallets-key';
import {EARN_PREFS_KEY} from '../af-earn-keys';
import {chainChosenFrom, chainLinked, earnChoiceOf, linkedWalletCount} from '../chain-choice';

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
let mirrorCache: {raw: string | null; showcase: boolean; chosen: boolean; view: PagesView} | null = null;
/**
 * Session AK X1 (RELEASE_REVIEW R3): whether the chain is chosen decides the crypto pages' defaults (lib/chain-choice.ts).
 * The linked-wallets and Earn device records are read here, synchronously, like the mirror; a wallet in use in this tab
 * (Keplr) is told by the shell (`refreshPagesChain`), since it lives in the goal provider's state.
 */
let walletInTab = false;
function chosenNow(showcase: boolean, pages: Pages | undefined): boolean {
  let wallets: string | null = null, earn: string | null = null;
  try { const storage = getAppStorage(); wallets = storage.getItem(LINKED_WALLETS_KEY); earn = storage.getItem(EARN_PREFS_KEY); } catch { /* storage refused: nothing chosen here */ }
  return chainChosenFrom({linked: chainLinked({showcase, wallet: walletInTab, linkedWallets: linkedWalletCount(wallets)}), pages, earn: earnChoiceOf(earn)});
}
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const SERVER_VIEW = defaultView(false);

function mirrorView(): PagesView {
  let raw: string | null = null, showcase = false;
  try { showcase = isShowcase(); raw = getAppStorage().getItem(PAGES_VIEW.key); } catch { /* storage refused: the defaults */ }
  const chosen = chosenNow(showcase, undefined);
  if (mirrorCache && mirrorCache.raw === raw && mirrorCache.showcase === showcase && mirrorCache.chosen === chosen) return mirrorCache.view;
  let view = defaultView(showcase, chosen);
  if (raw !== null) { const read = readDeviceRecord({getItem: () => raw}, PAGES_VIEW); if (!read.unreadable) view = read.data; }
  mirrorCache = {raw, showcase, chosen, view};
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
    // Compared with what the mirror's own reader falls back to (the stamps are unknown there), so a first paint matches.
    if (sameView(view, defaultView(showcase, chosenNow(showcase, undefined)))) { if (raw !== null) storage.removeItem(PAGES_VIEW.key); return; }
    const next = JSON.stringify(PAGES_VIEW.schema.parse(view));
    if (raw !== next) storage.setItem(PAGES_VIEW.key, next);
  } catch { /* the mirror is a convenience: a full or refused storage only costs the first paint */ }
}
/** The shell's report of the private settings; returns true when the view may have changed. */
export function setSyncedPages(next: SyncedPages): boolean {
  if (next.state === synced.state && (next.state !== 'ready' || (synced.state === 'ready' && synced.pages === next.pages))) return false;
  synced = next;
  if (next.state === 'ready') readyView(next.pages);
  else syncedView = next.state === 'unreadable' ? everythingView() : null;
  notify();
  return true;
}
function readyView(pages: Pages | undefined): boolean {
  const showcase = isShowcase(), view = viewOf(pages, showcase, chosenNow(showcase, pages));
  const changed = !syncedView || !sameView(view, syncedView);
  if (changed) syncedView = view;
  keepMirror(view);
  return changed;
}
/**
 * Session AK X1: the shell's report of a wallet in use in this tab, and its cue that the linked wallets or the Earn
 * switches may have changed; the view is worked out again (the crypto pages' defaults follow the chain choice). Returns
 * true when the view changed.
 */
export function refreshPagesChain(wallet: boolean): boolean {
  walletInTab = wallet;
  let changed = false;
  if (synced.state === 'ready') changed = readyView(synced.pages);
  else if (synced.state === 'pending') {
    // The device's mirror answers until the settings open: keep the same object when the view is the same.
    const before = mirrorCache?.view;
    mirrorCache = null;
    const after = mirrorView();
    if (before && sameView(before, after)) mirrorCache = {...mirrorCache!, view: before};
    else changed = true;
  }
  if (changed) notify();
  return changed;
}
/** Tests only: forget the shell's report and the mirror cache. */
export function resetPagesViewForTests(): void { synced = {state: 'pending'}; syncedView = null; mirrorCache = null; walletInTab = false; listeners.clear(); }
