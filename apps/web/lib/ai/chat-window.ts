/**
 * The window the chat lives in (Session V Part 14): the tab, or ZIGi's mini window (Document Picture-in-Picture). There
 * is one chat per tab, so this is one module-level value, set while the mini window is open. Copying and frame timing
 * use that window's own `navigator` and `requestAnimationFrame`: while the mini window has the focus the tab's clipboard
 * call fails ("Document is not focused"), and while the tab is in the background it runs no frames, but the mini window,
 * which the person is looking at, does.
 */
let current: Window | null = null;
const FALLBACK_MS = 100;
export function setChatWindow(win: Window | null): void { current = win; }
/** The mini window while it is open, else this tab's window. */
export function chatWindow(): Window { return current && !current.closed ? current : window; }
/** Text to the clipboard of the chat's own window. */
export function copyText(text: string): Promise<void> {
  const clipboard = chatWindow().navigator.clipboard;
  return clipboard ? clipboard.writeText(text) : Promise.reject(new Error('No clipboard here'));
}
/**
 * The next frame in the chat's window. In the tab, the tab's own frame, as before. With the mini window open, its frame
 * (the tab may be in the background, where frames stop), raced against a short timer of the tab: a window the browser
 * froze runs neither its frames nor its timers. Whichever comes first runs, once. Returns a cancel function.
 */
export function nextFrame(run: () => void): () => void {
  const win = chatWindow();
  let done = false;
  const once = () => { if (done) return; done = true; run(); };
  if (win === window) { const id = window.requestAnimationFrame(once); return () => { done = true; window.cancelAnimationFrame(id); }; }
  const frame = win.requestAnimationFrame(once), timer = window.setTimeout(once, FALLBACK_MS);
  return () => { done = true; win.cancelAnimationFrame(frame); window.clearTimeout(timer); };
}
