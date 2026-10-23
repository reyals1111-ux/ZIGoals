import {describe, expect, test} from 'vitest';
import {seeded, type FlowBox, type FlowNode, type FlowSegment} from './flow-geometry';
import {phoneRiver, RIVER, riverMinRadius, type RiverLayout} from './phone-river';
import {deg, read, rule1, rule2, rule3, type Drawn} from './river-rules.test-helper';

/**
 * Session AG Polish 3 (ADR-032; owner Part 1.7 and amendment 6): the phone's river, checked as a property over 240 seeded
 * paths — 1 to 12 nodes per orbit, 1 to 4 orbits, names of 3 to 40 characters, phones 320, 360, 390 and 430 px wide — with
 * the test's own geometry (it reads the drawn path data and the node centres, never the module's own measures). The owner's
 * rules are checked per stretch and per window (lib/path/river-rules.test-helper.ts), and the session's own wrong preview
 * (reference 06: four nodes stacked down the left, a near-vertical line) is shown to fail them.
 */
type Pt = {x: number; y: number};
/** A stage is the screen less the shell's 2 × 12 px; a planet's sphere is 84–100 px (`clamp(88px, 26cqi, 100px)`, 84 under 360). */
const PHONES = [{vw: 320, w: 296, pr: 42}, {vw: 360, w: 336, pr: 44}, {vw: 390, w: 366, pr: 47.6}, {vw: 430, w: 406, pr: 50}] as const;
/** The first screen, in the stage's coordinates: from the first banner's foot to the timer row's top (measured: the stage
 *  starts 69 px down at 390 × 844 and 71 px at 360 × 780; the timer row is the last 64 px). */
const FIRST_VIEW = {390: {h: 844, top: 69}, 360: {h: 780, top: 71}} as const;
const WORDS = ['Water', 'Read', 'Walk', 'Stretch', 'Journal', 'Meditate', 'Exercise', 'Vitamins', 'Piano', 'Spanish', 'Sleep', 'Breathe', 'Cold', 'shower', 'ten', 'pages', 'before', 'bed', 'steps', 'minutes', 'Learn', 'Save', 'for', 'the', 'trip', 'No', 'sugar'];
/** A name of 3–40 characters, and its tab's one-line width: about 8 px a character at 14 px bold, plus the tab's 47 px. */
function nameOf(r: () => number): string {
  const len = 3 + Math.floor(r() ** 1.6 * 38); let s = '';
  while (s.length < len) s += (s ? ' ' : '') + WORDS[Math.floor(r() * WORDS.length)];
  return s.slice(0, len).trim().padEnd(3, 'x');
}
const tabOf = (name: string) => Math.ceil(name.length * 7.9) + 47;
type Case = {seed: string; orbits: number[]; names: string[]; phone: typeof PHONES[number]};
function cases(): Case[] {
  const out: Case[] = [];
  for (let i = 0; i < 240; i++) {
    const r = seeded(`river-case|${i}`), k = 1 + Math.floor(r() * 4), orbits = Array.from({length: k}, () => 1 + Math.floor(r() * 12));
    const names = orbits.flatMap(c => Array.from({length: c}, () => nameOf(r)));
    out.push({seed: `path-${i}`, orbits, names, phone: PHONES[i % 4]!});
  }
  return out;
}
/** The first screen where the test measures it (390 × 844 and 360 × 780), passed as the page passes it. */
const viewOf = (phone: typeof PHONES[number]) => phone.vw === 390 || phone.vw === 360 ? {top: RIVER.stageTop + 2 * phone.pr + RIVER.bannerPad, bottom: FIRST_VIEW[phone.vw].h - 64 - FIRST_VIEW[phone.vw].top} : undefined;
const lay = (c: Case, phone = c.phone) => phoneRiver({w: phone.w, vw: phone.vw, seed: c.seed, tabs: c.names.map(tabOf), orbits: c.orbits, planetR: phone.pr, zigi: Math.min(92, phone.vw * .26) * .838, ...(viewOf(phone) ? {view: viewOf(phone)} : {})});
const drawn = (l: RiverLayout, phone: typeof PHONES[number]): Drawn => ({w: phone.w, vw: phone.vw, nodes: l.nodes, boxes: l.boxes, segments: l.segments});
const boxDist = (p: Pt, q: FlowBox) => { const dx = Math.max(q.left - p.x, 0, p.x - q.right), dy = Math.max(q.top - p.y, 0, p.y - q.bottom); return dx || dy ? Math.hypot(dx, dy) : -Math.min(p.x - q.left, q.right - p.x, p.y - q.top, q.bottom - p.y); };
const isNode = (n: FlowNode) => (n.inSide === 'left' || n.inSide === 'right') && !n.upright;

