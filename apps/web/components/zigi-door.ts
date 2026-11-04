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
export function openZigiPanel(): Promise<boolean> {
  return new Promise(resolve => {
    const start = performance.now();
    let calm = 0;
    const tick = () => {
      if (!isSensitiveScreen()) calm += 1; else calm = 0;
      if (calm >= 3) { window.dispatchEvent(new Event(ZIGI_OPEN_EVENT)); resolve(true); return; }
      if (performance.now() - start > 2000) { resolve(false); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
