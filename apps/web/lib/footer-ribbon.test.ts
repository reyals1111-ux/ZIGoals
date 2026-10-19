import {describe, expect, it} from 'vitest';
import {RIBBON_WIDTH, SAMPLES, phoneAnchors, ribbon, spline, wideAnchors, widthAt} from './footer-ribbon';

// Session AF (L5a, Part 10.8): the footer finale's ribbon from Health into "= Wealth".
const points = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => ({x: Number(m[1]), y: Number(m[2])}));

describe('the footer ribbon', () => {
  it('is one smooth curve through its anchors (Catmull-Rom pieces that meet with one tangent)', () => {
    const anchors = wideAnchors({x: 980, y: 455}, {x: 740, y: 290}, 1224), segs = spline(anchors);
    expect(segs).toHaveLength(anchors.length - 1);
    segs.forEach((s, i) => { expect(s[0]).toEqual(anchors[i]); expect(s[3]).toEqual(anchors[i + 1]); });
    for (let i = 1; i < segs.length; i++) { const a = segs[i - 1]!, b = segs[i]!; const t1 = Math.atan2(a[3].y - a[2].y, a[3].x - a[2].x), t2 = Math.atan2(b[1].y - b[0].y, b[1].x - b[0].x); expect(Math.abs(t1 - t2)).toBeLessThan(1e-9); }
  });
  it('on wider screens runs on past Health, turns at its rightmost point and comes back into the word’s right end', () => {
    const last = {x: 980, y: 455}, wealth = {x: 740, y: 290}, r = ribbon(wideAnchors(last, wealth, 1224), RIBBON_WIDTH.wide);
    expect(r.samples[0]).toEqual(last);
    expect(r.end.x).toBeCloseTo(wealth.x, 6); expect(r.end.y).toBeCloseTo(wealth.y, 6);
    const turn = r.samples[r.split]!;
    expect(turn.x).toBeGreaterThan(last.x + 100);
    expect(turn.x).toBeLessThanOrEqual(1224 - 16 + 0.5);
    expect(r.top).toBeLessThan(wealth.y); // over the word, then down into it
    // Each piece is revealed by a sliding box: the first only moves on to the right overall, the second back left.
    expect(r.samples[r.split]!.x).toBeGreaterThan(r.samples[0]!.x);
    expect(r.end.x).toBeLessThan(r.samples[r.split]!.x);
  });
  it('is a closed, tapered ribbon: thin at Health (1.5 px), about 6 px across the middle, 2 px at the word', () => {
    expect(widthAt(0, RIBBON_WIDTH.wide)).toBeCloseTo(1.5, 6);
    expect(widthAt(1, RIBBON_WIDTH.wide)).toBeCloseTo(2, 6);
    const r = ribbon(wideAnchors({x: 980, y: 455}, {x: 740, y: 290}, 1224), RIBBON_WIDTH.wide);
    expect(Math.max(...r.widths)).toBeGreaterThan(5.5); expect(Math.max(...r.widths)).toBeLessThanOrEqual(6.01);
    expect(Math.min(...r.widths)).toBeGreaterThanOrEqual(1.5 - 1e-9);
    expect(r.samples).toHaveLength(SAMPLES + 1);
    for (const piece of r.pieces) { expect(piece.startsWith('M')).toBe(true); expect(piece.endsWith(' Z')).toBe(true); }
  });
  it('its two pieces share the point where they meet, so no seam shows', () => {
    const r = ribbon(wideAnchors({x: 980, y: 455}, {x: 740, y: 290}, 1224), RIBBON_WIDTH.wide), [a, b] = r.pieces.map(points);
    const n = r.split + 1; // samples in the first piece; its left side is the first n points
    expect(a![n - 1]).toEqual(b![0]);
    // and the boxes the finale slides hold their whole piece (with room for the glow)
    r.pieces.forEach((d, i) => { const box = r.boxes[i]!; for (const p of points(d)) { expect(p.x).toBeGreaterThanOrEqual(box.l); expect(p.x).toBeLessThanOrEqual(box.l + box.w); expect(p.y).toBeGreaterThanOrEqual(box.t); expect(p.y).toBeLessThanOrEqual(box.t + box.h); } });
  });
  it('on phones runs beneath the steps, up the right edge and into the word, inside the stage at 320 and 390 px', () => {
    for (const w of [320, 390]) {
      const foot = {x: 55, y: 521}, wealth = {x: w * 0.72, y: 177}, r = ribbon(phoneAnchors(foot, 520, wealth, w), RIBBON_WIDTH.phone, 10, w - 6);
      for (const p of r.samples) { expect(p.x).toBeGreaterThanOrEqual(12); expect(p.x + 2.1).toBeLessThanOrEqual(w - 3); }
      expect(Math.max(...r.samples.map(p => p.y))).toBeGreaterThanOrEqual(520); // beneath the steps
      expect(r.end.x).toBeCloseTo(wealth.x, 6);
      expect(Math.max(...r.widths)).toBeLessThanOrEqual(4.21);
    }
  });
});
