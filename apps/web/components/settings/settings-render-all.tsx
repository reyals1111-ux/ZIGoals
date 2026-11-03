'use client';
import {useEffect, useLayoutEffect} from 'react';
import {hashId} from '../../lib/hash-id';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
/**
 * Session AK G2 (RELEASE_REVIEW R11, SESSION_AK_F8 proposal 1): Settings' lower groups skip their layout until they come
 * near the screen (`content-visibility: auto`, components/life-pages.css), which took Settings' blocking time at 4× CPU
 * from 2.4 s to about 1.45 s. A jump lands on sizes the browser has measured, never on estimates: the moment the page
 * opens on an address with a fragment, or a fragment link is followed (the sections nav, the phone's rows, any
 * `#…` link, a Search result for a Settings anchor), every group renders in full (`data-jump`) before the browser
 * scrolls, and stays so for the visit, so Settings' hash links and scrolling land exactly where they always did.
 */
export function SettingsRenderAll() {
  useIsoLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>('.settings-page');
    if (!page) return;
    const all = () => { page.dataset.jump = ''; };
    if (window.location.hash.length > 1) {
      all();
      // The browser may already have jumped before hydration, onto the groups' estimated sizes; now that they are
      // measured, land on the target again (instantly) before KeepSettingsJump starts holding it there.
      const id = hashId(window.location.hash), target = id ? document.getElementById(id) : null;
      target?.scrollIntoView({block: 'start', behavior: 'instant'});
      return;
    }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
      if (link && new URL(link.href, window.location.href).pathname === window.location.pathname) all();
    };
    const onHash = () => { if (window.location.hash.length > 1) all(); };
    type Nav = {addEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void; removeEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void};
    const nav = (window as Window & {navigation?: Nav}).navigation;
    const onNavigate = (event: {destination: {url: string}}) => { const url = new URL(event.destination.url); if (url.hash.length > 1 && url.pathname === window.location.pathname) all(); };
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHash);
    nav?.addEventListener('navigate', onNavigate);
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener('hashchange', onHash); nav?.removeEventListener('navigate', onNavigate); };
  }, []);
  return null;
}
