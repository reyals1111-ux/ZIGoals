import {rimPoint, seeded, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L24; owner amendment 10c, the checkpoint reply): the phone's line. The computer's own
 * logic — a node takes the line in on its name's side and lets it out on the other, heading straight down; on the same
 * side a stretch bows out past both rims, across it swings over; a planet takes it in at its top and lets it out at its
 * bottom; each stretch's turning height and amplitude seeded from its two ids — drawn so that on a phone:
 * - no curve point is ever clamped to the gutter: a bow that would leave the column shrinks smoothly until it fits, or
 *   turns to the side with room; a lead-in or tail that would leave it is mirrored;
 * - every stretch is ONE calm curve (one cubic) or ONE deliberate loop (two cubics joined C1 at the loop's apex, curving
 *   the same way on both sides of the join): at most 2 curvature sign changes, inflections 60 px of arc apart or more,
 *   no bump under 14 px, joins within 1°;
 * - nothing runs within 2° of upright for more than 24 px, except into or out of a planet.
 * Each stretch's candidates are tried in the computer's order (its own kind, its seeded amplitude, then smaller, then the
 * other side, then a plain swing) and the first that passes every check is drawn. Pure; computed when the path is laid out.
 */
type V = {x: number; y: number};
export type Cubic = [V, V, V, V];
export type LineOptions = {w: number; seed: string; swing: number; gutter: number; leadFrom: number | null; tailTo: number | null;
  /** boxes the line must not cross (the banners' pills) */ avoid?: {l: number; t: number; r: number; b: number}[]};

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const sideSign = (s: FlowNode['outSide']) => s === 'right' ? 1 : s === 'left' ? -1 : 0;
const isPlanet = (id: string | null) => !!id && id.startsWith('planet:');
const RAD = Math.PI / 180;
/** The owner's numbers (amendment 10c). */
export const LINE_RULES = {signChanges: 2, inflectionGap: 60, bump: 14, join: 1, upright: 2, uprightRun: 24};

export const pathD = (pieces: readonly Cubic[]) => pieces.length ? `M${f(pieces[0]![0].x)} ${f(pieces[0]![0].y)}${pieces.map(c => ` C${f(c[1].x)} ${f(c[1].y)} ${f(c[2].x)} ${f(c[2].y)} ${f(c[3].x)} ${f(c[3].y)}`).join('')}` : '';
/** The cubics of path data written as `M x y C … C …` (an `L` stretch reads as one straight cubic). */
export function piecesOf(d: string): Cubic[] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), out: Cubic[] = [];
  if (/L/.test(d) && n.length === 4) { const a = {x: n[0]!, y: n[1]!}, b = {x: n[2]!, y: n[3]!}; return [[a, {x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3}, {x: a.x + (b.x - a.x) * 2 / 3, y: a.y + (b.y - a.y) * 2 / 3}, b]]; }
  for (let i = 2; i + 5 < n.length; i += 6) out.push([{x: n[i - 2]!, y: n[i - 1]!}, {x: n[i]!, y: n[i + 1]!}, {x: n[i + 2]!, y: n[i + 3]!}, {x: n[i + 4]!, y: n[i + 5]!}]);
  return out;
}
const at = (c: Cubic, t: number): V => { const u = 1 - t; return {x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x, y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y}; };
const d1 = (c: Cubic, t: number): V => { const u = 1 - t; return {x: 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x), y: 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y)}; };
const d2 = (c: Cubic, t: number): V => ({x: 6 * (1 - t) * (c[2].x - 2 * c[1].x + c[0].x) + 6 * t * (c[3].x - 2 * c[2].x + c[1].x), y: 6 * (1 - t) * (c[2].y - 2 * c[1].y + c[0].y) + 6 * t * (c[3].y - 2 * c[2].y + c[1].y)});
const curv = (c: Cubic, t: number) => { const v = d1(c, t), a = d2(c, t), s = Math.hypot(v.x, v.y); return s < 1e-9 ? 0 : (v.x * a.y - v.y * a.x) / (s * s * s); };
/** A stretch sampled finely: points, arc length, curvature and the angle from upright at each sample. */
function sample(pieces: readonly Cubic[], per = 64) {
  const pts: {x: number; y: number; s: number; k: number; up: number; piece: number}[] = [];
  let s = 0, prev: V | null = null;
  pieces.forEach((c, pi) => {
    for (let j = pi ? 1 : 0; j <= per; j++) {
      const t = j / per, p = at(c, t), v = d1(c, t), sp = Math.hypot(v.x, v.y);
      if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({x: p.x, y: p.y, s, k: curv(c, t), up: sp < 1e-9 ? 0 : Math.asin(Math.min(1, Math.abs(v.x) / sp)) / RAD, piece: pi});
      prev = p;
    }
  });
  return pts;
}
/** Each line point sampled for the overlap checks (tabs, banners), `per` to a cubic. */
export function linePointsOf(segments: readonly {d: string}[], per = 24): V[] {
  return segments.flatMap(sg => piecesOf(sg.d).flatMap((c, i) => Array.from({length: per + (i ? 0 : 1)}, (_, j) => at(c, (j + (i ? 1 : 0)) / per))));
}

