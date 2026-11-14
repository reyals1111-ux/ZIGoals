'use client';
import {useEffect, useId, useState} from 'react';
import {useRovingFocus} from '../ui/use-roving-focus';

/**
 * Session AO (D-028, AL-A11Y-016): Today's own skip links, after the app's "Skip to content": straight to Today's big regions
 * (your goals, the Checklist, your widgets, your week). They show only while one has the focus (as "Skip to content"
 * does) and are ONE Tab stop together: the arrow keys move between them, Enter goes. A region that is not on this Today
 * (hidden, folded away, not chosen) has no link: the list follows the page (after it shows, on changes under Today's main
 * area, on resize), never while one of its links has the focus (re-filtering then could remove the focused link and drop the focus).
 */
const REGIONS = [
  {id: 'dashboard-item-builtin-goals', label: 'Skip to Your goals'},
  {id: 'today-checklist', label: 'Skip to Checklist'},
  {id: 'today-widgets', label: 'Skip to Your widgets'},
  {id: 'bottom-today-week', label: 'Skip to Your week'},
] as const;
const present = () => REGIONS.filter(r => { const el = typeof document === 'undefined' ? null : document.getElementById(r.id); return !!el && !el.closest('[hidden]') && el.getClientRects().length > 0; }).map(r => r.id);

export function TodaySkips() {
  const [shown, setShown] = useState<readonly string[] | null>(null), list = useRovingFocus<HTMLUListElement>('a[href]'), hint = useId();
  const regions = REGIONS.filter(r => shown === null || shown.includes(r.id));
  useEffect(() => {
    // Session AP (CI 1706, theme-parity-af:15 folded): the list was checked once by a 1.2 s timer, so which links it held
    // depended on when the page was read (Nebula kept all four, Dark three). It now follows the page itself: checked
    // after the page shows, after any change under Today's main area and on resize, once per frame at most, so a settled
    // page always has the same list. Still never while one of its links has the focus.
    let frame = 0;
    const check = () => { frame = 0; if (document.activeElement?.closest('.today-skips')) return; const now = present(); setShown(prev => prev && prev.join() === now.join() ? prev : now); };
    const soon = () => { if (!frame) frame = window.requestAnimationFrame(check); };
    soon();
    const root = document.getElementById('main') ?? document.body;
    const changes = new MutationObserver(soon);
    changes.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'open']});
    window.addEventListener('resize', soon);
    return () => { if (frame) window.cancelAnimationFrame(frame); changes.disconnect(); window.removeEventListener('resize', soon); };
  }, []);
  return <nav className="today-skips" aria-label="Skip to a part of Today">
    <p className="sr-only" id={hint}>The arrow keys move between these links.</p>
    <ul ref={list}>{regions.map(r => <li key={r.id}><a className="today-skip" href={`#${r.id}`} aria-describedby={hint}>{r.label}</a></li>)}</ul>
  </nav>;
}
