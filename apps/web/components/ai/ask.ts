/**
 * "Ask ZIGi about this" (ADR-012 follow-up, part F): a page can hand ZIGi a starting sentence. The launcher opens the
 * panel and the composer takes the text; nothing is sent until the person presses Send, and no data leaves before.
 * The last ask is kept for a moment so a composer that mounts after the event (the chat chunk loading) still finds it.
 * Session V Part 9 ("Explain this number"): an ask may also name the records behind a number (a tool call with its
 * label), which the panel shows as a removable chip next to the question.
 */
export const ASK_EVENT = 'zigoals:ai-ask';
export type AskAbout = {tool: string; args: Record<string, unknown>; label: string};
export type Ask = {text: string; about?: AskAbout};
let pending: (Ask & {at: number}) | null = null;
export function askZigi(text: string, about?: AskAbout): void {
  pending = {text, ...(about ? {about} : {}), at: Date.now()};
  window.dispatchEvent(new CustomEvent(ASK_EVENT, {detail: {text, ...(about ? {about} : {})}}));
}
/** The ask of the last 30 seconds, once. */
export function takePendingAsk(): Ask | null {
  if (!pending || Date.now() - pending.at > 30_000) { pending = null; return null; }
  const {text, about} = pending; pending = null;
  return {text, ...(about ? {about} : {})};
}
/** Set on the page's root while the ZIGi launcher shows, so "Ask ZIGi" affordances appear only then (Part 9). */
export const LAUNCHER_SHOWN_ATTRIBUTE = 'zigiLauncher';
export const launcherShown = () => typeof document !== 'undefined' && document.documentElement.dataset[LAUNCHER_SHOWN_ATTRIBUTE] === 'shown';
