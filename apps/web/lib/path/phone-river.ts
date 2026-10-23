import {seeded, type FlowBox, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L4–L8; owner Part 1, references 02 and 05): the phone's Path as the computer's river.
 * Pure (no React, no DOM).
 *
 * Reference 01's rule — in at the top of each ring, along it, out at the bottom — is gone on phones. The line is one smooth
 * river that flows THROUGH each node, under it (the node hides the join), so it meets the ring wherever the flow crosses
 * it. Through a node the curve keeps one direction (C1 at the node's centre), so it reads as one stream; the visible ends
 * are cut exactly at the rings, and the turn hidden under a node stays within 60°. Planets keep top-in, bottom-out (they
 * sit level with their banners) and the day's finale keeps its upright pass, as before.
 *
 * Two parts:
 * - `riverSegments`: the line through measured stations (planets, nodes, the finale), as the computer's FlowSegments
 *   (one cubic per stretch, the same ids, colours and lit ends). For each node a few directions are tried around the way
 *   its neighbours lie, and for each stretch a few handle lengths; the best whole line is found at once (a Viterbi pass over
 *   the nodes' choices), keeping every rule: never upward, no radius under `minRadius`, inside the column, 6 px clear of
 *   every other ring, planet, name tab and banner, and the turn under a node small. Never a loop, never Math.random.
 * - `phoneRiver`: where each node stands (its x, the side its tab hangs, the space above it) and the spaces above each
 *   banner and the finale, seeded from the path's id. Each orbit flows out of its planet in a leftward sweep; then runs of
 *   short steps and wide sweeps toward the side with room, now and then the other way, turning in the outer thirds, so the
 *   whole width is used. Each tab hangs on the side the line comes from (above it) — the computer's own rule — and the line
 *   leaves on the other side. The spaces start from a seeded palette (some close, some far) plus a share of the sideways
 *   travel, and only where a stretch would break a rule is its space widened (a bounded pass). The model's own line is the
 *   one `riverSegments` draws from the measured page, so the unit tests check the line the phone shows.
 * The lanes come from the width, the names and the planets alone — never from which node is next: a tick moves nothing.
 */
type Pt = {x: number; y: number};
type Cubic = readonly [Pt, Pt, Pt, Pt];

/** The phone's layout as components/path/path-orbit.css draws it (measured in Chromium at 320–430 px, ADR-032 L5). */
export const RIVER = {
  node: 62, r: 31,
  /** A tab's top below its node's centre, and where it starts beside the centre (`.2` and `.3` of a node). */
  tabTop: 62 * .2, tabReach: 62 * .3,
  /** A tab's height: one line, and each further line when a very long name wraps. */
  tabLine: 28.5, tabLineStep: 17.5,
  /** Nothing reaches closer than this to the stage's sides; a node's ring keeps its 6 px halo inside too. */
  margin: 6, halo: 6,
  /** The stage's own top padding; a banner is its planet's diameter + 10; 8 px from a banner to its steps. */
  stageTop: 2, bannerPad: 10, sectionGap: 8,
  /** A planet's sphere stands 4 px from the stage's right edge, centred on its banner. */
  planetEdge: 4,
  /** The banner's words: ±20 px about its middle, from 6 px past the stage's left; its tint runs on 44 px. */
  wordsHalf: 20, wordsLeft: -6, fade: 44,
  /** The day's finale (a 68 px node in the middle) and the room under it to the stage's foot (its words, the padding). */
  finaleR: 34, finaleFoot: 74,
  clearance: 6,
} as const;
/** The least radius of curvature on the phone's line: 40 px at 390 px, scaled with the width (owner Part 1.3). */
export const riverMinRadius = (vw: number) => 40 * vw / 390;
/** The most the line may turn under one node (each half; the owner's limit is 60° in all). */
const HALF_TURN = 30 * Math.PI / 180;
const f = (n: number) => (Math.round(n * 10) / 10).toString();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- Cubic Bézier helpers ----
export function bez(c: Cubic, t: number) {
  const [a, b, d, e] = c, u = 1 - t;
  return {
    p: {x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t * t * t * e.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t * t * t * e.y},
    v: {x: 3 * (u * u * (b.x - a.x) + 2 * u * t * (d.x - b.x) + t * t * (e.x - d.x)), y: 3 * (u * u * (b.y - a.y) + 2 * u * t * (d.y - b.y) + t * t * (e.y - d.y))},
    a: {x: 6 * (u * (d.x - 2 * b.x + a.x) + t * (e.x - 2 * d.x + b.x)), y: 6 * (u * (d.y - 2 * b.y + a.y) + t * (e.y - 2 * d.y + b.y))},
  };
}
/** The part of a cubic between t0 and t1, as a cubic of its own (de Casteljau). */
export function subCubic(c: Cubic, t0: number, t1: number): Cubic {
  const split = (q: Cubic, t: number): [Cubic, Cubic] => {
    const l = (p: Pt, r: Pt) => ({x: p.x + (r.x - p.x) * t, y: p.y + (r.y - p.y) * t});
    const ab = l(q[0], q[1]), bc = l(q[1], q[2]), cd = l(q[2], q[3]), abc = l(ab, bc), bcd = l(bc, cd), m = l(abc, bcd);
    return [[q[0], ab, abc, m], [m, bcd, cd, q[3]]];
  };
  const right = t0 > 0 ? split(c, t0)[1] : c;
  return t1 < 1 ? split(right, (t1 - t0) / (1 - t0))[0] : right;
}
const angleBetween = (a: Pt, b: Pt) => { const la = Math.hypot(a.x, a.y) || 1, lb = Math.hypot(b.x, b.y) || 1; return Math.acos(clamp((a.x * b.x + a.y * b.y) / la / lb, -1, 1)); };

// ---- The line ----
type Station = {id: string; free: boolean; c: Pt; r: number; entry: Pt; exit: Pt; tab: 'left' | 'right' | null; colour: string; done: boolean; badge: FlowBox | null};
export type RiverOptions = {w: number; seed: string; minRadius: number; obstacles?: readonly FlowBox[]; clearance?: number; gutter?: number; leadFrom?: number | null; tailTo?: number | null};
type Eval = {hard: number; soft: number; ctrl: Cubic; t0: number; t1: number};

function stationOf(n: FlowNode): Station {
  const common = {id: n.id, c: {x: n.x, y: n.y}, r: n.r, colour: n.colour, done: n.done};
  if (n.inSide === 'top' || n.inSide === 'bottom') return {...common, free: false, entry: {x: n.x, y: n.y - n.r}, exit: {x: n.x, y: n.y + n.r}, tab: null, badge: null};
  // (The finale passes upright, in at its side point and out at the other, as before.)
  if (n.upright) { const s = n.inSide === 'right' ? 1 : -1; return {...common, free: false, entry: {x: n.x + s * n.r, y: n.y}, exit: {x: n.x - s * n.r, y: n.y}, tab: null, badge: null}; }
  // (A node: through its centre. Its NEXT tag would sit above it — the line rather passes beside that.)
  return {...common, free: true, entry: common.c, exit: common.c, tab: n.inSide === 'right' ? 'right' : 'left', badge: {id: `badge:${n.id}`, left: n.x - 30, right: n.x + 30, top: n.y - n.r - 15, bottom: n.y - n.r + 7}};
}

/** Where a cubic leaving `centre` first reaches `r` from it (going out), or arriving reaches it last (coming in). */
function ringT(c: Cubic, centre: Pt, r: number, from: 'start' | 'end'): number {
  const at = (t: number) => { const p = bez(c, t).p; return Math.hypot(p.x - centre.x, p.y - centre.y) - r; };
  let lo = 0, hi = 1;
  if (from === 'start') { for (let i = 1; i <= 16; i++) { const t = i / 16; if (at(t) >= 0) { hi = t; lo = (i - 1) / 16; break; } } }
  else { for (let i = 15; i >= 0; i--) { const t = i / 16; if (at(t) >= 0) { lo = t; hi = (i + 1) / 16; break; } } }
  for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if ((at(m) >= 0) === (from === 'start')) hi = m; else lo = m; }
  return from === 'start' ? hi : lo;
}

/** The handles' lengths (shares of the stretch), nearest the middle first: the first clean pair is kept. */
const HANDLES = [.3, .42, .56, .7];
const PAIRS = HANDLES.flatMap(a => HANDLES.map(b => [a, b] as const)).sort((p, q) => Math.abs(p[0] - .42) + Math.abs(p[1] - .42) - Math.abs(q[0] - .42) - Math.abs(q[1] - .42));
/** One stretch from A (leaving in `da`) to B (arriving in `db`): its best cubic and how well it keeps the rules. */
type Ctx = {w: number; g: number; minR: number; need: number; rings: readonly Station[]; boxes: readonly FlowBox[]};
/** Stretches already worked out, by their shape relative to where they start (the layout's rounds move whole runs of
 *  stations up or down together, so most stretches recur exactly). Bounded; cleared when full. */
const CACHE = new Map<string, Eval>();
const k1 = (n: number) => Math.round(n * 10);
function evalStretch(A: Station, B: Station, da: Pt, db: Pt, ctx: Ctx): Eval {
  const p0 = A.exit, p3 = B.entry;
  const lo = Math.min(p0.y, p3.y) - 40, hi = Math.max(p0.y, p3.y) + 40;
  const rings = ctx.rings.filter(q => q !== A && q !== B && q.c.y + q.r > lo && q.c.y - q.r < hi);
  const boxes = ctx.boxes.filter(q => q.bottom > lo && q.top < hi);
  const key = [A.free ? 1 : 0, A.r, B.free ? 1 : 0, B.r, k1(p0.x), k1(p3.x), k1(p3.y - p0.y), k1(da.x * 100), k1(da.y * 100), k1(db.x * 100), k1(db.y * 100), ctx.w, ctx.g, k1(ctx.minR), ctx.need, B.badge ? 1 : 0,
    rings.map(q => `${k1(q.c.x)},${k1(q.c.y - p0.y)},${q.r}`).join(';'), boxes.map(q => `${k1(q.left)},${k1(q.right)},${k1(q.top - p0.y)},${k1(q.bottom - p0.y)}`).join(';')].join('|');
  const hit = CACHE.get(key);
  const move = (e: Eval, dy: number): Eval => ({...e, ctrl: e.ctrl.map(q => ({x: q.x, y: q.y + dy})) as unknown as Cubic});
  if (hit) return move(hit, p0.y);
  const e = solveStretch(A, B, da, db, ctx, rings, boxes);
  if (CACHE.size > 40_000) CACHE.clear();
  CACHE.set(key, move(e, -p0.y));
  return e;
}
function solveStretch(A: Station, B: Station, da: Pt, db: Pt, ctx: Ctx, rings: readonly Station[], boxes: readonly FlowBox[]): Eval {
  const p0 = A.exit, p3 = B.entry, L = Math.hypot(p3.x - p0.x, p3.y - p0.y) || 1, dy = p3.y - p0.y;
  let best: Eval | null = null;
  for (const [ka, kb] of PAIRS) {
    // (Never upward: the control points keep going down, so the curve does too.)
    let a = ka * L, b = kb * L;
    const room = dy * .98, used = a * da.y + b * db.y;
    if (used > room && used > 0) { const k = room / used; a *= k; b *= k; }
    const ctrl: Cubic = [p0, {x: p0.x + da.x * a, y: p0.y + da.y * a}, {x: p3.x - db.x * b, y: p3.y - db.y * b}, p3];
    const t0 = A.free ? ringT(ctrl, A.c, A.r, 'start') : 0, t1 = B.free ? ringT(ctrl, B.c, B.r, 'end') : 1;
    let hard = 0, soft = 0;
    if (t1 - t0 < .02) hard += 500;
    // (Samples about every 8 px along the stretch, so no corner of a tab slips between two of them.)
    const n = Math.min(72, Math.max(24, Math.ceil(L / 8)));
    let minR = Infinity, rise = 0, out = 0, ring = 0, box = 0, badge = 0;
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * i / n, {p, v, a: acc} = bez(ctrl, t), speed = Math.hypot(v.x, v.y);
      if (v.y < -1e-6) rise = Math.max(rise, -v.y);
      out = Math.max(out, ctx.g - p.x, p.x - (ctx.w - ctx.g));
      if (speed > 1e-9) { const k = Math.abs(v.x * acc.y - v.y * acc.x) / speed ** 3; if (k > 0) minR = Math.min(minR, 1 / k); }
      // (Its own two rings: once out, it never comes back in.)
      if (i > 0 && A.free) ring = Math.max(ring, A.r - .5 - Math.hypot(p.x - A.c.x, p.y - A.c.y));
      if (i < n && B.free) ring = Math.max(ring, B.r - .5 - Math.hypot(p.x - B.c.x, p.y - B.c.y));
      // (A planet it leaves or reaches: never across it.)
      if (i > 0 && !A.free) ring = Math.max(ring, A.r - .6 - Math.hypot(p.x - A.c.x, p.y - A.c.y));
      if (i < n && !B.free) ring = Math.max(ring, B.r - .6 - Math.hypot(p.x - B.c.x, p.y - B.c.y));
      for (const q of rings) ring = Math.max(ring, q.r + ctx.need - Math.hypot(p.x - q.c.x, p.y - q.c.y));
      for (const q of boxes) {
        const dx = Math.max(q.left - p.x, 0, p.x - q.right), dyy = Math.max(q.top - p.y, 0, p.y - q.bottom);
        const d = dx || dyy ? Math.hypot(dx, dyy) : -Math.min(p.x - q.left, q.right - p.x, p.y - q.top, q.bottom - p.y);
        box = Math.max(box, ctx.need - d);
      }
      if (B.badge && i < n) { const q = B.badge; if (p.x > q.left - 3 && p.x < q.right + 3 && p.y > q.top - 3 && p.y < q.bottom + 3) badge++; }
    }
    if (rise > 0) hard += 400;
    if (out > 0) hard += 200 + out * 20;
    // (A margin of 1 px: the curve is sampled, and its tightest point may lie between two samples.)
    if (minR < ctx.minR + 1) hard += (ctx.minR + 1 - minR) * 8;
    if (ring > .4) hard += ring * 12;
    if (box > .4) hard += box * 12;
    // (The turn hidden under each node: half of it each side, so the whole stays within 60°.)
    if (A.free) { const tA = angleBetween(da, bez(ctrl, t0).v); if (tA > HALF_TURN) hard += (tA - HALF_TURN) * 180 / Math.PI * 4; }
    if (B.free) { const tB = angleBetween(db, bez(ctrl, t1).v); if (tB > HALF_TURN) hard += (tB - HALF_TURN) * 180 / Math.PI * 4; }
    // (Soft: past a node's NEXT tag rather than under it, and handles near the middle of the grid.)
    soft += badge * 3 + Math.abs(ka - .42) * 2 + Math.abs(kb - .42) * 2;
    if (!best || hard < best.hard || (hard === best.hard && soft < best.soft)) best = {hard, soft, ctrl, t0, t1};
    if (hard === 0 && !badge) break;
    // (A pair of directions far from keeping the rules with the middle handles is not worth the other lengths.)
    if (best.hard > 120) break;
  }
  return best!;
}

