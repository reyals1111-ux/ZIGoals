'use client';

/**
 * Whether ZIGi's own animated files may play (Session V Part 12; shared since Session X-Local Part 1): never under the
 * device's reduced motion, the app's Motion Off (`html[data-app-motion=off]`) or ZIGi's animation Off
 * (`html[data-zigi-motion=off]`). The still frame shows instead. `watchMotion` tells a subscriber when any of the three
 * changes; `zigiAnimation` reads the person's Full / Calm / Off choice the launcher wrote on the root.
 */
export function motionAllowed(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement.dataset;
  return root.appMotion !== 'off' && root.zigiMotion !== 'off' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
export function watchMotion(change: () => void): () => void {
  const observer = new MutationObserver(change), query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-app-motion', 'data-zigi-motion']});
  query?.addEventListener('change', change);
  return () => { observer.disconnect(); query?.removeEventListener('change', change); };
}
export type ZigiAnimation = 'full' | 'calm' | 'off';
export function zigiAnimation(): ZigiAnimation {
  const value = typeof document === 'undefined' ? undefined : document.documentElement.dataset.zigiMotion;
  return value === 'full' || value === 'off' ? value : 'calm';
}
/**
 * Whether this browser plays animated WebP (every current engine; Safari since 14). Decided once per page from a
 * one-frame animated WebP data URL; a browser that cannot gets the APNG fallback instead. Resolves false where images
 * cannot load at all (a worker, a test runner without images).
 */
const PROBE = 'data:image/webp;base64,UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA';
let probe: Promise<boolean> | null = null;
export function supportsAnimatedWebp(): Promise<boolean> {
  if (probe) return probe;
  probe = new Promise(resolve => {
    if (typeof Image === 'undefined') { resolve(false); return; }
    const image = new Image();
    image.onload = () => resolve(image.width > 0 && image.height > 0);
    image.onerror = () => resolve(false);
    image.src = PROBE;
  });
  return probe;
}
