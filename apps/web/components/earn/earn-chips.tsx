'use client';
import {useEffect, useRef, useState} from 'react';

/**
 * Session AF (L1): the Earn page's sticky index. Each chip is a plain in-page link to its section (keyboard reachable,
 * works without script); the section on screen is marked with `aria-current="true"` by an IntersectionObserver, never by
 * pointer tracking. On a phone the row is a horizontal rail that keeps the current chip in view (no motion when the
 * person asked for less).
 */
export type Chip = {id: string; label: string};
export function EarnChips({chips}: {chips: readonly Chip[]}) {
  const [current, setCurrent] = useState(chips[0]?.id ?? '');
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The current section is the last one whose top has passed a line just under the index (or the last one when the page
    // is scrolled to its end). Read on scroll, at most once a frame; a section entering or leaving view wakes it too.
    let frame = 0;
    const read = () => {
      frame = 0;
      // The line sits under the index, and never above where a jump lands a section (the page's scroll padding), so a
      // section reached from its chip is the one marked, whatever the index's height (one row, or two with a mouse).
      const index = rail.current?.parentElement?.getBoundingClientRect().bottom ?? 0, padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0, line = Math.max(index + 48, padding + 64);
      const sections = chips.map(c => document.getElementById(c.id)).filter((el): el is HTMLElement => !!el);
      if (!sections.length) return;
      const end = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = end ? sections.at(-1)! : [...sections].reverse().find(el => el.getBoundingClientRect().top <= line) ?? sections[0]!;
      setCurrent(passed.id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(read); };
    const observer = new IntersectionObserver(schedule);
    for (const c of chips) { const el = document.getElementById(c.id); if (el) observer.observe(el); }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    schedule();
    return () => { observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, [chips]);
  useEffect(() => {
    const chip = rail.current?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(current)}"]`);
    if (!chip || !rail.current || rail.current.scrollWidth <= rail.current.clientWidth) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.appMotion === 'off';
    rail.current.scrollTo({left: chip.offsetLeft - rail.current.clientWidth / 2 + chip.offsetWidth / 2, behavior: still ? 'auto' : 'smooth'});
  }, [current]);
  return <nav className="earn-chips" aria-label="On this page">
    <div className="earn-chips-rail" ref={rail}>
      {chips.map(c => <a key={c.id} href={`#${c.id}`} className="earn-chip" data-chip={c.id} aria-current={c.id === current ? 'true' : undefined} onClick={() => setCurrent(c.id)}>{c.label}</a>)}
    </div>
  </nav>;
}
