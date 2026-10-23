import {describe, expect, test} from 'vitest';
import {seeded, type FlowBox} from './flow-geometry';
import {phoneRiver, RIVER, riverMinRadius, type RiverLayout} from './phone-river';

/**
 * Session AG Polish 3 (ADR-032; owner Part 1.7): the phone's river, checked as a property over 240 seeded paths — 1 to 12
 * nodes per orbit, 1 to 4 orbits, names of 3 to 40 characters, phones 320, 360, 390 and 430 px wide — with the test's own
 * geometry (it reads the drawn path data, never the module's own measures).
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

// ---- The test's own geometry ----
function cubicOf(d: string): Pt[] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), c: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) c.push({x: n[i]!, y: n[i + 1]!});
  expect(/^M[^A-Z]+C[^A-Z]+$/.test(d), `one cubic: ${d}`).toBe(true);
  return c;
}
function at(c: Pt[], t: number) {
  const [a, b, d, e] = c as [Pt, Pt, Pt, Pt], u = 1 - t;
  return {p: {x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t ** 3 * e.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t ** 3 * e.y},
    v: {x: 3 * u * u * (b.x - a.x) + 6 * u * t * (d.x - b.x) + 3 * t * t * (e.x - d.x), y: 3 * u * u * (b.y - a.y) + 6 * u * t * (d.y - b.y) + 3 * t * t * (e.y - d.y)},
    a: {x: 6 * u * (d.x - 2 * b.x + a.x) + 6 * t * (e.x - 2 * d.x + b.x), y: 6 * u * (d.y - 2 * b.y + a.y) + 6 * t * (e.y - 2 * d.y + b.y)}};
}
const deg = (a: Pt, b: Pt) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)))) * 180 / Math.PI;
const boxDist = (p: Pt, q: FlowBox) => { const dx = Math.max(q.left - p.x, 0, p.x - q.right), dy = Math.max(q.top - p.y, 0, p.y - q.bottom); return dx || dy ? Math.hypot(dx, dy) : -Math.min(p.x - q.left, q.right - p.x, p.y - q.top, q.bottom - p.y); };
/** Everything the checks read from one layout: each stretch's samples, its least radius, its end tangents. */
function read(l: RiverLayout) {
  return l.segments.map(s => {
    const c = cubicOf(s.d), pts: Pt[] = []; let minR = Infinity;
    for (let i = 0; i <= 64; i++) { const {p, v, a} = at(c, i / 64), sp = Math.hypot(v.x, v.y); pts.push(p); if (sp > 1e-9) { const k = Math.abs(v.x * a.y - v.y * a.x) / sp ** 3; if (k > 0) minR = Math.min(minR, 1 / k); } }
    return {s, c, pts, minR, start: at(c, 0).v, end: at(c, 1).v};
  });
}

