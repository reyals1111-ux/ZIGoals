import {describe, expect, it} from 'vitest';
import {RIBBON_COLOURS, RIBBON_WIDTH, SAMPLES, at, footerMinRadius, phoneArc, ribbon, wideArc, widthAt, type Seg} from './footer-ribbon';

/**
 * Session AF (L5a, Part 10.8): the footer finale's ribbon from Health into "= Wealth". Session AG Polish 3 (ADR-032 L17;
 * owner Part 6, reference 04 pointers 1–5): one smooth river with no corners — every join shares one tangent, no turn is
 * tighter than 40 px × width/390 — out of Health on the line's own tangent, over the crest and down into the word; its
 * colour magenta and pink up to just before the crest, then warm gold. The stages below are the page's own (measured in
 * Chromium: the stage's width, Health's node, the end of "= Wealth", the steps' foot).
 */
const points = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));
const deg = (a: {x: number; y: number}, b: {x: number; y: number}) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)))) * 180 / Math.PI;
const tangentIn = (s: Seg) => ({x: s[3].x - s[2].x, y: s[3].y - s[2].y}), tangentOut = (s: Seg) => ({x: s[1].x - s[0].x, y: s[1].y - s[0].y});
/** The least radius of curvature along the pieces (sampled). */
function leastRadius(segs: readonly Seg[]) {
  let m = Infinity;
  for (const s of segs) for (let i = 0; i <= 64; i++) {
    const t = i / 64, u = 1 - t, v = {x: 3 * u * u * (s[1].x - s[0].x) + 6 * u * t * (s[2].x - s[1].x) + 3 * t * t * (s[3].x - s[2].x), y: 3 * u * u * (s[1].y - s[0].y) + 6 * u * t * (s[2].y - s[1].y) + 3 * t * t * (s[3].y - s[2].y)};
    const a = {x: 6 * u * (s[2].x - 2 * s[1].x + s[0].x) + 6 * t * (s[3].x - 2 * s[2].x + s[1].x), y: 6 * u * (s[2].y - 2 * s[1].y + s[0].y) + 6 * t * (s[3].y - 2 * s[2].y + s[1].y)};
    const sp = Math.hypot(v.x, v.y), k = sp > 1e-9 ? Math.abs(v.x * a.y - v.y * a.x) / sp ** 3 : 0;
    if (k > 0) m = Math.min(m, 1 / k);
  }
  return m;
}
/** Wider screens: the stage's width, Health's node, the line's tangent into it (Habits → Health), the word's end. */
const WIDE = [
  {w: 1172, health: {x: 961, y: 376}, dir: {x: .38 * 375, y: -30}, wealth: {x: 719, y: 208}},
  {w: 1188, health: {x: 969, y: 420}, dir: {x: .38 * 375, y: -30}, wealth: {x: 753, y: 224}},
  {w: 782, health: {x: 612, y: 326}, dir: {x: .38 * 221, y: -30}, wealth: {x: 492, y: 175}},
  {w: 716, health: {x: 557, y: 326}, dir: {x: .38 * 199, y: -30}, wealth: {x: 459, y: 175}},
];
/** Phones: the stage's width, the foot of the line under Health and its tangent, the steps' foot + 12, the word's end. */
const PHONE = [
  {w: 358, foot: {x: 38, y: 498}, dir: {x: 10, y: 20}, below: 506, wealth: {x: 271, y: 145}},
  {w: 288, foot: {x: 38, y: 517}, dir: {x: 10, y: 20}, below: 526, wealth: {x: 220, y: 125}},
];