/**
 * The directions a node may take the line through it, best first. The first is the river's own: the way its neighbours lie
 * (from the station before to the one after), turned by a seeded meander that alternates side from node to node — so each
 * stretch bows out like the computer's line, one way and then the other (reference 05), never the same bow twice. Then
 * gentler meanders, the plain course, and a few turns either side. Never more than 12° toward the node's tab, so the line
 * leaves on the other side; planets and the finale pass straight down.
 */
function candidates(prev: Pt | null, S: Station, next: Pt | null, meander: number): Pt[] {
  if (!S.free) return [{x: 0, y: 1}];
  const from = prev ?? {x: S.c.x, y: S.c.y - 120}, to = next ?? {x: S.c.x, y: S.c.y + 120};
  const deg = Math.PI / 180, base = clamp(Math.atan2(to.x - from.x, Math.max(1, to.y - from.y)), -62 * deg, 62 * deg);
  const lo = S.tab === 'left' ? -12 * deg : -64 * deg, hi = S.tab === 'right' ? 12 * deg : 64 * deg;
  const seen = new Set<number>(), out: Pt[] = [];
  for (const d of [meander, meander * .5, 0, 18, -18, 34, -34]) {
    const t = clamp(base + d * deg, lo, hi), key = Math.round(t / deg);
    if (seen.has(key)) continue; seen.add(key);
    out.push({x: Math.sin(t), y: Math.cos(t)});
  }
  if (!seen.has(0)) out.push({x: 0, y: 1});
  return out;
}

