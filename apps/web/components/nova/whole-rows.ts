'use client';
import {useEffect, useRef} from 'react';

/**
 * Session AM-2 (the conversation console and the right bar): a scroller that shows whole rows. At rest its bottom edge
 * never cuts a row: the row the edge would cut (the outermost one that matches `rows`) is not drawn until it fits — the
 * scroller is clipped up to that row's top (a static clip-path; no fade) and marked `data-cut`, so its sheet can show
 * that more waits below. While the person scrolls nothing is clipped, so scrolling reads as scrolling; a row taller than
 * a third of the scroller is left as it is (a long answer is read by scrolling), and nothing is clipped at the end.
 * Session AM-3 (round 7; the conversation console): with `head`, a short row of the scroller's own (72 px or less: the
 * person's line, a note) that the scroller's top edge would cut is not drawn at rest either, so no half of a label stands under the head; a
 * longer row there (an answer being read) is left as it is. The same reads, in the same pass as the bottom edge's.
 * `target` gives the scroller; `key` names what changes its content (the rows are measured again when it changes, when
 * the scroller or one of its children is resized, and 140 ms after a scroll).
 */
export function useWholeRows(target: () => HTMLElement | null, rows: string, key: string, head = false): void {
  const get = useRef(target);
  get.current = target;
  useEffect(() => {
    const el = get.current();
    if (!el || typeof ResizeObserver === 'undefined') return;
    let timer = 0;
    const mark = (cut: number, above = 0) => {
      const next = cut || above ? `inset(${above ? `${above}px` : 0} 0 ${cut}px 0)` : '';
      if (el.style.clipPath !== next) el.style.clipPath = next;
      el.toggleAttribute('data-cut', cut > 0);
    };
    const settle = () => {
      const box = el.getBoundingClientRect(), edge = box.bottom;
      let cut = 0, above = 0;
      if (head && box.height > 0 && el.scrollTop > 1) {
        let bottom = -Infinity; // the lowest short row of the scroller's own that the top edge crosses
        for (const row of el.querySelectorAll<HTMLElement>(rows)) { const r = row.getBoundingClientRect(); if (row.parentElement === el && r.height > 0 && r.height <= 72 && r.top < box.top - 1 && r.bottom > box.top + 1 && r.bottom > bottom) bottom = r.bottom; }
        if (Number.isFinite(bottom) && bottom < edge) above = Math.ceil(bottom - box.top);
      }
      if (box.height > 0 && el.scrollHeight - el.scrollTop - el.clientHeight > 1) {
        let top = Infinity; // the outermost row the edge crosses (a request with its keys is one row)
        for (const row of el.querySelectorAll<HTMLElement>(rows)) { const r = row.getBoundingClientRect(); if (r.height > 0 && r.top < edge - 1 && r.bottom > edge + 1 && r.top < top) top = r.top; }
        if (Number.isFinite(top) && top > box.top && edge - top <= box.height / 3) cut = Math.ceil(edge - top) + 1;
      }
      mark(cut, above);
    };
    const later = () => { window.clearTimeout(timer); timer = window.setTimeout(settle, 140); };
    const onScroll = () => { if (el.style.clipPath) el.style.clipPath = ''; later(); };
    settle();
    el.addEventListener('scroll', onScroll, {passive: true});
    const observer = new ResizeObserver(later); observer.observe(el); for (const child of el.children) observer.observe(child);
    return () => { window.clearTimeout(timer); el.removeEventListener('scroll', onScroll); observer.disconnect(); mark(0); };
  }, [rows, key, head]);
}