/**
 * The owner's line checks for one stretch (amendment 10c), each returning what breaks it: at most 2 cubics; joins within
 * 1° and curving the same way; at most 2 curvature sign changes; inflections 60 px of arc apart; no bump (the arc between
 * two inflections) under 14 px from its chord; no run within 2° of upright longer than 24 px unless it starts or ends at a
 * planet; every point inside the column's gutter (so nothing was clamped: a clamped point would sit on the gutter's edge
 * in an upright run, which the run check catches).
 */
export function stretchFaults(sg: Pick<FlowSegment, 'id' | 'from' | 'to' | 'd'>, w: number, gutter: number): string[] {
  const pieces = piecesOf(sg.d), out: string[] = [];
  if (!pieces.length) return out;
  if (pieces.length > 2) out.push(`${sg.id}: ${pieces.length} cubic pieces`);
  for (let i = 1; i < pieces.length; i++) {
    const a = d1(pieces[i - 1]!, 1), b = d1(pieces[i]!, 0), ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) / RAD;
    if (ang > LINE_RULES.join) out.push(`${sg.id}: a join turns ${ang.toFixed(1)}°`);
    const ka = curv(pieces[i - 1]!, 1), kb = curv(pieces[i]!, 0);
    if (Math.abs(ka) > 1e-4 && Math.abs(kb) > 1e-4 && Math.sign(ka) !== Math.sign(kb)) out.push(`${sg.id}: a join changes its curving`);
  }
  const pts = sample(pieces), eps = 2e-4;
  // (Inflections: where the curvature's sign flips, ignoring stretches flatter than a 5000 px radius.)
  const flips: number[] = [];
  let last = 0;
  for (let i = 0; i < pts.length; i++) {
    const k = pts[i]!.k, sgn = k > eps ? 1 : k < -eps ? -1 : 0;
    if (!sgn) continue;
    if (last && sgn !== last) { let j = i - 1; while (j > 0 && Math.abs(pts[j]!.k) <= eps) j--; flips.push((pts[i]!.s + pts[j]!.s) / 2); }
    last = sgn;
  }
  if (flips.length > LINE_RULES.signChanges) out.push(`${sg.id}: ${flips.length} curvature sign changes`);
  for (let i = 1; i < flips.length; i++) {
    if (flips[i]! - flips[i - 1]! < LINE_RULES.inflectionGap) out.push(`${sg.id}: inflections ${Math.round(flips[i]! - flips[i - 1]!)} px apart`);
    const a = pts.find(p => p.s >= flips[i - 1]!)!, b = pts.find(p => p.s >= flips[i]!)!, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const amp = Math.max(...pts.filter(p => p.s >= a.s && p.s <= b.s).map(p => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L));
    if (amp < LINE_RULES.bump) out.push(`${sg.id}: a bump of ${amp.toFixed(1)} px`);
  }
  // (Upright runs.)
  const total = pts.at(-1)!.s;
  let from = -1;
  for (let i = 0; i <= pts.length; i++) {
    const up = i < pts.length && pts[i]!.up <= LINE_RULES.upright;
    if (up && from < 0) from = i;
    if (!up && from >= 0) {
      const s0 = pts[from]!.s, s1 = pts[i - 1]!.s, len = s1 - s0;
      const planetEnd = (s0 <= .5 && isPlanet(sg.from)) || (s1 >= total - .5 && isPlanet(sg.to));
      if (len > LINE_RULES.uprightRun && !planetEnd) out.push(`${sg.id}: ${Math.round(len)} px within ${LINE_RULES.upright}° of upright`);
      from = -1;
    }
  }
  if (pts.some(p => p.x < gutter - .05 || p.x > w - gutter + .05)) out.push(`${sg.id}: leaves the column`);
  return out;
}
/** The whole line's faults (every stretch). */
export const lineFaults = (segments: readonly Pick<FlowSegment, 'id' | 'from' | 'to' | 'd'>[], w: number, gutter: number) => segments.flatMap(sg => stretchFaults(sg, w, gutter));

