import type {FlowBox, FlowNode, FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (owner amendment 6, ADR-032 L10): the owner's rules for the phone's river, read from a layout's drawn
 * path data and node centres alone (the test's own geometry, independent of lib/path/phone-river.ts). Each check returns
 * what breaks it, so a test can show a wrong layout (reference 06) failing as clearly as a good one passing.
 */
type Pt = {x: number; y: number};
export type Drawn = {w: number; vw: number; nodes: readonly FlowNode[]; boxes: readonly FlowBox[]; segments: readonly FlowSegment[]};
function cubics(d: string): Pt[][] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), out: Pt[][] = [];
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
const isNode = (n: FlowNode) => (n.inSide === 'left' || n.inSide === 'right') && !n.upright;
/** Rule 1, per stretch: two C1-joined cubics, a sideways swing ≥ 30 % of the column, bowing out ≥ 5 % beside its chord; and
 *  its swings alternate (never three to one side in a row, at least half the neighbours turned the other way). */
export function rule1(d: Drawn): string[] {
  const out: string[] = [], r = read(d.segments).filter(x => x.s.kind === 'step'), sides: number[] = [];
  for (const {s, cs, pts} of r) {
    if (cs.length !== 2) out.push(`${s.id}: ${cs.length} cubic(s), not two through a waypoint`);
    else if (deg(at(cs[0]!, 1).v, at(cs[1]!, 0).v) > 1) out.push(`${s.id}: a corner at its waypoint`);
    const xs = pts.map(p => p.x), swing = Math.max(...xs) - Math.min(...xs);
    if (swing < d.w * .3) out.push(`${s.id}: swings ${Math.round(swing)} px, under 30 % of ${Math.round(d.w)}`);
    const a = pts[0]!, b = pts.at(-1)!, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let dev = 0, side = 0;
    for (const p of pts) { const v = ((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / len; if (Math.abs(v) > Math.abs(dev)) dev = v; }
    side = Math.sign(dev);
    if (Math.abs(dev) < d.w * .05) out.push(`${s.id}: bows only ${Math.abs(dev).toFixed(1)} px beside its chord`);
    // (Which way it swings: the way it travels across, from its first point to its last.)
    // (Between two nodes only; a planet or the finale starts a new run.)
    sides.push(s.from && s.to && !s.from.startsWith('planet:') && !s.to.startsWith('planet:') && !s.to.startsWith('finale') ? Math.sign(b.x - a.x) || side : 0);
  }
  for (let i = 2; i < sides.length; i++) if (sides[i] && sides[i] === sides[i - 1] && sides[i] === sides[i - 2]) out.push(`three stretches in a row swing the same way (from ${i - 2})`);
  const pairs = sides.slice(1).map((x, i) => [sides[i]!, x] as const).filter(([a, b]) => a && b), turned = pairs.filter(([a, b]) => a !== b).length;
  if (pairs.length >= 2 && turned < pairs.length / 2) out.push(`only ${turned} of ${pairs.length} neighbouring stretches swing the other way`);
  return out;
}
/** Rule 2, per window, along the river's stations — its nodes and its planets (each in the right third, beside its banner;
 *  ADR-032 L11): never more than two in a row in one half; every three in a row reach the left third and the right third. */
export function rule2(d: Drawn): string[] {
  const out: string[] = [], xs = d.nodes.filter(n => isNode(n) || n.id.startsWith('planet:')).map(n => n.x);
  for (let i = 2; i < xs.length; i++) {
    const win = xs.slice(i - 2, i + 1);
    if (win.every(x => x < d.w / 2) || win.every(x => x >= d.w / 2)) out.push(`nodes ${i - 2}–${i}: three in one half`);
    if (!win.some(x => x < d.w / 3) || !win.some(x => x > d.w * 2 / 3)) out.push(`nodes ${i - 2}–${i}: not both outer thirds (${win.map(Math.round).join(', ')})`);
  }
  return out;
}
/** Rule 3, the first screen (stage y from `top` — the stage's top, under the header — to `bottom`, the timer row): the line
 *  spans ≥ 65 % of the width, turns back across at least twice, and stations stand on both sides. */
export function rule3(d: Drawn, top: number, bottom: number): string[] {
  const out: string[] = [], pts = read(d.segments).flatMap(x => x.pts).filter(p => p.y >= top && p.y <= bottom).sort((a, b) => a.y - b.y);
  if (!pts.length) return ['no line on the first screen'];
  const xs = pts.map(p => p.x), span = Math.max(...xs) - Math.min(...xs);
  if (span < d.w * .65) out.push(`the line spans ${Math.round(span)} px, under 65 % of ${Math.round(d.w)}`);
  // (A turn: the line reverses its sideways way after moving at least 12 px.)
  let way = 0, from = xs[0]!, turns = 0;
  for (const x of xs) { const dx = x - from; if (Math.abs(dx) >= 12) { const s = Math.sign(dx); if (way && s !== way) turns++; way = s; from = x; } else if (way && Math.sign(dx) === way) from = x; }
  if (turns < 2) out.push(`the line turns back across ${turns} time(s), under 2`);
  // (Its stations: the nodes, and a planet, which stands in the right third beside its banner — ADR-032 L11.)
  const seen = d.nodes.filter(n => isNode(n) || n.id.startsWith('planet:')).filter(n => n.y + n.r >= top && n.y - n.r <= bottom);
  if (!seen.some(n => n.x < d.w / 2) || !seen.some(n => n.x >= d.w / 2)) out.push(`the stations on the first screen are all on one side (${seen.map(n => Math.round(n.x)).join(', ')})`);
  return out;
}
