import {stableHash} from './orbit-colours';

/**
 * Session AG (ADR-029; owner pointers 1–5, references 03–07): the geometry of the orbit path's one flowing neon line.
 * Pure (no React, no DOM): measured node centres and radii in, SVG path data out.
 *
 * - The line leaves each node's ring and enters the next one's TANGENTIALLY: at the ring's side point (left or right), heading
 *   straight down, so ring and line read as one stroke (reference 03). A node takes the line in on its name's side and lets
 *   it out on the other side.
 * - Between two nodes it flows through one waypoint: on the same side it bows out past both rims, across sides it swings
 *   through the middle — with an amplitude, a direction and a turning height of its own, seeded from the two nodes' ids, so
 *   no two stretches are the same curve and the same path is drawn the same on every visit (never Math.random).
 * - A lead-in flows down into the first node from above the first orbit's label and a tail runs on past the last node.
 * - Every point stays inside the column (`gutter` from each side): the page never scrolls sideways.
 * Computed when the path is measured (mount, resize, fonts), never per frame.
 *
 * Session AG Polish 2, owner amendment 5 (ADR-031 K16): on a phone (`ribbon`) the line is a ribbon instead — see
 * `ribbonSegments` below. A computer's line is exactly the one above.
 */
/** A node's side point; an orbit's planet (Session AG Polish, owner Part 4) takes the line in at its top and lets it out at its bottom. */
export type FlowSide = 'left' | 'right' | 'top' | 'bottom';
export type FlowNode = {id: string; x: number; y: number; r: number; inSide: FlowSide; outSide: FlowSide; colour: string; done: boolean;
  /** Ribbon only: the line passes this node straight down, whatever its neighbours (the day's finale). */
  upright?: boolean};
export type FlowSegment = {id: string; from: string | null; to: string | null; kind: 'step' | 'lead' | 'tail'; d: string;
  /** The gradient runs from (x1, y1) in `fromColour` to (x2, y2) in `toColour`. */
  x1: number; y1: number; x2: number; y2: number; fromColour: string; toColour: string; fromLit: boolean; toLit: boolean};
export type FlowOptions = {w: number; seed: string; swing: number; gutter?: number; leadFrom?: number | null; tailTo?: number | null;
  /** Session AG Polish 2, owner amendment 5 (phones): the smooth ribbon (`ribbonSegments`). */
  ribbon?: boolean;
  /** Ribbon only: boxes the line keeps `clearance` px from (name tabs, banners). They choose among clean curves and lean
   *  the nodes' passes; the line never bends around them. */
  obstacles?: readonly FlowBox[]; clearance?: number;
  /** Ribbon only: the least radius of curvature anywhere on the line (px). */
  minRadius?: number};
export type FlowBox = {id: string; left: number; top: number; right: number; bottom: number};

