/**
 * "Ask ZIGi about this" (ADR-012 follow-up, part F): a page can hand ZIGi a starting sentence. The launcher opens the
 * panel and the composer takes the text; nothing is sent until the person presses Send, and no data leaves before.
 * The last ask is kept for a moment so a composer that mounts after the event (the chat chunk loading) still finds it.
 */
export const ASK_EVENT = 'zigoals:ai-ask';
let pending: {text: string; at: number} | null = null;
export function askZigi(text: string): void {
  pending = {text, at: Date.now()};
  window.dispatchEvent(new CustomEvent(ASK_EVENT, {detail: {text}}));
}
/** The ask of the last 30 seconds, once. */
export function takePendingAsk(): string | null {
  if (!pending || Date.now() - pending.at > 30_000) { pending = null; return null; }
  const text = pending.text; pending = null; return text;
}