/** The least radius of curvature on a stretch (a calm curve has no tight hook). */
function leastRadius(pieces: readonly Cubic[]) { return Math.min(...sample(pieces, 48).map(p => Math.abs(p.k) < 1e-9 ? Infinity : 1 / Math.abs(p.k))); }

// The shapes. P and Q are the stretch's ends, both heading straight down.
/** One calm swing: one cubic, its turn at `turn` of the drop. */
function swing(P: V, Q: V, turn: number): Cubic[] {
  const dy = Q.y - P.y, h = .6;
  return [[P, {x: P.x, y: P.y + dy * h * 2 * turn}, {x: Q.x, y: Q.y - dy * h * 2 * (1 - turn)}, Q]];
}
/** One loop: out past both ends on side `s` by `A`, its apex at `turn` of the drop; two cubics joined C1 at the apex. */
function bow(P: V, Q: V, s: number, A: number, turn: number): Cubic[] {
  const dy = Q.y - P.y, M = {x: (s > 0 ? Math.max(P.x, Q.x) : Math.min(P.x, Q.x)) + s * A, y: P.y + dy * turn};
  const tx = (Q.x - P.x) * .15, len = Math.hypot(tx, dy) || 1, u = {x: tx / len, y: dy / len};
  const h1 = M.y - P.y, h2 = Q.y - M.y, l1 = h1 * .5, l2 = h2 * .5;
  return [[P, {x: P.x, y: P.y + h1 * .5}, {x: M.x - u.x * l1, y: M.y - u.y * l1}, M], [M, {x: M.x + u.x * l2, y: M.y + u.y * l2}, {x: Q.x, y: Q.y - h2 * .5}, Q]];
}

/** Whether a stretch's curve stays clear of every ring it does not end at, its own rings and the boxes to avoid. */
function clear(pieces: readonly Cubic[], stations: readonly FlowNode[], a: string | null, b: string | null, avoid: LineOptions['avoid']): boolean {
  const pts = sample(pieces, 32), top = Math.min(...pts.map(p => p.y)), bottom = Math.max(...pts.map(p => p.y));
  for (const n of stations) {
    if (n.y + n.r + 4 < top || n.y - n.r - 4 > bottom) continue;
    const own = n.id === a || n.id === b, need = own ? n.r - .6 : n.r + 4;
    if (pts.some(p => Math.hypot(p.x - n.x, p.y - n.y) < need)) return false;
  }
  return !(avoid ?? []).some(bx => pts.some(p => p.x > bx.l + 1 && p.x < bx.r - 1 && p.y > bx.t + 1 && p.y < bx.b - 1));
}

