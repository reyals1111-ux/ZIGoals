/**
 * Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): after a new Alpha is deployed, a tab that still runs the previous
 * version must never show a crash. Next 16 already turns a page change across versions into a full page load (the
 * navigation compares the server's build id with its own), so what is left is code the old version loads later, on
 * demand: the new deploy has removed those files, and loading one fails ("Loading chunk … failed", "Failed to fetch
 * dynamically imported module", Turbopack's "module factory is not available", Safari's "Importing a module script
 * failed").
 *
 * Such a failure is answered once, when the app's own server now serves another version (it names its build on every
 * page): the page reloads into the new version, and the reloaded page says "Updated to the newest version." The reload never happens while the person is in the middle of something (an open dialog or sheet, a
 * form with changes, an import, a restore or a confirm card): then only the calm "A new version of ZIGoals is ready ·
 * Reload" note shows, and the person chooses. Offline it never reloads (the page's own offline words stay). A tab reloads
 * by itself at most once in ten minutes (a session guard in this tab's sessionStorage), so a failure that a reload does
 * not cure can never loop: the note shows instead. Nothing is sent anywhere and nothing stored by the person changes.
 */
import {RELOAD_MARK, UPDATE_WAITING, isStaleCodeError, touched, watchEdits, watchStaleCode} from './stale-code';
export {RELOAD_MARK, UPDATE_WAITING, isStaleCodeError, watchEdits, watchStaleCode};
export const RELOAD_GUARD_MS = 10 * 60_000;
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const TEXTLESS = new Set(['button', 'submit', 'reset', 'image', 'hidden', 'range', 'color']);
function holds(field: Field): boolean {
  if (!field.isConnected || field.disabled || field.closest('[data-update-ignore]')) return false;
  if (field instanceof HTMLSelectElement) return true;
  if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) return true;
  if (field instanceof HTMLInputElement && field.type === 'file') return !!field.files?.length;
  if (field instanceof HTMLInputElement && TEXTLESS.has(field.type)) return false;
  return field.value.trim() !== '';
}
/**
 * The person is in the middle of something: an open dialog, sheet or confirm card; an import or a restore that marks
 * itself busy (`data-update-hold`); or a field they changed that still holds what they put in (typed words, a choice, a
 * chosen file) and was not sent.
 */
export function pageBusy(doc: Document): boolean {
  if (doc.querySelector('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-update-hold]')) return true;
  for (const field of doc.querySelectorAll<Field>('input, textarea, select')) if (touched.has(field) && holds(field)) return true;
  return false;
}
type Mark = {at: number; from: string; shown?: boolean};
function readMark(store: Storage): Mark | null {
  try {
    const m = JSON.parse(store.getItem(RELOAD_MARK) ?? 'null') as Mark | null;
    return m && typeof m.at === 'number' && typeof m.from === 'string' ? m : null;
  } catch { return null; }
}
export type Recovery = 'reloading' | 'held' | 'guarded' | 'offline' | 'same-version';
/** The version this app's own server serves now (the build commit it sends on every page), or '' when it cannot tell. */
export async function servedBuild(fetcher: typeof fetch = fetch): Promise<string> {
  try {
    const response = await fetcher('/app', {method: 'HEAD', cache: 'no-store', credentials: 'same-origin'});
    const build = response.headers.get('x-zigoals-build')?.toLowerCase() ?? '';
    return /^[0-9a-f]{40}$/.test(build) ? build : '';
  } catch { return ''; }
}
/**
 * Answers a failure to load this version's code. First the server is asked which version it serves: only another version
 * (a deploy) is an update; the same version (a network hiccup, a refused file) changes nothing here, and the part that
 * failed keeps saying so in its own words. For another version: one reload into it, or (busy, guarded, no storage) the
 * "new version is ready" note. `commit` is this page's own build commit; without one (a local build) nothing reloads.
 */
export async function recoverFromStaleCode(win: Window, commit: string, {now = () => Date.now(), fetcher = (...a: Parameters<typeof fetch>) => win.fetch(...a)}: {now?: () => number; fetcher?: typeof fetch} = {}): Promise<Recovery> {
  const note = () => { try { win.dispatchEvent(new Event(UPDATE_WAITING)); } catch { /* nothing to tell */ } };
  if (win.navigator.onLine === false) return 'offline';
  const own = commit.toLowerCase(), served = /^[0-9a-f]{40}$/.test(own) ? await servedBuild(fetcher) : '';
  if (!served || served === own) return 'same-version';
  if (pageBusy(win.document)) { note(); return 'held'; }
  let store: Storage;
  try { store = win.sessionStorage; const mark = readMark(store); if (mark && now() - mark.at < RELOAD_GUARD_MS) { note(); return 'guarded'; } store.setItem(RELOAD_MARK, JSON.stringify({at: now(), from: own} satisfies Mark)); }
  catch { note(); return 'guarded'; } // without a guard that survives the reload, never reload by itself
  win.location.reload();
  return 'reloading';
}
/**
 * After that reload: whether to say "Updated to the newest version." — once, and only when the version really changed
 * (a reload into the same version says nothing). The mark stays (as shown) so the guard still holds for its ten minutes.
 */
export function takeUpdatedNotice(store: Storage, commit: string, now = Date.now()): boolean {
  try {
    const mark = readMark(store);
    if (!mark || mark.shown) return false;
    if (now - mark.at > RELOAD_GUARD_MS) { store.removeItem(RELOAD_MARK); return false; }
    store.setItem(RELOAD_MARK, JSON.stringify({...mark, shown: true}));
    return !!commit && mark.from !== commit.toLowerCase();
  } catch { return false; }
}