describe('the footer ribbon (Session AG Polish 3, owner Part 6)', () => {
  it('has no corners: every join shares one tangent (within 1°), and no turn is tighter than 40 px × width/390', () => {
    for (const c of WIDE) {
      const {segs} = wideArc(c.health, c.dir, c.wealth, c.w);
      for (let i = 1; i < segs.length; i++) expect(deg(tangentIn(segs[i - 1]!), tangentOut(segs[i]!)), `${c.w}: join ${i}`).toBeLessThan(1);
      expect(leastRadius(segs), `${c.w}: its tightest turn`).toBeGreaterThanOrEqual(footerMinRadius(c.w) - .5);
    }
    for (const c of PHONE) {
      const {segs} = phoneArc(c.foot, c.dir, c.below, c.wealth, c.w);
      for (let i = 1; i < segs.length; i++) expect(deg(tangentIn(segs[i - 1]!), tangentOut(segs[i]!)), `${c.w}: join ${i}`).toBeLessThan(1);
      expect(leastRadius(segs), `${c.w}: its tightest turn`).toBeGreaterThanOrEqual(footerMinRadius(c.w) - .5);
    }
  });
  it('wider screens: out of Health on the line\'s own tangent, a turn up inside the stage, over a crest above the word and down into its right end', () => {
    for (const c of WIDE) {
      const {segs, crest, r} = wideArc(c.health, c.dir, c.wealth, c.w), rb = ribbon(segs, RIBBON_WIDTH.wide, 10, crest, r);
      expect(rb.samples[0]).toEqual(c.health);
      expect(deg(tangentOut(segs[0]!), c.dir), `${c.w}: continues the line into Health`).toBeLessThan(1);
      const end = segs.at(-1)![3];
      expect(Math.hypot(end.x - c.wealth.x, end.y - c.wealth.y), `${c.w}: ends at the word`).toBeLessThan(.5);
      expect(tangentIn(segs.at(-1)!).x, `${c.w}: comes into the word from the right`).toBeLessThan(0);
      expect(tangentIn(segs.at(-1)!).y, `${c.w}: …downward`).toBeGreaterThanOrEqual(0);
      // (The crest: above the word, and the highest point of the ribbon.)
      expect(crest.y).toBeLessThan(c.wealth.y - 12);
      expect(Math.abs(rb.top - crest.y)).toBeLessThan(1);
      const turn = rb.samples[rb.split]!;
      expect(turn.x, `${c.w}: on past Health's node (43 px) before it turns`).toBeGreaterThan(c.health.x + 43 + 24);
      expect(Math.max(...rb.samples.map(p => p.x)) + 3).toBeLessThanOrEqual(c.w);
      expect(rb.end.x).toBeLessThan(turn.x);
    }
  });
  it('phones: from the foot of the line under Health, beneath the steps, up the right edge and down into the word, inside the stage', () => {
    for (const c of PHONE) {
      const {segs, crest, r} = phoneArc(c.foot, c.dir, c.below, c.wealth, c.w), rb = ribbon(segs, RIBBON_WIDTH.phone, 10, crest, r);
      expect(rb.samples[0]).toEqual(c.foot);
      expect(deg(tangentOut(segs[0]!), c.dir)).toBeLessThan(1);
      for (const p of rb.samples) { expect(p.x).toBeGreaterThanOrEqual(6); expect(p.x + 2.1).toBeLessThanOrEqual(c.w - 3); }
      expect(Math.max(...rb.samples.map(p => p.y))).toBeGreaterThanOrEqual(c.below);
      expect(Math.max(...rb.samples.map(p => p.x))).toBeGreaterThan(c.w - 12);
      const end = segs.at(-1)![3];
      expect(Math.hypot(end.x - c.wealth.x, end.y - c.wealth.y)).toBeLessThan(.5);
      expect(crest.y).toBeLessThan(c.wealth.y);
      expect(Math.max(...rb.widths)).toBeLessThanOrEqual(4.21);
    }
  });
  it('its colour follows its way: magenta into pink to the turn, pink until just before the crest, then warm gold into the word', () => {
    for (const c of WIDE) {
      const {segs, crest, r} = wideArc(c.health, c.dir, c.wealth, c.w), rb = ribbon(segs, RIBBON_WIDTH.wide, 10, crest, r), [rise, back] = rb.paint;
      expect(rise.stops).toEqual([[0, RIBBON_COLOURS.magenta], [1, RIBBON_COLOURS.pink]]);
      expect(back.stops.map(s => s[1])).toEqual([RIBBON_COLOURS.pink, RIBBON_COLOURS.pink, RIBBON_COLOURS.gold, RIBBON_COLOURS.gold]);
      // (Along the way back, x runs from the turn to the word: where pink ends and gold is full, in px.)
      const xAt = (o: number) => back.x1 + (back.x2 - back.x1) * o, pinkTo = xAt(back.stops[1]![0]), goldFrom = xAt(back.stops[2]![0]);
      expect(pinkTo, `${c.w}: pink up to just before the crest`).toBeGreaterThan(crest.x);
      expect(pinkTo - crest.x, `${c.w}: …just before`).toBeLessThanOrEqual(r * .3);
      expect(goldFrom, `${c.w}: gold from just after the crest`).toBeLessThan(crest.x);
      expect(goldFrom).toBeGreaterThan(rb.end.x);
      expect(back.x1).toBeGreaterThan(back.x2);
    }
  });
  it('is a closed, tapered ribbon: thin at Health (1.5 px), about 6 px across the middle, 2 px at the word; its two pieces share the point where they meet', () => {
    expect(widthAt(0, RIBBON_WIDTH.wide)).toBeCloseTo(1.5, 6);
    expect(widthAt(1, RIBBON_WIDTH.wide)).toBeCloseTo(2, 6);
    const c = WIDE[0]!, {segs, crest, r} = wideArc(c.health, c.dir, c.wealth, c.w), rb = ribbon(segs, RIBBON_WIDTH.wide, 10, crest, r);
    expect(Math.max(...rb.widths)).toBeGreaterThan(5.5); expect(Math.max(...rb.widths)).toBeLessThanOrEqual(6.01);
    expect(rb.samples).toHaveLength(SAMPLES + 1);
    for (const piece of rb.pieces) { expect(piece.startsWith('M')).toBe(true); expect(piece.endsWith(' Z')).toBe(true); }
    const [a, b] = rb.pieces.map(points), n = rb.split + 1;
    expect(a![n - 1]).toEqual(b![0]);
    rb.pieces.forEach((d, i) => { const box = rb.boxes[i]!; for (const p of points(d)) { expect(p.x).toBeGreaterThanOrEqual(box.l); expect(p.x).toBeLessThanOrEqual(box.l + box.w); expect(p.y).toBeGreaterThanOrEqual(box.t); expect(p.y).toBeLessThanOrEqual(box.t + box.h); } });
    // (Samples at even steps along the way: no bunching at a straight run.)
    const steps = rb.samples.slice(1).map((p, i) => Math.hypot(p.x - rb.samples[i]!.x, p.y - rb.samples[i]!.y));
    expect(Math.max(...steps) / Math.min(...steps)).toBeLessThan(1.6);
    void at;
  });
});