export type RiverResult = {segments: FlowSegment[]; bad: string[]};
/**
 * The phone's river through `nodes` (in path order: an orbit's planet before its nodes, the finale last), drawn under them.
 * Each node takes its first choice (the meander); a stretch that breaks a rule tries its two nodes' other choices, keeping
 * the pair that leaves it and its neighbours cleanest — two rounds at most, never a loop. `bad` names the stretches (`a>b`)
 * still breaking a rule: the layout widens their space and draws again.
 */
export function riverLine(nodes: readonly FlowNode[], o: RiverOptions): RiverResult {
  const g = o.gutter ?? 8, need = o.clearance ?? RIVER.clearance, S = nodes.map(stationOf), out: FlowSegment[] = [], bad: string[] = [];
  if (!S.length) return {segments: out, bad};
  const ctx = {w: o.w, g, minR: o.minRadius, need, rings: S, boxes: o.obstacles ?? []};
  // (The meander: 20–38°, its side alternating node to node, seeded from the path.)
  const r0 = seeded(`${o.seed}|meander`), flip = r0() < .5 ? 1 : -1;
  let k = 0;
  const C = S.map((s, i) => { const m = s.free ? (k++ % 2 ? 1 : -1) * flip * (20 + seeded(`${o.seed}|meander|${s.id}`)() * 18) : 0; return candidates(i ? S[i - 1]!.exit : null, s, S[i + 1]?.entry ?? null, m); });
  const pick: number[] = S.map(() => 0);
  const stretch = (i: number, ka = pick[i]!, kb = pick[i + 1]!) => evalStretch(S[i]!, S[i + 1]!, C[i]![ka]!, C[i + 1]![kb]!, ctx);
  let E = S.slice(1).map((_, i) => stretch(i));
  for (let round = 0; round < 2; round++) {
    let changed = false;
    for (let i = 0; i < E.length; i++) {
      if (E[i]!.hard === 0) continue;
      const near = [i - 1, i, i + 1].filter(j => j >= 0 && j < E.length);
      let best: {hard: number; rank: number; ka: number; kb: number} | null = null;
      pairs: for (let ka = 0; ka < C[i]!.length; ka++) for (let kb = 0; kb < C[i + 1]!.length; kb++) {
        const hard = near.reduce((t, j) => t + stretch(j, j === i + 1 ? kb : j === i ? ka : pick[j]!, j === i - 1 ? ka : j === i ? kb : pick[j + 1]!).hard, 0), rank = ka + kb;
        if (!best || hard < best.hard || (hard === best.hard && rank < best.rank)) best = {hard, rank, ka, kb};
        if (hard === 0) break pairs;
      }
      if (best && (best.ka !== pick[i] || best.kb !== pick[i + 1])) {
        pick[i] = best.ka; pick[i + 1] = best.kb; changed = true;
        for (const j of near) E[j] = stretch(j);
      }
    }
    if (!changed) break;
  }
  E = S.slice(1).map((_, i) => stretch(i));
  const dirs = S.map((_, i) => C[i]![pick[i]!]!);
  const seg = (s: Station, e: Station, c: Cubic, kind: FlowSegment['kind'], from: string | null, to: string | null, fromColour: string, toColour: string, fromLit: boolean, toLit: boolean): FlowSegment =>
    ({id: kind === 'lead' ? `lead:${e.id}` : kind === 'tail' ? `tail:${s.id}` : `${s.id}>${e.id}`, from, to, kind, d: `M${f(c[0].x)} ${f(c[0].y)} C${f(c[1].x)} ${f(c[1].y)} ${f(c[2].x)} ${f(c[2].y)} ${f(c[3].x)} ${f(c[3].y)}`,
      x1: c[0].x, y1: c[0].y, x2: c[3].x, y2: c[3].y, fromColour, toColour, fromLit, toLit});
  // The lead-in: from above, down into the first station along its course.
  const first = S[0]!, d0 = dirs[0]!;
  if (o.leadFrom !== null && o.leadFrom !== undefined && o.leadFrom < first.entry.y - (first.free ? first.r : 0) - 1) {
    const dy = first.entry.y - o.leadFrom, sx = clamp(first.entry.x - d0.x / d0.y * dy * .5, g, o.w - g);
    const ctrl: Cubic = [{x: sx, y: o.leadFrom}, {x: sx, y: o.leadFrom + dy * .45}, {x: first.entry.x - d0.x * dy * .45, y: first.entry.y - d0.y * dy * .45}, first.entry];
    const vis = first.free ? subCubic(ctrl, 0, ringT(ctrl, first.c, first.r, 'end')) : ctrl;
    out.push(seg(first, first, vis, 'lead', null, first.id, first.colour, first.colour, false, first.done));
  }
  for (let i = 0; i + 1 < S.length; i++) {
    const a = S[i]!, b = S[i + 1]!, e = E[i]!;
    if (e.hard > 0) bad.push(`${a.id}>${b.id}`);
    out.push(seg(a, b, subCubic(e.ctrl, e.t0, e.t1), 'step', a.id, b.id, a.colour, b.colour, a.done, b.done));
  }
  // The tail: on from the last station in the direction it leaves, settling upright, fading out.
  const last = S.at(-1)!, dl = dirs.at(-1)!;
  if (o.tailTo !== null && o.tailTo !== undefined && o.tailTo > last.exit.y + (last.free ? last.r : 0) + 1) {
    const dy = o.tailTo - last.exit.y, r = seeded(`${o.seed}|river-tail|${last.id}`);
    let vis: Cubic | null = null;
    for (const share of [.12 + r() * .2, .06, 0]) {
      const ex = clamp(last.exit.x + (dl.x >= 0 ? 1 : -1) * Math.min(o.w * share, dy * .4), g, o.w - g);
      const ctrl: Cubic = [last.exit, {x: last.exit.x + dl.x * dy * .45, y: last.exit.y + dl.y * dy * .45}, {x: ex, y: o.tailTo - dy * .4}, {x: ex, y: o.tailTo}];
      vis = last.free ? subCubic(ctrl, ringT(ctrl, last.c, last.r, 'start'), 1) : ctrl;
      if (curveRadius(vis) >= o.minRadius) break;
    }
    out.push(seg(last, last, vis!, 'tail', last.id, null, last.colour, last.colour, last.done, false));
  }
  return {segments: out, bad};
}
/** The least radius of curvature along a cubic (sampled). */
export function curveRadius(c: Cubic, n = 48): number {
  let m = Infinity;
  for (let i = 0; i <= n; i++) { const {v, a} = bez(c, i / n), s = Math.hypot(v.x, v.y); if (s < 1e-9) continue; const k = Math.abs(v.x * a.y - v.y * a.x) / s ** 3; if (k > 0) m = Math.min(m, 1 / k); }
  return m;
}
/** The phone's line as FlowLine draws it. */
export const riverSegments = (nodes: readonly FlowNode[], o: RiverOptions): FlowSegment[] => riverLine(nodes, o).segments;

