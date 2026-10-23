import {seeded, type FlowBox, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L4–L10, owner amendment 6; owner Part 1, references 02, 05 and 06): the phone's Path as the
 * computer's river. Pure (no React, no DOM).
 *
 * Reference 01's rule (in at the top of each ring, along it, out at the bottom) is gone on phones, and so is the session's
 * first try (reference 06: nodes stacked down one side, a near-vertical wiggle). As on the computer (`flowSegments`), the
 * beauty is in the line BETWEEN nodes: every stretch flows through a seeded waypoint — its own amplitude, side and turning
 * height — as two cubics joined smoothly (C1), so it visibly swings sideways and back, a big S from node to node. The line
 * flows THROUGH each node, under it (the node hides the join): it meets the ring wherever the flow crosses it and keeps one
 * direction there (C1 at the centre), leaning away from the node's name tab; the visible ends are cut exactly at the rings
 * and the turn hidden under a node stays within 60°. Planets keep top-in, bottom-out; the finale its upright pass.
 *
 * Two parts:
 * - `riverLine`/`riverSegments`: the line through measured stations (planets, nodes, the finale), as FlowSegments (two C1
 *   cubics per stretch, the same ids, colours and lit ends as the computer's). For each node a few directions, for each
 *   stretch a few waypoints and handle lengths, tried in a fixed order until every rule holds: never upward, no radius under
 *   `minRadius`, inside the column, 6 px clear of every other ring, planet, name tab and banner, the turn under a node
 *   small, a sideways swing of at least 30 % of the column, bowing out beside its chord. Never a loop, never Math.random.
 * - `phoneRiver`: where each node stands, the side its tab hangs and the space above it, seeded from the path's id. Nodes
 *   alternate across the width — left third, right third, now and then the middle — so every three in a row reach both
 *   outer thirds and never three stand in one half; each tab hangs on the side the line comes from; the spaces start from
 *   a seeded palette and widen only where a stretch needs the room for its swing. The model's own line is the one
 *   `riverSegments` draws from the measured page, so the unit tests check the line the phone shows.
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
  /** Owner amendment 6: each stretch swings sideways at least this share of the column, and bows out beside its chord. */
  swing: .3, bow: .05,
} as const;
/** The least radius of curvature on the phone's line: 40 px at 390 px, scaled with the width (owner Part 1.3). */
export const riverMinRadius = (vw: number) => 40 * vw / 390;
/** The most the line may turn under one node, each side (so at most 60° in all, the owner's limit). */
const HALF_TURN = 30 * Math.PI / 180;
const f = (n: number) => (Math.round(n * 10) / 10).toString();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;


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
const unit = (v: Pt): Pt => { const l = Math.hypot(v.x, v.y) || 1; return {x: v.x / l, y: v.y / l}; };
/** The least radius of curvature along a cubic (sampled). */
export function curveRadius(c: Cubic, n = 48): number {
  let m = Infinity;
  for (let i = 0; i <= n; i++) { const {v, a} = bez(c, i / n), s = Math.hypot(v.x, v.y); if (s < 1e-9) continue; const k = Math.abs(v.x * a.y - v.y * a.x) / s ** 3; if (k > 0) m = Math.min(m, 1 / k); }
  return m;
}

// ---- The line ----
type Station = {id: string; free: boolean; c: Pt; r: number; entry: Pt; exit: Pt; tab: 'left' | 'right' | null; colour: string; done: boolean; badge: FlowBox | null};
export type RiverOptions = {w: number; seed: string; minRadius: number; obstacles?: readonly FlowBox[]; clearance?: number; gutter?: number; leadFrom?: number | null; tailTo?: number | null};
/** A stretch's waypoint: `u` along the way across, `tau` down the height, `off` sideways (px). */
type Way = {u: number; tau: number; off: number};
type Eval = {hard: number; soft: number; vis: [Cubic, Cubic]};
type Ctx = {w: number; g: number; minR: number; need: number; rings: readonly Station[]; boxes: readonly FlowBox[]};