describe('the phone\'s river (Session AG Polish 3, ADR-032; owner Part 1)', () => {
  const all = cases().map(c => ({c, l: lay(c)}));
  test('downward like a river: never climbing back up (≤ 2 px), so it never crosses itself', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      let low = -Infinity;
      for (const {s, pts} of read(l)) for (const p of pts) { if (p.y < low - 2) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: up ${(low - p.y).toFixed(1)}`); low = Math.max(low, p.y); }
    }
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('no corners: every stretch one cubic with no radius under 40 px × width / 390', () => {
    const fails: string[] = [];
    for (const {c, l} of all) for (const {s, minR} of read(l)) if (minR < riverMinRadius(c.phone.vw) - .5) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: ${minR.toFixed(1)}`);
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('it never crosses a name tab, a banner, a planet or another node, and stays inside the stage', {timeout: 60_000}, () => {
    const fails: string[] = [];
    for (const {c, l} of all) for (const {s, pts} of read(l)) {
      const own = [s.from, s.to], near = (y: number) => (q: {top: number; bottom: number}) => q.bottom > y - 80 && q.top < y + 80;
      for (const [i, p] of pts.entries()) {
        if (p.x < 7 || p.x > c.phone.w - 7) fails.push(`${c.seed}@${c.phone.vw} ${s.id}: outside at ${p.x.toFixed(1)}`);
        for (const q of l.boxes.filter(near(p.y))) { const d = boxDist(p, q); if (d < 3) fails.push(`${c.seed}@${c.phone.vw} ${s.id} over ${q.id} (${d.toFixed(1)})`); }
        for (const n of l.nodes) {
          if (Math.abs(n.y - p.y) > n.r + 10) continue;
          const d = Math.hypot(p.x - n.x, p.y - n.y);
          if (own.includes(n.id)) { if (i > 0 && i < 64 && d < n.r - 1) fails.push(`${c.seed} ${s.id} back into ${n.id}`); }
          else if (d < n.r + 3) fails.push(`${c.seed}@${c.phone.vw} ${s.id} across ${n.id} (${(d - n.r).toFixed(1)})`);
        }
      }
    }
    expect([...new Set(fails)].slice(0, 12)).toEqual([]);
  });
  test('one stream through each node: it meets the ring and leaves it within 60° of the way it came', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      const r = read(l);
      for (const n of l.nodes.filter(x => x.id.startsWith('n'))) {
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
      const r = read(l);
      for (const p of l.nodes.filter(x => x.id.startsWith('planet:'))) {
        const into = r.find(x => x.s.to === p.id), out = r.find(x => x.s.from === p.id);
        if (into) { expect(Math.hypot(into.pts.at(-1)!.x - p.x, into.pts.at(-1)!.y - (p.y - p.r)), `${c.seed} ${p.id} top`).toBeLessThan(.2); expect(deg(into.end, {x: 0, y: 1})).toBeLessThan(1); }
        if (out) { expect(Math.hypot(out.pts[0]!.x - p.x, out.pts[0]!.y - (p.y + p.r)), `${c.seed} ${p.id} bottom`).toBeLessThan(.2); expect(deg(out.start, {x: 0, y: 1})).toBeLessThan(1); }
      }
    }
  });
  test('the whole width: nodes reach both outer thirds', () => {
    for (const {c, l} of all.filter(x => x.c.names.length >= 4)) {
      const xs = l.nodes.filter(n => n.id.startsWith('n')).map(n => n.x);
      expect(Math.min(...xs), `${c.seed}@${c.phone.vw}: the left third`).toBeLessThan(c.phone.w / 3);
      expect(Math.max(...xs), `${c.seed}@${c.phone.vw}: the right third`).toBeGreaterThan(c.phone.w * 2 / 3);
    }
  });
  test('the spaces between nodes vary: some close, some far, never one pitch', () => {
    for (const {c, l} of all) {
      let i = 0;
      for (const count of c.orbits) {
        const ys = l.nodes.filter(n => n.id.startsWith('n')).slice(i, i + count).map(n => n.y); i += count;
        if (count < 5) continue;
        const gaps = ys.slice(1).map((y, k) => y - ys[k]!);
        expect(Math.max(...gaps) - Math.min(...gaps), `${c.seed}@${c.phone.vw}: spread`).toBeGreaterThanOrEqual(24);
      }
    }
  });
  test('the first screen: 3–4 nodes on a 390 × 844 phone, at least 3 on a 360 × 780 one', {timeout: 120_000}, () => {
    let checked = 0;
    // (Where one of the first three names is longer than ~58 % of the stage, its node must stand at an edge and the river
    // needs more room to swing there and back: those paths are left out — ADR-032 L6.)
    for (const {c} of all.filter(x => x.c.orbits[0]! >= 3)) for (const vw of [390, 360] as const) {
      const phone0 = PHONES.find(p => p.vw === vw)!;
      if (c.names.slice(0, 3).some(nm => tabOf(nm) > phone0.w * .58)) continue;
      const phone = PHONES.find(p => p.vw === vw)!, l = lay(c, phone), view = FIRST_VIEW[vw], foot = view.h - 64 - view.top, top = l.banners[0]!.bottom;
      const seen = l.nodes.filter(n => n.id.startsWith('n') && n.y - n.r >= top && n.y + n.r <= foot).length;
      if (vw === 390) { expect(seen, `${c.seed}@390`).toBeGreaterThanOrEqual(3); expect(seen, `${c.seed}@390`).toBeLessThanOrEqual(4); }
      else expect(seen, `${c.seed}@360`).toBeGreaterThanOrEqual(3);
      checked++;
    }
    expect(checked).toBeGreaterThan(60);
  });
  test('every name on one line, unless it is too long even at the edge (then it wraps there, never cut)', () => {
    for (const {c, l} of all) l.lanes.forEach((lane, i) => {
      const tab = tabOf(c.names[i]!), edge = c.phone.w - RIVER.margin * 2 - RIVER.r - RIVER.halo - RIVER.tabReach;
      if (lane.wrap) expect(tab, `${c.seed} ${i}`).toBeGreaterThan(edge);
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
