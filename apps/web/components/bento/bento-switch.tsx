'use client';
import {useEffect, useId, useState, type KeyboardEvent} from 'react';
import './bento.css';
import {BENTO_PAGES, type BentoPage} from './bento-pages';

/**
 * Session AP (owner decision 14 Nov, backlog #8; ADR-040): an optional "Bento" view on the pillar overviews (Goals, Habits,
 * Health, Wealth) and on Today below its hero (the hero and slogan are untouched): the same cards, as tiles. The list stays
 * the default; the choice is remembered per page on this device (`zigoals:bento:v1`, localStorage: a display convenience,
 * never a record, listed in erase's NOT_RECORDS). Only on a computer (a phone's one column is already a list of tiles).
 * The two choices are a radio group: one Tab stop on the chosen one, the arrows choose.
 */
export const BENTO_KEY = 'zigoals:bento:v1';

export function readBento(raw: string | null): BentoPage[] {
  try { const v = raw ? JSON.parse(raw) as {version?: unknown; pages?: unknown} : null; return v && v.version === 1 && Array.isArray(v.pages) ? BENTO_PAGES.filter(p => (v.pages as unknown[]).includes(p)) : []; } catch { return []; }
}
const regionOf = (page: BentoPage) => `${page}:${page === 'today' ? 'main' : 'body'}`;
/** Marks the element that holds the page's cards as the tile grid, and each card that lays its own content out in columns
 *  (in the list view) as wide. */
function markWide(page: BentoPage): boolean {
  const items = document.querySelectorAll<HTMLElement>(`[data-layout-region="${regionOf(page)}"]`);
  for (const el of document.querySelectorAll('[data-bento-grid]')) el.removeAttribute('data-bento-grid');
  items[0]?.parentElement?.setAttribute('data-bento-grid', '');
  for (const item of items) {
    let wide = false;
    // Three levels down is where a card lays out its own grid; deeper parts are its contents.
    const inner = item.querySelectorAll<HTMLElement>(':scope > *, :scope > * > *, :scope > * > * > *');
    for (let i = 0; i < inner.length && i < 200 && !wide; i++) {
      // Rendered and wide first: reading a grid's columns inside a closed <details> (not rendered) crashed Chrome's
      // renderer (Chrome 153, Session AP), so only a laid-out grid is asked for its columns.
      const el = inner[i]!;
      if (!el.getClientRects().length || el.getBoundingClientRect().width <= 480 || el.closest('details:not([open])')) continue;
      const cs = getComputedStyle(el);
      if (cs.display.includes('grid') && cs.gridTemplateColumns.split(' ').filter(Boolean).length >= 2) wide = true;
    }
    item.toggleAttribute('data-bento-wide', wide);
  }
  return items.length > 0;
}
const store = (): Storage | null => { try { return window.localStorage; } catch { return null; } };
/** Where storage is refused, the choice lasts until the page reloads. */
let fallback: BentoPage[] = [];
const current = (): BentoPage[] => { try { const s = store(); return s ? readBento(s.getItem(BENTO_KEY)) : fallback; } catch { return fallback; } };

const CHANGED = 'zigoals-bento-change';
/** The choice for a page on this device, kept current when the switch changes it. */
function useBentoOn(page: BentoPage): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(current().includes(page));
    read(); window.addEventListener(CHANGED, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(CHANGED, read); window.removeEventListener('storage', read); };
  }, [page]);
  return on;
}

/**
 * `apply` (always mounted with the page, beside the lock, drawing nothing) lays the cards out; the switch itself is in
 * "Arrange this page" (CI 1726, ADR-040 D24: in the header it pushed the lock to a second line at 1280 and hid the mode
 * strip). Choosing writes the choice and tells the applier.
 */
export default function BentoSwitch({page, apply = false}: {page: BentoPage; apply?: boolean}) {
  const id = useId(), on = useBentoOn(page);
  useEffect(() => {
    if (!apply) return;
    const root = document.documentElement;
    if (!on) { if (root.dataset.bento === page) delete root.dataset.bento; return; }
    // UX review (Blocker): a card that holds its own multi-column grid in the list (the holdings, the goal cards, the habit
    // cards) keeps the whole row as a tile; only self-contained cards become tiles. Measured in the list layout, before the
    // tiles apply, and again when the window changes size (in one step, never painted in between).
    let frame = 0, width = window.innerWidth, tries = 0, retry = 0;
    // Cards that load after the switch (a slow first paint) are picked up within a few seconds.
    const run = () => { delete root.dataset.bento; const found = markWide(page); root.dataset.bento = page; if (!found && tries++ < 10) retry = window.setTimeout(run, 300); };
    run();
    // A page that is still filling in (parts load on demand after a reload) is measured again once it settles.
    const settle = [600, 2000].map(ms => window.setTimeout(run, ms));
    // Only a real change of the window's width measures again (never a resize the tiles themselves could cause).
    const onResize = () => { if (Math.abs(window.innerWidth - width) < 1) return; width = window.innerWidth; cancelAnimationFrame(frame); frame = requestAnimationFrame(run); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(frame); clearTimeout(retry); settle.forEach(clearTimeout); window.removeEventListener('resize', onResize); if (root.dataset.bento === page) delete root.dataset.bento; for (const el of document.querySelectorAll('[data-bento-grid]')) el.removeAttribute('data-bento-grid'); };
  }, [apply, on, page]);
  if (apply) return null;
  const choose = (next: boolean) => {
    const pages = current().filter(p => p !== page), kept = next ? [...pages, page] : pages;
    fallback = kept;
    try { const s = store(); if (kept.length) s?.setItem(BENTO_KEY, JSON.stringify({version: 1, pages: kept})); else s?.removeItem(BENTO_KEY); } catch { /* refused: kept for this page's life */ }
    window.dispatchEvent(new Event(CHANGED));
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const next = !on; choose(next);
    (event.currentTarget.parentElement?.querySelector(`[data-bento-choice="${next ? 'bento' : 'list'}"]`) as HTMLElement | null)?.focus();
  };
  return <div className="bento-switch" role="radiogroup" aria-labelledby={`${id}-label`}>
    <span className="bento-switch-label" id={`${id}-label`}>Layout</span>
    <button type="button" role="radio" aria-checked={!on} tabIndex={on ? -1 : 0} data-bento-choice="list" onClick={() => choose(false)} onKeyDown={onKey}>List</button>
    <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-bento-choice="bento" onClick={() => choose(true)} onKeyDown={onKey}>Bento</button>
  </div>;
}