/** A small seeded random source (mulberry32): the same seed gives the same numbers everywhere. */
export function seeded(seed: string): () => number {
  let a = stableHash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sign = (s: FlowSide) => s === 'right' ? 1 : s === 'left' ? -1 : 0;
const f = (n: number) => (Math.round(n * 10) / 10).toString();
/** The point on a node's ring where the line meets it: its left or right side (a planet: its top or bottom). The line is
 *  never drawn across a planet: it ends at the top rim and starts again at the bottom rim, heading straight down. */
export const rimPoint = (n: Pick<FlowNode, 'x' | 'y' | 'r'>, side: FlowSide) => side === 'top' ? {x: n.x, y: n.y - n.r} : side === 'bottom' ? {x: n.x, y: n.y + n.r} : {x: n.x + sign(side) * n.r, y: n.y};

export function flowSegments(nodes: readonly FlowNode[], o: FlowOptions): FlowSegment[] {
  const g = o.gutter ?? 8, clampX = (x: number) => Math.min(o.w - g, Math.max(g, x)), out: FlowSegment[] = [];
  const first = nodes[0], last = nodes.at(-1);
  if (!first || !last) return out;
  if (o.ribbon) return ribbonSegments(nodes, o);
  // The lead-in: from above the first orbit's label, down into the first node's ring on its name's side.
  if (o.leadFrom !== null && o.leadFrom !== undefined && o.leadFrom < first.y - first.r) {
    const r = seeded(`${o.seed}|lead|${first.id}`), p3 = rimPoint(first, first.inSide), s = sign(first.inSide);
    const sx = clampX(p3.x + (s || (r() < .5 ? -1 : 1)) * o.swing * (.25 + r() * .35)), dy = p3.y - o.leadFrom;
    out.push({id: `lead:${first.id}`, from: null, to: first.id, kind: 'lead', d: `M${f(sx)} ${f(o.leadFrom)} C${f(sx)} ${f(o.leadFrom + dy * .55)} ${f(p3.x)} ${f(p3.y - dy * .55)} ${f(p3.x)} ${f(p3.y)}`,
      x1: sx, y1: o.leadFrom, x2: p3.x, y2: p3.y, fromColour: first.colour, toColour: first.colour, fromLit: false, toLit: first.done});
  }
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i]!, b = nodes[i + 1]!, p0 = rimPoint(a, a.outSide), p3 = rimPoint(b, b.inSide), dy = p3.y - p0.y;
    const id = `${a.id}>${b.id}`, base = {id, from: a.id, to: b.id, kind: 'step' as const, x1: p0.x, y1: p0.y, x2: p3.x, y2: p3.y, fromColour: a.colour, toColour: b.colour, fromLit: a.done, toLit: b.done};
    if (dy <= 1) { out.push({...base, d: `M${f(p0.x)} ${f(p0.y)} L${f(p3.x)} ${f(p3.y)}`}); continue; }
    const r = seeded(`${o.seed}|${id}`), turn = .38 + r() * .24, amp = o.swing * (.35 + r() * .65), sa = sign(a.outSide), same = sa !== 0 && a.outSide === b.inSide;
    // Same side: bow out past both rims on that side. Across: swing through the middle, a little off it either way.
    const mx = clampX(same ? (sa > 0 ? Math.max(p0.x, p3.x) : Math.min(p0.x, p3.x)) + sa * amp * .55 : p0.x + (p3.x - p0.x) * turn + (r() - .5) * amp * .5), my = p0.y + dy * turn;
    // (The tangent at the waypoint: nearly upright for a bow, along the swing for a crossing.)
    const tx = (p3.x - p0.x) * (same ? .15 : .9), ty = dy, len = Math.hypot(tx, ty) || 1, ux = tx / len, uy = ty / len;
    const l1 = (my - p0.y) * .5, l2 = (p3.y - my) * .5;
    const c1 = {x: p0.x, y: p0.y + (my - p0.y) * .62}, c2 = {x: clampX(mx - ux * l1), y: my - uy * l1}, c3 = {x: clampX(mx + ux * l2), y: my + uy * l2}, c4 = {x: p3.x, y: p3.y - (p3.y - my) * .62};
    out.push({...base, d: `M${f(p0.x)} ${f(p0.y)} C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(mx)} ${f(my)} C${f(c3.x)} ${f(c3.y)} ${f(c4.x)} ${f(c4.y)} ${f(p3.x)} ${f(p3.y)}`});
  }
  // The tail: on past the last node (to the day's finale), fading out.
  if (o.tailTo !== null && o.tailTo !== undefined && o.tailTo > last.y + last.r) {
    const r = seeded(`${o.seed}|tail|${last.id}`), p0 = rimPoint(last, last.outSide), s = sign(last.outSide), dy = o.tailTo - p0.y;
    const ex = clampX(p0.x + (s || 1) * o.swing * (.15 + r() * .3));
    out.push({id: `tail:${last.id}`, from: last.id, to: null, kind: 'tail', d: `M${f(p0.x)} ${f(p0.y)} C${f(p0.x)} ${f(p0.y + dy * .5)} ${f(ex)} ${f(o.tailTo - dy * .45)} ${f(ex)} ${f(o.tailTo)}`,
      x1: p0.x, y1: p0.y, x2: ex, y2: o.tailTo, fromColour: last.colour, toColour: last.colour, fromLit: last.done, toLit: false});
  }
  return out;
}

