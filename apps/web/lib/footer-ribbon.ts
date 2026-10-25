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
 *
 * Session AG Polish 3 (ADR-032 L27; owner addition after the 10d OK, references 07–09): on a COMPUTER the loop out to the
 * right is replaced by a river with soft curls (`wideRiver`); a PHONE keeps its frame (`phoneArc`), now starting at the
 * steps line's own width and colour (`stepsPaint`).
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
// (Session AG Polish 3, owner addition after the 10d OK, ref 09 pointer 1: a phone's frame starts at the steps line's own
// 2 px, so the line from the steps flows into it with no step in width.)
export const RIBBON_WIDTH = {wide: [1.5, 6, 2], phone: [2, 4.2, 1.6]} as const;
/** The steps line's own stroke width (components/footer/footer-path.tsx). */
export const STEPS_STROKE = 2;
/** The steps line's colours: Goals' violet, Habits' cyan, Health's pink, and the magenta past Health. */
export const STEPS_COLOURS = ['#9273ff', '#23eaff', '#ff74be', '#f06dff'] as const;
/**
 * The steps line's paint. On wider screens across the stage (as before). On phones (owner addition, ref 09 pointer 1),
 * down the stacked steps — Goals violet, Habits cyan, Health pink — to the magenta at the foot of the line under Health,
 * where the frame begins in that same magenta: one colour at the join.
 */
export function stepsPaint(nodes: readonly Pt[], foot: Pt, stacked: boolean, w: number): Paint {
  const [violet, cyan, pink, magenta] = STEPS_COLOURS;
  if (!stacked || nodes.length < 3) return {x1: 0, y1: 0, x2: w, y2: 0, stops: [[0, violet], [.45, cyan], [.8, pink], [1, magenta]]};
  const top = nodes[0]!.y, span = Math.max(1, foot.y - top), o = (y: number) => clamp((y - top) / span, 0, 1);
  return {x1: 0, y1: top, x2: 0, y2: foot.y, stops: [[0, violet], [o(nodes[1]!.y), cyan], [o(nodes[2]!.y), pink], [1, magenta]]};
}
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

/**
 * Session AG Polish 3 (ADR-032 L27; owner addition after the 10d OK, references 07 and 08): the COMPUTER's footer line is a
 * free-flowing river — no longer one giant loop out to the right with corners at its top (07). From Health's node it
 * leaves on the steps' own tangent, rises a little to the right of Health, then meanders up and to the left in two soft
 * curls and comes into the right end of "= Wealth" from the right (08, an approximate guide). Smooth everywhere: C1
 * Hermite cubics through its waypoints, every join one tangent, no bend tighter than 30 px, no bump under 14 px, never
 * crossing itself; at least 120 px from the bright star at the planet's top right, never above the "Goals · Habits ·
 * Health" line (`ceiling`), inside the stage. Its waypoints are tried from a small grid, the first that passes wins.
 */
