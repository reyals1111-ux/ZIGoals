/**
 * Session X-Local Part 9, the owner's H7 (ADR-017 S81): on a phone the launcher rests where it covers no first-screen
 * control. Its corner sits just above the tab bar, and on some pages a page's first actions sit exactly there on first
 * load (Help's chips, Markets' refresh, Health's view tabs, measured 6–58 % covered); no fixed spot is free on every page
 * and size, so at the top of a page the launcher lifts to the nearest free band and returns to its corner once the person
 * scrolls. Pure: boxes in, a lift in pixels out; the component reads the boxes and sets a CSS variable.
 */
export type Box = {left: number; top: number; right: number; bottom: number};

const intersects = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * The smallest lift (a multiple of `step`, from 0) that moves `launcher` clear of every box in `controls` (plus `margin`), keeping its top
 * at or below `minTop`; 0 when it is clear where it is, and 0 again when no lift within reach clears it (then it stays
 * put rather than hiding — reachable first).
 */
export function restLift(launcher: Box, controls: readonly Box[], {minTop = 72, step = 8, margin = 4}: {minTop?: number; step?: number; margin?: number} = {}): number {
  // `margin` keeps a few pixels of air between the launcher and a control, so a fractional edge never reads as a touch.
  const padded = controls.map(c => ({left: c.left - margin, top: c.top - margin, right: c.right + margin, bottom: c.bottom + margin}));
  const blocked = (lift: number) => padded.some(c => intersects({...launcher, top: launcher.top - lift, bottom: launcher.bottom - lift}, c));
  if (!blocked(0)) return 0;
  for (let lift = step; launcher.top - lift >= minTop; lift += step) if (!blocked(lift)) return lift;
  return 0;
}

/** The controls of `main` that are on the first screen (any part above the fold), as boxes; zero-size ones are skipped. */
export const CONTROL_SELECTOR = 'main a, main button, main input, main select, main textarea, main [role="button"], main summary';
export function firstScreenControls(root: Document, viewportHeight: number): Box[] {
  const out: Box[] = [];
  for (const el of root.querySelectorAll(CONTROL_SELECTOR)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.top >= viewportHeight) continue;
    out.push({left: r.left, top: r.top, right: r.right, bottom: r.bottom});
  }
  return out;
}
