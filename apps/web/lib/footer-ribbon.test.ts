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
// Health" line, measured at 1440 × 900, 1920 × 1080, 1280 × 720, 1024 × 800, 768 × 1024, 1366 × 768 and 1536 × 864.)
const WIDE = [
  {w: 1172, health: {x: 961, y: 376}, dir: {x: .38 * 375, y: -30}, wealth: {x: 719, y: 208}, star: {x: 1029, y: 111}, ceiling: 170, tagline: {l: 412, r: 760, t: 250, b: 272}, floor: 427},
  {w: 1188, health: {x: 969, y: 420}, dir: {x: .38 * 375, y: -30}, wealth: {x: 753, y: 224}, star: {x: 1211, y: 155}, ceiling: 178, tagline: {l: 420, r: 768, t: 272, b: 293}, floor: 471},
  {w: 1012, health: {x: 851, y: 354}, dir: {x: .38 * 345, y: -30}, wealth: {x: 622, y: 197}, star: {x: 891, y: 97}, ceiling: 164, tagline: {l: 332, r: 680, t: 236, b: 258}, floor: 405},
  {w: 782, health: {x: 612, y: 326}, dir: {x: .38 * 221, y: -30}, wealth: {x: 492, y: 175}, star: {x: 693, y: 71}, ceiling: 146, tagline: {l: 217, r: 565, t: 210, b: 231}, floor: 377},
  {w: 716, health: {x: 557, y: 326}, dir: {x: .38 * 199, y: -30}, wealth: {x: 459, y: 175}, star: {x: 636, y: 65}, ceiling: 146, tagline: {l: 184, r: 532, t: 210, b: 231}, floor: 377},
  // (Owner footer fix, L28: also 1366 × 768 and 1536 × 864, between the stages above.)
  {w: 1098, health: {x: 923, y: 366}, dir: {x: .38 * 360, y: -30}, wealth: {x: 674, y: 203}, star: {x: 965, y: 105}, ceiling: 167, tagline: {l: 375, r: 723, t: 244, b: 265}, floor: 417},
  {w: 1188, health: {x: 969, y: 389}, dir: {x: .38 * 375, y: -30}, wealth: {x: 737, y: 214}, star: {x: 1072, y: 120}, ceiling: 173, tagline: {l: 420, r: 768, t: 258, b: 280}, floor: 440},
];
const room = (c: typeof WIDE[number]) => ({star: c.star, ceiling: c.ceiling, tagline: c.tagline, floor: c.floor});
const river = (c: typeof WIDE[number]) => wideRiver(c.health, c.dir, c.wealth, c.w, room(c));
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
  // Session AG Polish 3 (ADR-032 L27, L28; owner footer fix after the 10d OK, reference 08), moved deliberately: the
  // computer's line is no longer one loop out to the right over a crest (07), nor two generic curves, but a river flowing
  // out of "= Wealth" down to Health, its bends growing.
  it('computers: a river out of "= Wealth" down to Health — three bends alternating sides, growing bend by bend; one C2 spline; no flat run over 60 px, no bump under 14 px, never crossing itself; inside its bounds; from the word\'s end, into Health on the steps\' tangent', () => {
    for (const c of WIDE) {
      const {segs, bends, faults} = river(c);
      expect(faults, `${c.w}: the owner's rules`).toEqual([]);
      // (Bends of 30 px or more where the stage allows — every computer window from 1280 px; 12 px or more on the 1024
      // and 768 px windows, where Health stands close under the word: L28.)
      expect(riverFaults(segs, c.w, room(c), {radius: c.w >= 1000 ? RIVER_RULES.radius : RIVER_RULES.narrowRadius}), `${c.w}: bends, flats, bumps, crossings, bounds`).toEqual([]);
      expect(bends[0]!, `${c.w}: the bends grow`).toBeLessThan(bends[1]!); expect(bends[1]!).toBeLessThan(bends[2]!);
      if (c.w >= 1100) { expect(bends[0]!).toBeGreaterThanOrEqual(19); expect(bends[0]!).toBeLessThanOrEqual(31); expect(bends[1]!).toBeGreaterThanOrEqual(44); expect(bends[1]!).toBeLessThanOrEqual(61); expect(bends[2]!).toBeGreaterThanOrEqual(74); expect(bends[2]!).toBeLessThanOrEqual(96); }
      // (C2: at every join one tangent and one curvature.)
      const curvature = (sg: Seg, t: number) => { const u = 1 - t, v = {x: 3 * u * u * (sg[1].x - sg[0].x) + 6 * u * t * (sg[2].x - sg[1].x) + 3 * t * t * (sg[3].x - sg[2].x), y: 3 * u * u * (sg[1].y - sg[0].y) + 6 * u * t * (sg[2].y - sg[1].y) + 3 * t * t * (sg[3].y - sg[2].y)}, a = {x: 6 * u * (sg[2].x - 2 * sg[1].x + sg[0].x) + 6 * t * (sg[3].x - 2 * sg[2].x + sg[1].x), y: 6 * u * (sg[2].y - 2 * sg[1].y + sg[0].y) + 6 * t * (sg[3].y - 2 * sg[2].y + sg[1].y)}; return (v.x * a.y - v.y * a.x) / Math.hypot(v.x, v.y) ** 3; };
      for (let i = 1; i < segs.length; i++) {
        expect(deg(tangentIn(segs[i - 1]!), tangentOut(segs[i]!)), `${c.w}: join ${i}, one tangent`).toBeLessThan(RIVER_RULES.join);
        expect(Math.abs(curvature(segs[i - 1]!, 1) - curvature(segs[i]!, 0)), `${c.w}: join ${i}, one curvature`).toBeLessThan(2e-3);
      }
      // (From Health on the steps' tangent — the river comes into Health continuing the steps' line — to the word's end.)
      expect(segs[0]![0]).toEqual(c.health);
      expect(deg(tangentOut(segs[0]!), c.dir), `${c.w}: tangent-continuous at Health`).toBeLessThan(1);
      const end = segs.at(-1)![3];
      expect(Math.hypot(end.x - c.wealth.x, end.y - c.wealth.y), `${c.w}: starts at the end of "= Wealth"`).toBeLessThan(.5);
      const xs = segs.flatMap(sg => Array.from({length: 17}, (_, k) => at(sg, k / 16)));
      expect(Math.max(...xs.map(p => p.x)), `${c.w}: past Health's ring on its upper right`).toBeGreaterThan(c.health.x + 43);
      expect(Math.min(...xs.map(p => Math.hypot(p.x - c.star.x, p.y - c.star.y))), `${c.w}: clear of the star`).toBeGreaterThanOrEqual(RIVER_RULES.star);
      expect(Math.min(...xs.map(p => p.y)), `${c.w}: below the slogan's line`).toBeGreaterThanOrEqual(c.ceiling - .5);
      expect(Math.max(...xs.map(p => p.y)), `${c.w}: above the step labels`).toBeLessThanOrEqual(c.floor);
      expect(xs.filter(p => p.y >= c.tagline.t && p.y <= c.tagline.b && p.x > c.tagline.l && p.x < c.tagline.r + 30), `${c.w}: 30 px right of the tagline`).toEqual([]);
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
  it('its colour: gold only in the first stretch out of "= Wealth", fading into pink, then magenta and pink into Health', () => {
    for (const c of WIDE) {
      const r = river(c), rb = ribbon(r.segs, RIBBON_WIDTH.wide, 10, null, 0, r.goldFrom), [rise, back] = rb.paint;
      expect(rise.stops).toEqual([[0, RIBBON_COLOURS.magenta], [1, RIBBON_COLOURS.pink]]);
      expect(back.stops.map(s => s[1])).toEqual([RIBBON_COLOURS.pink, RIBBON_COLOURS.pink, RIBBON_COLOURS.gold, RIBBON_COLOURS.gold]);
      // (Along the way back, x runs from the turn to the word: pink up to the last stretch, gold full before the word.)
      const xAt = (o: number) => back.x1 + (back.x2 - back.x1) * o, pinkTo = xAt(back.stops[1]![0]), goldAt = xAt(back.stops[2]![0]);
      expect(Math.abs(pinkTo - r.goldFrom), `${c.w}: pink up to the end of the first bend`).toBeLessThan(1);
      expect(goldAt, `${c.w}: gold only in the first stretch out of the word`).toBeLessThan(r.goldFrom);
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