// ---- The layout ----
export type RiverLane = {x: number; side: 'left' | 'right'; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above';
  /** The space above this node: from the node above's foot (or its orbit's banner's steps) to this node's top, in px. */
  gap: number};
export type RiverInput = {
  /** The stage's width, and the screen's (for the least radius; default the stage + the shell's 2 × 12 px). */
  w: number; vw?: number; seed: string;
  /** Each node's tab at its whole width on one line (the words as drawn + the tab's chrome), in path order. */
  tabs: readonly number[];
  /** How many nodes each orbit has, in order (their sum is `tabs.length`). */
  orbits: readonly number[];
  /** Per orbit: whether it has a planet (default: each one does). */
  planets?: readonly boolean[];
  /** The planets' sphere radius (42–50 px). */
  planetR: number;
  /** Per orbit: where its banner's words end (px from the stage's left; the tint runs on `RIVER.fade` past them). */
  words?: readonly number[];
  /** ZIGi's width at rest (beside a node where it fits). */
  zigi: number;
  /** Whether the day's finale ends the path (default true). */
  finale?: boolean;
  /** The first screen in the stage's own coordinates (from the first banner's foot to the timer row): at most four nodes in it. */
  view?: {top: number; bottom: number};
  /** The nodes' and orbits' own ids (the line's meander is seeded by them, so the model draws exactly the page's line). */
  ids?: readonly string[]; orbitIds?: readonly string[];
};
export type RiverLayout = {
  lanes: RiverLane[];
  /** The space above each orbit's banner (the first is 0: it opens the stage). */
  orbitGaps: number[];
  /** The space above the finale. */
  finaleGap: number;
  /** The model the lanes were checked on: every station, the boxes the line keeps clear of, its line, the stage's height. */
  nodes: FlowNode[]; boxes: FlowBox[]; segments: FlowSegment[]; bad: string[]; h: number;
  /** Per orbit: its banner's top and foot (stage px). */
  banners: {top: number; bottom: number}[];
};

