'use client';
import {startTransition, useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {DEFER_BELOW, ROOT_MARGIN, mountsAtOnce, type MountRule} from '../lib/mount-on-view';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
/**
 * Session AK G2 (RELEASE_REVIEW R11, SESSION_AK_F8 proposal 2): mounts a part of a page below the first screen when it is
 * needed (lib/mount-on-view.ts has the rules): within 600 px of the screen, at once on an address that points into it,
 * when forced or on a wide screen, or when the browser is first idle (2.5 s at most). A deferred mount renders in a
 * transition, so React yields to taps and scrolling while it builds. The server and the first client render agree (the
 * part is not mounted in either), so nothing mismatches on hydration. Attach `ref` to the part's always-present box.
 */
export function useMountOnView({hashPrefixes, force = false}: Omit<MountRule, 'wide'>) {
  const [node, setNode] = useState<HTMLElement | null>(null), [mounted, setMounted] = useState(false);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);
  const key = hashPrefixes.join('|');
  // Before the first paint after hydration: a wide screen, an address into the part, or a forced mount shows it at once.
  useIsoLayoutEffect(() => {
    if (mounted) return;
    const wide = !window.matchMedia?.(DEFER_BELOW).matches;
    if (mountsAtOnce(window.location.hash, {hashPrefixes: key.split('|'), force, wide}) || typeof IntersectionObserver === 'undefined') setMounted(true);
  }, [mounted, force, key]);
  useEffect(() => {
    if (mounted || !node) return;
    const later = () => startTransition(() => setMounted(true));
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) later(); }, {rootMargin: ROOT_MARGIN});
    observer.observe(node);
    const w = window as Window & {requestIdleCallback?: (f: () => void, o?: {timeout: number}) => number; cancelIdleCallback?: (id: number) => void};
    const idle = w.requestIdleCallback ? (id => () => w.cancelIdleCallback?.(id))(w.requestIdleCallback(later, {timeout: 2500})) : (id => () => window.clearTimeout(id))(window.setTimeout(later, 1500));
    const onHash = () => { if (mountsAtOnce(window.location.hash, {hashPrefixes: key.split('|')})) setMounted(true); };
    // A keyboard or screen-reader user moving into the part's box mounts it at once.
    const onFocus = () => setMounted(true);
    node.addEventListener('focusin', onFocus);
    window.addEventListener('hashchange', onHash);
    return () => { observer.disconnect(); idle(); node.removeEventListener('focusin', onFocus); window.removeEventListener('hashchange', onHash); };
  }, [mounted, node, key]);
  return {ref, mounted};
}
