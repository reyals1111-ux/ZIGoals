/**
 * Session AF (L5a, Part 10.8): the footer finale's line from Health into "= Wealth", drawn as a filled, tapered ribbon (pure
 * geometry; components/footer/footer-path.tsx measures the page and paints it). The ribbon is the curve's two offset
 * sides, about 1.5 px wide at Health, 6 px in the middle and 2 px at the word (narrower on phones), closed into one shape;
 * it is cut at the curve's rightmost point into the two pieces the finale reveals one after the other (rightwards, then
 * back), each sharing its first point with the previous piece's last, so no seam shows.
 *
 * Session AG Polish 3 (ADR-032 L17; owner Part 6, reference 04 pointers 1–5): one free-flowing river with no corners. The
 * curve is built from quarter turns (circular arcs as cubics) and straight runs, every join sharing one tangent: on wider
 * screens it leaves Health on the line's own tangent, turns up, rises, turns left over the crest and comes down into the
 * right end of "= Wealth"; on phones it runs on from the foot of the line under Health, turns along beneath the stacked
 * steps, up the right edge, left over the crest and down into the word. No turn is tighter than 40 px × width/390 (the
 * phone river's rule). Its colour follows the path: magenta into pink up to just before the crest, then warm gold into
 * "= Wealth" (`paint`).
 */
export type Pt = {x: number; y: number};
export type Seg = [Pt, Pt, Pt, Pt];
export type Ribbon = {segs: Seg[]; samples: Pt[]; widths: number[]; split: number; pieces: [string, string]; boxes: [Box, Box]; end: Pt; top: number;
  /** Each piece's colour along its way: a gradient vector and its stops (offset, colour). */
  paint: [Paint, Paint]};
export type Paint = {x1: number; y1: number; x2: number; y2: number; stops: [number, string][]};
/** The ribbon's colours: Health's magenta, pink, and the warm gold of "= Wealth". */
export const RIBBON_COLOURS = {magenta: '#f06dff', pink: '#ff8fd0', gold: '#ffd27a'} as const;
/** The least radius of curvature: 40 px at 390 px wide, scaled with the width (as on the phone's Path). */
export const footerMinRadius = (w: number) => 40 * w / 390;
export type Box = {l: number; t: number; w: number; h: number};
/** The ribbon's width at its start, its widest and its end, on wider screens and on phones. */
export const RIBBON_WIDTH = {wide: [1.5, 6, 2], phone: [1.2, 4.2, 1.6]} as const;
export const SAMPLES = 72;
const f = (n: number) => n.toFixed(1);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const at = (s: Seg, t: number): Pt => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return {x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y}; };

/** A turtle's moves: a turn by `turn` radians (screen coordinates: negative turns toward up when heading right) on a
 *  circle of radius `r`, or a straight run of `line` px. */
export type Move = {turn: number; r: number} | {line: number};
/** The moves as cubic pieces, every join sharing one tangent (a turn of up to 90° per piece, its handles 4/3·tan(θ/4)·r). */
export function turtle(start: Pt, heading: number, moves: readonly Move[]): {segs: Seg[]; end: Pt; heading: number; marks: Pt[]} {
  const segs: Seg[] = [], marks: Pt[] = [];
  let p = start, h = heading;
  for (const m of moves) {
    if ('line' in m) {
      if (m.line > 1e-6) { const u = {x: Math.cos(h), y: Math.sin(h)}, q = {x: p.x + u.x * m.line, y: p.y + u.y * m.line}; segs.push([p, {x: p.x + u.x * m.line / 3, y: p.y + u.y * m.line / 3}, {x: p.x + u.x * m.line * 2 / 3, y: p.y + u.y * m.line * 2 / 3}, q]); p = q; }
    } else {
      const parts = Math.max(1, Math.ceil(Math.abs(m.turn) / (Math.PI / 2) - 1e-9)), step = m.turn / parts, s = m.turn < 0 ? -1 : 1;
      for (let i = 0; i < parts; i++) {
        const n0 = {x: -Math.sin(h) * s, y: Math.cos(h) * s}, c = {x: p.x + n0.x * m.r, y: p.y + n0.y * m.r}, h1 = h + step, n1 = {x: -Math.sin(h1) * s, y: Math.cos(h1) * s};
        const q = {x: c.x - n1.x * m.r, y: c.y - n1.y * m.r}, k = 4 / 3 * Math.tan(Math.abs(step) / 4) * m.r;
        segs.push([p, {x: p.x + Math.cos(h) * k, y: p.y + Math.sin(h) * k}, {x: q.x - Math.cos(h1) * k, y: q.y - Math.sin(h1) * k}, q]);
        p = q; h = h1;
      }
    }
    marks.push(p);
  }
  return {segs, end: p, heading: h, marks};
}
/** Over the crest and down into the word: from `p` heading left (−π) at the crest, a run, a turn of α down-left and a run
 *  into `wealth`. α starts at 30° and steepens until the descent fits the room left of the crest. */
