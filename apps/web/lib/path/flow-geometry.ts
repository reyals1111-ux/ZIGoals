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
 */
/** A node's side point; an orbit's planet (Session AG Polish, owner Part 4) takes the line in at its top and lets it out at its bottom. */
export type FlowSide = 'left' | 'right' | 'top' | 'bottom';
export type FlowNode = {id: string; x: number; y: number; r: number; inSide: FlowSide; outSide: FlowSide; colour: string; done: boolean};
export type FlowSegment = {id: string; from: string | null; to: string | null; kind: 'step' | 'lead' | 'tail'; d: string;
  /** The gradient runs from (x1, y1) in `fromColour` to (x2, y2) in `toColour`. */
  x1: number; y1: number; x2: number; y2: number; fromColour: string; toColour: string; fromLit: boolean; toLit: boolean};
export type FlowOptions = {w: number; seed: string; swing: number; gutter?: number; leadFrom?: number | null; tailTo?: number | null;
  /** Session AG Polish 2 (phones only): a stretch bows at least this far (px) from the straight line between its ends. */
  minBow?: number;
  /** Session AG Polish 2 (phones only): boxes the line keeps `clearance` px away from (name tabs, banners). */
  obstacles?: readonly FlowBox[]; clearance?: number;
  /** Filled in when `obstacles` is given: the obstacles a stretch still comes too near after every try (its best try is drawn). */
  blocked?: Set<string>};
export type FlowBox = {id: string; left: number; top: number; right: number; bottom: number};
/** Owner amendment 1 (ADR-031): at most this many shapes are tried per stretch; then the best one is kept. */
export const MAX_TRIES = 12;

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
    const r = seeded(`${o.seed}|${id}`), sa = sign(a.outSide), same = sa !== 0 && a.outSide === b.inSide;
    // One shape of the stretch: where it turns (a share of its height), how far it swings, and (crossing) how far off the middle.
    const shape = (turn: number, amp: number, jitter: number, bowSign = 0) => {
      // Same side: bow out past both rims on that side. Across: swing through the middle, a little off it either way.
      let mx = clampX(same ? (sa > 0 ? Math.max(p0.x, p3.x) : Math.min(p0.x, p3.x)) + sa * amp * .55 : p0.x + (p3.x - p0.x) * turn + jitter * amp * .5);
      const my = p0.y + dy * turn;
      // (Phones: a stretch whose ends nearly line up still bows clearly — out to the side with room, never a straight drop.)
      if (o.minBow && Math.abs(p3.x - p0.x) < o.minBow * 1.5) {
        const chord = p0.x + (p3.x - p0.x) * turn, off = mx - chord;
        if (Math.abs(off) < o.minBow) {
          const want = bowSign || (off !== 0 ? Math.sign(off) : chord < o.w / 2 ? 1 : -1), there = clampX(chord + want * o.minBow);
          mx = Math.abs(there - chord) >= o.minBow * .9 ? there : clampX(chord - want * o.minBow);
        }
      }
      // (The tangent at the waypoint: nearly upright for a bow, along the swing for a crossing.)
      const tx = (p3.x - p0.x) * (same ? .15 : .9), ty = dy, len = Math.hypot(tx, ty) || 1, ux = tx / len, uy = ty / len;
      const l1 = (my - p0.y) * .5, l2 = (p3.y - my) * .5;
      const c1 = {x: p0.x, y: p0.y + (my - p0.y) * .62}, c2 = {x: clampX(mx - ux * l1), y: my - uy * l1}, c3 = {x: clampX(mx + ux * l2), y: my + uy * l2}, c4 = {x: p3.x, y: p3.y - (p3.y - my) * .62};
      return {d: `M${f(p0.x)} ${f(p0.y)} C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(mx)} ${f(my)} C${f(c3.x)} ${f(c3.y)} ${f(c4.x)} ${f(c4.y)} ${f(p3.x)} ${f(p3.y)}`,
        pts: [p0, c1, c2, {x: mx, y: my}, c3, c4, p3]};
    };
    // (The first shape draws its numbers in the order Session AG did, so a computer's line is exactly as before.)
    const turn0 = .38 + r() * .24, amp0 = o.swing * (.35 + r() * .65), first = shape(turn0, amp0, same ? 0 : r() - .5);
    const near = o.obstacles?.filter(q => q.bottom > Math.min(p0.y, p3.y) - 40 && q.top < Math.max(p0.y, p3.y) + 40) ?? [];
    if (!near.length) { out.push({...base, d: first.d}); continue; }
    // Owner amendment 1 (ADR-031): up to MAX_TRIES shapes, seeded, until one keeps clear of every tab and banner near it;
    // if none does, the one with the most room is drawn and the obstacles it still meets are reported (the caller moves that tab).
    const need = o.clearance ?? 6;
    let best = {d: first.d, room: clearanceOf(first.pts, near)};
    for (let k = 1; k < MAX_TRIES && best.room.min < need; k++) {
      const s = shape(.3 + r() * .4, o.swing * (.3 + r() * .8), same ? 0 : r() - .5, r() < .5 ? -1 : 1), room = clearanceOf(s.pts, near);
      if (room.min > best.room.min) best = {d: s.d, room};
    }
    if (best.room.min < need) for (const q of best.room.hits(need)) o.blocked?.add(q);
    out.push({...base, d: best.d});
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

/** Points along a stretch made of two cubic Béziers (its seven control points), `n` per half. */
export function bezierPoints(c: readonly {x: number; y: number}[], n = 24): {x: number; y: number}[] {
  const out: {x: number; y: number}[] = [];
  for (let h = 0; h + 3 < c.length; h += 3) {
    const [a, b, d, e] = [c[h]!, c[h + 1]!, c[h + 2]!, c[h + 3]!];
    for (let i = h ? 1 : 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push({x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t ** 3 * e.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t ** 3 * e.y}); }
  }
  return out;
}
/** How near a stretch comes to each box (px; negative inside it): the least of all, and which boxes come nearer than a limit. */
function clearanceOf(ctrl: readonly {x: number; y: number}[], boxes: readonly FlowBox[]) {
  const pts = bezierPoints(ctrl), by = new Map<string, number>();
  for (const q of boxes) {
    let m = Infinity;
    for (const p of pts) {
      const dx = Math.max(q.left - p.x, 0, p.x - q.right), dy = Math.max(q.top - p.y, 0, p.y - q.bottom);
      const d = dx || dy ? Math.hypot(dx, dy) : -Math.min(p.x - q.left, q.right - p.x, p.y - q.top, q.bottom - p.y);
      if (d < m) m = d;
    }
    by.set(q.id, m);
  }
  return {min: Math.min(...by.values()), hits: (limit: number) => [...by].filter(([, d]) => d < limit).map(([id]) => id)};
}

/** Which side a node takes the line in on (its name's side) and lets it out on (the other). */
export const sidesFor = (nameSide: FlowSide): {inSide: FlowSide; outSide: FlowSide} => ({inSide: nameSide, outSide: nameSide === 'left' ? 'right' : 'left'});
