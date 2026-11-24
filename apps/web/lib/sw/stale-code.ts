/**
 * Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): the part of the update recovery every page carries from its first
 * script: knowing a failure to load this version's code, and noting the fields the person changes (so a reload never
 * takes their words). What to do about a failure (lib/sw/update-recovery.ts) loads only when one happens.
 */
export const UPDATE_WAITING = 'zigoals:update-waiting';
export const RELOAD_MARK = 'zigoals:update-reload:v1';
const STALE = [
  /ChunkLoadError/i,
  /Loading (?:CSS )?chunk [\w./-]+ failed/i,
  /Failed to load chunk/i,
  /module factory is not available/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];
/** Whether an error (or a rejection's reason, or a message) says code of this version could not be loaded. */
export function isStaleCodeError(error: unknown): boolean {
  if (!error) return false;
  const e = error as {name?: unknown; message?: unknown};
  const text = typeof error === 'string' ? error : `${typeof e.name === 'string' ? e.name : ''} ${typeof e.message === 'string' ? e.message : ''}`;
  return STALE.some(re => re.test(text));
}
/** Fields the person typed into or changed in this tab (React keeps a controlled field's default equal to its value, so a
 * change cannot be read from the page alone). A form that is sent or reset is no longer in the middle of anything. */
export const touched = new WeakSet<Element>();
/** Notes the fields the person changes (call once per tab; `watchStaleCode` does). */
export function watchEdits(doc: Document): () => void {
  const mark = (event: Event) => { const t = event.target; if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) touched.add(t); };
  const done = (event: Event) => { const form = event.target; if (form instanceof HTMLFormElement) for (const el of form.elements) touched.delete(el); };
  doc.addEventListener('input', mark, true); doc.addEventListener('change', mark, true);
  doc.addEventListener('submit', done, true); doc.addEventListener('reset', done, true);
  return () => { doc.removeEventListener('input', mark, true); doc.removeEventListener('change', mark, true); doc.removeEventListener('submit', done, true); doc.removeEventListener('reset', done, true); };
}
/** Hands a failure that is one to the recovery, loaded now (never throws). */
export function onStaleCode(error: unknown, win: Window = window, commit = process.env.NEXT_PUBLIC_APP_COMMIT ?? ''): void {
  if (!isStaleCodeError(error)) return;
  void import('./update-recovery').then(m => m.recoverFromStaleCode(win, commit)).catch(() => { try { win.dispatchEvent(new Event(UPDATE_WAITING)); } catch { /* nothing to tell */ } });
}
/** Listens for such failures outside React (a rejected `import()`, a script that failed), and notes the person's edits. */
export function watchStaleCode(win: Window): () => void {
  const edits = watchEdits(win.document);
  const rejected = (event: PromiseRejectionEvent) => onStaleCode(event.reason, win);
  const failed = (event: ErrorEvent) => onStaleCode(event.error ?? event.message, win);
  win.addEventListener('unhandledrejection', rejected);
  win.addEventListener('error', failed);
  // The recovery itself is fetched once the page is idle, so it is already here when a deploy removes its file. Session AV
  // lane 2 (CI run 2026, av-update:38): on a busy page there was no idle moment and the 5 s cap came after a deploy 3 s in, so
  // the recovery's own file was gone too and only the note showed; it now comes within 1.5 s at most.
  const warm = () => { void import('./update-recovery').catch(() => {}); };
  const idle = (win as Window & {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}).requestIdleCallback;
  if (idle) idle.call(win, warm, {timeout: 1500}); else win.setTimeout(warm, 1500);
  return () => { edits(); win.removeEventListener('unhandledrejection', rejected); win.removeEventListener('error', failed); };
}
