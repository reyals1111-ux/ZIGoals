'use client';
import {useEffect, useRef, type RefObject} from 'react';
import {rovingCurrent, rovingTarget} from '../../lib/primitives/roving';

/**
 * Session AO (D-028, AL-A11Y-016: Showcase Today took 176 Tab stops): a list or grid of repeated controls becomes ONE Tab
 * stop with a roving tabindex (lib/primitives/roving.ts). Pass the selector of its items (`a[href]` for a list of links);
 * the hook keeps tabindex="0" on the item used last (else the first visible one) and "-1" on the others as items come
 * and go, and moves the focus with the arrow keys, Home and End. Nothing else changes: an item keeps its role, name,
 * look and what Enter does; a click still works on any item; screen readers' reading mode still reads every item.
 * Items that are hidden (a folded row, a closed <details>) are left out, so Tab never lands on something unseen.
 * `columns`: the items form a grid of that many columns (Up and Down move by a row).
 */
export function useRovingFocus<T extends HTMLElement>(selector: string, {columns, enabled = true}: {columns?: number; enabled?: boolean} = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null), last = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const all = () => [...root.querySelectorAll<HTMLElement>(selector)];
    const items = () => all().filter(item => !(item as HTMLButtonElement).disabled && item.getClientRects().length > 0);
    const touched = new Set<HTMLElement>();
    const apply = () => {
      const shown = items(), current = rovingCurrent(shown, last.current);
      for (const item of all()) {
        const tab = item === current ? '0' : '-1';
        if (item.getAttribute('tabindex') !== tab) { item.setAttribute('tabindex', tab); touched.add(item); }
      }
    };
    let frame = 0;
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
    const onFocus = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(selector);
      if (!item || !root.contains(item) || last.current === item) return;
      last.current = item; apply();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const item = (event.target as HTMLElement).closest<HTMLElement>(selector);
      if (!item || !root.contains(item)) return;
      const shown = items(), to = rovingTarget(event.key, shown.indexOf(item), shown.length, columns);
      if (to === null) return;
      event.preventDefault();
      const next = shown[to];
      if (!next || next === item) return;
      last.current = next; apply(); next.focus();
    };
    apply();
    root.setAttribute('data-roving', selector); // for tests/ao/today-tab-stops.spec.ts: each group's items are reached by the arrows
    root.addEventListener('focusin', onFocus);
    root.addEventListener('keydown', onKey);
    // Items arrive with the stores and leave with a fold; a resize can show or hide one (a phone's folded rows).
    const watch = new MutationObserver(later);
    watch.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open', 'disabled', 'data-phone-collapsed']});
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame); watch.disconnect(); window.removeEventListener('resize', later);
      root.removeEventListener('focusin', onFocus); root.removeEventListener('keydown', onKey);
      for (const item of touched) item.removeAttribute('tabindex');
      root.removeAttribute('data-roving');
    };
  }, [selector, columns, enabled]);
  return ref;
}
