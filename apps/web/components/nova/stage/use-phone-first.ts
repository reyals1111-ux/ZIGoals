'use client';
import {useEffect, useState} from 'react';

/**
 * Session AM-3 (round 6; the phone's stage): the height of a phone's first screen, in CSS px — what the window leaves
 * for the stage between the top bar with its deck and the foot (the one-tap keys and the command bar), measured, so the
 * star, its words and the strip of instrument cards fill exactly that and the full panels start under the fold. It is
 * read once and again whenever one of those parts changes size (a ResizeObserver; nothing follows a pointer or a scroll).
 * Null until it is known (the sheet has a fallback).
 */
export function usePhoneFirst(frame: {current: HTMLElement | null}, on: boolean): number | null {
  const [first, setFirst] = useState<number | null>(null);
  useEffect(() => {
    const root = on ? frame.current : null, centre = root?.querySelector<HTMLElement>('.nova-centre'), area = root?.querySelector<HTMLElement>('.nova-stage-area'), foot = root?.querySelector<HTMLElement>('.nova-foot');
    if (!centre || !area || !foot || typeof ResizeObserver === 'undefined') { setFirst(null); return; }
    const read = () => {
      // The stage area's own padding and the column's top padding stand between the deck and the first screen.
      const css = getComputedStyle(area), column = area.querySelector<HTMLElement>('.holo-phone-column');
      const pad = (parseFloat(css.paddingTop) || 0) + (parseFloat(css.paddingBottom) || 0) + (column ? parseFloat(getComputedStyle(column).paddingTop) || 0 : 0);
      const top = area.getBoundingClientRect().top - centre.getBoundingClientRect().top + centre.scrollTop;
      const next = Math.max(0, Math.round(centre.clientHeight - top - foot.offsetHeight - pad));
      setFirst(was => was === next ? was : next);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(centre); observer.observe(foot);
    for (const el of centre.querySelectorAll<HTMLElement>(':scope > .nova-top, :scope > .nova-deck')) observer.observe(el);
    return () => observer.disconnect();
  }, [frame, on]);
  return first;
}