function stationOf(n: FlowNode): Station {
  const common = {id: n.id, c: {x: n.x, y: n.y}, r: n.r, colour: n.colour, done: n.done};
  if (n.inSide === 'top' || n.inSide === 'bottom') return {...common, free: false, entry: {x: n.x, y: n.y - n.r}, exit: {x: n.x, y: n.y + n.r}, tab: null, badge: null};
  // (The finale passes upright, in at its side point and out at the other, as before.)
  if (n.upright) { const s = n.inSide === 'right' ? 1 : -1; return {...common, free: false, entry: {x: n.x + s * n.r, y: n.y}, exit: {x: n.x - s * n.r, y: n.y}, tab: null, badge: null}; }
  // (A node: through its centre. Its NEXT tag sits above it — the line rather passes beside that.)
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

/**
 * One stretch from A (leaving in `da`) to B (arriving in `db`) through the waypoint `wp` — the computer's own shape: two
 * cubics joined at the waypoint with one tangent there (along the swing), the control points always going down.
 */
function shape(A: Station, B: Station, da: Pt, db: Pt, wp: Way, k: number): [Cubic, Cubic] {
  const p0 = A.exit, p3 = B.entry, dx = p3.x - p0.x, dy = p3.y - p0.y;
  const M = {x: p0.x + dx * wp.u + wp.off, y: p0.y + dy * wp.tau};
  // (The tangent at the waypoint: from where the line heads out of A to where it heads into B — the swing.)
  const a = {x: p0.x + da.x * dy * .3, y: p0.y + da.y * dy * .3}, b = {x: p3.x - db.x * dy * .3, y: p3.y - db.y * dy * .3};
  const t = unit({x: b.x - a.x, y: Math.max(b.y - a.y, dy * .2)});
  const L1 = Math.hypot(M.x - p0.x, M.y - p0.y), L2 = Math.hypot(p3.x - M.x, p3.y - M.y);
  // (Never upward: in each piece the control points keep going down.)
  const fit = (room: number, u1: number, u2: number, p: number, q: number): [number, number] => { const used = u1 * p + u2 * q; if (used <= room * .98 || used <= 0) return [p, q]; const s = room * .98 / used; return [p * s, q * s]; };
  const [h1, h2] = fit(M.y - p0.y, da.y, t.y, k * L1, k * L1), [h3, h4] = fit(p3.y - M.y, t.y, db.y, k * L2, k * L2);
  return [[p0, {x: p0.x + da.x * h1, y: p0.y + da.y * h1}, {x: M.x - t.x * h2, y: M.y - t.y * h2}, M], [M, {x: M.x + t.x * h3, y: M.y + t.y * h3}, {x: p3.x - db.x * h4, y: p3.y - db.y * h4}, p3]];
}

/** How a stretch keeps the rules (`hard`, 0 when all hold) and how good it is otherwise (`soft`). */
function judge(A: Station, B: Station, da: Pt, db: Pt, pieces: [Cubic, Cubic], ctx: Ctx, rings: readonly Station[], boxes: readonly FlowBox[]): Eval {
  let hard = 0;
  const [c1, c2] = pieces;
  if (A.free && Math.hypot(c1[3].x - A.c.x, c1[3].y - A.c.y) < A.r + 4) hard += 500;
  if (B.free && Math.hypot(c2[0].x - B.c.x, c2[0].y - B.c.y) < B.r + 4) hard += 500;
  if (c1[3].y - c1[0].y < 2 || c2[3].y - c2[0].y < 2) hard += 500;
  const t0 = A.free ? ringT(c1, A.c, A.r, 'start') : 0, t1 = B.free ? ringT(c2, B.c, B.r, 'end') : 1;
  const vis: [Cubic, Cubic] = [subCubic(c1, t0, 1), subCubic(c2, 0, t1)];
  const pts: Pt[] = [];
  let minR = Infinity, rise = false, out = 0, ring = 0, box = 0, badge = 0, lo = Infinity, hi = -Infinity;
  for (const [q, piece] of vis.entries()) {
    const L = Math.hypot(piece[3].x - piece[0].x, piece[3].y - piece[0].y) + Math.hypot(piece[1].x - piece[0].x, piece[1].y - piece[0].y) * .5;
    const n = Math.min(48, Math.max(14, Math.ceil(L / 8)));
    for (let i = q ? 1 : 0; i <= n; i++) {
      const t = i / n, {p, v, a} = bez(piece, t), speed = Math.hypot(v.x, v.y);
      pts.push(p); lo = Math.min(lo, p.x); hi = Math.max(hi, p.x);
      if (v.y < -1e-6) rise = true;
      out = Math.max(out, ctx.g - p.x, p.x - (ctx.w - ctx.g));
      if (speed > 1e-9) { const kk = Math.abs(v.x * a.y - v.y * a.x) / speed ** 3; if (kk > 0) minR = Math.min(minR, 1 / kk); }
      const first = q === 0 && i === 0, last = q === 1 && i === n;
      // (Its own two rings: once out, it never comes back in; a planet it leaves or reaches: never across it.)
      if (!first) ring = Math.max(ring, A.r - (A.free ? .5 : .6) - Math.hypot(p.x - A.c.x, p.y - A.c.y));
      if (!last) ring = Math.max(ring, B.r - (B.free ? .5 : .6) - Math.hypot(p.x - B.c.x, p.y - B.c.y));
      for (const o of rings) ring = Math.max(ring, o.r + ctx.need - Math.hypot(p.x - o.c.x, p.y - o.c.y));
      for (const o of boxes) {
        const ddx = Math.max(o.left - p.x, 0, p.x - o.right), ddy = Math.max(o.top - p.y, 0, p.y - o.bottom);
        const d = ddx || ddy ? Math.hypot(ddx, ddy) : -Math.min(p.x - o.left, o.right - p.x, p.y - o.top, o.bottom - p.y);
        box = Math.max(box, ctx.need - d);
      }
      if (B.badge && !last) { const o = B.badge; if (p.x > o.left - 3 && p.x < o.right + 3 && p.y > o.top - 3 && p.y < o.bottom + 3) badge++; }
    }
  }
  if (rise) hard += 400;
  if (out > 0) hard += 200 + out * 20;
  // (A margin of 1 px: the curve is sampled, and its tightest point may lie between two samples.)
  if (minR < ctx.minR + 1) hard += (ctx.minR + 1 - minR) * 8;
  if (ring > .4) hard += ring * 12;
  if (box > .4) hard += box * 12;
  if (A.free) { const tA = angleBetween(da, bez(vis[0], 0).v); if (tA > HALF_TURN) hard += (tA - HALF_TURN) / DEG * 4; }
  if (B.free) { const tB = angleBetween(db, bez(vis[1], 1).v); if (tB > HALF_TURN) hard += (tB - HALF_TURN) / DEG * 4; }
  // (Owner amendment 6: a visible swing of at least 30 % of the column, bowing out beside its chord.)
  const swing = ctx.w * RIVER.swing + 2;
  if (hi - lo < swing) hard += (swing - (hi - lo)) * 2;
  const s = pts[0]!, e = pts.at(-1)!, cl = Math.hypot(e.x - s.x, e.y - s.y) || 1;
  let dev = 0; for (const p of pts) dev = Math.max(dev, Math.abs((p.x - s.x) * (e.y - s.y) - (p.y - s.y) * (e.x - s.x)) / cl);
  if (dev < ctx.w * RIVER.bow + 1) hard += (ctx.w * RIVER.bow + 1 - dev) * 2;
  return {hard, soft: badge * 3, vis};
}

/** Stretches already worked out, by their shape relative to where they start (the layout's rounds move whole runs of
 *  stations up or down together, so most stretches recur exactly). Bounded; cleared when full. */
const CACHE = new Map<string, Eval>();
const k1 = (n: number) => Math.round(n * 10);
const HANDLES = [.42, .58];
function evalStretch(A: Station, B: Station, da: Pt, db: Pt, ways: readonly Way[], ctx: Ctx): Eval {
  const p0 = A.exit, p3 = B.entry, lo = Math.min(p0.y, p3.y) - 40, hi = Math.max(p0.y, p3.y) + 40;
  const lx = Math.min(p0.x, p3.x) - ctx.w, hx = Math.max(p0.x, p3.x) + ctx.w;
  const rings = ctx.rings.filter(q => q !== A && q !== B && q.c.y + q.r > lo && q.c.y - q.r < hi && q.c.x > lx && q.c.x < hx);
  const boxes = ctx.boxes.filter(q => q.bottom > lo && q.top < hi);
  const key = [A.free ? 1 : 0, A.r, B.free ? 1 : 0, B.r, k1(p0.x), k1(p3.x), k1(p3.y - p0.y), k1(da.x * 100), k1(da.y * 100), k1(db.x * 100), k1(db.y * 100), ctx.w, ctx.g, k1(ctx.minR), ctx.need, B.badge ? 1 : 0,
    ways.map(q => `${k1(q.u)},${k1(q.tau)},${k1(q.off)}`).join(';'), rings.map(q => `${k1(q.c.x)},${k1(q.c.y - p0.y)},${q.r}`).join(';'), boxes.map(q => `${k1(q.left)},${k1(q.right)},${k1(q.top - p0.y)},${k1(q.bottom - p0.y)}`).join(';')].join('|');
  const move = (e: Eval, dy: number): Eval => ({...e, vis: e.vis.map(c => c.map(q => ({x: q.x, y: q.y + dy}))) as unknown as [Cubic, Cubic]});
  const hit = CACHE.get(key);
  if (hit) return move(hit, p0.y);
  let best: Eval | null = null;
  search: for (const wp of ways) for (const k of HANDLES) {
    const e = judge(A, B, da, db, shape(A, B, da, db, wp, k), ctx, rings, boxes);
    if (!best || e.hard < best.hard || (e.hard === best.hard && e.soft < best.soft)) best = e;
    if (e.hard === 0 && e.soft === 0) break search;
  }
  if (CACHE.size > 40_000) CACHE.clear();
  CACHE.set(key, move(best!, -p0.y));
  return best!;
}

/**
 * The directions a node may take the line through it, best first: leaning away from its name tab (toward the side the
 * river swings on to), seeded 8–20° off upright; then gentler, upright, steeper, and a little the other way — never more
 * than 12° toward the tab. Planets and the finale pass straight down.
 */
function candidates(S: Station, lean: number): Pt[] {
  if (!S.free) return [{x: 0, y: 1}];
  const lo = S.tab === 'left' ? -12 * DEG : -64 * DEG, hi = S.tab === 'right' ? 12 * DEG : 64 * DEG, seen = new Set<number>(), out: Pt[] = [];
  for (const t0 of [lean, 0, lean * 2, -lean * .6]) {
    const t = clamp(t0, lo, hi), key = Math.round(t / DEG);
    if (seen.has(key)) continue; seen.add(key);
    out.push({x: Math.sin(t), y: Math.cos(t)});
  }
  return out;
}
/**
 * A stretch's waypoints, best first. Where its ends already lie a third of the column apart, its own seeded waypoint swings
 * a little to one side; where they lie closer, the waypoint swings out far enough for the stretch to cover 30 % of the
 * column — to the side the bows take in turn, else the other.
 */
function waysFor(seed: string, id: string, w: number, side: number, A: Station, B: Station): Way[] {
  const r = seeded(`${seed}|bow|${id}`), u = .4 + r() * .2, tau = .42 + r() * .16, dx = Math.abs(B.entry.x - A.exit.x);
  const need = Math.max(0, w * RIVER.swing + 16 - dx + (A.free ? A.r * .4 : 0) + (B.free ? B.r * .4 : 0)), amp = Math.max(need, (.08 + r() * .08) * w) * side;
  return [{u, tau, off: amp}, {u, tau, off: -amp}, {u: .5, tau: .5, off: amp * 1.4}, {u: .5, tau: .5, off: -amp * 1.4}, {u: .5, tau: .5, off: amp * .5}];
}

export type RiverResult = {segments: FlowSegment[]; bad: string[]; hard: Record<string, number>};
/**
 * The phone's river through `nodes` (in path order: an orbit's planet before its nodes, the finale last), drawn under them.
 * Each node takes its first direction and each stretch its first waypoint that keeps every rule; a stretch that cannot
 * tries its two nodes' other directions, keeping the pair that leaves it and its neighbours cleanest — two rounds at
 * most, never a loop. `bad` names the stretches (`a>b`) still breaking a rule: the layout widens their space and draws
 * again.
 */
export function riverLine(nodes: readonly FlowNode[], o: RiverOptions): RiverResult {
  const g = o.gutter ?? 8, need = o.clearance ?? RIVER.clearance, S = nodes.map(stationOf), out: FlowSegment[] = [], bad: string[] = [], hard: Record<string, number> = {};
  if (!S.length) return {segments: out, bad, hard};
  const ctx: Ctx = {w: o.w, g, minR: o.minRadius, need, rings: S, boxes: o.obstacles ?? []};
  // (Each node leans away from its tab, 8–20°, seeded; each stretch bows to a side that alternates, now and then the same.)
  const C = S.map(s => candidates(s, s.free ? (s.tab === 'left' ? 1 : -1) * (16 + seeded(`${o.seed}|lean|${s.id}`)() * 12) * DEG : 0));
  const rs = seeded(`${o.seed}|bows`);
  let side = rs() < .5 ? 1 : -1;
  const W = S.slice(1).map((s, i) => { if (rs() >= .2) side = -side; return waysFor(o.seed, `${S[i]!.id}>${s.id}`, o.w, side, S[i]!, s); });
  const pick: number[] = S.map(() => 0);
  const stretch = (i: number, ka = pick[i]!, kb = pick[i + 1]!) => evalStretch(S[i]!, S[i + 1]!, C[i]![ka]!, C[i + 1]![kb]!, W[i]!, ctx);
  let E = S.slice(1).map((_, i) => stretch(i));
  for (let round = 0; round < 2; round++) {
    let changed = false;
    for (let i = 0; i < E.length; i++) {
      if (E[i]!.hard === 0) continue;
      const near = [i - 1, i, i + 1].filter(j => j >= 0 && j < E.length);
      let best: {hard: number; rank: number; ka: number; kb: number} | null = null;
      pairs: for (let ka = 0; ka < Math.min(3, C[i]!.length); ka++) for (let kb = 0; kb < Math.min(3, C[i + 1]!.length); kb++) {
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
  const pathOf = (cs: readonly Cubic[]) => `M${f(cs[0]![0].x)} ${f(cs[0]![0].y)}${cs.map(c => ` C${f(c[1].x)} ${f(c[1].y)} ${f(c[2].x)} ${f(c[2].y)} ${f(c[3].x)} ${f(c[3].y)}`).join('')}`;
  const seg = (s: Station, e: Station, cs: readonly Cubic[], kind: FlowSegment['kind'], from: string | null, to: string | null, fromColour: string, toColour: string, fromLit: boolean, toLit: boolean): FlowSegment => {
    const a = cs[0]![0], b = cs.at(-1)![3];
    return {id: kind === 'lead' ? `lead:${e.id}` : kind === 'tail' ? `tail:${s.id}` : `${s.id}>${e.id}`, from, to, kind, d: pathOf(cs), x1: a.x, y1: a.y, x2: b.x, y2: b.y, fromColour, toColour, fromLit, toLit};
  };
  // The lead-in: from above, down into the first station along its course.
  const first = S[0]!, d0 = dirs[0]!;
  if (o.leadFrom !== null && o.leadFrom !== undefined && o.leadFrom < first.entry.y - (first.free ? first.r : 0) - 1) {
    const dy = first.entry.y - o.leadFrom, sx = clamp(first.entry.x - d0.x / d0.y * dy * .5, g, o.w - g);
    const ctrl: Cubic = [{x: sx, y: o.leadFrom}, {x: sx, y: o.leadFrom + dy * .45}, {x: first.entry.x - d0.x * dy * .45, y: first.entry.y - d0.y * dy * .45}, first.entry];
    out.push(seg(first, first, [first.free ? subCubic(ctrl, 0, ringT(ctrl, first.c, first.r, 'end')) : ctrl], 'lead', null, first.id, first.colour, first.colour, false, first.done));
  }
  for (let i = 0; i + 1 < S.length; i++) {
    const a = S[i]!, b = S[i + 1]!, e = E[i]!;
    if (e.hard > 0) { bad.push(`${a.id}>${b.id}`); hard[`${a.id}>${b.id}`] = e.hard; }
    out.push(seg(a, b, e.vis, 'step', a.id, b.id, a.colour, b.colour, a.done, b.done));
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
    out.push(seg(last, last, [vis!], 'tail', last.id, null, last.colour, last.colour, last.done, false));
  }
  return {segments: out, bad, hard};
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
  /** The nodes' and orbits' own ids (the line is seeded by them, so the model draws exactly the page's line). */
  ids?: readonly string[]; orbitIds?: readonly string[];
};
export type RiverLayout = {
  lanes: RiverLane[];
  /** The space above each orbit's banner (the first is 0: it opens the stage). */
  orbitGaps: number[];
  /** The space above the finale. */
  finaleGap: number;
  /** The model the lanes were checked on: every station, the boxes the line keeps clear of, its line, the stage's height. */
  nodes: FlowNode[]; boxes: FlowBox[]; segments: FlowSegment[]; bad: string[]; hard: Record<string, number>; h: number;
  /** Per orbit: its banner's top and foot (stage px). */
  banners: {top: number; bottom: number}[];
};

/** The day's finale's id on the path (components/path/path.tsx `FINALE_POINT`). */
export const FINALE = 'finale:end';
/** Rounds of widening a space where a stretch breaks a rule, and how far any space may grow. */
const ROUNDS = 22, GROW = 40, MAX_GAP = 400;
/** Where a node stands across the width: the left third, the right third, or the middle. */
type Zone = 'L' | 'C' | 'R';

/**
 * The zones, node by node, as the cheapest sequence that keeps the rules (a small dynamic programme over the last two
 * stations): along the river's stations — the nodes, and each orbit's planet, which stands in the right third — every three
 * in a row hold the left third and the right third, so the river crosses the width again and again and never three
 * stations stand in one half. Costs: a swing across the width 0; into or out of the middle 1.5 (it needs a bow to cover
 * 30 % of the column); the same zone twice in a row 6 (a bow out and back on one side, the dearest in height; 12 among
 * the path's first three nodes); the middle
 * among the path's first three nodes 6 more (the first screen wants its swings wide), and only where the name fits there
 * on one line, never beside a planet; a node in the right third just before or after a planet (under it) 50; and a
 * seeded nudge of up to 1 per
 * choice, so paths differ. Exact and bounded: 9 states × 3 choices per station.
 */
function zonesFor(stations: readonly ('planet' | number)[], middleOk: readonly boolean[], rnd: () => number): Zone[] {
  const Z: Zone[] = ['L', 'C', 'R'], n = stations.length;
  if (!n) return [];
  const nudge = stations.map(() => Z.map(() => rnd()));
  const near = (i: number) => stations[i - 1] === 'planet' || stations[i + 1] === 'planet';
  const cost = (i: number, zone: Zone, prev: Zone | null) => {
    const st = stations[i]!;
    if (st === 'planet') return zone === 'R' ? 0 : Infinity;
    // (A swing across is free; into or out of the middle it needs a bow; on one side, a bow out and back — the dearest.)
    const swing = prev === null ? 0 : prev === zone ? (st < 3 ? 12 : 6) : prev === 'C' || zone === 'C' ? 1.5 : 0;
    // (Beside a planet a node stands in the left third: from the right third it would sit under the planet, and from the
    // middle its swing to the planet would be too short.)
    return (zone === 'C' && (!middleOk[st] || near(i)) ? Infinity : 0) + swing + (near(i) && zone === 'R' ? 50 : 0) + (zone === 'C' && st < 3 ? 6 : 0) + nudge[i]![Z.indexOf(zone)]!;
  };
  const pickOne = (i: number) => Z.reduce((x, y) => cost(i, y, null) < cost(i, x, null) ? y : x);
  let z: Zone[];
  if (n === 1) z = [pickOne(0)];
  else {
    // (best[a][b]: the least cost of a sequence ending with zones a, b; from[i][a][b]: the zone before a.)
    let best = Z.map(x => Z.map(y => cost(0, x, null) + cost(1, y, x)));
    const from: number[][][] = [];
    for (let i = 2; i < n; i++) {
      const next = Z.map(() => Z.map(() => Infinity)), back = Z.map(() => Z.map(() => 0));
      Z.forEach((x, ix) => Z.forEach((y, iy) => Z.forEach((c, ic) => {
        if (![x, y, c].includes('L') || ![x, y, c].includes('R')) return;
        const v = best[ix]![iy]! + cost(i, c, y);
        if (v < next[iy]![ic]!) { next[iy]![ic] = v; back[iy]![ic] = ix; }
      })));
      best = next; from.push(back);
    }
    let ia = 0, ib = 0, m = Infinity;
    best.forEach((row, x) => row.forEach((v, y) => { if (v < m) { m = v; ia = x; ib = y; } }));
    z = [Z[ia]!, Z[ib]!];
    for (let i = n - 1; i >= 2; i--) { const prev = from[i - 2]![ia]![ib]!; z.unshift(Z[prev]!); ib = ia; ia = prev; }
    // (Where every sequence breaks a rule — a lone planet between two one-node orbits, say — left and right in turn.)
    if (m === Infinity) z = stations.map((st, i) => st === 'planet' ? 'R' : i % 2 ? 'R' : 'L');
  }
  return z.filter((_, i) => stations[i] !== 'planet');
}

export function phoneRiver(input: RiverInput): RiverLayout {
  const {w, seed, tabs, orbits, planetR} = input, vw = input.vw ?? w + 24, R = RIVER.r, n = tabs.length;
  const xmin = RIVER.margin + R + RIVER.halo, xmax = Math.max(xmin, w - xmin);
  const rnd = seeded(`${seed}|phone-river|${Math.round(w)}`);
  const planetX = w - RIVER.planetEdge - planetR;
  const hasPlanet = (s: number) => input.planets?.[s] ?? true;
  const fitsOn = (x: number, side: 'left' | 'right', tab: number) => side === 'right' ? x + RIVER.tabReach + tab <= w - RIVER.margin : x - RIVER.tabReach - tab >= RIVER.margin;
  const nodeIds = tabs.map((_, i) => input.ids?.[i] ?? `n${i}`), planetIds = orbits.map((_, s) => `planet:${input.orbitIds?.[s] ?? s}`);
  // 1. The zones: who opens an orbit out of its planet, who closes one before the next planet, who may stand in the middle.
  const opens: boolean[] = [], closes: boolean[] = [], stations: ('planet' | number)[] = [];
  orbits.forEach((count, s) => {
    const next = orbits.findIndex((c, i) => i > s && c > 0);
    if (count > 0 && hasPlanet(s)) stations.push('planet');
    for (let j = 0; j < count; j++) { stations.push(opens.length); opens.push(j === 0 && hasPlanet(s)); closes.push(j === count - 1 && next > 0 && hasPlanet(next)); }
  });
  const third = w / 3, cLo = third + 8, cHi = w - third - 8;
  const middleOk = tabs.map(tab => fitsOn(cHi, 'left', tab) || fitsOn(cLo, 'right', tab));
  const zones = zonesFor(stations, middleOk, rnd);
  // 2. Where in its zone each node stands, and its tab: on the side the line comes from (above it), else the other side,
  //    else (a name too long even there) wrapped at the edge — the node keeps its zone, the swing comes first.
  const lanes: RiverLane[] = [];
  let prevX = hasPlanet(0) ? planetX : w / 2;
  orbits.forEach((count, s) => {
    for (let j = 0; j < count; j++) {
      const k = lanes.length, zone = zones[k]!, tab = tabs[k]!, from = j === 0 && hasPlanet(s) ? planetX : prevX;
      // (Toward the outer edge of its third, so the river reaches across the whole width.)
      // (An orbit's first node out of its planet stands toward the outer edge — the planet's sweep spans the width; the others in
      // their third, toward its inner part, where each swing across costs the least height.)
      const span = third - 6 - xmin, [za, zb] = opens[k] ? [0, .35] : [.3, 1];
      const [lo, hi] = zone === 'L' ? [xmin + span * za, xmin + span * zb] : zone === 'R' ? [xmax - span * zb, xmax - span * za] : [cLo, cHi];
      const top = closes[k] ? Math.max(lo, Math.min(hi, planetX - .38 * w)) : hi;
      let x = lo + rnd() * Math.max(0, top - lo);
      const entry: 'left' | 'right' = Math.abs(from - x) < 6 ? (x < w / 2 ? 'right' : 'left') : from > x ? 'right' : 'left', other = entry === 'right' ? 'left' : 'right';
      let side: 'left' | 'right' = entry;
      // (A long name moves its node within its zone, toward the edge that gives its tab room.)
      const room = (sd: 'left' | 'right') => sd === 'right' ? clamp(w - RIVER.margin - RIVER.tabReach - tab, lo, top) : clamp(RIVER.margin + RIVER.tabReach + tab, lo, top);
      if (!fitsOn(x, side, tab)) { const y = room(side); if (fitsOn(y, side, tab)) x = y; else { const z = room(other); if (fitsOn(z, other, tab)) { x = z; side = other; } } }
      let wrap = false, maxTab = tab, lines = 1;
      if (!fitsOn(x, side, tab)) {
        // (Too long for one line even at the edge: it wraps there, every line shown — never "…".)
        x = side === 'right' ? lo : top;
        maxTab = Math.max(80, side === 'right' ? w - RIVER.margin - x - RIVER.tabReach : x - RIVER.tabReach - RIVER.margin);
        wrap = true; lines = Math.ceil(tab / maxTab);
      }
      const zigiRoom = side === 'right' ? x - R - RIVER.halo - 10 - input.zigi >= RIVER.margin : x + R + RIVER.halo + 10 + input.zigi <= w - RIVER.margin;
      lanes.push({x: Math.round(x * 10) / 10, side, wrap, maxTab, lines, zigi: zigiRoom ? 'side' : 'above', gap: 0});
      prevX = x;
    }
  });
  // 3. The spaces: each orbit goes through a palette in a seeded order (so any four in a row hold a close one and a far
  //    one), plus a share of the sideways travel; then widened only where a stretch needs the room for its swing.
  const PALETTE = [52, 74, 96, 122];
  {
    let at = 0, px = planetX;
    orbits.forEach((count, s) => {
      const order = [0, 1, 2, 3].map(q => ({q, r: rnd()})).sort((a, b) => a.r - b.r).map(x => x.q);
      for (let j = 0; j < count; j++, at++) {
        const from = j === 0 && hasPlanet(s) ? planetX : px, dx = Math.abs(lanes[at]!.x - from);
        // (A swing across needs its height: about half its width, less the node itself.)
        // (The path's first three nodes start from the close end of the palette: the first screen should hold three.)
        const base = j === 0 ? 46 + rnd() * 20 : at < 3 ? PALETTE[order[(j - 1) % 4]! % 2]! + rnd() * 10 : PALETTE[order[(j - 1) % 4]!]! + rnd() * 10;
        lanes[at]!.gap = Math.max(base, dx * .55 - 20);
        px = lanes[at]!.x;
      }
    });
  }
  const orbitGaps = orbits.map((_, s) => s === 0 ? 0 : 62 + rnd() * 24);
  let finaleGap = 40;
  const minR = riverMinRadius(vw), wantFinale = input.finale ?? true;
  let model = build();
  for (let round = 0; round < ROUNDS && model.bad.length; round++) {
    let grew = false;
    for (const id of model.bad) {
      const to = id.slice(id.indexOf('>') + 1), i = nodeIds.indexOf(to), s = planetIds.indexOf(to);
      // (The further a stretch is from keeping the rules, the more room it is given at once.)
      const more = clamp(6 + (model.hard[id] ?? 0) * .25, 8, GROW);
      if (i >= 0) { if (lanes[i]!.gap < MAX_GAP) { lanes[i]!.gap += more; grew = true; } }
      else if (s >= 0) { if (orbitGaps[s]! < MAX_GAP) { orbitGaps[s]! += more; grew = true; } }
      else if (to === FINALE && finaleGap < MAX_GAP) { finaleGap += more; grew = true; }
    }
    if (!grew) break;
    model = build();
  }
  // (In an orbit of five or more, some spaces close and some far: where the rules happened to give one pitch, one of its
  // spaces opens up — kept only if the line still keeps every rule.)
  {
    let i0 = 0;
    for (const count of orbits) {
      const gaps = lanes.slice(i0 + 1, i0 + count).map(l => l.gap);
      if (gaps.length >= 4 && Math.max(...gaps) - Math.min(...gaps) < 32) {
        // (The widest space opens further, or the closest closes in — either way the spread grows.)
        const order = gaps.map((g, q) => ({g, at: i0 + 1 + q})).sort((a, b) => b.g - a.g).map(x => x.at);
        tries: for (const more of [36, -28, 52, -40, 72]) for (let t = 0; t < order.length; t++) {
          const at = more > 0 ? order[t]! : order[order.length - 1 - t]!;
          lanes[at]!.gap += more;
          const trial = build();
          if (trial.bad.some(b => !model.bad.includes(b))) lanes[at]!.gap -= more; else { model = trial; break tries; }
        }
      }
      i0 += count;
    }
  }
  // (Three whole nodes on a phone's first screen where the third just misses it: the first three spaces give back what the
  // rules let them, 6 px at a time, at most 60 px in all — kept only while the line keeps every rule.)
  if (input.view && (orbits[0] ?? 0) >= 3) {
    const third3 = () => model.nodes.find(q => q.id === nodeIds[2])!.y + R - input.view!.bottom;
    let over = third3(), budget = 60;
    while (over > 0 && over <= 60 && budget > 0) {
      let done = false;
      for (const at of [1, 2, 0]) {
        if (lanes[at]!.gap < 40) continue;
        lanes[at]!.gap -= 6;
        const trial = build();
        if (trial.bad.length <= model.bad.length && !trial.bad.some(b => !model.bad.includes(b))) { model = trial; done = true; break; }
        lanes[at]!.gap += 6;
      }
      if (!done) break;
      budget -= 6; over = third3();
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
    const {segments, bad, hard} = riverLine(nodes, {w, seed, minRadius: minR, obstacles: boxes, leadFrom: 0, tailTo: wantFinale ? h - 4 : null});
    // (And a node never stands on the tab of the node above it.)
    for (let q = 1; q < n; q++) {
      const a = nodes.find(x => x.id === nodeIds[q])!, t = boxes.find(b => b.id === `tab:${nodeIds[q - 1]}`)!;
      const dx = Math.max(t.left - a.x, 0, a.x - t.right), dy = Math.max(t.top - a.y, 0, a.y - t.bottom);
      if (Math.hypot(dx, dy) < R + RIVER.halo + 4 && !bad.some(b => b.endsWith(`>${nodeIds[q]}`))) { bad.push(`${nodeIds[q - 1]}>${nodeIds[q]}`); hard[`${nodeIds[q - 1]}>${nodeIds[q]}`] = 40; }
    }
    return {nodes, boxes, segments, bad, hard, h, banners};
  }
}
