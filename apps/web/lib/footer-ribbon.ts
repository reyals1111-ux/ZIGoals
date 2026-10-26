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
 * Session AG Polish 3 (ADR-032 L27, L28; owner footer fix after the 10d OK, reference 08): the COMPUTER's footer line is a
 * river flowing OUT of "= Wealth" down to Health, its bends growing as it goes. A gently descending baseline from the end
 * point beside the word to Health (arriving at the ring's upper-right side on the steps' own tangent); along it three
 * meander bends alternating sides, about 20–30, 45–60 and 75–95 px (in proportion where Health stands nearer the word),
 * each longer than the one before, the first starting right at the word; drawn as ONE curvature-continuous (C2) cubic
 * spline through the word's end, the bends' apexes and Health — no kink, no hook, no flat run. Bounds: below the "Goals · Habits · Health"
 * line, 30 px or more right of the tagline where it passes it, 120 px or more from the planet's bright star, above the
 * step labels, inside the stage. The ribbon is drawn from Health (the pieces reversed), so the reveal and its timing are
 * unchanged.
 */
/** Health's ring on a computer: its node's radius (86 px across). */
const RING = 43;
/** How far the computer's river runs on past Health's ring before it turns back (Session AH Finish): 20 px. It was 4 px,
 *  which only the narrow stages ever used, and the tablet rail (LA2) made the 768 px window's stage one of them: the river
 *  then turned back 8 px past Health, where footer-arc-af holds it to more than 20 (wider stages pass by 27 px or more,
 *  and their river is unchanged). */
const PAST_HEALTH = 20;
const NOT_PAST = 'not past Health\'s ring on its right';
/** The faults that break the river's shape itself (footer-arc-af pins them): not on past Health, above the "Goals · Habits ·
 *  Health" line, down among the step labels, outside the stage. The others (a bend, a bump, the star's and the tagline's
 *  distances) are its finer spacing. */
