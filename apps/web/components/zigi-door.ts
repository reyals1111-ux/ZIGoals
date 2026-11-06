'use client';
import {useSyncExternalStore} from 'react';
import {askZigi, launcherShown} from './ai/ask';
import {isSensitiveScreen} from './ai/use-sensitive-screen';

/**
 * This lane's doors to ZIGi (Session AA-Cloud, Gate C persona round): whether ZIGi's launcher shows, followed as it
 * changes (it mounts after the page and steps aside while another dialog is open), and an ask that waits for the
 * launcher to be back (after the search palette closes, say) before it hands ZIGi the words. Uses ZIGi's public API
 * only (components/ai/ask.ts).
 */
const subscribe = (change: () => void) => {
  const observer = new MutationObserver(change);
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-zigi-launcher']});
  return () => observer.disconnect();
};
export const useLauncherShown = (): boolean => useSyncExternalStore(subscribe, launcherShown, () => false);

/** Hands ZIGi the words once its launcher shows and no other dialog is open, within two seconds; false if it never did. */
export function askZigiWhenShown(text: string): Promise<boolean> {
  return new Promise(resolve => {
    const start = performance.now();
    const tick = () => {
      if (launcherShown() && !document.querySelector('dialog[open]:not([data-ai-dialog])')) { askZigi(text); resolve(true); return; }
      if (performance.now() - start > 2000) { resolve(false); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Session AL (owner decision O3): opens ZIGi's panel without its floating button, from the "Apps & extras" sheet below
 * 901 px. The launcher (components/ai/ai-launcher.tsx) listens. It waits until no other dialog or sensitive form is open
 * (the sheet itself closes first), plus two frames so the launcher has seen that too; false if that never happened
 * within two seconds (a sign-in, unlock or recovery form stays on the page: ZIGi steps aside there, ADR-012 rule 8).
 */
export const ZIGI_OPEN_EVENT = 'zigoals:zigi-open';
/**
 * CI17 (CI 1569, WebKit, ⌘/Ctrl+Shift+Z on Today): when nothing private or open shows at the call (the key on a page, a
 * sheet that has already closed), the panel opens at once: the wait below was frames, and on a busy page (Today still
 * loading its parts after hydration) the browser drew its third frame only after the two seconds, so the key did nothing.
 * The launcher checks the screen again itself (and the panel shows once it has seen the screen calm). While something
 * still shows, the wait gives up only after two seconds and at least WAIT_FRAMES frames, so a slow page is not mistaken
 * for a private form that stays.
 */
const WAIT_FRAMES = 12;
export function openZigiPanel(): Promise<boolean> {
  const open = () => window.dispatchEvent(new Event(ZIGI_OPEN_EVENT));
  if (!isSensitiveScreen()) { open(); return Promise.resolve(true); }
  return new Promise(resolve => {
    const start = performance.now();
    let calm = 0, frames = 0;
    const tick = () => {
      frames += 1;
      if (!isSensitiveScreen()) calm += 1; else calm = 0;
      if (calm >= 3) { open(); resolve(true); return; }
      if (frames >= WAIT_FRAMES && performance.now() - start > 2000) { resolve(false); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