/** Owner amendment 5 (ADR-031 K16): the phone line's least radius of curvature (px; the owner's "about 40"). */
export const RIBBON_MIN_RADIUS = 42;
/** The most a node's pass leans from upright (radians: 40°). */
export const RIBBON_MAX_LEAN = 40 * Math.PI / 180;
type Pt = {x: number; y: number};
type Pass = {entry: Pt; exit: Pt; dir: Pt};

/**
 * Where the ribbon passes through a node: in at `entry` on its ring, out at the opposite point `exit`, heading `dir` at both —
 * so the line leaves a ring in exactly the direction it came in. A node leans its pass toward its name's side (`lean`,
 * radians from upright): the line comes in at the upper part of the name's side, from above the tab, and goes out at the
 * lower part of the other side, under the node. A planet (top/bottom) and an `upright` node pass straight down: the line
 * is never drawn across a planet, it ends at its top rim and goes on from its bottom rim (Session AG Polish, owner Part 4).
 */
export function passOf(n: FlowNode, lean: number): Pass {
  if (n.inSide === 'top' || n.inSide === 'bottom') return {entry: rimPoint(n, n.inSide), exit: rimPoint(n, n.outSide), dir: {x: 0, y: 1}};
  const s = n.inSide === 'right' ? 1 : -1, t = n.upright ? 0 : s * Math.min(RIBBON_MAX_LEAN, Math.abs(lean));
  const nx = s * Math.cos(t), ny = -s * Math.sin(t);
  return {entry: {x: n.x + n.r * nx, y: n.y + n.r * ny}, exit: {x: n.x - n.r * nx, y: n.y - n.r * ny}, dir: {x: Math.sin(t), y: Math.cos(t)}};
}

/** A cubic Bézier's point, first and second derivative at `t`. */
function cubicAt(c: readonly Pt[], t: number) {
  const [a, b, d, e] = c as [Pt, Pt, Pt, Pt], u = 1 - t;
  return {
    p: {x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t * t * t * e.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t * t * t * e.y},
    v: {x: 3 * (u * u * (b.x - a.x) + 2 * u * t * (d.x - b.x) + t * t * (e.x - d.x)), y: 3 * (u * u * (b.y - a.y) + 2 * u * t * (d.y - b.y) + t * t * (e.y - d.y))},
    acc: {x: 6 * (u * (d.x - 2 * b.x + a.x) + t * (e.x - 2 * d.x + b.x)), y: 6 * (u * (d.y - 2 * b.y + a.y) + t * (e.y - 2 * d.y + b.y))},
  };
}
/** Below this curvature (1/px) a piece counts as straight: its sign is not a turn. */
const FLAT = 1 / 3000;
/**
 * What a single cubic stretch is like (owner amendment 5's measures): how often its curvature changes sign (`turns`), its
 * least radius of curvature, whether it ever runs upward, whether it leaves [left, right], how near it comes to `rings`
 * (beyond its own two ends) and to `boxes`.
 */
