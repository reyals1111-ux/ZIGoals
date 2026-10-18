'use client';
import {useLayoutEffect, useState, type RefObject} from 'react';

/**
 * Where each dot's centre sits inside the path's stage, measured from the page (the footer line's rule: on mount, on a
 * resize of the stage or of any orbit, banner, dot or chest in it, when the fonts settle, and once more as the page settles
 * after its first paint; never per frame). `key` names the dots in order, so a reorder or a new dot measures
 * again. The same geometry keeps the same object, so nothing re-renders inside a ResizeObserver delivery.
 */
export type PathPoint = {x: number; y: number};
export type PathGeometry = {w: number; h: number; points: Record<string, PathPoint>};
const same = (a: PathGeometry, b: PathGeometry) => a.w === b.w && a.h === b.h && Object.keys(a.points).length === Object.keys(b.points).length && Object.entries(a.points).every(([id, p]) => b.points[id]?.x === p.x && b.points[id]?.y === p.y);
const round = (n: number) => Math.round(n * 10) / 10;

export function measurePath(stage: HTMLElement): PathGeometry {
  const base = stage.getBoundingClientRect(), points: Record<string, PathPoint> = {};
  for (const el of stage.querySelectorAll<HTMLElement>('[data-path-point]')) {
    const id = el.dataset.pathPoint, r = el.getBoundingClientRect();
    if (id && r.width > 0) points[id] = {x: round(r.left + r.width / 2 - base.left), y: round(r.top + r.height / 2 - base.top)};
  }
  return {w: round(base.width), h: round(base.height), points};
}

export function usePathGeometry(stage: RefObject<HTMLElement | null>, key: string): PathGeometry | null {
  const [geo, setGeo] = useState<PathGeometry | null>(null);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    let live = true;
    const measure = () => { if (!live) return; const next = measurePath(el); setGeo(g => g && same(g, next) ? g : next); };
    measure();
    // The stage, and each orbit and chest inside it: a banner that shrinks while a chest grows (a font settling) moves
    // the dots without changing the stage's own size.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); ro?.observe(el);
    for (const part of el.querySelectorAll('.path-section, .path-banner, .path-step, .path-chest, .path-end')) ro?.observe(part);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure, () => undefined);
    // And once the page has settled after it first paints (late styles and images can move a dot without resizing
    // anything observed): the next frame, then a quarter second and a second later.
    const frame = requestAnimationFrame(measure), timers = [250, 1000].map(ms => window.setTimeout(measure, ms));
    return () => { live = false; ro?.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); timers.forEach(t => window.clearTimeout(t)); };
  }, [stage, key]);
  return geo;
}

/** A soft S between two dots: leave each dot straight down, swing across in the middle. */
export function curve(a: PathPoint, b: PathPoint): string {
  const dy = b.y - a.y, f = (n: number) => n.toFixed(1);
  return `M${f(a.x)} ${f(a.y)} C${f(a.x)} ${f(a.y + dy * .5)} ${f(b.x)} ${f(b.y - dy * .5)} ${f(b.x)} ${f(b.y)}`;
}