const SHAPE_FAULT = /^(not past |above |down among |outside )/;
export const RIVER_RULES = {radius: 30, narrowRadius: 12, bump: 14, star: 120, join: 1, flat: 60, flatRadius: 1000, tagline: 30} as const;
export type RiverRoom = {star: Pt; ceiling: number; tagline?: {l: number; r: number; t: number; b: number}; floor?: number};
const unit = (v: Pt): Pt => { const l = Math.hypot(v.x, v.y) || 1; return {x: v.x / l, y: v.y / l}; };
/** A clamped C2 cubic spline through `P` (chord-length parameter), leaving along `d0` and arriving along `dn`. */
export function c2Spline(P: readonly Pt[], d0: Pt, dn: Pt): Seg[] {
  const n = P.length - 1, h = P.slice(1).map((p, i) => Math.max(1e-6, Math.hypot(p.x - P[i]!.x, p.y - P[i]!.y)));
  const D: Pt[] = P.map(() => ({x: 0, y: 0})); D[0] = unit(d0); D[n] = unit(dn);
  if (n >= 2) {
    // (The tridiagonal system for the inner derivatives — the C2 condition at each inner point — solved per axis.)
    const m = n - 1, a: number[] = [], b: number[] = [], c: number[] = [], rx: number[] = [], ry: number[] = [];
    for (let k = 1; k < n; k++) {
      const h0 = h[k - 1]!, h1 = h[k]!;
      a.push(h1); b.push(2 * (h0 + h1)); c.push(h0);
      rx.push(3 * (h0 * (P[k + 1]!.x - P[k]!.x) / h1 + h1 * (P[k]!.x - P[k - 1]!.x) / h0)); ry.push(3 * (h0 * (P[k + 1]!.y - P[k]!.y) / h1 + h1 * (P[k]!.y - P[k - 1]!.y) / h0));
    }
    rx[0]! -= a[0]! * D[0]!.x; ry[0]! -= a[0]! * D[0]!.y; rx[m - 1]! -= c[m - 1]! * D[n]!.x; ry[m - 1]! -= c[m - 1]! * D[n]!.y;
    for (let k = 1; k < m; k++) { const w = a[k]! / b[k - 1]!; b[k]! -= w * c[k - 1]!; rx[k]! -= w * rx[k - 1]!; ry[k]! -= w * ry[k - 1]!; }
    const X: number[] = Array(m).fill(0), Y: number[] = Array(m).fill(0);
    X[m - 1] = rx[m - 1]! / b[m - 1]!; Y[m - 1] = ry[m - 1]! / b[m - 1]!;
    for (let k = m - 2; k >= 0; k--) { X[k] = (rx[k]! - c[k]! * X[k + 1]!) / b[k]!; Y[k] = (ry[k]! - c[k]! * Y[k + 1]!) / b[k]!; }
    for (let k = 1; k < n; k++) D[k] = {x: X[k - 1]!, y: Y[k - 1]!};
  }
  return P.slice(0, -1).map((p, i) => [p, {x: p.x + D[i]!.x * h[i]! / 3, y: p.y + D[i]!.y * h[i]! / 3}, {x: P[i + 1]!.x - D[i + 1]!.x * h[i]! / 3, y: P[i + 1]!.y - D[i + 1]!.y * h[i]! / 3}, P[i + 1]!] as Seg);
}
/** Every way a river can fail the owner's rules: bends, bumps, flat runs, joins, crossings, star, bounds, stage. */
export function riverFaults(segs: readonly Seg[], w: number, room: RiverRoom, o: {radius?: number; early?: boolean} = {}): string[] {
  const out: string[] = [], pts: {p: Pt; k: number; s: number}[] = [], minR = o.radius ?? RIVER_RULES.radius;
  let s = 0, prev: Pt | null = null;
  segs.forEach((sg, i) => {
    if (i) { const a = {x: sg[0].x - segs[i - 1]![2].x, y: sg[0].y - segs[i - 1]![2].y}, b = {x: sg[1].x - sg[0].x, y: sg[1].y - sg[0].y}, ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) * 180 / Math.PI; if (ang > RIVER_RULES.join) out.push(`join ${i} turns ${ang.toFixed(1)}°`); }
    for (let j = i ? 1 : 0; j <= 24; j++) {
      const t = j / 24, u = 1 - t, p = at(sg, t);
      const v = {x: 3 * u * u * (sg[1].x - sg[0].x) + 6 * u * t * (sg[2].x - sg[1].x) + 3 * t * t * (sg[3].x - sg[2].x), y: 3 * u * u * (sg[1].y - sg[0].y) + 6 * u * t * (sg[2].y - sg[1].y) + 3 * t * t * (sg[3].y - sg[2].y)};
      const a2 = {x: 6 * u * (sg[2].x - 2 * sg[1].x + sg[0].x) + 6 * t * (sg[3].x - 2 * sg[2].x + sg[1].x), y: 6 * u * (sg[2].y - 2 * sg[1].y + sg[0].y) + 6 * t * (sg[3].y - 2 * sg[2].y + sg[1].y)};
      const sp = Math.hypot(v.x, v.y), k = sp > 1e-9 ? (v.x * a2.y - v.y * a2.x) / sp ** 3 : 0;
      if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({p, k, s}); prev = p;
    }
  });
  // (The bounds first — the cheapest — then the shape.)
  const P = pts.map(q => q.p);
  const near = Math.min(...P.map(p => Math.hypot(p.x - room.star.x, p.y - room.star.y)));
  if (near < RIVER_RULES.star) out.push(`${near.toFixed(0)} px from the star`);
  if (P.some(p => p.y < room.ceiling - .5)) out.push('above the "Goals · Habits · Health" line');
  const tag = room.tagline;
  if (tag && P.some(p => p.y >= tag.t && p.y <= tag.b && p.x > tag.l && p.x < tag.r + RIVER_RULES.tagline)) out.push('less than 30 px right of the tagline');
  if (room.floor !== undefined && P.some(p => p.y > room.floor!)) out.push('down among the step labels');
  if (P.some(p => p.x < 8 || p.x > w - 8)) out.push('outside the stage');
  if (o.early && out.length) return out;
  const least = Math.min(...pts.map(q => Math.abs(q.k) > 1e-9 ? 1 / Math.abs(q.k) : Infinity));
  if (least < minR) out.push(`a bend of ${least.toFixed(1)} px`);
  // (Flat runs: curvature about nothing — a radius over 1000 px — for more than 60 px of arc.)
  let from = -1;
  for (let i = 0; i <= pts.length; i++) {
    const flat = i < pts.length && Math.abs(pts[i]!.k) < 1 / RIVER_RULES.flatRadius;
    if (flat && from < 0) from = i;
    if (!flat && from >= 0) { const len = pts[i - 1]!.s - pts[from]!.s; if (len > RIVER_RULES.flat) out.push(`a flat run of ${Math.round(len)} px`); from = -1; }
  }
  // (Bumps: the arc between two inflections, its greatest distance from their chord.)
  const flips: number[] = [];
  let last = 0;
  pts.forEach((q, i) => { const sg = q.k > 2e-4 ? 1 : q.k < -2e-4 ? -1 : 0; if (!sg) return; if (last && sg !== last) flips.push(i); last = sg; });
  for (let i = 1; i < flips.length; i++) {
    const a = pts[flips[i - 1]!]!.p, b = pts[flips[i]!]!.p, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const amp = Math.max(...pts.slice(flips[i - 1]!, flips[i]! + 1).map(q => Math.abs((b.x - a.x) * (a.y - q.p.y) - (a.x - q.p.x) * (b.y - a.y)) / L));
    if (amp < RIVER_RULES.bump) out.push(`a bump of ${amp.toFixed(1)} px`);
  }
  if (o.early && out.length) return out;
  // (Never crossing itself: no two pieces of the line, sampled every few px, apart, meet.)
  const Q = P.filter((_, i) => i % 3 === 0 || i === P.length - 1), cross = (a: Pt, b: Pt, c: Pt, d: Pt) => { const f = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return f(a, b, c) * f(a, b, d) < 0 && f(c, d, a) * f(c, d, b) < 0; };
  outer: for (let i = 0; i + 1 < Q.length; i++) for (let j = i + 2; j + 1 < Q.length; j++) if (cross(Q[i]!, Q[i + 1]!, Q[j]!, Q[j + 1]!)) { out.push('crosses itself'); break outer; }
  return out;
}
/** Points along a cubic, and the arc length up to each. */
function arcTable(seg: Seg, n = 200) { const pts: Pt[] = [], len: number[] = []; let L = 0, q = seg[0]; for (let i = 0; i <= n; i++) { const p = at(seg, i / n); if (i) L += Math.hypot(p.x - q.x, p.y - q.y); pts.push(p); len.push(L); q = p; } return {pts, len, L}; }
/**
 * The computer's river (owner footer fix): out of "= Wealth" (`wealth`) down to Health (`last`, reached along the steps'
 * tangent `dir`). Along the baseline a wave of three half-waves — the bends — its phase growing so each bend is `grow` times
 * longer than the one before, its amplitude passing smoothly through the three bends' sizes, starting right at the word and
 * crossing the baseline again at Health, where the baseline is turned so the river arrives on the steps' own tangent;
 * sampled and drawn as one C2 cubic spline. Returns its pieces FROM HEALTH (as the ribbon draws them), where the gold gives way to
 * pink (`goldFrom`, the end of the first bend), the bends' measured amplitudes (from the word) and what still breaks a rule.
 */