export function curveFacts(c: readonly Pt[], o: {left: number; right: number; rings?: readonly {x: number; y: number; r: number}[]; boxes?: readonly FlowBox[]; n?: number}) {
  const n = o.n ?? 64, pts: Pt[] = [];
  let turns = 0, lastSign = 0, minRadius = Infinity, rises = false, outside = false;
  for (let i = 0; i <= n; i++) {
    const {p, v, acc} = cubicAt(c, i / n), speed = Math.hypot(v.x, v.y);
    pts.push(p);
    if (v.y < -1e-6) rises = true;
    if (p.x < o.left - .01 || p.x > o.right + .01) outside = true;
    const k = speed < 1e-9 ? Infinity : (v.x * acc.y - v.y * acc.x) / speed ** 3;
    if (Math.abs(k) > 0) minRadius = Math.min(minRadius, 1 / Math.abs(k));
    if (Math.abs(k) >= FLAT) { const s = k > 0 ? 1 : -1; if (lastSign && s !== lastSign) turns++; lastSign = s; }
  }
  // (The rings: beyond the stretch's first and last 4 %, where it leaves and meets its own two rings tangentially.)
  let ring = Infinity;
  for (const q of o.rings ?? []) for (let i = Math.ceil(n * .04); i <= n - Math.ceil(n * .04); i++) ring = Math.min(ring, Math.hypot(pts[i]!.x - q.x, pts[i]!.y - q.y) - q.r);
  let room = Infinity;
  for (const q of o.boxes ?? []) for (const p of pts) {
    const dx = Math.max(q.left - p.x, 0, p.x - q.right), dy = Math.max(q.top - p.y, 0, p.y - q.bottom);
    room = Math.min(room, dx || dy ? Math.hypot(dx, dy) : -Math.min(p.x - q.left, q.right - p.x, p.y - q.top, q.bottom - p.y));
  }
  return {turns, minRadius, rises, outside, ring, room, pts};
}

/**
 * Session AG Polish 2, owner amendment 5 (ADR-031 K16): the phone's line as one smooth ribbon, like the computer's.
 * - Each stretch between two nodes (or a node and a planet) is ONE cubic Bézier: at most one S-turn (its curvature changes
 *   sign at most once), never a radius under `minRadius`, never running upward, inside the column.
 * - It leaves each ring in exactly the direction it came in (`passOf`): each node leans its pass toward its name's side,
 *   about as its neighbours lie (seeded, so no two passes are alike), planets and the finale pass straight down.
 * - The handles' lengths are seeded per stretch (wide arcs that swing out past a node before curving back, gentle ones);
 *   a few lengths are tried in a fixed order until the stretch is clean and clear of the rings, tabs and banners. If none
 *   is, its two nodes ease their lean (half, then upright) and it is drawn again — a bounded pass, never a loop. The line
 *   is never bent around anything: what keeps it clear is the nodes' lanes, their tabs' sides and their leans.
 */
