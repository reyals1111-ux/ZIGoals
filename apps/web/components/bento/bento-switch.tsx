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

export default function BentoSwitch({page}: {page: BentoPage}) {
  const id = useId(), [on, setOn] = useState(false);
  useEffect(() => { setOn(readBento(store()?.getItem(BENTO_KEY) ?? null).includes(page)); }, [page]);
  useEffect(() => {
    const root = document.documentElement;
    if (!on) { if (root.dataset.bento === page) delete root.dataset.bento; return; }
    // UX review (Blocker): a card that holds its own multi-column grid in the list (the holdings, the goal cards, the habit
    // cards) keeps the whole row as a tile; only self-contained cards become tiles. Measured in the list layout, before the
    // tiles apply, and again when the window changes size (in one step, never painted in between).
    let frame = 0, width = window.innerWidth, tries = 0, retry = 0;
    // Cards that load after the switch (a slow first paint) are picked up within a few seconds.
    const apply = () => { delete root.dataset.bento; const found = markWide(page); root.dataset.bento = page; if (!found && tries++ < 10) retry = window.setTimeout(apply, 300); };
    apply();
    // A page that is still filling in (parts load on demand after a reload) is measured again once it settles.
    const settle = [600, 2000].map(ms => window.setTimeout(apply, ms));
    // Only a real change of the window's width measures again (never a resize the tiles themselves could cause).
    const onResize = () => { if (Math.abs(window.innerWidth - width) < 1) return; width = window.innerWidth; cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(frame); clearTimeout(retry); settle.forEach(clearTimeout); window.removeEventListener('resize', onResize); if (root.dataset.bento === page) delete root.dataset.bento; for (const el of document.querySelectorAll('[data-bento-grid]')) el.removeAttribute('data-bento-grid'); };
  }, [on, page]);
  const choose = (next: boolean) => {
    setOn(next);
    try {
      const s = store(), pages = readBento(s?.getItem(BENTO_KEY) ?? null).filter(p => p !== page);
      const kept = next ? [...pages, page] : pages;
      if (kept.length) s?.setItem(BENTO_KEY, JSON.stringify({version: 1, pages: kept})); else s?.removeItem(BENTO_KEY);
    } catch { /* storage refused: the choice lasts until the page reloads */ }
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