/** The day's finale's id on the path (components/path/path.tsx `FINALE_POINT`). */
export const FINALE = 'finale:end';
/** Rounds of widening a space where a stretch breaks a rule, and how far any space may grow. */
const ROUNDS = 22, GROW = 16, MAX_GAP = 360;

export function phoneRiver(input: RiverInput): RiverLayout {
  // (Where a stretch still breaks a rule once its space has grown, its lower node is pulled a third of the way back toward
  // the station above it — a shorter sweep — and the layout runs again: twice at most.)
  const pulls = new Map<number, number>();
  let out = layoutOnce(input, pulls);
  for (let attempt = 0; attempt < 2 && out.bad.length; attempt++) {
    let pulled = false;
    for (const id of out.bad) { const i = out.nodes.filter(q => q.inSide === 'left' || q.inSide === 'right').filter(q => !q.upright).findIndex(q => q.id === id.slice(id.indexOf('>') + 1)); if (i >= 0 && (pulls.get(i) ?? 0) < .6) { pulls.set(i, (pulls.get(i) ?? 0) + .3); pulled = true; } }
    if (!pulled) break;
    out = layoutOnce(input, pulls);
  }
  return out;
}
function layoutOnce(input: RiverInput, pulls: ReadonlyMap<number, number>): RiverLayout {
  const {w, seed, tabs, orbits, planetR} = input, vw = input.vw ?? w + 24, R = RIVER.r, n = tabs.length;
  const xmin = RIVER.margin + R + RIVER.halo, xmax = Math.max(xmin, w - xmin);
  const rnd = seeded(`${seed}|phone-river|${Math.round(w)}`);
  const planetX = w - RIVER.planetEdge - planetR;
  const hasPlanet = (s: number) => input.planets?.[s] ?? true;
  const fitsOn = (x: number, side: 'left' | 'right', tab: number) => side === 'right' ? x + RIVER.tabReach + tab <= w - RIVER.margin : x - RIVER.tabReach - tab >= RIVER.margin;
  const lanes: RiverLane[] = [];
  // 1. Where each node stands and the side its tab hangs.
  let prevX: number | null = null, dir = -1, k = 0, run = 0, left = false, right = false;
  orbits.forEach((count, s) => {
    const start = hasPlanet(s) ? planetX : prevX ?? w * .7;
    for (let j = 0; j < count; j++, k++) {
      const from = j === 0 ? start : prevX!;
      let x: number;
      // (Out of its planet, a leftward sweep — a short one that stays in the right third, or a wide one across; then runs
      // of short steps and now and then a wide sweep, turning where a run meets an edge, now and then sooner.)
      if (j === 0) { x = from - (rnd() < .5 ? .08 + rnd() * .12 : .42 + rnd() * .18) * w; dir = -1; run = 1; }
      else {
        // (The path's first few nodes take short steps, so the first screen holds three or four of them; a run toward an
        // outer third the path has not reached yet sweeps wide more often.)
        const early = k < 3, unreached = dir < 0 ? !left : !right;
        let wide = rnd() < (early ? .12 : unreached ? .6 : .28), step = wide ? (.3 + rnd() * .16) * w : (.12 + rnd() * .1) * w;
        // (A run turns at an edge, and now and then sooner — but only once it has reached that side's outer third; from an
        // edge the river sweeps wide, back across the width.)
        const room = dir < 0 ? from - xmin : xmax - from, outer = dir < 0 ? from < w / 3 : from > w * 2 / 3;
        if (room < step * .6 || (outer && run >= 1 && rnd() < .3)) { dir = -dir; run = 0; if (Math.min(from - xmin, xmax - from) < .12 * w && !wide) { wide = true; step = (.32 + rnd() * .14) * w; } }
        x = from + dir * step; run++;
      }
      // (An orbit's last node, with another planet after it: a third to a half of the width left of that planet, so the
      // line sweeps up and over into the planet's top.)
      const nextPlanet = j === count - 1 && s + 1 < orbits.length && orbits.slice(s + 1).some(c => c > 0) && hasPlanet(orbits.findIndex((c, i) => i > s && c > 0));
      if (nextPlanet && (planetX - x < .3 * w || planetX - x > .62 * w)) x = planetX - (.32 + rnd() * .22) * w;
      x = clamp(x, xmin, xmax);
      // (Near the path's end, a path of four or more that has not yet reached an outer third goes there now.)
      if (n >= 4 && n - k <= 2 && !nextPlanet && (!right || !left)) { x = !right ? Math.max(x, w * 2 / 3 + 8 + rnd() * .1 * w) : Math.min(x, w / 3 - 8 - rnd() * .1 * w); dir = x > from ? 1 : -1; x = clamp(x, xmin, xmax); }
      const pull = pulls.get(k); if (pull) x = clamp(from + (x - from) * (1 - pull), xmin, xmax);
      // 2. The tab hangs on the side the line comes from (above it), so the line leaves on the other side. A name too long
      //    for that side hangs on the other where it fits there (the line then leaves downward and passes under it);
      //    else the node moves on along the run until the whole name fits on one line.
      const tab = tabs[k]!;
      let side: 'left' | 'right' = Math.abs(from - x) < 6 ? (x < w / 2 ? 'right' : 'left') : from > x ? 'right' : 'left';
      const other = (q: 'left' | 'right') => q === 'right' ? 'left' : 'right';
      if (!fitsOn(x, side, tab)) {
        // (Not before a planet: the line must sweep up and over into it, and a tab on that side would be in its way.)
        if (!nextPlanet && fitsOn(x, other(side), tab)) side = other(side);
        else {
          const step = side === 'right' ? -2 : 2;
          let y = x; while (y >= xmin && y <= xmax && !fitsOn(y, side, tab)) y += step;
          if (y >= xmin && y <= xmax) x = y;
          else { let z = x; while (z >= xmin && z <= xmax && !fitsOn(z, other(side), tab)) z -= step; if (z >= xmin && z <= xmax) { x = z; side = other(side); } }
        }
      }
      let wrap = false, maxTab = tab, lines = 1;
      if (!fitsOn(x, side, tab)) {
        // (Too long for one line even at the edge: it wraps there, every line shown — never "…".)
        side = x <= w / 2 ? 'right' : 'left'; x = side === 'right' ? xmin : xmax;
        maxTab = Math.max(80, side === 'right' ? w - RIVER.margin - x - RIVER.tabReach : x - RIVER.tabReach - RIVER.margin);
        wrap = true; lines = Math.ceil(tab / maxTab);
      }
      const zigiRoom = side === 'right' ? x - R - RIVER.halo - 10 - input.zigi >= RIVER.margin : x + R + RIVER.halo + 10 + input.zigi <= w - RIVER.margin;
      lanes.push({x: Math.round(x * 10) / 10, side, wrap, maxTab, lines, zigi: zigiRoom ? 'side' : 'above', gap: 0});
      prevX = x; if (x < w / 3) left = true; if (x > w * 2 / 3) right = true;
    }
  });
  // 3. The spaces: a seeded palette (close, medium, far) plus a share of the sideways travel.
  // (Each orbit goes through the palette in a seeded order, so any four spaces in a row hold a close one and a far one.)
  const PALETTE = [42, 58, 74, 98];
  let at = 0; prevX = null;
  orbits.forEach((count, s) => {
    const order = [0, 1, 2, 3].map(q => ({q, r: rnd()})).sort((a, b) => a.r - b.r).map(x => x.q);
    for (let j = 0; j < count; j++, at++) {
      const from = j === 0 ? (hasPlanet(s) ? planetX : prevX ?? w / 2) : prevX!, dx = Math.abs(lanes[at]!.x - from);
      lanes[at]!.gap = j === 0 ? 44 + rnd() * 20 + dx * .1 : PALETTE[order[(j - 1) % 4]!]! + rnd() * 10 + dx * .12;
      prevX = lanes[at]!.x;
    }
  });
  const orbitGaps = orbits.map((_, s) => s === 0 ? 0 : 58 + rnd() * 24);
  let finaleGap = 36;
  const minR = riverMinRadius(vw), wantFinale = input.finale ?? true;
  const nodeIds = tabs.map((_, i) => input.ids?.[i] ?? `n${i}`), planetIds = orbits.map((_, s) => `planet:${input.orbitIds?.[s] ?? s}`);
  // 4. The model, its line, and the spaces widened where a stretch breaks a rule (a bounded pass).
  let model = build();
  for (let round = 0; round < ROUNDS && model.bad.length; round++) {
    let grew = false;
    for (const id of model.bad) {
      // (Wider sweeps take bigger steps of room.)
      const from = id.slice(0, id.indexOf('>')), to = id.slice(id.indexOf('>') + 1), i = nodeIds.indexOf(to), s = planetIds.indexOf(to);
      const a = model.nodes.find(q => q.id === from), b = model.nodes.find(q => q.id === to), more = GROW + (a && b ? Math.abs(b.x - a.x) * .06 : 0);
      if (i >= 0) { if (lanes[i]!.gap < MAX_GAP) { lanes[i]!.gap += more; grew = true; } }
      else if (s >= 0) { if (orbitGaps[s]! < MAX_GAP) { orbitGaps[s]! += more; grew = true; } }
      else if (to === FINALE && finaleGap < MAX_GAP) { finaleGap += more; grew = true; }
    }
    if (!grew) break;
    model = build();
  }
  // (In an orbit of five or more, some spaces close and some far: where the palette and the rules happened to give one
  // pitch, one of its later spaces opens up — kept only if the line still keeps every rule.)
  {
    let i0 = 0;
    for (const count of orbits) {
      const gaps = lanes.slice(i0 + 1, i0 + count).map(l => l.gap);
      if (gaps.length >= 4 && Math.max(...gaps) - Math.min(...gaps) < 32) {
        const first = Math.floor(rnd() * (count - 1));
        tries: for (const more of [36, 52]) for (let t = 0; t < count - 1; t++) {
          const at = i0 + 1 + (first + t) % (count - 1);
          lanes[at]!.gap += more;
          const trial = build();
          if (trial.bad.length > model.bad.length) lanes[at]!.gap -= more; else { model = trial; break tries; }
        }
      }
      i0 += count;
    }
  }
  // (And no more than four nodes on a phone's first screen, where the caller says where that ends: the fifth moves down
  // past it, by at most 80 px — on a taller screen five may show.)
  if (input.view && orbits[0]) {
    const ys = model.nodes.filter(q => nodeIds.includes(q.id)).map(q => q.y), band = (y: number) => y - R >= input.view!.top && y + R <= input.view!.bottom;
    const push = ys.length >= 5 ? input.view.bottom - (ys[4]! - R) + 2 : 0;
    if (ys.length >= 5 && ys.slice(0, 5).every(band) && push <= 80) lanes[4]!.gap += push;
  }
  lanes.forEach(l => { l.gap = Math.round(l.gap); });
  orbitGaps.forEach((g, s) => { orbitGaps[s] = Math.round(g); });
  finaleGap = Math.round(finaleGap);
  model = build();
  return {lanes, orbitGaps, finaleGap, ...model};

  function build() {
    const nodes: FlowNode[] = [], boxes: FlowBox[] = [], banners: {top: number; bottom: number}[] = [];
    let y = RIVER.stageTop, i = 0, lastSide: 'left' | 'right' = 'left';
    orbits.forEach((count, s) => {
      if (s > 0) y += orbitGaps[s]!;
      const top = y, bh = 2 * planetR + RIVER.bannerPad, cy = top + bh / 2;
      banners.push({top, bottom: top + bh});
      boxes.push({id: `banner:${input.orbitIds?.[s] ?? s}`, left: RIVER.wordsLeft, right: (input.words?.[s] ?? Math.min(214, w * .6)) + RIVER.fade, top: cy - RIVER.wordsHalf, bottom: cy + RIVER.wordsHalf});
      if (hasPlanet(s) && count > 0) nodes.push({id: planetIds[s]!, x: planetX, y: cy, r: planetR, inSide: 'top', outSide: 'bottom', colour: '#23eaff', done: false});
      y = top + bh + RIVER.sectionGap;
      for (let j = 0; j < count; j++, i++) {
        const l = lanes[i]!;
        y += l.gap; const ny = y + R; y += RIVER.node;
        nodes.push({id: nodeIds[i]!, x: l.x, y: ny, r: R, inSide: l.side, outSide: l.side === 'left' ? 'right' : 'left', colour: '#9273ff', done: false});
        const width = l.wrap ? l.maxTab : tabs[i]!, tt = ny + RIVER.tabTop, th = RIVER.tabLine + (l.lines - 1) * RIVER.tabLineStep;
        boxes.push({id: `tab:${nodeIds[i]}`, top: tt, bottom: tt + th, left: l.side === 'right' ? l.x + RIVER.tabReach : l.x - RIVER.tabReach - width, right: l.side === 'right' ? l.x + RIVER.tabReach + width : l.x - RIVER.tabReach});
        lastSide = l.side === 'left' ? 'right' : 'left';
      }
    });
    if (wantFinale && n) {
      y += finaleGap; const fy = y + RIVER.finaleR; y += 2 * RIVER.finaleR;
      nodes.push({id: FINALE, x: w / 2, y: fy, r: RIVER.finaleR, inSide: lastSide, outSide: lastSide === 'left' ? 'right' : 'left', colour: '#9273ff', done: false, upright: true});
    }
    const h = y + RIVER.finaleFoot;
    const {segments, bad} = riverLine(nodes, {w, seed, minRadius: minR, obstacles: boxes, leadFrom: 0, tailTo: wantFinale ? h - 4 : null});
    // (And a node never stands on the tab of the node above it.)
    for (let q = 1; q < n; q++) {
      const a = nodes.find(x => x.id === nodeIds[q])!, t = boxes.find(b => b.id === `tab:${nodeIds[q - 1]}`)!;
      const dx = Math.max(t.left - a.x, 0, a.x - t.right), dy = Math.max(t.top - a.y, 0, a.y - t.bottom);
      if (Math.hypot(dx, dy) < R + RIVER.halo + 4 && !bad.some(b => b.endsWith(`>${nodeIds[q]}`))) bad.push(`${nodeIds[q - 1]}>${nodeIds[q]}`);
    }
    return {nodes, boxes, segments, bad, h, banners};
  }
}