function descent(p: Pt, wealth: Pt, r: number): Move[] {
  const rise = wealth.y - p.y, room = p.x - wealth.x;
  for (let deg = 30; deg <= 80; deg += 5) {
    const a = deg * Math.PI / 180, down = r * (1 - Math.cos(a));
    const run = down >= rise ? 0 : (rise - down) / Math.sin(a), turnA = down >= rise ? Math.acos(1 - rise / r) : a;
    const across = r * Math.sin(turnA) + run * Math.cos(turnA), before = room - across;
    if (before >= 0) return [{line: before}, {turn: -turnA, r}, {line: run}];
  }
  // (No room at all: straight from the crest into the word.)
  const a = Math.atan2(rise, room);
  return [{turn: -a, r}, {line: Math.max(0, Math.hypot(rise, room) - r * Math.tan(a / 2))}];
}
/** Wider screens: from Health's node on the line's own tangent (`dir`), on past it, a quarter turn up, a rise, a quarter
 *  turn left over the crest — at least 0.134·r + 12 px above the word — and down into the word's right end. */
export function wideArc(last: Pt, dir: Pt, wealth: Pt, w: number): {segs: Seg[]; crest: Pt; r: number} {
  const r = footerMinRadius(w) * 1.02, h0 = Math.atan2(dir.y, dir.x);
  // (It runs on past Health first — its turn's rightmost point about 12 % of the stage beyond the node's centre, 70–150 px,
  // within the room to the stage's edge — on the line's own tangent.)
  const turned = turtle(last, h0, [{turn: -Math.PI / 2 - h0, r}]).end, reach = Math.min(Math.max(70, Math.min(150, .12 * w)), w - 16 - last.x);
  const on = Math.max(0, (reach - (turned.x - last.x)) / Math.max(.2, Math.cos(h0)));
  const up = turtle(last, h0, [{line: on}, {turn: -Math.PI / 2 - h0, r}]).end;
  const crestY = Math.min(wealth.y - (0.134 * r + 12), up.y - r), rise = up.y - r - crestY;
  const crest = {x: up.x - r, y: crestY};
  const t = turtle(last, h0, [{line: on}, {turn: -Math.PI / 2 - h0, r}, {line: rise}, {turn: -Math.PI / 2, r}, ...descent(crest, wealth, r)]);
  return {segs: t.segs, crest, r};
}
/** Phones (the steps stacked, "= Wealth" above them): from the foot of the line under Health on its own tangent, a turn
 *  along beneath the steps (at `below` or lower), a run right, a quarter turn up at the right edge, a rise, a quarter turn
 *  left over the crest and down into the word. */
export function phoneArc(foot: Pt, dir: Pt, below: number, wealth: Pt, w: number): {segs: Seg[]; crest: Pt; r: number} {
  const r = footerMinRadius(w) * 1.02, edge = w - 8, h0 = Math.atan2(dir.y, dir.x);
  const flat = turtle(foot, h0, [{turn: -h0, r}]).end, drop = Math.max(0, below - flat.y) / Math.max(.2, Math.sin(h0));
  const along = turtle(foot, h0, [{line: drop}, {turn: -h0, r}]).end, run = Math.max(0, edge - r - along.x);
  const crestY = wealth.y - (0.134 * r + 12), rise = Math.max(0, along.y - r - r - crestY), crest = {x: edge - r, y: along.y - 2 * r - rise};
  const t = turtle(foot, h0, [{line: drop}, {turn: -h0, r}, {line: run}, {turn: -Math.PI / 2, r}, {line: rise}, {turn: -Math.PI / 2, r}, ...descent(crest, wealth, r)]);
  return {segs: t.segs, crest, r};
}

