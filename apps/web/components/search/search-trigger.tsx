'use client';
import {Suspense, lazy, useEffect, useState} from 'react';
import {launcherShown} from '../ai/ask';
import {LoadBoundary} from '../load-boundary';

/**
 * Search (Session AA-Cloud Part 4, S1): a magnifier in the header of every page and the "/" key (when the person is
 * not typing) open one palette over goals, habits, foods and recipes, assets, pages, settings, Help's answers and the
 * goal templates, all on this device. ⌘K stays ZIGi's. The palette loads when it first opens (weights), so the shell
 * carries only this button and its key.
 */
const SearchPalette = lazy(() => import('./search-palette'));
const OPEN_EVENT = 'zigoals:open-search';
export const openSearch = (query = '') => window.dispatchEvent(new CustomEvent(OPEN_EVENT, {detail: {query}}));
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Listens for "/" once per page; the triggers only send the open event. Mounted once by the shell. */
export function SearchHost() {
  const [open, setOpen] = useState(false), [initial, setInitial] = useState(''), [zigi, setZigi] = useState(false);
  useEffect(() => {
    const show = (e: Event) => { setZigi(launcherShown()); setInitial(e instanceof CustomEvent && typeof e.detail?.query === 'string' ? e.detail.query : ''); setOpen(true); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(e.target) || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      setZigi(launcherShown());
      setInitial('');
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener('keydown', key);
    // Session AA-Local, merged second (ADR-022 B52): ZIGi's "open search" card navigates with ?search=<query>; the palette opens with it and the address is cleaned.
    try { const url = new URL(window.location.href), q = url.searchParams.get('search'); if (q !== null) { url.searchParams.delete('search'); window.history.replaceState(null, '', url.pathname + url.search + url.hash); setZigi(launcherShown()); setInitial(q); setOpen(true); } } catch { /* no window */ }
    return () => { window.removeEventListener(OPEN_EVENT, show); window.removeEventListener('keydown', key); };
  }, []);
  // Offline before its first use, the palette cannot load: the page stays as it is (LoadBoundary, quiet).
  return open ? <LoadBoundary quiet><Suspense fallback={null}><SearchPalette initial={initial} zigi={zigi} onClose={() => setOpen(false)} /></Suspense></LoadBoundary> : null;
}

export function SearchButton({className = 'search-trigger', label = false}: {className?: string; label?: boolean}) {
  return <button type="button" className={className} aria-label={label ? undefined : 'Search'} aria-keyshortcuts="/" title="Search ( / )" onPointerEnter={() => void import('./search-palette').catch(() => undefined)} onClick={() => openSearch()}>
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
    {label && <><span>Search</span><kbd aria-hidden="true">/</kbd></>}
  </button>;
}
