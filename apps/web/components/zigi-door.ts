'use client';
import {useSyncExternalStore} from 'react';
import {askZigi, launcherShown} from './ai/ask';

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