describe('the owner\'s rules catch the wrong preview (reference 06)', () => {
  // The session's preview at 390 px (stage coordinates): the planet at the right, then four nodes down the left side
  // (x ≈ 15–30 % of the width, the last at 66 %), joined by a near-vertical wiggle (single cubics straight down and across).
  const w = 366, at = (id: string, x: number, y: number): FlowNode => ({id, x, y, r: 31, inSide: 'right', outSide: 'left', colour: '#23eaff', done: false});
  const planet: FlowNode = {id: 'planet:morning', x: 314.4, y: 54.6, r: 47.6, inSide: 'top', outSide: 'bottom', colour: '#23eaff', done: false};
  const nodes = [planet, at('a', 97, 225), at('b', 43, 337), at('c', 94, 466), at('d', 242, 653)];
  const line = (a: Pt, b: Pt, id: string, from: string, to: string): FlowSegment => ({id, from, to, kind: 'step', d: `M${a.x} ${a.y} C${a.x} ${a.y + (b.y - a.y) * .5} ${b.x} ${b.y - (b.y - a.y) * .5} ${b.x} ${b.y}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, fromColour: '', toColour: '', fromLit: false, toLit: false});
  const segments = [line({x: 314.4, y: 102.2}, {x: 110, y: 197}, 'planet:morning>a', 'planet:morning', 'a'), line({x: 90, y: 255}, {x: 50, y: 307}, 'a>b', 'a', 'b'), line({x: 50, y: 367}, {x: 88, y: 436}, 'b>c', 'b', 'c'), line({x: 108, y: 493}, {x: 225, y: 627}, 'c>d', 'c', 'd')];
  const d: Drawn = {w, vw: 390, nodes, boxes: [], segments};
  test('rule 1 (each stretch a sideways S of 30 % or more, through a waypoint) fails', () => {
    const fails = rule1(d);
    expect(fails.some(f => /not two through a waypoint/.test(f))).toBe(true);
    expect(fails.some(f => /a>b: swings .* under 30 %/.test(f))).toBe(true);
  });
  test('rule 2 (stations alternate across the width) fails: three in the left half', () => {
    expect(rule2(d).some(f => /three in one half/.test(f))).toBe(true);
  });
  test('rule 3 (the first screen swings across and back at least twice) fails', () => {
    expect(rule3(d, 0, 711).some(f => /turns back across [01] time/.test(f))).toBe(true);
  });
});

describe('the phone\'s river (Session AG Polish 3, ADR-032; owner Part 1 and amendment 6)', () => {
  const all = cases().map(c => ({c, l: lay(c)}));
  test('rule 1, per stretch: two C1 cubics through a waypoint, a sideways swing of 30 % or more, bowing out beside its chord, alternating', () => {
    const fails = all.flatMap(({c, l}) => rule1(drawn(l, c.phone)).map(f => `${c.seed}@${c.phone.vw}: ${f}`));
    expect(fails.slice(0, 12)).toEqual([]);
  });
  test('rule 2, per window of three stations: never three in one half; the left third and the right third in every one', () => {
    const fails = all.flatMap(({c, l}) => rule2(drawn(l, c.phone)).map(f => `${c.seed}@${c.phone.vw}: ${f}`));
    expect(fails.slice(0, 12)).toEqual([]);
  });
  test('rule 3, the first screen at 390 × 844 (and 360 × 780): the line spans 65 % of the width, swings back across twice, stations on both sides', {timeout: 120_000}, () => {
    const fails: string[] = [];
    // (Paths whose first orbit has three nodes or more: a first orbit of one or two hands the screen to the next banner —
    // ADR-032 L11.)
    for (const {c} of all.filter(x => x.c.orbits[0]! >= 3)) for (const vw of [390, 360] as const) {
      const phone = PHONES.find(p => p.vw === vw)!, l = lay(c, phone), v = viewOf(phone)!;
      for (const f of rule3(drawn(l, phone), 0, v.bottom)) fails.push(`${c.seed}@${vw}: ${f}`);
    }
    expect(fails.slice(0, 12)).toEqual([]);
  });
  test('downward like a river: never climbing back up (≤ 2 px), so it never crosses itself', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      let low = -Infinity;
      for (const {s, pts} of read(l.segments)) for (const p of pts) { if (p.y < low - 2) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: up ${(low - p.y).toFixed(1)}`); low = Math.max(low, p.y); }
    }
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('no corners: no radius under 40 px × width / 390, and C1 through every waypoint', () => {
    const fails: string[] = [];
    for (const {c, l} of all) for (const {s, cs, minR} of read(l.segments)) {
      if (minR < riverMinRadius(c.phone.vw) - .5) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: radius ${minR.toFixed(1)}`);
      for (let q = 1; q < cs.length; q++) { const a = cs[q - 1]!, b = cs[q]!; const t1 = {x: a[3]!.x - a[2]!.x, y: a[3]!.y - a[2]!.y}, t2 = {x: b[1]!.x - b[0]!.x, y: b[1]!.y - b[0]!.y}; if (deg(t1, t2) > 1) fails.push(`${c.seed} ${s.id}: corner at its waypoint`); }
    }
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('it never crosses a name tab, a banner, a planet or another node, and stays inside the stage', {timeout: 60_000}, () => {
    const fails: string[] = [];
    for (const {c, l} of all) for (const {s, pts} of read(l.segments)) {
      const own = [s.from, s.to], near = (y: number) => (q: {top: number; bottom: number}) => q.bottom > y - 80 && q.top < y + 80;
      for (const [i, p] of pts.entries()) {
        if (p.x < 7 || p.x > c.phone.w - 7) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: outside at ${p.x.toFixed(1)}`);
        for (const q of l.boxes.filter(near(p.y))) { const d = boxDist(p, q); if (d < 3) fails.push(`${c.seed}@${c.phone.vw} ${s.id} over ${q.id} (${d.toFixed(1)})`); }
        for (const n of l.nodes) {
          if (Math.abs(n.y - p.y) > n.r + 10) continue;
          const d = Math.hypot(p.x - n.x, p.y - n.y);
          if (own.includes(n.id)) { if (i > 0 && i < pts.length - 1 && d < n.r - 1) fails.push(`${c.seed} ${s.id} back into ${n.id}`); }
          else if (d < n.r + 3) fails.push(`${c.seed}@${c.phone.vw} ${s.id} across ${n.id} (${(d - n.r).toFixed(1)})`);
        }
      }
    }
    expect([...new Set(fails)].slice(0, 12)).toEqual([]);
  });
  test('one stream through each node: it meets the ring and leaves it within 60° of the way it came', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      const r = read(l.segments);
      for (const n of l.nodes.filter(isNode)) {
        const into = r.find(x => x.s.to === n.id && x.s.kind !== 'tail'), out = r.find(x => x.s.from === n.id && x.s.kind !== 'lead');
        if (!into || !out) continue;
        const e = into.pts.at(-1)!, b = out.pts[0]!;
        if (Math.abs(Math.hypot(e.x - n.x, e.y - n.y) - n.r) >= 1) fails.push(`${c.seed} ${n.id}: does not end on the ring`);
        if (Math.abs(Math.hypot(b.x - n.x, b.y - n.y) - n.r) >= 1) fails.push(`${c.seed} ${n.id}: does not leave from the ring`);
        const turn = deg(into.end, out.start);
        if (turn > 60) fails.push(`${c.seed}@${c.phone.vw} ${n.id}: turns ${turn.toFixed(1)}°`);
      }
    }
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('planets keep top-in, bottom-out (straight down within 1°)', () => {
    for (const {c, l} of all) {
      const r = read(l.segments);
      for (const p of l.nodes.filter(x => x.id.startsWith('planet:'))) {
        const into = r.find(x => x.s.to === p.id), out = r.find(x => x.s.from === p.id);
        if (into) { expect(Math.hypot(into.pts.at(-1)!.x - p.x, into.pts.at(-1)!.y - (p.y - p.r)), `${c.seed} ${p.id} top`).toBeLessThan(.2); expect(deg(into.end, {x: 0, y: 1})).toBeLessThan(1); }
        if (out) { expect(Math.hypot(out.pts[0]!.x - p.x, out.pts[0]!.y - (p.y + p.r)), `${c.seed} ${p.id} bottom`).toBeLessThan(.2); expect(deg(out.start, {x: 0, y: 1})).toBeLessThan(1); }
      }
    }
  });
  test('the spaces between nodes vary: some close, some far, never one pitch', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      let i = 0;
      for (const count of c.orbits) {
        const ys = l.nodes.filter(isNode).slice(i, i + count).map(n => n.y); i += count;
        if (count < 5) continue;
        const gaps = ys.slice(1).map((y, k) => y - ys[k]!);
        if (Math.max(...gaps) - Math.min(...gaps) < 24) fails.push(`${c.seed}@${c.phone.vw}: spread ${Math.round(Math.max(...gaps) - Math.min(...gaps))}`);
      }
    }
    expect(fails).toEqual([]);
  });
  test('the first screen holds 3–4 whole nodes at 390 × 844 (3 rather than 4 where the swings need it); at 360 × 780 three in nearly every path, never under two', {timeout: 120_000}, () => {
    // (Where one of the first three names is longer than ~58 % of the stage its node must stand at an edge: those paths are
    // left out — ADR-032 L6.)
    let checked = 0, short = 0;
    const fails: string[] = [];
    for (const {c} of all.filter(x => x.c.orbits[0]! >= 3)) for (const vw of [390, 360] as const) {
      const phone = PHONES.find(p => p.vw === vw)!;
      if (c.names.slice(0, 3).some(nm => tabOf(nm) > phone.w * .58)) continue;
      const l = lay(c, phone), v = viewOf(phone)!;
      const seen = l.nodes.filter(n => isNode(n) && n.y - n.r >= v.top && n.y + n.r <= v.bottom).length;
      if (vw === 390 && (seen < 3 || seen > 4)) fails.push(`${c.seed}@390: ${seen}`);
      if (vw === 360) { if (seen < 2) fails.push(`${c.seed}@360: ${seen}`); if (seen < 3) short++; checked++; }
    }
    expect(fails).toEqual([]);
    expect(short / checked, `${short} of ${checked} paths show two whole nodes at 360`).toBeLessThanOrEqual(.1);
  });
  test('every name on one line, unless it is too long even at the edge (then it wraps there, never cut)', () => {
    for (const {c, l} of all) l.lanes.forEach((lane, i) => {
      const tab = tabOf(c.names[i]!), edge = c.phone.w - RIVER.margin * 2 - RIVER.r - RIVER.halo - RIVER.tabReach;
      if (lane.wrap) expect(tab, `${c.seed} ${i}`).toBeGreaterThan(edge * .55);
      else {
        const end = lane.side === 'right' ? lane.x + RIVER.tabReach + tab : lane.x - RIVER.tabReach - tab;
        expect(end, `${c.seed} ${i}`).toBeGreaterThanOrEqual(RIVER.margin - .01); expect(end).toBeLessThanOrEqual(c.phone.w - RIVER.margin + .01);
      }
    });
  });
  test('the same path gives the same layout and line; another path id another', () => {
    const c = cases()[17]!;
    expect(lay(c)).toEqual(lay({...c}));
    expect(lay({...c, seed: 'another day'}).lanes.map(x => x.x)).not.toEqual(lay(c).lanes.map(x => x.x));
  });
});
