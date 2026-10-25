import {describe, expect, it} from 'vitest';
import {RIBBON_COLOURS, RIBBON_WIDTH, RIVER_RULES, SAMPLES, STEPS_COLOURS, STEPS_STROKE, at, footerMinRadius, phoneArc, ribbon, riverFaults, stepsPaint, wideRiver, widthAt, type Seg} from './footer-ribbon';

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
// (Session AG Polish 3, owner addition after the 10d OK: with the bright star's place and the bottom of the "Goals · Habits ·
// Health" line, measured at 1440 × 900, 1920 × 1080, 1280 × 720, 1024 × 800 and 768 × 1024.)
const WIDE = [
  {w: 1172, health: {x: 961, y: 376}, dir: {x: .38 * 375, y: -30}, wealth: {x: 719, y: 208}, star: {x: 1029, y: 111}, ceiling: 170},
  {w: 1188, health: {x: 969, y: 420}, dir: {x: .38 * 375, y: -30}, wealth: {x: 753, y: 224}, star: {x: 1211, y: 155}, ceiling: 178},
  {w: 1012, health: {x: 851, y: 354}, dir: {x: .38 * 345, y: -30}, wealth: {x: 622, y: 197}, star: {x: 891, y: 97}, ceiling: 164},
  {w: 782, health: {x: 612, y: 326}, dir: {x: .38 * 221, y: -30}, wealth: {x: 492, y: 175}, star: {x: 693, y: 71}, ceiling: 146},
  {w: 716, health: {x: 557, y: 326}, dir: {x: .38 * 199, y: -30}, wealth: {x: 459, y: 175}, star: {x: 636, y: 65}, ceiling: 146},
];
const river = (c: typeof WIDE[number]) => wideRiver(c.health, c.dir, c.wealth, c.w, {star: c.star, ceiling: c.ceiling});
/** Phones: the stage's width, the foot of the line under Health and its tangent, the steps' foot + 12, the word's end. */
const PHONE = [
  {w: 358, foot: {x: 38, y: 498}, dir: {x: 10, y: 20}, below: 506, wealth: {x: 271, y: 145}},
  {w: 288, foot: {x: 38, y: 517}, dir: {x: 10, y: 20}, below: 526, wealth: {x: 220, y: 125}},
];

