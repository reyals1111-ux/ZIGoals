/**
 * ZIGi's mini window (Session V Part 14): Document Picture-in-Picture, an always-on-top window of this tab where the same
 * chat goes on. Verified 2026-10-05 (YOUR_AI_V2.md): Chrome and Edge 116+ on computers and Firefox 151 on computers have
 * `documentPictureInPicture.requestWindow`; Safari and Android browsers do not, and neither does a phone layout here.
 * The window opens only from the person's click, one per tab; it is a document of this origin, so this page's CSP and
 * Trusted Types apply inside (by the spec's policy-container rule; YOUR_AI_V2.md says it is an inference). Only the
 * page's same-origin styles are carried over, and the page root's display marks (the app's motion choice, ZIGi's
 * animation and side) are copied, so the window looks and moves as the page does.
 */
export type PipHost = {requestWindow: (options?: {width?: number; height?: number; disallowReturnToOpener?: boolean; preferInitialWindowPlacement?: boolean}) => Promise<Window>; window: Window | null};
export const PIP_SIZE = {width: 420, height: 640};
/** The browser's Document Picture-in-Picture, or null where it is missing (Safari, Android, older browsers). */
export function pipHost(win: Window = window): PipHost | null {
  const host = (win as unknown as {documentPictureInPicture?: PipHost}).documentPictureInPicture;
  return host && typeof host.requestWindow === 'function' ? host : null;
}
/** The root marks that change how ZIGoals looks or moves; copied to the mini window and kept in step. */
export const ROOT_MARKS = ['appMotion', 'zigiMotion', 'zigiSide'] as const;
export function copyRootMarks(from: Document, to: Document): void {
  for (const mark of ROOT_MARKS) {
    const value = from.documentElement.dataset[mark];
    if (value === undefined) delete to.documentElement.dataset[mark]; else to.documentElement.dataset[mark] = value;
  }
}
/**
 * The page's own styles, as style elements in the mini window, as Chrome's and MDN's own samples do it: each same-origin
 * stylesheet's rules, read from the page's loaded sheets. They apply at once, with nothing to fetch, so the window is
 * never unstyled. A sheet already carried over is skipped, so this runs again whenever the page loads more styles (a
 * view opened later in the chat). A sheet from another origin, or one the browser will not let us read, is left out.
 */
const carried = new WeakMap<Document, WeakSet<CSSStyleSheet>>();
type SheetSource = Pick<Document, 'baseURI'> & {styleSheets: ArrayLike<CSSStyleSheet>};
export function copyStylesheets(from: SheetSource, to: Document): number {
  let seen = carried.get(to);
  if (!seen) { seen = new WeakSet(); carried.set(to, seen); }
  const origin = new URL(from.baseURI).origin;
  let copied = 0;
  for (const sheet of Array.from(from.styleSheets)) {
    if (seen.has(sheet)) continue;
    try { if (sheet.href && new URL(sheet.href, from.baseURI).origin !== origin) continue; } catch { continue; }
    let text: string;
    try { text = Array.from(sheet.cssRules, rule => rule.cssText).join('\n'); } catch { continue; }
    const style = to.createElement('style');
    if (sheet.media?.mediaText) style.media = sheet.media.mediaText;
    style.textContent = text;
    to.head.append(style); seen.add(sheet); copied++;
  }
  return copied;
}
/** Opens the mini window from a click: the stylesheets and marks first, then the caller portals the chat into it. */
export async function openPipWindow(host: PipHost, from: Document = document): Promise<Window> {
  const win = await host.requestWindow({...PIP_SIZE});
  const doc = win.document;
  doc.title = 'ZIGi · Your Personal AI Companion';
  doc.documentElement.lang = from.documentElement.lang || 'en';
  doc.documentElement.classList.add('zigi-pip-root');
  copyStylesheets(from, doc);
  copyRootMarks(from, doc);
  return win;
}
