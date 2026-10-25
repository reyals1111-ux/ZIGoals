import {rimPoint, seeded, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L24, L25; owner amendments 10c and 10d): the phone's line.
 * - Node → node: the computer's own stretch (`flowSegments`' construction: in on the name's side and out on the other,
 *   heading straight down; on the same side a loop bowing out past both rims through a seeded waypoint, across a swing
 *   through a waypoint near the middle; its turning height, amplitude and offset seeded from the two ids), at amendment
 *   10b's strength (the swing stretched as 10b stretched the path), on the phone's node places (10c) — but never
 *   clamped: where a loop would leave the column it shrinks smoothly until it fits, or bows to the side with room; it
 *   stays a loop, never flattened against the gutter.
 * - Planet → first node and last node → planet: one smooth sweep (one cubic), upright at the planet's rim (10c).
 * - Everywhere: no bump under 14 px (no micro-wiggle) and no straight run within 2° of upright for more than 24 px,
 *   except into or out of a planet; every point inside the column.
 * Each stretch's candidates are tried in order — the computer's own first — and the first that passes is drawn. Pure.
 */
type V = {x: number; y: number};
export type Cubic = [V, V, V, V];
export type LineOptions = {w: number; seed: string; swing: number; gutter: number; leadFrom: number | null; tailTo: number | null;
  /** boxes the line must not cross (the banners' pills) */ avoid?: {l: number; t: number; r: number; b: number}[];
  /** stretch ids drawn smaller than seeded, or mirrored, to fit (filled in) */ fitted?: Set<string>};

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const sideSign = (s: FlowNode['outSide']) => s === 'right' ? 1 : s === 'left' ? -1 : 0;
const isPlanet = (id: string | null) => !!id && id.startsWith('planet:');
const RAD = Math.PI / 180;
/** The owner's numbers (amendments 10c, 10d). */
export const LINE_RULES = {bump: 14, join: 1, upright: 2, uprightRun: 24};

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
  const pts: {x: number; y: number; s: number; k: number; up: number}[] = [];
  let s = 0, prev: V | null = null;
  pieces.forEach((c, pi) => {
    for (let j = pi ? 1 : 0; j <= per; j++) {
      const t = j / per, p = at(c, t), v = d1(c, t), sp = Math.hypot(v.x, v.y);
      if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({x: p.x, y: p.y, s, k: curv(c, t), up: sp < 1e-9 ? 0 : Math.asin(Math.min(1, Math.abs(v.x) / sp)) / RAD});
      prev = p;
    }
  });
  return pts;
}
/** Each line point sampled for the overlap checks (tabs, banners), `per` to a cubic. */
export function linePointsOf(segments: readonly {d: string}[], per = 24): V[] {
  return segments.flatMap(sg => piecesOf(sg.d).flatMap((c, i) => Array.from({length: per + (i ? 0 : 1)}, (_, j) => at(c, (j + (i ? 1 : 0)) / per))));
}
/** A loop's reach (owner amendment 10d): how far its waypoint — where its two cubics join — stands out past both of its
 *  ends, sideways; 0 for a stretch of one cubic or a swing between its ends. */
export function excursion(d: string): number {
  const pieces = piecesOf(d);
  if (pieces.length < 2) return 0;
  const p = pieces[0]![0], q = pieces.at(-1)![3], m = pieces[0]![3];
  return Math.max(0, m.x - Math.max(p.x, q.x), Math.min(p.x, q.x) - m.x);
}

/**
 * The owner's line checks (amendments 10c, 10d) for one stretch, each returning what breaks it: no bump (the arc between
 * two inflections) under 14 px from its chord; joins within 1°; no run within 2° of upright longer than 24 px unless it
 * starts or ends at a planet; a planet's stretch one cubic, upright at the planet's rim; every point inside the column.
 */