type River = {segs: Seg[]; goldFrom: number; bends: number[]; faults: string[]};
const rivers = new Map<string, River>();
export function wideRiver(last: Pt, dir: Pt, wealth: Pt, w: number, room: RiverRoom): River {
  // (The same stage, measured again — a resize that changes nothing — reuses its river.)
  const key = JSON.stringify([last, dir, wealth, w, room].map(v => JSON.parse(JSON.stringify(v, (_, x) => typeof x === 'number' ? Math.round(x * 2) / 2 : x))));
  const known = rivers.get(key);
  if (known) return known;
  const made = makeRiver(last, dir, wealth, w, room);
  if (rivers.size > 32) rivers.clear();
  rivers.set(key, made);
  return made;
}
function makeRiver(last: Pt, dir: Pt, wealth: Pt, w: number, room: RiverRoom): River {
  const into = unit({x: -dir.x, y: -dir.y}), D0 = Math.hypot(last.x - wealth.x, last.y - wealth.y);
  let best: River | null = null;
  const AMPS = [[25, 52, 85], [22, 48, 80], [28, 56, 90], [20, 45, 75], [30, 60, 95]] as const;
  // (The bends' sizes are the owner's at a computer's usual stage, Health 290 px or more from the word; nearer, in proportion
  // — and on the narrowest stages, where the tagline ends beside Health, smaller still if that is what fits.)
  const scale = Math.min(1, D0 / 290);
  type Try = {drop: number; grow: number; k1: number; k2: number; first: number; amps0: readonly number[]; shrink: number};
  // (First the variants that suit the measured stages — 1920, 1440, 1280, 1024 and 768 px windows — then the grid.)
  const tries: Try[] = [[1, .45, 1.2, .9, .6, 3], [1, .45, 1.3, .6, .85, 3], [.8, .45, 1.25, .9, .6, 1], [1, .3, 1.1, .9, .6, 3], [.8, 0, 1.6, 1, .8, 0], [1, -.1, 1.6, 1, .8, 1], [1, -.1, 1.8, 1, .8, 1]]
    .map(([shrink, drop, grow, k1, k2, a]) => ({shrink: shrink!, drop: drop!, grow: grow!, k1: k1!, k2: k2!, first: -1, amps0: AMPS[a!]!}));
  for (const shrink of scale < 1 ? [1, .8, .6] : [1]) for (const drop of [.45, .5, .3, .55, .12, 0, -.1]) for (const grow of [1.3, 1.25, 1.4, 1.5, 1.2, 1.1, 1.6, 1.8]) for (const [k1, k2] of [[.5, .7], [.6, .85], [.4, .6], [.5, 1], [.7, 1], [.6, 1.4], [.9, .6], [1, .8], [1.1, 1]] as const) for (const first of [-1, 1]) for (const amps0 of [AMPS[3], AMPS[1], AMPS[0]]) tries.push({drop, grow, k1, k2, first, amps0, shrink});
  // (Two passes in one: bends of 30 px or more; else — a narrow stage — the roundest variant found, its tightest bend 12 px
  // or more, looking at most 120 variants past the first that passes and 600 in all.)
  let round: (River & {r: number}) | null = null, shape: River | null = null, since = 0, tried = 0;
  for (const {drop, grow, k1, k2, first, amps0, shrink} of tries) {
    const amps = amps0.map(a => a * scale * shrink), g3 = grow ** 3;
    const lag = (f: number) => { const x = f / Math.PI, [a0, a1, a2] = amps; return a0! * (x - 1.5) * (x - 2.5) / 2 - a1! * (x - .5) * (x - 2.5) + a2! * (x - .5) * (x - 1.5) / 2; };
    // The baseline: out of the word to the right, gently down, and into Health from its upper right — turned so that, with
    // the wave crossing it there, the river itself comes into Health exactly on the steps' tangent (two passes settle it).
    let arrive = into, base: Seg = [wealth, wealth, last, last], tab = arcTable(base, 4), S = 1;
    for (let pass = 0; pass < 3; pass++) {
      base = [wealth, {x: wealth.x + k1 * D0, y: wealth.y + drop * k1 * D0}, {x: last.x - arrive.x * k2 * D0, y: last.y - arrive.y * k2 * D0}, last];
      tab = arcTable(base, 240); S = tab.L;
      const slope = -first * lag(3 * Math.PI) * Math.PI * (g3 - 1) / (S * Math.log(grow) * g3), turn = -Math.atan(slope);
      arrive = {x: into.x * Math.cos(turn) - into.y * Math.sin(turn), y: into.x * Math.sin(turn) + into.y * Math.cos(turn)};
    }
    const atLen = (l: number) => { let k = tab.len.findIndex(v => v >= l); if (k < 1) k = 1; const f = (l - tab.len[k - 1]!) / Math.max(1e-6, tab.len[k]! - tab.len[k - 1]!); const a = tab.pts[k - 1]!, b = tab.pts[k]!; return {p: {x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f}, t: unit({x: b.x - a.x, y: b.y - a.y})}; };
    // (Phase: the k-th bend from S·(g^k − 1)/(g³ − 1) to S·(g^(k+1) − 1)/(g³ − 1). Amplitude: a smooth quadratic through the
    // three bends' sizes at their middles.)
    const phase = (l: number) => Math.PI * Math.log(1 + l * (g3 - 1) / S) / Math.log(grow);
    const cut = (k: number) => S * (grow ** k - 1) / (g3 - 1);
    const C = (l: number): Pt => { const {p, t} = atLen(l), f = phase(l), o = first * lag(f) * Math.sin(f); return {x: p.x - t.y * o, y: p.y + t.x * o}; };
    const N = 24, pts = Array.from({length: N + 1}, (_, k) => k === N ? last : k === 0 ? wealth : C(S * k / N));
    const d0 = unit({x: C(1).x - wealth.x, y: C(1).y - wealth.y});
    const fromWealth = c2Spline(pts, d0, into);
    // (The pieces from Health: each reversed, in reverse order.)
    const segs = fromWealth.map(sg => [sg[3], sg[2], sg[1], sg[0]] as Seg).reverse();
    const faults = Math.max(...pts.map(q => q.x)) < last.x + RING + PAST_HEALTH ? [NOT_PAST] : riverFaults(segs, w, room, {radius: RIVER_RULES.narrowRadius, early: true});
    if (faults.length) {
      if (!faults.some(f => SHAPE_FAULT.test(f))) { const all = riverFaults(segs, w, room, {radius: RIVER_RULES.narrowRadius}); if (!all.some(f => SHAPE_FAULT.test(f)) && (!shape || all.length < shape.faults.length)) shape = {segs, goldFrom: atLen(cut(1)).p.x, bends: [], faults: all}; }
      if (!best || faults.length < best.faults.length) best = {segs, goldFrom: 0, bends: [], faults}; if ((round && ++since > 120) || ++tried > 600) break; continue;
    }
    // (Each bend's amplitude as drawn: the farthest the river strays from the baseline within its span.)
    const bends = [0, 1, 2].map(k => Math.max(...Array.from({length: 61}, (_, j) => { const l = cut(k) + (cut(k + 1) - cut(k)) * j / 60, q = C(l), b = atLen(l).p; return Math.hypot(q.x - b.x, q.y - b.y); })));
    if (!(bends[0]! < bends[1]! && bends[1]! < bends[2]!)) faults.push('bends not growing');
    const cand = {segs, goldFrom: atLen(cut(1)).p.x, bends, faults};
    if (faults.length) { if (!shape || faults.length < shape.faults.length) shape = cand; if (!best || faults.length < best.faults.length) best = cand; if ((round && ++since > 120) || ++tried > 600) break; continue; }
    const r = Math.min(...segs.flatMap(sg => Array.from({length: 25}, (_, j) => { const t = j / 24, u = 1 - t, v = {x: 3 * u * u * (sg[1].x - sg[0].x) + 6 * u * t * (sg[2].x - sg[1].x) + 3 * t * t * (sg[3].x - sg[2].x), y: 3 * u * u * (sg[1].y - sg[0].y) + 6 * u * t * (sg[2].y - sg[1].y) + 3 * t * t * (sg[3].y - sg[2].y)}, a2 = {x: 6 * u * (sg[2].x - 2 * sg[1].x + sg[0].x) + 6 * t * (sg[3].x - 2 * sg[2].x + sg[1].x), y: 6 * u * (sg[2].y - 2 * sg[1].y + sg[0].y) + 6 * t * (sg[3].y - 2 * sg[2].y + sg[1].y)}, k = Math.abs(v.x * a2.y - v.y * a2.x) / Math.hypot(v.x, v.y) ** 3; return k > 1e-9 ? 1 / k : Infinity; })));
    if (r >= RIVER_RULES.radius) return cand;
    if (!round || r > round.r) round = {...cand, r};
    // (A narrow stage: a bend of 20 px or more is round enough to stop at; else look 150 variants further at most.)
    if (++since > 120 || ++tried > 600) break;
  }
  if (round) return {segs: round.segs, goldFrom: round.goldFrom, bends: round.bends, faults: round.faults};
  // (Session AH Finish: a narrow stage where no variant keeps every rule — the tablet rail's 768 px window, a computer window
  // just over 900 px — keeps the river's shape first: on past Health, below the line, inside the stage, its finer spacing as
  // close as it comes. Before, the fallback could turn back at Health's ring.)
  if (best!.faults.includes(NOT_PAST) && shape) return shape;
  return best!;
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
