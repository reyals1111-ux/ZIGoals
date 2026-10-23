import type {FlowBox, FlowNode, FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (owner amendment 7, ADR-032 L13): the owner's rules for the phone's river, read from a layout's drawn
 * path data and stations alone (the test's own geometry, independent of lib/path/phone-river.ts). Each check returns what
 * breaks it, so a test can show a wrong layout (reference 06, a strict zig-zag) failing as clearly as a good one passing.
 *
 * - The hard rules, per path: never upward, no radius under 40 px × width/390, inside the column, clear of every other ring,
 *   name tab and banner, planets top-in and bottom-out.
 * - The variety rules, over many paths: each stretch kind (drift, swing, sweep, bow) in 12 % of stretches or more; the
 *   left/right order not a strict alternation in 40 % or more of the paths with five nodes or more; no 20 %-wide band of the
 *   width holding more than 45 % of the nodes; in every orbit of four nodes or more, its spaces 60 px apart or more.
 */
type Pt = {x: number; y: number};
export type Drawn = {w: number; vw: number; nodes: readonly FlowNode[]; boxes: readonly FlowBox[]; segments: readonly FlowSegment[]};
function cubics(d: string): Pt[][] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), out: Pt[][] = [];
  if (d.includes('L')) { const a = {x: n[0]!, y: n[1]!}, b = {x: n[2]!, y: n[3]!}; return [[a, a, b, b]]; }
  let at = {x: n[0]!, y: n[1]!};
  for (let i = 2; i + 5 < n.length; i += 6) { const c = [at, {x: n[i]!, y: n[i + 1]!}, {x: n[i + 2]!, y: n[i + 3]!}, {x: n[i + 4]!, y: n[i + 5]!}]; out.push(c); at = c[3]!; }
  return out;
}
export function at(c: Pt[], t: number) {
  const [a, b, d, e] = c as [Pt, Pt, Pt, Pt], u = 1 - t;
  return {p: {x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t ** 3 * e.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t ** 3 * e.y},
    v: {x: 3 * u * u * (b.x - a.x) + 6 * u * t * (d.x - b.x) + 3 * t * t * (e.x - d.x), y: 3 * u * u * (b.y - a.y) + 6 * u * t * (d.y - b.y) + 3 * t * t * (e.y - d.y)},
    a: {x: 6 * u * (d.x - 2 * b.x + a.x) + 6 * t * (e.x - 2 * d.x + b.x), y: 6 * u * (d.y - 2 * b.y + a.y) + 6 * t * (e.y - 2 * d.y + b.y)}};
}
export const deg = (a: Pt, b: Pt) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)))) * 180 / Math.PI;
/** Each stretch read from its path data: its cubics, its points (64 a cubic), least radius, end tangents. */
export function read(segments: readonly FlowSegment[]) {
  return segments.map(s => {
    const cs = cubics(s.d), pts: Pt[] = []; let minR = Infinity;
    cs.forEach((c, q) => { for (let i = q ? 1 : 0; i <= 64; i++) { const {p, v, a} = at(c, i / 64), sp = Math.hypot(v.x, v.y); pts.push(p); if (sp > 1e-9) { const k = Math.abs(v.x * a.y - v.y * a.x) / sp ** 3; if (k > 0) minR = Math.min(minR, 1 / k); } } });
    return {s, cs, pts, minR, start: at(cs[0]!, 0).v, end: at(cs.at(-1)!, 1).v};
  });
}
export type Kind = 'drift' | 'swing' | 'sweep' | 'bow';
/**
 * A stretch's kind, from its shape (owner amendment 7): a bow when both ends are on the same side of their nodes, the line
 * passes out 16 px or more beyond both rims there and the two nodes stand within 30 % of the width of each other; else a sweep when it
 * travels 45 % of the width or more; else a swing when it crosses the middle; else a drift.
 */
export function kindOf(s: FlowSegment, a: FlowNode, b: FlowNode, w: number): Kind {
  const xs = read([s])[0]!.pts.map(p => p.x), lo = Math.min(...xs), hi = Math.max(...xs), side = (a.outSide === 'left' || a.outSide === 'right') && a.outSide === b.inSide ? a.outSide : null;
  if (side && Math.abs(a.x - b.x) <= .3 * w && (side === 'right' ? hi > Math.max(a.x, b.x) + Math.max(a.r, b.r) + 16 : lo < Math.min(a.x, b.x) - Math.max(a.r, b.r) - 16)) return 'bow';
  if (hi - lo >= .45 * w) return 'sweep';
  if (lo < w / 2 && hi > w / 2) return 'swing';
  return 'drift';
}
const isPlanet = (n: FlowNode) => n.id.startsWith('planet:');
const isNode = (n: FlowNode) => !isPlanet(n) && (n.inSide === 'left' || n.inSide === 'right');
/** The kinds of a path's stretches between stations, in order. */
export function kinds(d: Drawn): Kind[] {
  const by = new Map(d.nodes.map(n => [n.id, n]));
  return d.segments.filter(s => s.kind === 'step' && s.from && s.to && by.has(s.from) && by.has(s.to)).map(s => kindOf(s, by.get(s.from!)!, by.get(s.to!)!, d.w));
}