describe('the footer ribbon (Session AG Polish 3, owner Part 6)', () => {
  it('phones: no corners — every join shares one tangent (within 1°), and no turn is tighter than 40 px × width/390', () => {
    for (const c of PHONE) {
      const {segs} = phoneArc(c.foot, c.dir, c.below, c.wealth, c.w);
      for (let i = 1; i < segs.length; i++) expect(deg(tangentIn(segs[i - 1]!), tangentOut(segs[i]!)), `${c.w}: join ${i}`).toBeLessThan(1);
      expect(leastRadius(segs), `${c.w}: its tightest turn`).toBeGreaterThanOrEqual(footerMinRadius(c.w) - .5);
    }
  });
  // Session AG Polish 3 (ADR-032 L27; owner addition after the 10d OK, references 07 and 08), moved deliberately: the
  // computer's line is no longer one loop out to the right over a crest (07) but a river with soft curls (08).
  it('computers: a free-flowing river — out of Health on the steps\' tangent, past Health to the right, up and to the left in soft curls, into the right end of "= Wealth"; C1 joins, no bend under 30 px, no bump under 14 px, never crossing itself, 120 px from the bright star, never above the "Goals · Habits · Health" line', () => {
    for (const c of WIDE) {
      const {segs, faults} = river(c);
      expect(faults, `${c.w}: the owner's river rules`).toEqual([]);
      expect(riverFaults(segs, c.w, {star: c.star, ceiling: c.ceiling})).toEqual([]);
      for (let i = 1; i < segs.length; i++) expect(deg(tangentIn(segs[i - 1]!), tangentOut(segs[i]!)), `${c.w}: join ${i}`).toBeLessThan(RIVER_RULES.join);
      expect(leastRadius(segs), `${c.w}: its tightest bend`).toBeGreaterThanOrEqual(RIVER_RULES.radius - .01);
      expect(segs[0]![0]).toEqual(c.health);
      expect(deg(tangentOut(segs[0]!), c.dir), `${c.w}: continues the steps' line out of Health`).toBeLessThan(1);
      const end = segs.at(-1)![3];
      expect(Math.hypot(end.x - c.wealth.x, end.y - c.wealth.y), `${c.w}: ends at the word`).toBeLessThan(.5);
      expect(tangentIn(segs.at(-1)!).x, `${c.w}: comes into the word from the right`).toBeLessThan(0);
      const xs = segs.flatMap(sg => Array.from({length: 17}, (_, k) => at(sg, k / 16)));
      expect(Math.max(...xs.map(p => p.x)), `${c.w}: past Health's node (43 px) to the right first`).toBeGreaterThan(c.health.x + 43 + 20);
      expect(Math.min(...xs.map(p => Math.hypot(p.x - c.star.x, p.y - c.star.y))), `${c.w}: clear of the star`).toBeGreaterThanOrEqual(RIVER_RULES.star);
      expect(Math.min(...xs.map(p => p.y)), `${c.w}: never above the slogan's line`).toBeGreaterThanOrEqual(c.ceiling - .5);
      // (Its curls: from 1012 px the way bends left, right and left again — two curls; narrower stages have room for one.)
      const turns = segs.map(sg => { const a = tangentOut(sg), b = tangentIn(sg); return Math.sign(a.x * b.y - a.y * b.x); }).filter(Boolean);
      const bends = 1 + turns.slice(1).filter((t, k) => t !== turns[k]).length;
      expect(bends, `${c.w}: soft curls`).toBeGreaterThanOrEqual(c.w >= 1000 ? 3 : 1);
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
  it('its colour follows its way: magenta from Health into pink, pink all the way to the last stretch, gold only there into the word', () => {
    for (const c of WIDE) {
      const r = river(c), rb = ribbon(r.segs, RIBBON_WIDTH.wide, 10, null, 0, r.goldFrom), [rise, back] = rb.paint;
      expect(rise.stops).toEqual([[0, RIBBON_COLOURS.magenta], [1, RIBBON_COLOURS.pink]]);
      expect(back.stops.map(s => s[1])).toEqual([RIBBON_COLOURS.pink, RIBBON_COLOURS.pink, RIBBON_COLOURS.gold, RIBBON_COLOURS.gold]);
      // (Along the way back, x runs from the turn to the word: pink up to the last stretch, gold full before the word.)
      const xAt = (o: number) => back.x1 + (back.x2 - back.x1) * o, pinkTo = xAt(back.stops[1]![0]), goldAt = xAt(back.stops[2]![0]);
      expect(Math.abs(pinkTo - r.goldFrom), `${c.w}: pink up to the last stretch`).toBeLessThan(1);
      expect(goldAt, `${c.w}: gold in the last stretch`).toBeLessThan(r.goldFrom);
      expect(goldAt).toBeGreaterThan(rb.end.x);
      expect(back.x1).toBeGreaterThan(back.x2);
    }
  });
  it('phones (owner addition, ref 09 pointer 1): the line from the steps flows into the frame — same place, same tangent, same width, the same magenta at the join, pink at Health', () => {
    for (const c of PHONE) {
      // (The stacked steps as the page lays them out: Goals, Habits, Health above the foot of the line.)
      const nodes = [{x: c.foot.x, y: c.foot.y - 56 - 2 * 128}, {x: c.foot.x, y: c.foot.y - 56 - 128}, {x: c.foot.x, y: c.foot.y - 56}];
      const tail: Seg = [nodes[2]!, {x: nodes[2]!.x + 10, y: nodes[2]!.y + 20}, {x: c.foot.x - 10, y: c.foot.y - 20}, c.foot];
      const {segs, crest, r} = phoneArc(c.foot, tangentIn(tail), c.below, c.wealth, c.w), rb = ribbon(segs, RIBBON_WIDTH.phone, 10, crest, r);
      expect(Math.hypot(segs[0]![0].x - tail[3].x, segs[0]![0].y - tail[3].y), 'the same place').toBeLessThanOrEqual(.5);
      expect(deg(tangentIn(tail), tangentOut(segs[0]!)), 'the same tangent').toBeLessThan(1);
      expect(rb.widths[0], 'the same width').toBeCloseTo(STEPS_STROKE, 6);
      const paint = stepsPaint(nodes, c.foot, true, c.w), at1 = paint.stops.find(st => st[0] === 1)![1];
      expect(paint.y2, 'the line\'s colour runs down the stacked steps to the foot').toBe(c.foot.y);
      expect(at1, 'the line ends in the frame\'s magenta').toBe(rb.paint[0].stops[0]![1]);
      expect(at1).toBe(RIBBON_COLOURS.magenta);
      const healthStop = paint.stops.find(st => Math.abs(st[0] - (nodes[2]!.y - nodes[0]!.y) / (c.foot.y - nodes[0]!.y)) < 1e-9);
      expect(healthStop?.[1], 'Health in its pink').toBe(STEPS_COLOURS[2]);
    }
    // (Computers keep the line's colour across the stage.)
    expect(stepsPaint([], {x: 0, y: 0}, false, 1000)).toEqual({x1: 0, y1: 0, x2: 1000, y2: 0, stops: [[0, '#9273ff'], [.45, '#23eaff'], [.8, '#ff74be'], [1, '#f06dff']]});
  });
  it('is a closed, tapered ribbon: thin at Health (1.5 px), about 6 px across the middle, 2 px at the word; its two pieces share the point where they meet', () => {
    expect(widthAt(0, RIBBON_WIDTH.wide)).toBeCloseTo(1.5, 6);
    expect(widthAt(1, RIBBON_WIDTH.wide)).toBeCloseTo(2, 6);
    const c = WIDE[0]!, rv = river(c), rb = ribbon(rv.segs, RIBBON_WIDTH.wide, 10, null, 0, rv.goldFrom);
    expect(Math.max(...rb.widths)).toBeGreaterThan(5.5); expect(Math.max(...rb.widths)).toBeLessThanOrEqual(6.01);
    expect(rb.samples).toHaveLength(SAMPLES + 1);
    for (const piece of rb.pieces) { expect(piece.startsWith('M')).toBe(true); expect(piece.endsWith(' Z')).toBe(true); }
    const [a, b] = rb.pieces.map(points), n = rb.split + 1;
    expect(a![n - 1]).toEqual(b![0]);
    rb.pieces.forEach((d, i) => { const box = rb.boxes[i]!; for (const p of points(d)) { expect(p.x).toBeGreaterThanOrEqual(box.l); expect(p.x).toBeLessThanOrEqual(box.l + box.w); expect(p.y).toBeGreaterThanOrEqual(box.t); expect(p.y).toBeLessThanOrEqual(box.t + box.h); } });
    // (Samples at even steps along the way: no bunching at a straight run.)
    const steps = rb.samples.slice(1).map((p, i) => Math.hypot(p.x - rb.samples[i]!.x, p.y - rb.samples[i]!.y));
    expect(Math.max(...steps) / Math.min(...steps)).toBeLessThan(1.6);
  });
});