/** The ribbon's width at t (0 at the start, 1 at the end): thin, widest a little before the middle, thin again. */
export const widthAt = (t: number, [start, peak, end]: readonly [number, number, number] | readonly number[]) => { const base = start! + (end! - start!) * t; return base + (peak! - base) * Math.sin(Math.PI * t) ** 0.9; };

/** The closed outline of the samples from `from` to `to` (inclusive): one side forward, the other back. */
function outline(samples: readonly Pt[], widths: readonly number[], from: number, to: number) {
  const left: string[] = [], right: string[] = [];
  for (let i = from; i <= to; i++) {
    const a = samples[Math.max(0, i - 1)]!, b = samples[Math.min(samples.length - 1, i + 1)]!, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, half = widths[i]! / 2, p = samples[i]!;
    left.push(`${f(p.x + nx * half)} ${f(p.y + ny * half)}`); right.unshift(`${f(p.x - nx * half)} ${f(p.y - ny * half)}`);
  }
  return `M${left.join(' L')} L${right.join(' L')} Z`;
}
const boxOf = (samples: readonly Pt[], from: number, to: number, pad: number): Box => { const part = samples.slice(from, to + 1), xs = part.map(p => p.x), ys = part.map(p => p.y), l = Math.min(...xs) - pad, t = Math.min(...ys) - pad; return {l, t, w: Math.max(...xs) + pad - l, h: Math.max(...ys) + pad - t}; };

/** The ribbon along the pieces: its samples (by length), widths, the two pieces (cut at the rightmost point), their boxes,
 *  and their colours — magenta into pink to the rightmost point; then pink up to just before the crest (`crest`, a turn
 *  of radius `r`) and warm gold from there into the word. */
export function ribbon(segs: readonly Seg[], widths: readonly number[], pad = 10, crest: Pt | null = null, r = 0): Ribbon {
  // (Even steps along the curve: each piece's share of the samples by its length.)
  const lens = segs.map(s => { let l = 0, q = s[0]; for (let i = 1; i <= 16; i++) { const p = at(s, i / 16); l += Math.hypot(p.x - q.x, p.y - q.y); q = p; } return l; }), total = lens.reduce((a, b) => a + b, 0) || 1;
  const samples: Pt[] = [], ws: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    let d = i / SAMPLES * total, k = 0;
    while (k < segs.length - 1 && d > lens[k]!) { d -= lens[k]!; k++; }
    samples.push(at(segs[k]!, Math.min(1, d / (lens[k]! || 1)))); ws.push(widthAt(i / SAMPLES, widths));
  }
  let split = 0; samples.forEach((p, i) => { if (p.x > samples[split]!.x + 1e-6) split = i; });
  split = clamp(split, 1, SAMPLES - 1);
  const start = samples[0]!, turn = samples[split]!, end = samples[SAMPLES]!, C = RIBBON_COLOURS;
  const k = crest ?? {x: turn.x, y: Math.min(...samples.map(p => p.y))}, span = Math.max(1, turn.x - end.x);
  // (Along the way back: pink until just before the crest, the gold from just after it.)
  const hold = clamp((turn.x - (k.x + .25 * r)) / span, 0, 1), gold = clamp((turn.x - (k.x - Math.max(.5 * r, .35 * (k.x - end.x)))) / span, hold + .01, 1);
  const paint: [Paint, Paint] = [
    {x1: start.x, y1: start.y, x2: turn.x, y2: turn.y, stops: [[0, C.magenta], [1, C.pink]]},
    {x1: turn.x, y1: 0, x2: end.x, y2: 0, stops: [[0, C.pink], [hold, C.pink], [gold, C.gold], [1, C.gold]]},
  ];
  return {segs: [...segs], samples, widths: ws, split, pieces: [outline(samples, ws, 0, split), outline(samples, ws, split, SAMPLES)], boxes: [boxOf(samples, 0, split, pad), boxOf(samples, split, SAMPLES, pad)], end, top: Math.min(...samples.map(p => p.y)), paint};
}