export function stretchFaults(sg: Pick<FlowSegment, 'id' | 'from' | 'to' | 'd'>, w: number, gutter: number): string[] {
  const pieces = piecesOf(sg.d), out: string[] = [];
  if (!pieces.length) return out;
  // (A planet's stretch: one sweep — one cubic, or, where its node stands nearly above or below the planet, one gentle
  // bow of two C1 cubics out to the inner side; never a swing's two pieces.)
  if ((isPlanet(sg.from) || isPlanet(sg.to)) && (pieces.length > 2 || (pieces.length === 2 && !(excursion(sg.d) > 0)))) out.push(`${sg.id}: a planet's stretch in ${pieces.length} pieces`);
  if (isPlanet(sg.from) && Math.abs(pieces[0]![1].x - pieces[0]![0].x) > .05) out.push(`${sg.id}: not upright out of its planet`);
  if (isPlanet(sg.to) && Math.abs(pieces.at(-1)![2].x - pieces.at(-1)![3].x) > .05) out.push(`${sg.id}: not upright into its planet`);
  for (let i = 1; i < pieces.length; i++) {
    const a = d1(pieces[i - 1]!, 1), b = d1(pieces[i]!, 0), ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) / RAD;
    if (ang > LINE_RULES.join) out.push(`${sg.id}: a join turns ${ang.toFixed(1)}°`);
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
  for (let i = 1; i < flips.length; i++) {
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

// The shapes. P and Q are the stretch's ends, both heading straight down.
/** One smooth sweep: one cubic, its turn at `turn` of the drop (a planet's stretch). */
function sweep(P: V, Q: V, turn: number): Cubic[] {
  const dy = Q.y - P.y, h = .6;
  return [[P, {x: P.x, y: P.y + dy * h * 2 * turn}, {x: Q.x, y: Q.y - dy * h * 2 * (1 - turn)}, Q]];
}
/** The computer's own stretch (`flowSegments`), unclamped, through its waypoint `mx` at `turn` of the drop. */
function computerStretch(P: V, Q: V, same: boolean, mx: number, turn: number): Cubic[] {
  const dy = Q.y - P.y, my = P.y + dy * turn;
  const tx = (Q.x - P.x) * (same ? .15 : .9), len = Math.hypot(tx, dy) || 1, ux = tx / len, uy = dy / len;
  const l1 = (my - P.y) * .5, l2 = (Q.y - my) * .5, M = {x: mx, y: my};
  return [[P, {x: P.x, y: P.y + (my - P.y) * .62}, {x: mx - ux * l1, y: my - uy * l1}, M], [M, {x: mx + ux * l2, y: my + uy * l2}, {x: Q.x, y: Q.y - (Q.y - my) * .62}, Q]];
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

/** Where a node stands nearly above or below its planet: closer across than this share of the width (owner, 10d OK). */
export const PLANET_NEAR = .25;
/** A planet sweep's tightest bend, at least (px): never a hook — about the computer's own loops' (their tenth
 *  percentile on the phone is 7 px). */
export const PLANET_SWEEP_RADIUS = 8;
/**
 * Owner fix 1 after the 10d checkpoint: a planet's stretch whose node stands nearly above or below the planet never drops
 * straight down. It sweeps gently out to the inner side, its waypoint 15–20 % of the width past its ends (seeded), and
 * into the planet's top (or out of its bottom) upright. Drawn only where it passes every line check and crosses nothing
 * — no ring, banner or tab (`avoid`) — so the layout around it stays exactly as it was; else the sweep as it was.
 */
export function planetSweep(sg: FlowSegment, stations: readonly FlowNode[], o: {w: number; gutter: number; seed: string; avoid: LineOptions['avoid']}): string | null {
  const a = stations.find(n => n.id === sg.from), b = stations.find(n => n.id === sg.to);
  if (!a || !b || sg.kind !== 'step' || isPlanet(a.id) === isPlanet(b.id)) return null;
  const planet = isPlanet(a.id) ? a : b, node = planet === a ? b : a;
  if (Math.abs(node.x - planet.x) >= PLANET_NEAR * o.w) return null;
  const pieces = piecesOf(sg.d), P = pieces[0]![0], Q = pieces.at(-1)![3], s = planet.x > o.w / 2 ? -1 : 1;
  const r = seeded(`${o.seed}|planet-sweep|${sg.id}`), turn = .4 + r() * .2, share = .15 + r() * .05;
  // (A gentle bow: upright at both ends and at its waypoint, each half one even S. Its seeded reach and turn, then the
  // turn lower or higher — under the node's own tab, or above the next one's — the gentlest that fits first.)
  const bowAt = (f: number, t: number, k: number): Cubic[] => {
    const M = {x: (s < 0 ? Math.min(P.x, Q.x) : Math.max(P.x, Q.x)) + s * f * o.w, y: P.y + (Q.y - P.y) * t}, h1 = (M.y - P.y) * k, h2 = (Q.y - M.y) * k;
    return [[P, {x: P.x, y: P.y + h1}, {x: M.x, y: M.y - h1}, M], [M, {x: M.x, y: M.y + h2}, {x: Q.x, y: Q.y - h2}, Q]];
  };
  // (Where the node's own tab, just under it on the inner side, leaves no room for 15–20 %, the widest sweep that passes
  // beside the tab instead: 13, 11, 9, 7 or 5 % — never a straight drop, never a moved tab.)
  const sweepsAt = (shares: number[]) => shares.flatMap(f => [turn, .5, .6, .4, .68, .32, .76, .24].flatMap(t => [.5, .56, .62].map(k => bowAt(f, t, k)))).map(c => ({c, r: leastRadius(c)})).filter(x => x.r >= PLANET_SWEEP_RADIUS).sort((x, y) => y.r - x.r);
  for (const {c} of [...sweepsAt([share, .175, .15, .2]), ...sweepsAt([.13]), ...sweepsAt([.11]), ...sweepsAt([.09]), ...sweepsAt([.07]), ...sweepsAt([.05])]) {
    if (!c.every(p => p.every(q => q.x >= o.gutter + 1 && q.x <= o.w - o.gutter - 1))) continue;
    const d = pathD(c);
    if (stretchFaults({...sg, d}, o.w, o.gutter).length || !clear(c, stations, a.id, b.id, o.avoid)) continue;
    return d;
  }
  return null;
}
/** The tightest bend on a stretch (its least radius of curvature, px). */
export function leastRadius(pieces: readonly Cubic[]): number {
  let m = Infinity;
  for (const c of pieces) for (let j = 0; j <= 48; j++) { const k = Math.abs(curv(c, j / 48)); if (k > 1e-9) m = Math.min(m, 1 / k); }
  return m;
}

/** The phone's line over its stations (planets, nodes, the finale), in the computer's format. */
export function phoneLine(stations: readonly FlowNode[], o: LineOptions): FlowSegment[] {
  const out: FlowSegment[] = [], g = o.gutter, inside = (x: number) => x >= g + 1 && x <= o.w - g - 1;
  const first = stations[0], last = stations.at(-1);
  if (!first || !last) return out;
  // Pick the first candidate inside the column (never touching the gutter's edge: nothing is clamped) that passes every
  // check and stays clear; else the one with the fewest faults. `tag` marks a candidate smaller than seeded, or mirrored.
  const choose = (id: string, from: string | null, to: string | null, cands: {c: Cubic[]; fitted: boolean}[]) => {
    let best: {d: string; n: number; fitted: boolean} | null = null;
    for (const {c, fitted} of cands) {
      if (!c.every(p => p.every(q => inside(q.x)))) continue;
      const d = pathD(c), faults = stretchFaults({id, from, to, d}, o.w, g).length + (clear(c, stations, from, to, o.avoid) ? 0 : 1);
      if (!faults) { if (fitted) o.fitted?.add(id); return d; }
      if (!best || faults < best.n) best = {d, n: faults, fitted};
    }
    if (best?.fitted) o.fitted?.add(id);
    return best?.d ?? pathD(cands.at(-1)!.c);
  };
  // The lead-in: the computer's, from the top down into the first station — mirrored or shorter where it would leave.
  if (o.leadFrom !== null && o.leadFrom < first.y - first.r) {
    const r = seeded(`${o.seed}|lead|${first.id}`), Q = rimPoint(first, first.inSide), s0 = sideSign(first.inSide) || (r() < .5 ? -1 : 1), k = .25 + r() * .35;
    const cands = [s0, -s0].flatMap(s => [1, .8, .6, .4].map(m => { const x = Q.x + s * o.swing * k * m, P = {x, y: o.leadFrom!}, dy = Q.y - P.y; return {c: [[P, {x, y: P.y + dy * .55}, {x: Q.x, y: Q.y - dy * .55}, Q]] as Cubic[], fitted: m < 1 || s !== s0}; }));
    const d = choose(`lead:${first.id}`, null, first.id, cands), p = piecesOf(d)[0]![0];
    out.push({id: `lead:${first.id}`, from: null, to: first.id, kind: 'lead', d, x1: p.x, y1: o.leadFrom, x2: Q.x, y2: Q.y, fromColour: first.colour, toColour: first.colour, fromLit: false, toLit: first.done});
  }
  for (let i = 0; i + 1 < stations.length; i++) {
    const a = stations[i]!, b = stations[i + 1]!, P = rimPoint(a, a.outSide), Q = rimPoint(b, b.inSide), id = `${a.id}>${b.id}`;
    const base = {id, from: a.id, to: b.id, kind: 'step' as const, x1: P.x, y1: P.y, x2: Q.x, y2: Q.y, fromColour: a.colour, toColour: b.colour, fromLit: a.done, toLit: b.done};
    if (Q.y - P.y <= 1) { out.push({...base, d: `M${f(P.x)} ${f(P.y)} L${f(Q.x)} ${f(Q.y)}`}); continue; }
    // (The computer's seeds, in its order: the turning height, the amplitude, the swing's offset.)
    const r = seeded(`${o.seed}|${id}`), turn = .38 + r() * .24, amp = o.swing * (.35 + r() * .65), off = r() - .5, sa = sideSign(a.outSide);
    if (isPlanet(a.id) || isPlanet(b.id)) {
      // A planet's stretch: one smooth sweep, its turn the computer's, then a little higher or lower.
      out.push({...base, d: choose(id, a.id, b.id, [turn, .5, .4, .6].map((t, k) => ({c: sweep(P, Q, t), fitted: k > 0})))});
      continue;
    }
    const same = sa !== 0 && a.outSide === b.inSide;
    let cands: {c: Cubic[]; fitted: boolean}[];
    if (same) {
      // A loop: past both rims on its side by the computer's 0.55 × amplitude; else smaller, smoothly, to fit; else the
      // same loop on the side with room; larger only where a seeded loop would leave a bump under 14 px or a straight run.
      const end = (s: number) => s > 0 ? Math.max(P.x, Q.x) : Math.min(P.x, Q.x), A = amp * .55;
      const loops = (s: number, mirrored: boolean) => [1, .9, .8, .7, .6, .5, .4, 1.2, 1.4, 1.7].map(m => ({c: computerStretch(P, Q, true, end(s) + s * A * m, turn), fitted: mirrored || m < 1}));
      cands = [...loops(sa, false), ...loops(-sa, true)];
    } else {
      // A swing: through the computer's waypoint near the middle; where that wobbles (a bump under 14 px) or runs upright,
      // the same swing bowed deliberately wider its own way, then the other way; last, one smooth sweep.
      const mid = P.x + (Q.x - P.x) * turn, dir = off < 0 ? -1 : 1, px = (k: number) => ({c: computerStretch(P, Q, false, mid + k * amp * .5, turn), fitted: Math.abs(k) < Math.abs(off) - 1e-9 || (k !== 0 && Math.sign(k) !== dir)});
      cands = [...[off, dir * .6, dir * .8, dir * 1.05, -dir * .6, -dir * .8, -dir * 1.05, dir * 1.4, -dir * 1.4, dir * 1.8, -dir * 1.8].map(px), {c: sweep(P, Q, turn), fitted: true}];
    }
    out.push({...base, d: choose(id, a.id, b.id, cands)});
  }
  // The tail: the computer's, on past the last station, fading out — mirrored or shorter where it would leave.
  if (o.tailTo !== null && o.tailTo > last.y + last.r) {
    const r = seeded(`${o.seed}|tail|${last.id}`), P = rimPoint(last, last.outSide), s0 = sideSign(last.outSide) || 1, k = .15 + r() * .3, dy = o.tailTo - P.y;
    const cands = [s0, -s0].flatMap(s => [1, .8, .6, .4].map(m => { const ex = P.x + s * o.swing * k * m; return {c: [[P, {x: P.x, y: P.y + dy * .5}, {x: ex, y: o.tailTo! - dy * .45}, {x: ex, y: o.tailTo!}]] as Cubic[], fitted: m < 1 || s !== s0}; }));
    const d = choose(`tail:${last.id}`, last.id, null, cands), end = piecesOf(d)[0]![3];
    out.push({id: `tail:${last.id}`, from: last.id, to: null, kind: 'tail', d, x1: P.x, y1: P.y, x2: end.x, y2: end.y, fromColour: last.colour, toColour: last.colour, fromLit: last.done, toLit: false});
  }
  return out;
}
