import {seeded, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L21; owner amendment 9, "line first, nodes on the line"): the phone's path. Pure; values
 * are at a 390 px column (x scales with the width, y does not); every choice is seeded from the path id, so the same path
 * looks the same on every visit and a tick moves nothing.
 *
 * 1. Each orbit's river is drawn first: one smooth wave down the page from its planet's bottom (straight down, then away
 *    to the left) through apexes that alternate sides — left at 8–22 % of the width, right at 78–92 % — each flat (a
 *    horizontal tangent), so every swing turns as a swirl at the edge; apexes 90–190 px apart, seeded per swing; C1
 *    cubics, no turn under 40 px, always downward (so it never crosses itself). Its last swing runs from a left apex to
 *    the right, above the next planet, and down into that planet's top (or the finale's).
 * 2. The nodes then sit ON the river, walked along its length: seeded short steps (0.5–0.8 of a swing) and long ones
 *    (1.2–2 swings, a whole loop between two nodes), never closer than a node + 46 px down the page nor within 12 px of
 *    another ring, a planet or a banner's words.
 * 3. Each tab beside its node, one line: below-right, below-left, beside right or left — the first clear of the line,
 *    every ring, the banners and the column's edges; else its node slides along the river (± 30 % of its step); only
 *    then a wrap to two lines.
 * The line is drawn under the nodes, trimmed at each ring: one stretch per pair of stations, cut from the river.
 */
export const WAVE = {
  dot: 62, r: 31, gap: 62 + 46, ring: 12, minRadius: 40,
  apexGap: [90, 190] as const, left: [.08, .22] as const, right: [.78, .92] as const,
  tabTop: 62 * .2, tabBeside: -14.25, tabReach: 62 * .3, tabLine: 28.5, tabLineStep: 17.5,
  margin: 6, stageTop: 2, finaleNode: 62 * 1.1, finaleFoot: 100,
} as const;

type Pt = {x: number; y: number};
export type Cubic = [Pt, Pt, Pt, Pt];
export type WaveOrbit = {id: string; planet: boolean; steps: {id: string}[]};
export type WaveInput = {w: number; seed: string; orbits: WaveOrbit[]; finale: boolean; planetR: number; tabs: number[]; words: number[];
  /** the first screen, in the stage's coordinates: from the first banner's foot to the timer row */ view?: {top: number; bottom: number}};
/** `zigi`: ZIGi's own placer finds its pocket beside the node ('side'; 'above' is the placer's fallback). */
export type WaveLane = {x: number; y: number; side: 'left' | 'right'; tabDy: number; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above'};
export type PhoneWave = {h: number; lanes: WaveLane[]; banners: {top: number}[]; finale: {x: number; y: number} | null;
  /** each orbit's whole river (path data), and the stations' stretches cut from it */ rivers: string[]; segments: FlowSegment[]; stations: FlowNode[];
  /** tabs left with no clear spot (0 in a good layout) */ unresolved: number};

const at = (c: Cubic, t: number): Pt => { const u = 1 - t; return {x: u ** 3 * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t ** 3 * c[3].x, y: u ** 3 * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t ** 3 * c[3].y}; };
/** The least radius of curvature along a cubic (sampled). */
export function leastRadius(c: Cubic): number {
  let m = Infinity;
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, u = 1 - t;
    const v = {x: 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x), y: 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y)};
    const a = {x: 6 * u * (c[2].x - 2 * c[1].x + c[0].x) + 6 * t * (c[3].x - 2 * c[2].x + c[1].x), y: 6 * u * (c[2].y - 2 * c[1].y + c[0].y) + 6 * t * (c[3].y - 2 * c[2].y + c[1].y)};
    const s = Math.hypot(v.x, v.y), k = s > 1e-9 ? Math.abs(v.x * a.y - v.y * a.x) / s ** 3 : 0;
    if (k > 1e-12) m = Math.min(m, 1 / k);
  }
  return m;
}
const span = (c: Cubic) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 32; i++) { const x = at(c, i / 32).x; lo = Math.min(lo, x); hi = Math.max(hi, x); } return {lo, hi}; };
/** De Casteljau: the part of a cubic between t0 and t1. */
function part(c: Cubic, t0: number, t1: number): Cubic {
  const split = (q: Cubic, t: number): [Cubic, Cubic] => {
    const l = (a: Pt, b: Pt) => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
    const p01 = l(q[0], q[1]), p12 = l(q[1], q[2]), p23 = l(q[2], q[3]), p012 = l(p01, p12), p123 = l(p12, p23), m = l(p012, p123);
    return [[q[0], p01, p012, m], [m, p123, p23, q[3]]];
  };
  const right = t0 > 0 ? split(c, t0)[1] : c;
  return t1 < 1 ? split(right, (t1 - t0) / (1 - t0))[0] : right;
}
const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pathOf = (cs: readonly Cubic[]) => cs.length ? `M${f(cs[0]![0].x)} ${f(cs[0]![0].y)}${cs.map(c => ` C${f(c[1].x)} ${f(c[1].y)} ${f(c[2].x)} ${f(c[2].y)} ${f(c[3].x)} ${f(c[3].y)}`).join('')}` : '';