/** The hard rules, per path. */
export function hard(d: Drawn, o: {clearance?: number} = {}): string[] {
  const out: string[] = [], minR = 40 * d.vw / 390 - .5, c = o.clearance ?? 4, by = new Map(d.nodes.map(n => [n.id, n]));
  for (const {s, pts, minR: r, start, end} of read(d.segments)) {
    if (r < minR) out.push(`${s.id}: radius ${r.toFixed(1)} under ${minR.toFixed(1)}`);
    for (let i = 1; i < pts.length; i++) if (pts[i]!.y < pts[i - 1]!.y - 2) { out.push(`${s.id}: climbs at y ${Math.round(pts[i]!.y)}`); break; }
    if (pts.some(p => p.x < 0 || p.x > d.w)) out.push(`${s.id}: leaves the column`);
    for (const n of d.nodes) {
      if (n.id === s.from || n.id === s.to) continue;
      const need = n.r + (isPlanet(n) ? c : 6);
      if (pts.some(p => Math.hypot(p.x - n.x, p.y - n.y) < need)) out.push(`${s.id}: crosses ${n.id}`);
    }
    for (const b of d.boxes) if (pts.some(p => p.x > b.left - c && p.x < b.right + c && p.y > b.top - c && p.y < b.bottom + c)) out.push(`${s.id}: crosses ${b.id}`);
    // (Planets: in at the top and out at the bottom, upright.)
    const a = s.from ? by.get(s.from) : undefined, b = s.to ? by.get(s.to) : undefined;
    if (a && isPlanet(a) && (Math.abs(pts[0]!.x - a.x) > 1 || Math.abs(pts[0]!.y - (a.y + a.r)) > 1 || deg(start, {x: 0, y: 1}) > 1)) out.push(`${s.id}: not out of its planet's bottom, upright`);
    if (b && isPlanet(b) && (Math.abs(pts.at(-1)!.x - b.x) > 1 || Math.abs(pts.at(-1)!.y - (b.y - b.r)) > 1 || deg(end, {x: 0, y: 1}) > 1)) out.push(`${s.id}: not into its planet's top, upright`);
  }
  return out;
}

/** The orbits' nodes, in order (a planet opens an orbit). */
export function orbitsOf(d: Drawn): FlowNode[][] {
  const out: FlowNode[][] = [[]];
  for (const n of d.nodes) { if (isPlanet(n)) { if (out.at(-1)!.length) out.push([]); } else if (isNode(n)) out.at(-1)!.push(n); }
  return out.filter(o => o.length);
}
/** The variety rules, over many paths (owner amendment 7). */
export function variety(paths: readonly Drawn[]): string[] {
  const out: string[] = [], count: Record<Kind, number> = {drift: 0, swing: 0, sweep: 0, bow: 0};
  let all = 0;
  for (const d of paths) for (const k of kinds(d)) { count[k]++; all++; }
  for (const k of Object.keys(count) as Kind[]) if (count[k] < all * .12) out.push(`${k}: ${count[k]} of ${all} stretches, under 12 %`);
  // (Left or right of the middle, node by node: a strict alternation in most paths is a template, not a river.)
  const long = paths.map(d => d.nodes.filter(isNode).map(n => n.x < d.w / 2)).filter(s => s.length >= 5);
  const strict = long.filter(s => s.every((v, i) => !i || v !== s[i - 1])).length;
  if (long.length && long.length - strict < long.length * .4) out.push(`only ${long.length - strict} of ${long.length} paths of five nodes or more break the left/right alternation, under 40 %`);
  const bands = [0, 0, 0, 0, 0]; let nodes = 0;
  for (const d of paths) for (const n of d.nodes.filter(isNode)) { bands[Math.min(4, Math.max(0, Math.floor(n.x / d.w * 5)))]!++; nodes++; }
  bands.forEach((b, i) => { if (b > nodes * .45) out.push(`${b} of ${nodes} nodes in the band ${i * 20}–${i * 20 + 20} %, over 45 %`); });
  for (const d of paths) for (const o of orbitsOf(d)) {
    if (o.length < 4) continue;
    const gaps = o.slice(1).map((n, i) => n.y - o[i]!.y), spread = Math.max(...gaps) - Math.min(...gaps);
    if (spread < 60) out.push(`an orbit of ${o.length} nodes spaced ${gaps.map(Math.round).join(', ')}: spread ${Math.round(spread)} px, under 60`);
  }
  return out;
}