export const RIVER_RULES = {radius: 30, bump: 14, star: 120, join: 1} as const;
export type RiverRoom = {star: Pt; ceiling: number};
/** Every way a river can fail the owner's rules (amendment after 10d): bends, bumps, joins, crossings, star, ceiling, stage. */
export function riverFaults(segs: readonly Seg[], w: number, room: RiverRoom): string[] {
  const out: string[] = [], pts: {p: Pt; k: number; s: number}[] = [];
  let s = 0, prev: Pt | null = null;
  segs.forEach((sg, i) => {
    if (i) { const a = {x: sg[0].x - segs[i - 1]![2].x, y: sg[0].y - segs[i - 1]![2].y}, b = {x: sg[1].x - sg[0].x, y: sg[1].y - sg[0].y}, ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) * 180 / Math.PI; if (ang > RIVER_RULES.join) out.push(`join ${i} turns ${ang.toFixed(1)}°`); }
    for (let j = i ? 1 : 0; j <= 48; j++) {
      const t = j / 48, u = 1 - t, p = at(sg, t);
      const v = {x: 3 * u * u * (sg[1].x - sg[0].x) + 6 * u * t * (sg[2].x - sg[1].x) + 3 * t * t * (sg[3].x - sg[2].x), y: 3 * u * u * (sg[1].y - sg[0].y) + 6 * u * t * (sg[2].y - sg[1].y) + 3 * t * t * (sg[3].y - sg[2].y)};
      const a2 = {x: 6 * u * (sg[2].x - 2 * sg[1].x + sg[0].x) + 6 * t * (sg[3].x - 2 * sg[2].x + sg[1].x), y: 6 * u * (sg[2].y - 2 * sg[1].y + sg[0].y) + 6 * t * (sg[3].y - 2 * sg[2].y + sg[1].y)};
      const sp = Math.hypot(v.x, v.y), k = sp > 1e-9 ? (v.x * a2.y - v.y * a2.x) / sp ** 3 : 0;
      if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({p, k, s}); prev = p;
    }
  });
  const least = Math.min(...pts.map(q => Math.abs(q.k) > 1e-9 ? 1 / Math.abs(q.k) : Infinity));
  if (least < RIVER_RULES.radius) out.push(`a bend of ${least.toFixed(1)} px`);
  // (Bumps: the arc between two inflections, its greatest distance from their chord.)
  const flips: number[] = [];
  let last = 0;
  pts.forEach((q, i) => { const sg = q.k > 2e-4 ? 1 : q.k < -2e-4 ? -1 : 0; if (!sg) return; if (last && sg !== last) flips.push(i); last = sg; });
  for (let i = 1; i < flips.length; i++) {
    const a = pts[flips[i - 1]!]!.p, b = pts[flips[i]!]!.p, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const amp = Math.max(...pts.slice(flips[i - 1]!, flips[i]! + 1).map(q => Math.abs((b.x - a.x) * (a.y - q.p.y) - (a.x - q.p.x) * (b.y - a.y)) / L));
    if (amp < RIVER_RULES.bump) out.push(`a bump of ${amp.toFixed(1)} px`);
  }
  // (Never crossing itself: no two pieces of the sampled line, apart, meet.)
  const P = pts.map(q => q.p), cross = (a: Pt, b: Pt, c: Pt, d: Pt) => { const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  for (let i = 0; i + 1 < P.length; i++) for (let j = i + 3; j + 1 < P.length; j++) if (cross(P[i]!, P[i + 1]!, P[j]!, P[j + 1]!)) { out.push('crosses itself'); i = P.length; break; }
  const near = Math.min(...P.map(p => Math.hypot(p.x - room.star.x, p.y - room.star.y)));
  if (near < RIVER_RULES.star) out.push(`${near.toFixed(0)} px from the star`);
  if (P.some(p => p.y < room.ceiling - .5)) out.push('above the "Goals · Habits · Health" line');
  if (P.some(p => p.x < 8 || p.x > w - 8)) out.push('outside the stage');
  return out;
}
/**
 * The computer's river: from Health (`last`) on the steps' tangent (`dir`) to the end of "= Wealth" (`wealth`), built as
 * a turtle walks — circular turns (radius 40 px or more) and straight runs, every join one tangent: on past Health a
 * little, the first curl (a turn up and back to the left), a run, the second curl (a soft S: up a little, then level
 * again), a run, and into the word from the right. Two of the runs are solved so it lands exactly on the word; the
 * turns and radii are tried from a grid, gentlest first.
 */