/**
 * One cubic between two points with given unit tangents, its handle lengths chosen (from short to long) so that it turns
 * no tighter than the least radius and stays inside the column; null when none does.
 */
function joint(p: Pt, dp: Pt, q: Pt, dq: Pt, w: number, minR: number): Cubic | null {
  // (A level end's handle is a length of its own — long enough for the turn, short enough to keep the swirl inside the
  // column; an upright end's is a share of the height.)
  const dy = q.y - p.y, k = w / 366, level = [230, 200, 175, 155, 130, 110, 90, 75, 65, 55].map(n => n * k), upright = [.85, .75, .65, .55, .45, .35].map(n => n * dy);
  for (const ka of dp.y ? upright : level) for (const kb of dq.y ? upright : level) {
    const c: Cubic = [p, {x: p.x + dp.x * ka, y: p.y + dp.y * Math.min(ka, dy)}, {x: q.x - dq.x * kb, y: q.y - dq.y * Math.min(kb, dy)}, q];
    const s = span(c);
    if (s.lo < WAVE.margin || s.hi > w - WAVE.margin) continue;
    if (leastRadius(c) >= minR) return c;
  }
  return null;
}

export function phoneWave(input: WaveInput): PhoneWave {
  let best: {wave: PhoneWave; score: number} | null = null;
  for (let attempt = 0; attempt < 32; attempt++) {
    const wave = build(input, attempt);
    const score = judge(input, wave);
    if (!best || score < best.score) best = {wave, score};
    if (score === 0) break;
  }
  return best!.wave;
}

/** How far a layout is from the owner's rules that depend on the seed (the first screen, the spaces' spread, clear tabs). */
function judge(input: WaveInput, wave: PhoneWave): number {
  let bad = 0;
  const firstOrbit = input.orbits.find(o => o.steps.length)?.steps.length ?? 0;
  if (input.view && firstOrbit) {
    const seen = wave.lanes.filter(l => l.y - WAVE.r >= input.view!.top && l.y + WAVE.r <= input.view!.bottom).length;
    const want = Math.min(3, firstOrbit);
    if (seen < want) bad += 100 * (want - seen);
    if (seen > 4) bad += 10 * (seen - 4);
  }
  let i = 0;
  for (const o of input.orbits) {
    const ys = wave.lanes.slice(i, i + o.steps.length).map(l => l.y); i += o.steps.length;
    if (ys.length >= 4) { const gaps = ys.slice(1).map((y, j) => y - ys[j]!); if (Math.max(...gaps) - Math.min(...gaps) < 60) bad += 20; }
  }
  bad += wave.lanes.filter(l => l.wrap).length * 3 + wave.unresolved * 50;
  return bad;
}