/** The phone's line over its stations (planets, nodes, the finale), in the computer's format. */
export function phoneLine(stations: readonly FlowNode[], o: LineOptions): FlowSegment[] {
  const out: FlowSegment[] = [], g = o.gutter, inside = (x: number) => x >= g + 1 && x <= o.w - g - 1;
  const first = stations[0], last = stations.at(-1);
  if (!first || !last) return out;
  // Pick the first candidate that passes every check and stays clear; else the one with the fewest faults.
  const choose = (id: string, from: string | null, to: string | null, cands: Cubic[][]) => {
    let best: {d: string; n: number} | null = null;
    for (const c of cands) {
      if (!c.every(p => p.every(q => inside(q.x)))) continue;
      const d = pathD(c), faults = stretchFaults({id, from, to, d}, o.w, g).length + (clear(c, stations, from, to, o.avoid) ? 0 : 1) + (leastRadius(c) < 12 ? 1 : 0);
      if (!faults) return d;
      if (!best || faults < best.n) best = {d, n: faults};
    }
    return best?.d ?? pathD(cands.at(-1)!);
  };
  // The lead-in: from the top down into the first station, from the side the computer's seed picks — or the other.
  if (o.leadFrom !== null && o.leadFrom < first.y - first.r) {
    const r = seeded(`${o.seed}|lead|${first.id}`), Q = rimPoint(first, first.inSide), s0 = sideSign(first.inSide) || (r() < .5 ? -1 : 1), k = .25 + r() * .35;
    const cands = [s0, -s0].flatMap(s => [1, .7, .45].map(m => { const x = Q.x + s * o.swing * k * m, P = {x, y: o.leadFrom!}, dy = Q.y - P.y; return [[P, {x, y: P.y + dy * .55}, {x: Q.x, y: Q.y - dy * .55}, Q]] as Cubic[]; }));
    out.push({id: `lead:${first.id}`, from: null, to: first.id, kind: 'lead', d: choose(`lead:${first.id}`, null, first.id, cands), x1: cands[0]![0]![0].x, y1: o.leadFrom, x2: Q.x, y2: Q.y, fromColour: first.colour, toColour: first.colour, fromLit: false, toLit: first.done});
    const sg = out.at(-1)!, p = piecesOf(sg.d)[0]![0]; sg.x1 = p.x;
  }
  for (let i = 0; i + 1 < stations.length; i++) {
    const a = stations[i]!, b = stations[i + 1]!, P = rimPoint(a, a.outSide), Q = rimPoint(b, b.inSide), id = `${a.id}>${b.id}`;
    const base = {id, from: a.id, to: b.id, kind: 'step' as const, x1: P.x, y1: P.y, x2: Q.x, y2: Q.y, fromColour: a.colour, toColour: b.colour, fromLit: a.done, toLit: b.done};
    if (Q.y - P.y <= 1) { out.push({...base, d: `M${f(P.x)} ${f(P.y)} L${f(Q.x)} ${f(Q.y)}`}); continue; }
    const r = seeded(`${o.seed}|${id}`), turn = .38 + r() * .24, amp = o.swing * (.35 + r() * .65), lean = r() < .5 ? -1 : 1, sa = sideSign(a.outSide);
    const same = sa !== 0 && a.outSide === b.inSide;
    // (A bow's side: the computer's for a same-side stretch; for a crossing that needs one, the seeded lean.)
    const bowSide = same ? sa : lean, room = (s: number) => s > 0 ? o.w - g - Math.max(P.x, Q.x) : Math.min(P.x, Q.x) - g;
    // (A bow's amplitude: the seeded one; where the drop is tall, as much more as keeps its apex from running upright
    // (a parabola's apex stays within 2° of upright over 0.035 × H² / A px); then smaller, smoothly, to fit the column.)
    const bows = (s: number) => {
      const fitIn = room(s) - 2, A0 = Math.min(amp * .55, fitIn), H = Math.max(turn, 1 - turn) * (Q.y - P.y), tall = Math.min(fitIn, H * H * .035 / (LINE_RULES.uprightRun * .8));
      // (Larger before smaller: a loop under about 28 px leaves a bump under 14 px.)
      const larger = [1.25, 1.5, 1.8, 2.2].map(m => A0 * m).filter(A => A <= fitIn);
      return [...(tall > A0 ? [tall, (tall + A0) / 2] : []), A0, ...larger, ...(fitIn > A0 * 2.2 ? [fitIn] : []), ...[.85, .7, .55, .4].map(m => A0 * m)].filter(A => A >= 8).map(A => bow(P, Q, s, A, turn));
    };
    const calm = swing(P, Q, turn);
    const cands = same ? [...bows(bowSide), calm, ...bows(-bowSide)] : [calm, ...bows(bowSide), ...bows(-bowSide)];
    out.push({...base, d: choose(id, a.id, b.id, cands)});
  }
  // The tail: on past the last station, to the seeded side — or the other — fading out.
  if (o.tailTo !== null && o.tailTo > last.y + last.r) {
    const r = seeded(`${o.seed}|tail|${last.id}`), P = rimPoint(last, last.outSide), s0 = sideSign(last.outSide) || 1, k = .15 + r() * .3, dy = o.tailTo - P.y;
    const cands = [s0, -s0].flatMap(s => [1, .7, .45].map(m => { const ex = P.x + s * o.swing * k * m; return [[P, {x: P.x, y: P.y + dy * .5}, {x: ex, y: o.tailTo! - dy * .45}, {x: ex, y: o.tailTo!}]] as Cubic[]; }));
    const d = choose(`tail:${last.id}`, last.id, null, cands), end = piecesOf(d)[0]![3];
    out.push({id: `tail:${last.id}`, from: last.id, to: null, kind: 'tail', d, x1: P.x, y1: P.y, x2: end.x, y2: end.y, fromColour: last.colour, toColour: last.colour, fromLit: last.done, toLit: false});
  }
  return out;
}
