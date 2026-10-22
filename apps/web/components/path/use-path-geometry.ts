'use client';
import {useLayoutEffect, useState, type RefObject} from 'react';

/**
 * Where each dot's centre sits inside the path's stage, measured from the page (the footer line's rule: on mount, on a
 * resize of the stage or of any orbit, banner, dot or chest in it, when the fonts settle, and once more as the page settles
 * after its first paint, up to 2.5 s; never per frame). `key` names the dots in order, so a reorder or a new dot measures
 * again. The same geometry keeps the same object, so nothing re-renders inside a ResizeObserver delivery.
 *
 * Session AF (L3b; CI on 42ec357c: a line end 3.01 px from its dot, read while the page was still settling): once that last
 * scheduled measure has run, the stage carries `data-settled` — the path's own "the line now matches the dots" signal,
 * which a test (or anything reading the geometry from outside) waits for. A new key measures again and clears it until
 * the new geometry has settled in turn.
 */
/** `r`: the dot's own radius, its layout size (round 4: the orbit look's comet leaves and reaches a planet at its rim). */
export type PathPoint = {x: number; y: number; r?: number};
/** `inset`: room from the stage's sides to the screen's (round 7: how far a name may reach past the stage). */
export type PathGeometry = {w: number; h: number; points: Record<string, PathPoint>; inset?: {left: number; right: number};
  /** Session AG Polish 2: boxes the phone's line keeps clear of (`data-path-box`: name tabs, banners), in the stage's coordinates. */
  boxes?: Record<string, PathBox>};
export type PathBox = {left: number; top: number; right: number; bottom: number};
const sameBoxes = (a: PathGeometry['boxes'], b: PathGeometry['boxes']) => Object.keys(a ?? {}).length === Object.keys(b ?? {}).length && Object.entries(a ?? {}).every(([id, q]) => { const o = b?.[id]; return !!o && o.left === q.left && o.top === q.top && o.right === q.right && o.bottom === q.bottom; });
const same = (a: PathGeometry, b: PathGeometry) => a.w === b.w && a.h === b.h && a.inset?.left === b.inset?.left && a.inset?.right === b.inset?.right && Object.keys(a.points).length === Object.keys(b.points).length && Object.entries(a.points).every(([id, p]) => b.points[id]?.x === p.x && b.points[id]?.y === p.y && b.points[id]?.r === p.r) && sameBoxes(a.boxes, b.boxes);
const round = (n: number) => Math.round(n * 10) / 10;

export function measurePath(stage: HTMLElement): PathGeometry {
  const base = stage.getBoundingClientRect(), points: Record<string, PathPoint> = {};
  for (const el of stage.querySelectorAll<HTMLElement>('[data-path-point]')) {
    const id = el.dataset.pathPoint, r = el.getBoundingClientRect();
    // (`r`: the planet's own radius, its layout size — the next planet is drawn a size larger, which must not move anything.)
    if (id && r.width > 0) points[id] = {x: round(r.left + r.width / 2 - base.left), y: round(r.top + r.height / 2 - base.top), r: round((el.offsetWidth || Math.min(r.width, r.height)) / 2)};
  }
  const vw = document.documentElement.clientWidth, boxes: Record<string, PathBox> = {};
  for (const el of stage.querySelectorAll<HTMLElement>('[data-path-box]')) {
    const id = el.dataset.pathBox, r = el.getBoundingClientRect();
    if (id && r.width > 0) boxes[id] = {left: round(r.left - base.left), top: round(r.top - base.top), right: round(r.right - base.left), bottom: round(r.bottom - base.top)};
  }
  return {w: round(base.width), h: round(base.height), points, inset: {left: round(base.left), right: round(vw - base.right)}, ...(Object.keys(boxes).length ? {boxes} : {})};
}

export function usePathGeometry(stage: RefObject<HTMLElement | null>, key: string): PathGeometry | null {
  const [geo, setGeo] = useState<PathGeometry | null>(null);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    let live = true;
    el.removeAttribute('data-settled');
    const measure = () => { if (!live) return; const next = measurePath(el); setGeo(g => g && same(g, next) ? g : next); };
    measure();
    // The stage, and each orbit and chest inside it: a banner that shrinks while a chest grows (a font settling) moves
    // the dots without changing the stage's own size.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); ro?.observe(el);
    // Session AF (CI on bf72baa0, path-engine: a line end 2.01 px from its dot): the dots themselves too, since a dot that
    // grows or settles late moves its own centre without resizing anything around it.
    for (const part of el.querySelectorAll('.path-section, .path-banner, .path-step, .path-chest, .path-end, [data-path-point]')) ro?.observe(part);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure, () => undefined);
    // And once the page has settled after it first paints (late styles and images can move a dot without resizing
    // anything observed): the next frame, then a quarter second and a second later.
    const frame = requestAnimationFrame(measure), timers = [250, 1000, 2500].map(ms => window.setTimeout(measure, ms));
    // (Marked two frames after that measure, so a geometry it changed has reached the line first.)
    let mark = 0;
    timers.push(window.setTimeout(() => { if (!live) return; measure(); mark = requestAnimationFrame(() => { mark = requestAnimationFrame(() => { if (live) el.setAttribute('data-settled', ''); }); }); }, 2600));
    return () => { live = false; ro?.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); cancelAnimationFrame(mark); timers.forEach(t => window.clearTimeout(t)); };
  }, [stage, key]);
  return geo;
}

/** A soft S between two dots: leave each dot straight down, swing across in the middle. */
export function curve(a: PathPoint, b: PathPoint): string {
  const dy = b.y - a.y, f = (n: number) => n.toFixed(1);
  return `M${f(a.x)} ${f(a.y)} C${f(a.x)} ${f(a.y + dy * .5)} ${f(b.x)} ${f(b.y - dy * .5)} ${f(b.x)} ${f(b.y)}`;
}