export function wideRiver(last: Pt, dir: Pt, wealth: Pt, w: number, room: RiverRoom): {segs: Seg[]; goldFrom: number; faults: string[]} {
  const h0 = Math.atan2(dir.y, dir.x), D = Math.PI / 180, endHeading = Math.PI + 8 * D;
  let best: {segs: Seg[]; goldFrom: number; faults: string[]} | null = null;
  for (const r1 of [60, 50, 70, 42]) for (const lean of [8, 0, 16, -6]) for (const s2 of [38, 30, 48, 60, 75, 90]) for (const r2 of [70, 90, 55, 45, 110]) for (const lead of [24, 8, 44]) {
    // (Headings: out of Health on h0; after the first curl, left and a little down (`lean`); the S turns up by s2 and back.)
    const hA = Math.PI + lean * D, turn1 = -(2 * Math.PI - (hA - h0)) % (2 * Math.PI), hB = hA + s2 * D, turn3 = endHeading - hB;
    const moves = (L1: number, L2: number): Move[] => [{line: lead}, {turn: turn1, r: r1}, {line: L1}, {turn: s2 * D, r: r2}, {line: L2}, {turn: turn3, r: r2}, {line: 16}];
    const p00 = turtle(last, h0, moves(0, 0)).end, p10 = turtle(last, h0, moves(1, 0)).end, p01 = turtle(last, h0, moves(0, 1)).end;
    const u1 = {x: p10.x - p00.x, y: p10.y - p00.y}, u2 = {x: p01.x - p00.x, y: p01.y - p00.y}, det = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(det) < 1e-6) continue;
    const ex = wealth.x - p00.x, ey = wealth.y - p00.y, L1 = (ex * u2.y - ey * u2.x) / det, L2 = (u1.x * ey - u1.y * ex) / det;
    if (L1 < 10 || L2 < 10) continue;
    const t = turtle(last, h0, moves(L1, L2)), segs = t.segs, faults = riverFaults(segs, w, room);
    if (Math.max(...segs.flatMap(sg => [0, .25, .5, .75, 1].map(q => at(sg, q).x))) < last.x + 64) faults.push('not past Health to the right');
    const cand = {segs, goldFrom: t.marks[4]!.x, faults};
    if (!faults.length) return cand;
    if (!best || faults.length < best.faults.length) best = cand;
  }
  // (A narrow stage — the word close above Health — leaves no room for the second curl's S at 14 px: one curl, then one
  // smooth sweep into the word.)
  for (const r1 of [60, 50, 70, 42]) for (const lean of [8, 0, 16, -6, 24, -14, 32]) for (const r2 of [90, 70, 110, 55, 140]) for (const lead of [24, 8, 44]) {
    const hA = Math.PI + lean * D, turn1 = -(2 * Math.PI - (hA - h0)) % (2 * Math.PI), turn2 = endHeading - hA;
    const moves = (L1: number, L2: number): Move[] => [{line: lead}, {turn: turn1, r: r1}, {line: L1}, {turn: turn2, r: r2}, {line: L2}];
    const p00 = turtle(last, h0, moves(0, 0)).end, p10 = turtle(last, h0, moves(1, 0)).end, p01 = turtle(last, h0, moves(0, 1)).end;
    const u1 = {x: p10.x - p00.x, y: p10.y - p00.y}, u2 = {x: p01.x - p00.x, y: p01.y - p00.y}, det = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(det) < 1e-6) continue;
    const ex = wealth.x - p00.x, ey = wealth.y - p00.y, L1 = (ex * u2.y - ey * u2.x) / det, L2 = (u1.x * ey - u1.y * ex) / det;
    if (L1 < 10 || L2 < 10) continue;
    const t = turtle(last, h0, moves(L1, L2)), segs = t.segs, faults = riverFaults(segs, w, room);
    if (Math.max(...segs.flatMap(sg => [0, .25, .5, .75, 1].map(q => at(sg, q).x))) < last.x + 64) faults.push('not past Health to the right');
    const cand = {segs, goldFrom: t.marks[2]!.x - .4 * (t.marks[2]!.x - wealth.x), faults};
    if (!faults.length) return cand;
    if (!best || faults.length < best.faults.length) best = cand;
  }
  return best ?? {segs: [], goldFrom: wealth.x, faults: ['no river fits']};
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
export function ribbon(segs: readonly Seg[], widths: readonly number[], pad = 10, crest: Pt | null = null, r = 0, goldFrom: number | null = null): Ribbon {
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
  // (The computer's river, L27: pink all the way to its last stretch, gold only from there into the word.)
  const hold = goldFrom !== null ? clamp((turn.x - goldFrom) / span, 0, .98) : clamp((turn.x - (k.x + .25 * r)) / span, 0, 1);
  const gold = goldFrom !== null ? clamp((turn.x - (goldFrom - .45 * (goldFrom - end.x))) / span, hold + .01, 1) : clamp((turn.x - (k.x - Math.max(.5 * r, .35 * (k.x - end.x)))) / span, hold + .01, 1);
  const paint: [Paint, Paint] = [
    {x1: start.x, y1: start.y, x2: turn.x, y2: turn.y, stops: [[0, C.magenta], [1, C.pink]]},
    {x1: turn.x, y1: 0, x2: end.x, y2: 0, stops: [[0, C.pink], [hold, C.pink], [gold, C.gold], [1, C.gold]]},
  ];
  return {segs: [...segs], samples, widths: ws, split, pieces: [outline(samples, ws, 0, split), outline(samples, ws, split, SAMPLES)], boxes: [boxOf(samples, 0, split, pad), boxOf(samples, split, SAMPLES, pad)], end, top: Math.min(...samples.map(p => p.y)), paint};
}