function build(input: WaveInput, attempt: number): PhoneWave {
  // (A 390 px phone's column is 366 px: lengths across follow the column, a turn's least radius the phone's width.)
  const {w, planetR} = input, k = w / 366, minR = WAVE.minRadius * k + .5, bh = 2 * planetR + 10, px = w - 4 - planetR;
  const R = WAVE.r, lanes: WaveLane[] = [], banners: {top: number}[] = [], rivers: string[] = [], segments: FlowSegment[] = [], stations: FlowNode[] = [];
  const samples: Pt[] = [], rings: {x: number; y: number; r: number}[] = [], words: {l: number; t: number; r: number; b: number}[] = [];
  let y = WAVE.stageTop, tabIndex = 0, finale: {x: number; y: number} | null = null, unresolved = 0;
  const live = input.orbits.map((o, i) => o.steps.length ? i : -1).filter(i => i >= 0), lastLive = live.at(-1) ?? -1;
  // (Where the river of the orbit before ended: the top of this orbit's planet.)
  input.orbits.forEach((orbit, si) => {
    banners.push({top: y});
    const mid = y + bh / 2;
    words.push({l: 0, t: mid - 20, r: input.words[si] ?? w * .6, b: mid + 20});
    if (!orbit.steps.length) { y += bh + 8; return; }
    if (orbit.planet) { stations.push(node(`planet:${orbit.id}`, px, mid, planetR)); rings.push({x: px, y: mid, r: planetR}); }
    const r = seeded(`${input.seed}|wave|${orbit.id}|${attempt}`), start: Pt = {x: px, y: mid + (orbit.planet ? planetR : bh / 2)};
    const gapOf = () => WAVE.apexGap[0] + (WAVE.apexGap[1] - WAVE.apexGap[0]) * Math.cbrt(r());
    // The river, swing by swing: from the planet's bottom, straight down, away to the left.
    const cubics: Cubic[] = [], apexes: (Pt & {side: 'left' | 'right'})[] = [];
    // Each swing: a sweep across that ends heading straight down at its outermost point, then a quarter turn of radius
    // 40–50 px (× width/390) that ends level at the apex — the swirl at the edge. Joins share one tangent.
    const addSwing = () => {
      const prev = apexes.at(-1), side: 'left' | 'right' = prev?.side === 'left' ? 'right' : 'left', out = side === 'left' ? -1 : 1;
      for (let tries = 0; tries < 16; tries++) {
        const rho = (40 + 10 * r()) * k + .5, [lo, hi] = side === 'left' ? WAVE.left : WAVE.right;
        const a = Math.max(lo * w, WAVE.margin + 4 + rho), b = Math.min(hi * w, w - WAVE.margin - 4 - rho), x = side === 'left' ? a + (Math.min(hi * w, b + w) - a) * r() : a + (b - a) * r();
        const qx = side === 'left' ? Math.min(x, hi * w) : Math.max(lo * w, Math.min(x, b));
        const g = gapOf() + tries * 14, q = {x: qx, y: (prev ?? start).y + Math.max(g, prev ? 0 : 130), side};
        const m = {x: q.x + out * rho, y: q.y - rho};
        const sweep = prev ? joint(prev, {x: out, y: 0}, m, {x: 0, y: 1}, w, minR) : joint(start, {x: 0, y: 1}, m, {x: 0, y: 1}, w, minR);
        if (!sweep) continue;
        const c = .5523 * rho, turn: Cubic = [m, {x: m.x, y: m.y + c}, {x: q.x + out * c, y: q.y}, q];
        cubics.push(sweep, turn); apexes.push(q); return;
      }
      // (Not reached with these bands; a plain swing keeps the river going.)
      const q = {x: w * (side === 'left' ? .15 : .85), y: (prev ?? start).y + 220, side}, p = prev ?? start;
      cubics.push([p, {x: p.x, y: p.y + 80}, {x: q.x, y: q.y - 80}, q]); apexes.push(q);
    };
    // (Dense samples along the river with their arc length, cubic and t.)
    type S = Pt & {s: number; c: number; t: number};
    const along: S[] = [];
    let closed = false;
    const extend = () => { if (closed) return; const before = cubics.length; addSwing(); for (let c = before; c < cubics.length; c++) { const cu = cubics[c]!; for (let i = along.length ? 1 : 0; i <= 64; i++) { const p = at(cu, i / 64), prev = along.at(-1); along.push({...p, s: prev ? prev.s + Math.hypot(p.x - prev.x, p.y - prev.y) : 0, c, t: i / 64}); } } };
    const pointAt = (s: number): S => { while (!closed && along.at(-1)!.s < s) extend(); if (s >= along.at(-1)!.s) return along.at(-1)!; let lo = 0, hi = along.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (along[m]!.s < s) lo = m; else hi = m; } return along[hi]!; };
    extend(); extend();
    const swing = along.at(-1)!.s / 2;
    // The nodes on the river.
    const placed: S[] = [], prevY = () => placed.at(-1)?.y ?? -Infinity;
    const clear = (p: Pt, others: readonly Pt[]) => {
      if (p.y - prevY() < WAVE.gap - .01) return false;
      for (const q of others) if (Math.hypot(p.x - q.x, p.y - q.y) < 2 * R + WAVE.ring) return false;
      for (const g of rings) if (Math.hypot(p.x - g.x, p.y - g.y) < g.r + R + WAVE.ring) return false;
      for (const b of words) if (p.x - R < b.r + WAVE.ring && p.y + R > b.t - WAVE.ring && p.y - R < b.b + WAVE.ring) return false;
      return p.x - R >= WAVE.margin && p.x + R <= w - WAVE.margin;
    };
    let s = 0;
    const pre: WaveLane[] = [];
    for (let j = 0; j < orbit.steps.length; j++) {
      const step = r() < .5 ? .5 + .3 * r() : 1.2 + .8 * r(), len = step * swing * (placed.length ? 1 : .35);
      s = (placed.length ? s : 0) + len;
      let p = pointAt(s);
      while (!clear(p, placed) || pre.some(l => ringOnBox(p, laneBox(l, tabIndex + pre.indexOf(l))))) { s += 4; p = pointAt(s); }
      // (Its tab: the first clear spot; else the node slides along the river, up to 30 % of its step either way.)
      const tab = input.tabs[tabIndex + j] ?? 120;
      let pick = tabFor(p, tab, false, along, pre);
      // (Slide first — every place up to 30 % either way — and only then wrap, at the same places.)
      const base = placed.length ? p.s - placed.at(-1)!.s : p.s;
      const spots = [p, ...Array.from({length: 24}, (_, i) => pointAt(p.s + (i % 2 ? -1 : 1) * .0125 * (1 + (i >> 1)) * base))].filter(q => q === p || (clear(q, placed) && !pre.some(l => ringOnBox(q, laneBox(l, tabIndex + pre.indexOf(l))))));
      for (const wrap of [false, true]) for (const q of spots) {
        if (!pick.fault) break;
        const c = tabFor(q, tab, wrap, along, pre);
        if (c.fault === 0) { p = q; pick = c; }
      }
      s = p.s; placed.push(p); pre.push(pick.lane);
    }
    // The river runs on to a left apex below the last node, then swings right into the next planet's top (or the finale's).
    const last = placed.at(-1)!;
    while (!(apexes.at(-1)!.side === 'left' && apexes.at(-1)!.y > last.y + R + WAVE.ring && along.at(-1)!.s > s + R)) extend();
    const L = apexes.at(-1)!, next = input.orbits.slice(si + 1).find(o => o.steps.length), toFinale = si === lastLive && input.finale;
    const end: Pt = toFinale ? {x: w / 2, y: 0} : {x: px, y: 0};
    let tail: Cubic | null = null;
    for (let g = Math.max(WAVE.apexGap[0], gapOf()); g < 400 && !tail; g += 10) {
      end.y = L.y + g;
      const c = joint(L, {x: 1, y: 0}, end, {x: 0, y: 1}, w, minR);
      // (Its planet, or the finale, clear of the last node.)
      const er = toFinale ? WAVE.finaleNode / 2 : planetR, centre = {x: end.x, y: end.y + er};
      if (c && Math.hypot(centre.x - last.x, centre.y - last.y) >= er + R + WAVE.ring) tail = c;
    }
    if (next || toFinale) {
      cubics.push(tail!);
      const c = cubics.length - 1; for (let i = 1; i <= 64; i++) { const p = at(tail!, i / 64), prev = along.at(-1)!; along.push({...p, s: prev.s + Math.hypot(p.x - prev.x, p.y - prev.y), c, t: i / 64}); }
    }
    closed = true;
    rivers.push(pathOf(cubics));
    for (let i = 0; i < cubics.length; i++) for (let t = 0; t <= 1; t += 1 / 48) samples.push(at(cubics[i]!, t));
    // (Where an arc position falls: its cubic and t.)
    const cut = (sA: number, sB: number): Cubic[] => {
      const a = pointAt(sA), b = sB === Infinity ? {c: cubics.length - 1, t: 1} : pointAt(sB), out: Cubic[] = [];
      for (let c = a.c; c <= b.c; c++) out.push(part(cubics[c]!, c === a.c ? a.t : 0, c === b.c ? b.t : 1));
      return out;
    };
    // (Each node's ring on the river: the arc positions where it enters and leaves it.)
    const ringOut = (p: S, dir: 1 | -1) => { let q = p.s; while (q > 0 && Math.hypot(pointAt(q).x - p.x, pointAt(q).y - p.y) < R) q += dir; return q; };
    let from = orbit.planet ? `planet:${orbit.id}` : null, fromS = 0;
    placed.forEach((p, j) => {
      const id = orbit.steps[j]!.id, inS = ringOut(p, -1), outS = ringOut(p, 1);
      stations.push(node(id, p.x, p.y, R)); rings.push({x: p.x, y: p.y, r: R});
      if (from !== null) segments.push(seg(from, id, cut(fromS, inS)));
      from = id; fromS = outS;
    });
    const endId = toFinale ? 'finale:end' : next?.planet ? `planet:${next.id}` : null;
    if (endId && from !== null) segments.push(seg(from, endId, cut(fromS, Infinity)));
    if (toFinale) { const fy = end.y + WAVE.finaleNode / 2; finale = {x: end.x, y: fy}; stations.push(node('finale:end', end.x, fy, WAVE.finaleNode / 2)); rings.push({x: end.x, y: fy, r: WAVE.finaleNode / 2}); y = fy + WAVE.finaleNode / 2 + WAVE.finaleFoot; }
    else if (next) y = end.y + planetR - bh / 2;
    else y = (along.at(-1)!.y) + 40;
    // The tabs: beside each node, clear of everything; else the node slides along the river; else a wrap.
    placed.forEach((p, j) => {
      const tab = input.tabs[tabIndex++] ?? 120;
      const kept = pre[j]!, keptFault = faultOf(laneBox(kept, lanes.length), p);
      if (keptFault === 0) { lanes.push(kept); return; }
      const choice = tabFor(p, tab);
      if (choice.fault === 0) { lanes.push(choice.lane); return; }
      const others = placed.filter((_, i) => i !== j), nextY = placed[j + 1]?.y ?? Infinity, prevYj = placed[j - 1]?.y ?? -Infinity;
      for (const f of Array.from({length: 24}, (_, i) => (i % 2 ? -1 : 1) * .0125 * (1 + (i >> 1)))) {
        const d = (j ? p.s - placed[j - 1]!.s : p.s) * f, q = pointAt(p.s + d);
        if (q.y - prevYj < WAVE.gap || nextY - q.y < WAVE.gap) continue;
        if (others.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 2 * R + WAVE.ring)) continue;
        if (rings.some(g => g.r !== R && Math.hypot(q.x - g.x, q.y - g.y) < g.r + R + WAVE.ring)) continue;
        const c2 = tabFor(q, tab);
        if (c2.fault === 0) { moveNode(id(j), p, q); placed[j] = q; lanes.push(c2.lane); return; }
      }
      const wrapped = tabFor(p, tab, true), use = wrapped.fault < choice.fault ? wrapped : choice;
      if (use.fault) unresolved++;
      lanes.push(use.lane);
    });
    function id(j: number) { return orbit.steps[j]!.id; }
    // (A node slid along the river: its station, ring and the two stretches beside it follow.)
    function moveNode(nid: string, p: S, q: S) {
      const st = stations.find(n => n.id === nid)!; st.x = q.x; st.y = q.y;
      const ring = rings.find(g => g.x === p.x && g.y === p.y && g.r === R); if (ring) { ring.x = q.x; ring.y = q.y; }
      const inS = ringOut(q, -1), outS = ringOut(q, 1);
      const before = segments.findIndex(sg => sg.to === nid), after = segments.findIndex(sg => sg.from === nid);
      const sOf = (sg: FlowSegment, end: boolean) => { const n = (sg.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), x = end ? n.at(-2)! : n[0]!, yy = end ? n.at(-1)! : n[1]!; let best = 0, bd = Infinity; for (const a of along) { const d = Math.hypot(a.x - x, a.y - yy); if (d < bd) { bd = d; best = a.s; } } return best; };
      if (before >= 0) { const sg = segments[before]!; segments[before] = seg(sg.from!, nid, cut(sOf(sg, false), inS)); }
      if (after >= 0) { const sg = segments[after]!; segments[after] = seg(nid, sg.to!, sg.to === 'finale:end' || sg.to!.startsWith('planet:') ? cut(outS, Infinity) : cut(outS, sOf(sg, true))); }
    }
  });
  // (Tabs are chosen after every river and node of the orbit is known; a tab of an earlier orbit checks this orbit's too.)
  function tabFor(p: Pt, tab: number, wrap = false, extra: readonly Pt[] = [], more: readonly WaveLane[] = []): {fault: number; lane: WaveLane} {
    let bestLane: WaveLane | null = null, bestFault = Infinity;
    const room = (side: 'left' | 'right') => side === 'right' ? w - WAVE.margin - p.x - WAVE.tabReach : p.x - WAVE.tabReach - WAVE.margin;
    const sides: ('left' | 'right')[] = p.x < w / 2 ? ['right', 'left'] : ['left', 'right'];
    // (A wrapped tab: two even lines, or as wide as the room allows.)
    for (const dy of [WAVE.tabTop, WAVE.tabBeside]) for (const side of sides) for (const share of wrap ? [.52, .6, .7] : [1]) {
      const max = wrap ? Math.max(70, Math.min(Math.floor(room(side)), Math.ceil(tab * share) + 8)) : tab, lines = wrap ? Math.max(1, Math.ceil(tab / max)) : 1, width = Math.min(tab, max);
      const t = p.y + dy, b = t + WAVE.tabLine + (lines - 1) * WAVE.tabLineStep;
      const box = side === 'right' ? {l: p.x + WAVE.tabReach, t, r: p.x + WAVE.tabReach + width, b} : {l: p.x - WAVE.tabReach - width, t, r: p.x - WAVE.tabReach, b};
      let n = faultOf(box, p, extra);
      for (const [i, l] of more.entries()) { const lb = laneBox(l, lanes.length + i); if (box.l < lb.r && box.r > lb.l && box.t < lb.b && box.b > lb.t) n += 100; }
      if (n < bestFault) { bestFault = n; bestLane = {x: p.x, y: p.y, side, tabDy: dy, wrap: wrap && lines > 1, maxTab: max, lines, zigi: 'side'}; }
      if (n === 0) return {fault: 0, lane: bestLane!};
    }
    return {fault: bestFault, lane: bestLane!};
  }
  /** How much a tab's box is in the way: the column's edge, the line (with `extra` points), rings, banners' words, tabs. */
  function faultOf(box: {l: number; t: number; r: number; b: number}, p: Pt, extra: readonly Pt[] = []): number {
    let n = box.l < WAVE.margin || box.r > w - WAVE.margin ? 1e4 : 0;
    const g = {l: box.l - 3, t: box.t - 3, r: box.r + 3, b: box.b + 3};
    // (The river only goes down: the pieces near the box are found by their height.)
    for (const line of [samples, extra]) { let lo = 0, hi = line.length; while (lo < hi) { const m = (lo + hi) >> 1; if (line[m]!.y < g.t - 1) lo = m + 1; else hi = m; } for (let i = Math.max(1, lo); i < line.length && line[i - 1]!.y <= g.b + 1; i++) if (segHits(line[i - 1]!, line[i]!, g)) n += 1; }
    for (const c of [...rings, {x: p.x, y: p.y, r: 18}]) if ((c.x !== p.x || c.y !== p.y || c.r === 18) && Math.max(box.l - c.x, 0, c.x - box.r) ** 2 + Math.max(box.t - c.y, 0, c.y - box.b) ** 2 < (c.r + 2) ** 2) n += 100;
    for (const q of words) if (box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t) n += 100;
    for (const [i, l] of lanes.entries()) { const lb = laneBox(l, i); if (box.l < lb.r && box.r > lb.l && box.t < lb.b && box.b > lb.t) n += 100; }
    return n;
  }
  function ringOnBox(p: Pt, b: {l: number; t: number; r: number; b: number}) { return Math.max(b.l - p.x, 0, p.x - b.r) ** 2 + Math.max(b.t - p.y, 0, p.y - b.b) ** 2 < (R + 2) ** 2; }
  function laneBox(l: WaveLane, index: number) { const width = l.wrap ? l.maxTab : input.tabs[index] ?? 120, t = l.y + l.tabDy, b = t + WAVE.tabLine + (l.lines - 1) * WAVE.tabLineStep; return l.side === 'right' ? {l: l.x + WAVE.tabReach, t, r: l.x + WAVE.tabReach + width, b} : {l: l.x - WAVE.tabReach - width, t, r: l.x - WAVE.tabReach, b}; }
  return {h: Math.ceil(y), lanes, banners, finale, rivers, segments, stations, unresolved};
}
/** Whether a piece of the line (a to b) meets a box. */
function segHits(a: Pt, b: Pt, box: {l: number; t: number; r: number; b: number}): boolean {
  if (Math.max(a.x, b.x) < box.l || Math.min(a.x, b.x) > box.r || Math.max(a.y, b.y) < box.t || Math.min(a.y, b.y) > box.b) return false;
  for (let i = 0; i <= 8; i++) { const x = a.x + (b.x - a.x) * i / 8, y = a.y + (b.y - a.y) * i / 8; if (x >= box.l && x <= box.r && y >= box.t && y <= box.b) return true; }
  return false;
}
const node = (id: string, x: number, y: number, r: number): FlowNode => ({id, x, y, r, inSide: 'top', outSide: 'bottom', colour: '', done: false});
function seg(from: string, to: string, cs: Cubic[]): FlowSegment {
  const a = cs[0]![0], b = cs.at(-1)![3];
  return {id: `${from}>${to}`, from, to, kind: 'step', d: pathOf(cs), x1: a.x, y1: a.y, x2: b.x, y2: b.y, fromColour: '', toColour: '', fromLit: false, toLit: false};
}