export function ribbonSegments(nodes: readonly FlowNode[], o: FlowOptions): FlowSegment[] {
  const g = o.gutter ?? 8, clampX = (x: number) => Math.min(o.w - g, Math.max(g, x)), minR = o.minRadius ?? RIBBON_MIN_RADIUS, need = o.clearance ?? 6, out: FlowSegment[] = [];
  const first = nodes[0]!, last = nodes.at(-1)!;
  // Each node's lean: the way its neighbours lie (the line through it runs from the one before toward the one after),
  // toward its name's side only (else upright), seeded a little wider or narrower, at most RIBBON_MAX_LEAN.
  const lean = nodes.map((n, i) => {
    if (n.upright || n.inSide === 'top' || n.inSide === 'bottom') return 0;
    const s = n.inSide === 'right' ? 1 : -1, p = nodes[i - 1] ?? n, q = nodes[i + 1] ?? n, k = .7 + seeded(`${o.seed}|lean|${n.id}`)() * .6;
    const way = (u: FlowNode, v: FlowNode) => Math.atan2(v.x - u.x, Math.max(1, v.y - u.y));
    // (Where its neighbours lie the other way, it leans more gently toward the one that lies its way, if one does.)
    const a = [way(p, q), way(n, q) * .6, way(p, n) * .6].find(x => s * x > 0) ?? 0;
    return Math.min(RIBBON_MAX_LEAN, s * a * k);
  });
  // Each node's choices, in order: its lean, half of it, upright (a planet and the finale: upright only).
  const opts = lean.map(l => l > 0 ? [l, l / 2, 0] : [0]);
  const pick = nodes.map(() => 0), passAt = (i: number, k = pick[i]!) => passOf(nodes[i]!, opts[i]![k]!);
  const score = (x: ReturnType<typeof curveFacts>) => Math.max(0, x.turns - 1) * 1000 + Math.max(0, minR - x.minRadius) * 10 + (x.rises ? 500 : 0) + (x.outside ? 500 : 0) + Math.max(0, -x.ring) * 20 + Math.max(0, need - x.room) * 5;
  const solve = (i: number, ps: readonly Pass[]) => {
    const a = nodes[i]!, b = nodes[i + 1]!, A = ps[i]!, B = ps[i + 1]!, p0 = A.exit, p3 = B.entry, L = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    if (p3.y - p0.y <= 1) return {d: `M${f(p0.x)} ${f(p0.y)} L${f(p3.x)} ${f(p3.y)}`, s: 0, ok: true, p0, p3};
    // (The handles' lengths, as shares of the stretch: a seeded pair first, then the others nearest it — at most 25 tries.)
    const r = seeded(`${o.seed}|ribbon|${a.id}>${b.id}`), k0 = .34 + r() * .18, skew = (r() - .5) * .24;
    const ks = [0, .12, -.1, .24, -.16].map(dk => Math.min(.8, Math.max(.18, k0 + dk)));
    const pairs = ks.flatMap((x, i) => ks.map((y, j) => ({ka: x * (1 + skew), kb: y * (1 - skew), rank: i + j + Math.abs(i - j) * .5}))).sort((p, q) => p.rank - q.rank);
    const lo = Math.min(p0.y, p3.y) - 2, hi = Math.max(p0.y, p3.y) + 2;
    const rings = nodes.filter(q => q.y + q.r > lo && q.y - q.r < hi).map(q => ({x: q.x, y: q.y, r: q === a || q === b ? q.r - .5 : q.r + 6}));
    const boxes = o.obstacles?.filter(q => q.bottom > lo && q.top < hi) ?? [];
    let best: {ctrl: Pt[]; s: number} | null = null;
    for (const {ka, kb} of pairs) {
      const ctrl = [p0, {x: p0.x + A.dir.x * ka * L, y: p0.y + A.dir.y * ka * L}, {x: p3.x - B.dir.x * kb * L, y: p3.y - B.dir.y * kb * L}, p3];
      const s = score(curveFacts(ctrl, {left: g, right: o.w - g, rings, boxes}));
      if (!best || s < best.s) best = {ctrl, s};
      if (s === 0) break;
    }
    const c = best!.ctrl;
    return {d: `M${f(c[0]!.x)} ${f(c[0]!.y)} C${f(c[1]!.x)} ${f(c[1]!.y)} ${f(c[2]!.x)} ${f(c[2]!.y)} ${f(c[3]!.x)} ${f(c[3]!.y)}`, s: best!.s, ok: best!.s === 0, p0, p3};
  };
  // (A stretch with no clean curve tries its two nodes' other choices — at most 3 × 3 — keeping the one that leaves it and
  // its neighbours cleanest; two rounds at most.)
  let ps = nodes.map((_, i) => passAt(i));
  const drawn = nodes.slice(1).map((_, i) => solve(i, ps));
  for (let round = 0; round < 2; round++) {
    let changed = false;
    for (let i = 0; i < drawn.length; i++) {
      if (drawn[i]!.ok) continue;
      const near = [i - 1, i, i + 1].filter(k => k >= 0 && k < drawn.length);
      let best: {bad: number; s: number; ka: number; kb: number; local: ReturnType<typeof solve>[]} | null = null;
      for (let ka = 0; ka < opts[i]!.length; ka++) for (let kb = 0; kb < opts[i + 1]!.length; kb++) {
        const trial = ps.slice(); trial[i] = passAt(i, ka); trial[i + 1] = passAt(i + 1, kb);
        const local = near.map(k => solve(k, trial)), bad = local.filter(x => !x.ok).length, s = local.reduce((t, x) => t + x.s, 0);
        if (!best || bad < best.bad || (bad === best.bad && s < best.s)) best = {bad, s, ka, kb, local};
      }
      if (best && (best.ka !== pick[i] || best.kb !== pick[i + 1])) {
        pick[i] = best.ka; pick[i + 1] = best.kb; ps = nodes.map((_, j) => passAt(j));
        near.forEach((k, j) => { drawn[k] = best!.local[j]!; });
        changed = true;
      }
    }
    if (!changed) break;
  }
  // The lead-in: from above into the first ring along its course, curving gently in where there is the height for it.
  if (o.leadFrom !== null && o.leadFrom !== undefined && o.leadFrom < first.y - first.r) {
    const P = ps[0]!, p3 = P.entry, dy = p3.y - o.leadFrom, r = seeded(`${o.seed}|lead|${first.id}`), back = clampX(p3.x - P.dir.x / P.dir.y * dy);
    const toward = p3.x < o.w / 2 ? 1 : -1, sx = clampX(p3.x - P.dir.x / P.dir.y * dy * .5 + toward * Math.min(o.swing * (.2 + r() * .3), dy * .3));
    const ctrl = [{x: sx, y: o.leadFrom}, {x: sx, y: o.leadFrom + dy * .45}, {x: p3.x - P.dir.x * dy * .45, y: p3.y - P.dir.y * dy * .45}, p3];
    const curved = curveFacts(ctrl, {left: g, right: o.w - g}).minRadius >= minR, x0 = curved ? sx : back;
    out.push({id: `lead:${first.id}`, from: null, to: first.id, kind: 'lead', d: curved ? `M${f(sx)} ${f(o.leadFrom)} C${f(sx)} ${f(ctrl[1]!.y)} ${f(ctrl[2]!.x)} ${f(ctrl[2]!.y)} ${f(p3.x)} ${f(p3.y)}` : `M${f(back)} ${f(o.leadFrom)} L${f(p3.x)} ${f(p3.y)}`,
      x1: x0, y1: o.leadFrom, x2: p3.x, y2: p3.y, fromColour: first.colour, toColour: first.colour, fromLit: false, toLit: first.done});
  }
  drawn.forEach((s, i) => {
    const a = nodes[i]!, b = nodes[i + 1]!;
    out.push({id: `${a.id}>${b.id}`, from: a.id, to: b.id, kind: 'step', d: s.d, x1: s.p0.x, y1: s.p0.y, x2: s.p3.x, y2: s.p3.y, fromColour: a.colour, toColour: b.colour, fromLit: a.done, toLit: b.done});
  });
  // The tail: on past the last ring, in the direction it left it, settling upright, fading out.
  if (o.tailTo !== null && o.tailTo !== undefined && o.tailTo > last.y + last.r) {
    const P = ps.at(-1)!, p0 = P.exit, dy = o.tailTo - p0.y, r = seeded(`${o.seed}|tail|${last.id}`), s = P.dir.x ? (P.dir.x > 0 ? 1 : -1) : sign(last.outSide) || 1;
    let c: Pt[] = [];
    for (const share of [.15 + r() * .3, .1, 0]) {
      const ex = clampX(p0.x + s * Math.min(o.swing * share, dy * .5)), ctrl = [p0, {x: p0.x + P.dir.x * dy * .5, y: p0.y + P.dir.y * dy * .5}, {x: ex, y: o.tailTo - dy * .45}, {x: ex, y: o.tailTo}];
      c = ctrl; if (curveFacts(ctrl, {left: g, right: o.w - g}).minRadius >= minR) break;
    }
    out.push({id: `tail:${last.id}`, from: last.id, to: null, kind: 'tail', d: `M${f(p0.x)} ${f(p0.y)} C${f(c[1]!.x)} ${f(c[1]!.y)} ${f(c[2]!.x)} ${f(c[2]!.y)} ${f(c[3]!.x)} ${f(c[3]!.y)}`,
      x1: p0.x, y1: p0.y, x2: c[3]!.x, y2: o.tailTo, fromColour: last.colour, toColour: last.colour, fromLit: last.done, toLit: false});
  }
  return out;
}

/** Which side a node takes the line in on (its name's side) and lets it out on (the other). */
export const sidesFor = (nameSide: FlowSide): {inSide: FlowSide; outSide: FlowSide} => ({inSide: nameSide, outSide: nameSide === 'left' ? 'right' : 'left'});
