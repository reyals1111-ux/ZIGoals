import {flowSegments, seeded, type FlowBox, type FlowNode, type FlowSegment} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L13, owner amendment 7; owner Part 1, references 02, 05 and 06): the phone's Path as the
 * computer's river. Pure (no React, no DOM).
 *
 * The line is the computer's own: `flowSegments` (lib/path/flow-geometry.ts), unchanged, in the phone's column with the
 * phone's swing (`phoneSwing`). It leaves each node at a side point and enters the next at a side point, heading down — in
 * on the name's side, out on the other — through one seeded waypoint: where both ends are on the same side it bows out past
 * both rims and back, across it swings through the middle. Planets keep top-in, bottom-out; the finale takes the line in at
 * its top. Reference 01 (in along the ring at the top) stays scrapped.
 *
 * What the phone adds is where the nodes stand (`phoneRiver`). The computer's 8-step wave moves each node half a swing
 * sideways; in a phone's column that gives five fixed places and no long sweep, so the phone walks instead, seeded from the
 * path's id. Each stretch between two nodes is a drift (a short way across), a swing (through the middle), a sweep (45 % of
 * the column or more) or a bow (the next node's name on the side the line leaves by, so the line bows out past both rims and
 * back), in a seeded order where every run of four holds each kind once; each node's place within its kind's reach is seeded,
 * and so is the space above it (about 90 to 200 px centre to centre at 390). Each stretch is drawn exactly as the page draws
 * it and checked: no radius under 40 px × width/390, inside the column, never upward (by construction), clear of every other
 * ring, planet, name tab and banner. A stretch that breaks a rule gets more height, 8 px at a time; a place that cannot keep
 * the rules gives way to the next. Bounded, never Math.random.
 * The places come from the width, the names and the planets alone — never from which node is next: a tick moves nothing.
 */
type Pt = {x: number; y: number};
type Cubic = readonly [Pt, Pt, Pt, Pt];

/** The phone's layout as components/path/path-orbit.css draws it (measured in Chromium at 320–430 px, ADR-032 L5). */
export const RIVER = {
  node: 62, r: 31,
  /** A tab's top below its node's centre, and where it starts beside the centre (`.2` and `.3` of a node). */
  tabTop: 62 * .2, tabReach: 62 * .3,
  /** A tab's height: one line, and each further line when a very long name wraps. */
  tabLine: 28.5, tabLineStep: 17.5,
  /** Nothing reaches closer than this to the stage's sides; a node's ring keeps its 6 px halo inside too. */
  margin: 6, halo: 6,
  /** The stage's own top padding; a banner is its planet's diameter + 10; 8 px from a banner to its steps. */
  stageTop: 2, bannerPad: 10, sectionGap: 8,
  /** A planet's sphere stands 4 px from the stage's right edge, centred on its banner. */
  planetEdge: 4,
  /** The banner's words: ±20 px about its middle, from 6 px past the stage's left; its tint runs on 44 px. */
  wordsHalf: 20, wordsLeft: -6, fade: 44,
  /** The day's finale (a 68 px node in the middle) and the room under it to the stage's foot (its words, the padding). */
  finaleR: 34, finaleFoot: 74,
  clearance: 6,
  /** `flowSegments`' own gutter: no point of the line nearer the stage's sides. */
  gutter: 8,
} as const;
/** The least radius of curvature on the phone's line: 40 px at 390 px, scaled with the width (owner Part 1.3). */
export const riverMinRadius = (vw: number) => 40 * vw / 390;
/** The phone's swing for `flowSegments` (owner amendment 7: about min(150, 0.4 × the column)). */
export const phoneSwing = (w: number) => Math.min(150, .4 * w);

// ---- Cubic Bézier helpers ----
export function bez(c: Cubic, t: number) {
  const [a, b, d, e] = c, u = 1 - t;
  return {
    p: {x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t * t * t * e.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t * t * t * e.y},
    v: {x: 3 * (u * u * (b.x - a.x) + 2 * u * t * (d.x - b.x) + t * t * (e.x - d.x)), y: 3 * (u * u * (b.y - a.y) + 2 * u * t * (d.y - b.y) + t * t * (e.y - d.y))},
    a: {x: 6 * (u * (d.x - 2 * b.x + a.x) + t * (e.x - 2 * d.x + b.x)), y: 6 * (u * (d.y - 2 * b.y + a.y) + t * (e.y - 2 * d.y + b.y))},
  };
}
/** The least radius of curvature along a cubic (sampled). */
export function curveRadius(c: Cubic, n = 48): number {
  let m = Infinity;
  for (let i = 0; i <= n; i++) { const {v, a} = bez(c, i / n), s = Math.hypot(v.x, v.y); if (s < 1e-9) continue; const k = Math.abs(v.x * a.y - v.y * a.x) / s ** 3; if (k > 0) m = Math.min(m, 1 / k); }
  return m;
}
/** A segment's cubics, read back from its path data (`M x y C … C …`; a straight `L` reads as one flat cubic). */
export function cubicsOf(d: string): Cubic[] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), out: Cubic[] = [];
  if (d.includes('L')) { const a = {x: n[0]!, y: n[1]!}, b = {x: n[2]!, y: n[3]!}; return [[a, a, b, b]]; }
  let at: Pt = {x: n[0]!, y: n[1]!};
  for (let i = 2; i + 5 < n.length; i += 6) { const c: Cubic = [at, {x: n[i]!, y: n[i + 1]!}, {x: n[i + 2]!, y: n[i + 3]!}, {x: n[i + 4]!, y: n[i + 5]!}]; out.push(c); at = c[3]; }
  return out;
}

// ---- The checks ----
type Ring = {id: string; x: number; y: number; r: number};
/** How badly a stretch breaks the rules (0 = it keeps them all): its least radius, the column, its clearances. */
export function stretchFault(seg: FlowSegment, rings: readonly Ring[], boxes: readonly FlowBox[], o: {w: number; minRadius: number}): {fault: number; why: string} {
  if (seg.d.includes('L')) return {fault: 100, why: 'flat'};
  const cs = cubicsOf(seg.d), c = RIVER.clearance;
  let fault = 0, why = '';
  const add = (v: number, w: string) => { if (v > 0) { fault += v; if (!why) why = w; } };
  for (const q of cs) add(Math.max(0, o.minRadius - curveRadius(q)), 'radius');
  const near = rings.filter(g => g.y + g.r + 12 >= Math.min(cs[0]![0].y, cs.at(-1)![3].y) - 12 && g.y - g.r - 12 <= Math.max(cs[0]![0].y, cs.at(-1)![3].y) + 12);
  const nearBoxes = boxes.filter(b => b.bottom + c >= cs[0]![0].y && b.top - c <= cs.at(-1)![3].y);
  for (const q of cs) for (let i = 0; i <= 32; i++) {
    const {p} = bez(q, i / 32);
    add(Math.max(0, RIVER.margin - p.x, p.x - (o.w - RIVER.margin)) * 4, 'column');
    for (const g of near) {
      // (Its own two rings: the line starts and ends on them, so only their inside counts.)
      const own = g.id === seg.from || g.id === seg.to, need = own ? g.r - 1.5 : g.r + (g.id.startsWith('planet:') ? c : RIVER.halo + 2);
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < need) add((need - d) * 2, `ring ${g.id}`);
    }
    for (const b of nearBoxes) if (p.x > b.left - c && p.x < b.right + c && p.y > b.top - c && p.y < b.bottom + c) add(Math.min(p.x - b.left + c, b.right + c - p.x, p.y - b.top + c, b.bottom + c - p.y) + 2, `box ${b.id}`);
  }
  return {fault, why};
}

// ---- The layout ----
/** A stretch's kind (owner amendment 7). */
export type StretchKind = 'drift' | 'swing' | 'sweep' | 'bow';
export type RiverLane = {x: number; side: 'left' | 'right'; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above';
  /** The space above this node: from the node above's foot (or its orbit's banner's steps) to this node's top, in px. */
  gap: number;
  /** The kind of the stretch into this node, read from its shape; and its place on the walk's grid (-1: wrapped). */
  kind: StretchKind; q: number};
export type RiverInput = {
  /** The stage's width, and the screen's (for the least radius; default the stage + the shell's 2 × 12 px). */
  w: number; vw?: number; seed: string;
  /** Each node's tab at its whole width on one line (the words as drawn + the tab's chrome), in path order. */
  tabs: readonly number[];
  /** How many nodes each orbit has, in order (their sum is `tabs.length`). */
  orbits: readonly number[];
  /** Per orbit: whether it has a planet (default: each one does). */
  planets?: readonly boolean[];
  /** The planets' sphere radius (42–50 px). */
  planetR: number;
  /** Per orbit: where its banner's words end (px from the stage's left; the tint runs on `RIVER.fade` past them). */
  words?: readonly number[];
  /** ZIGi's width at rest (beside a node where it fits). */
  zigi: number;
  /** Whether the day's finale ends the path (default true). */
  finale?: boolean;
  /** The first screen in the stage's own coordinates (from the first banner's foot to the timer row): three or four nodes in it. */
  view?: {top: number; bottom: number};
  /** The nodes' and orbits' own ids (the line is seeded by them, so the model draws exactly the page's line). */
  ids?: readonly string[]; orbitIds?: readonly string[];
};
export type RiverLayout = {
  lanes: RiverLane[];
  /** The space above each orbit's banner (the first is 0: it opens the stage). */
  orbitGaps: number[];
  /** The space above the finale. */
  finaleGap: number;
  /** The model the lanes were checked on: every station, the boxes the line keeps clear of, its line, the stage's height. */
  nodes: FlowNode[]; boxes: FlowBox[]; segments: FlowSegment[]; bad: string[]; h: number;
  /** Per orbit: its banner's top and foot (stage px). */
  banners: {top: number; bottom: number}[];
  /** The swing the line is drawn with (`flowSegments`). */
  swing: number;
};

/** The day's finale's id on the path (components/path/path.tsx `FINALE_POINT`). */
export const FINALE = 'finale:end';
/** A stretch's height grows 8 px at a time, at most this far past its seeded start. */
const GROW = 8, REACH_DOWN = 240;
/** Room a node keeps on its way out (the side away from its name), and past the outer rim of a bow, for the bow (px). */
const ROOM = 34;
/** The kinds' space (node foot to node top, at 390; scaled): centre to centre about 90–130 px for a drift, 120–170 for a
 *  swing, 150–200 for a sweep, 125–185 for a bow. */
const SPACE: Record<StretchKind, [number, number]> = {drift: [30, 66], swing: [56, 106], sweep: [88, 138], bow: [62, 122]};
const KINDS: StretchKind[] = ['drift', 'swing', 'sweep', 'bow'];
/** The six orders of a path's first run: a drift, a sweep and a bow. */
const FIRST_RUNS: StretchKind[][] = [['drift', 'sweep', 'bow'], ['sweep', 'bow', 'drift'], ['bow', 'drift', 'sweep'], ['drift', 'bow', 'sweep'], ['bow', 'sweep', 'drift'], ['sweep', 'drift', 'bow']];

const shuffledBy = <T>(xs: readonly T[], rnd: () => number) => xs.map(v => ({v, r: rnd()})).sort((p, q) => p.r - q.r).map(o => o.v);
/**
 * A stretch's kind, read from its shape (owner amendment 7, ADR-032 L13): a bow when both its ends are on the same side of
 * their nodes, it passes out 16 px or more beyond both rims there and the nodes stand within 30 % of the column of each other; else a
 * sweep when it travels 45 % of the column or more; else a swing when it crosses the column's middle; else a drift.
 */
export function stretchKind(seg: FlowSegment, a: FlowNode, b: FlowNode, w: number): StretchKind {
  const xs = cubicsOf(seg.d).flatMap(c => [0, .125, .25, .375, .5, .625, .75, .875, 1].map(t => bez(c, t).p.x)), lo = Math.min(...xs), hi = Math.max(...xs);
  const side = (a.outSide === 'left' || a.outSide === 'right') && a.outSide === b.inSide ? a.outSide : null;
  if (side && Math.abs(a.x - b.x) <= .3 * w && (side === 'right' ? hi > Math.max(a.x, b.x) + Math.max(a.r, b.r) + 16 : lo < Math.min(a.x, b.x) - Math.max(a.r, b.r) - 16)) return 'bow';
  if (hi - lo >= .45 * w) return 'sweep';
  if (lo < w / 2 && hi > w / 2) return 'swing';
  return 'drift';
}
export function phoneRiver(input: RiverInput): RiverLayout {
  const {w, seed, tabs, orbits, planetR} = input, vw = input.vw ?? w + 24, R = RIVER.r, n = tabs.length, scale = w / 366;
  const swing = phoneSwing(w), minRadius = riverMinRadius(vw);
  const xmin = RIVER.margin + R + RIVER.halo, xmax = w - xmin, planetX = w - RIVER.planetEdge - planetR, bh = 2 * planetR + RIVER.bannerPad;
  const nodeIds = tabs.map((_, i) => input.ids?.[i] ?? `n${i}`), planetIds = orbits.map((_, s) => `planet:${input.orbitIds?.[s] ?? s}`);
  const hasPlanet = (s: number) => input.planets?.[s] ?? true;
  const wantFinale = input.finale ?? true;
  const fitsOn = (x: number, side: 'left' | 'right', tab: number) => side === 'right' ? x + RIVER.tabReach + tab <= w - RIVER.margin : x - RIVER.tabReach - tab >= RIVER.margin;
  const stretch = (a: FlowNode, b: FlowNode) => flowSegments([a, b], {w, seed, swing, gutter: RIVER.gutter})[0]!;
  const nodeAt = (id: string, x: number, y: number, side: 'left' | 'right'): FlowNode => ({id, x, y, r: R, inSide: side, outSide: side === 'left' ? 'right' : 'left', colour: '#9273ff', done: false});
  const tabBox = (id: string, x: number, y: number, side: 'left' | 'right', width: number, lines: number): FlowBox => {
    const tt = y + RIVER.tabTop, th = RIVER.tabLine + (lines - 1) * RIVER.tabLineStep;
    return {id: `tab:${id}`, top: tt, bottom: tt + th, left: side === 'right' ? x + RIVER.tabReach : x - RIVER.tabReach - width, right: side === 'right' ? x + RIVER.tabReach + width : x - RIVER.tabReach};
  };
  const bannerBox = (s: number, top: number): FlowBox => ({id: `banner:${input.orbitIds?.[s] ?? s}`, left: RIVER.wordsLeft, right: (input.words?.[s] ?? Math.min(214, w * .6)) + RIVER.fade, top: top + bh / 2 - RIVER.wordsHalf, bottom: top + bh / 2 + RIVER.wordsHalf});
  const planetAt = (s: number, top: number): FlowNode => ({id: planetIds[s]!, x: planetX, y: top + bh / 2, r: planetR, inSide: 'top', outSide: 'bottom', colour: '#23eaff', done: false});
  const finaleAt = (y: number): FlowNode => ({id: FINALE, x: w / 2, y, r: RIVER.finaleR, inSide: 'top', outSide: 'bottom', colour: '#9273ff', done: false});
  const ringOf = (q: FlowNode) => ({id: q.id, x: q.x, y: q.y, r: q.r});
  // (How far past its rims `flowSegments` bows the stretch between two nodes, were it a bow: its own seeded amplitude.)
  const bowOf = (from: string, to: string) => { const r = seeded(`${seed}|${from}>${to}`); r(); return swing * (.35 + r() * .65) * .55; };
  // (Seeded by the path and its own nodes: every path its own walk, the same on every visit; a tick changes no id.)
  let lanes: RiverLane[] = [], orbitGaps: number[] = [], finaleGap = 40;
  const walk = (compact: boolean, turn = 0) => {
    const rnd = seeded(`${seed}|${nodeIds.join(',')}|phone-river-v3|${Math.round(w)}`);
    // The kinds in a seeded order: every run of five stretches holds each kind, the bow twice; the path's first run puts a
    // drift, a sweep and a bow first, in one of their six orders (seeded; `turn` steps on to the next), so a phone's first
    // two screens show all three.
    const plan: StretchKind[] = [];
    for (let b = 0; plan.length < n + 8; b++) {
      let bag: StretchKind[] = [...KINDS, 'bow'];
      if (b === 0) bag = FIRST_RUNS[(Math.floor(rnd() * 6) + turn) % 6]!.slice();
      else for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!]; }
      plan.push(...bag, ...(b === 0 ? ['swing' as const] : []));
    }
    let planAt = 0;
    const take = (kind: StretchKind) => {
      // (A kind that gave way stays next in line: the one that stood in for it takes its turn now.)
      if (plan[planAt] !== kind) plan.splice(planAt, 0, kind);
      planAt++;
    };

    // ---- The walk: station by station, top to bottom; `y` is the foot of what stands so far ----
    lanes = []; orbitGaps = orbits.map(() => 0); finaleGap = 40;
    const rings: Ring[] = [], boxes: FlowBox[] = [];
    let y: number = RIVER.stageTop, last: FlowNode | null = null, k = 0;
    // (The least space a stretch needs for its rules, from `from` up, 8 px at a time: the first that keeps them all, else the
    // least bad.)
    const settle = (a: FlowNode, place: (gap: number) => {b: FlowNode; extra: FlowBox[]}, from: number, upTo = from + REACH_DOWN) => {
      let best: {gap: number; fault: number; b: FlowNode; extra: FlowBox[]} | null = null;
      for (let gap = Math.round(from); gap <= upTo; gap += GROW) {
        const {b, extra} = place(gap), {fault} = stretchFault(stretch(a, b), [...rings, ringOf(b)], [...boxes, ...extra], {w, minRadius});
        if (!best || fault < best.fault - 1e-6) best = {gap, fault, b, extra};
        if (fault === 0) break;
      }
      return best!;
    };
    orbits.forEach((count, s) => {
      // The orbit's banner (and its planet, which takes the line in at its top from the node above).
      let og = s === 0 ? 0 : Math.round(62 + rnd() * 24);
      if (s > 0 && last && hasPlanet(s) && count > 0) og = settle(last, gap => ({b: planetAt(s, y + gap), extra: [bannerBox(s, y + gap)]}), og).gap;
      orbitGaps[s] = og;
      const top = y + og;
      boxes.push(bannerBox(s, top));
      if (hasPlanet(s) && count > 0) { last = planetAt(s, top); rings.push(ringOf(last)); }
      y = top + bh + RIVER.sectionGap;
      // (One step back where a node finds no place that keeps every rule: the node above it, in this orbit, takes another
      // place — at most four times an orbit.)
      const saved: {lanes: number; rings: number; boxes: number; last: FlowNode | null; y: number; planAt: number; plan: StretchKind[]}[] = [], banned: Set<string>[] = [];
      let backs = 0;
      for (let j = 0; j < count; j++, k++) {
        saved[j] = {lanes: lanes.length, rings: rings.length, boxes: boxes.length, last, y, planAt, plan: plan.slice()};
        const tab = tabs[k]!, id = nodeIds[k]!, a: FlowNode | null = last, fromPlanet = !!a && a.inSide === 'top';
        const nextS = orbits.findIndex((c, t) => t > s && c > 0), closing = j === count - 1 && nextS > 0 && hasPlanet(nextS);
        type Try = {x: number; side: 'left' | 'right'; kind: StretchKind; space: [number, number]; q: number};
        // (The places it may take: a seeded grid across the column, its name on either side — inside the column, its name
        // whole on one line, and, before a planet (`strict`), its way out toward that planet, well left of it. Places with room
        // on their way out — the side away from the name — for the next stretch come first.)
        // (The room it needs on its way out: the bow `flowSegments` will draw toward the next node — seeded from the two ids,
        // so known now — past its rim; toward a planet or the finale, a drift's worth.)
        const nextId = j + 1 < count ? nodeIds[k + 1] : null, need = nextId ? bowOf(id, nextId) + 6 : ROOM;
        const jitter = rnd(), places: {x: number; side: 'left' | 'right'; q: number; room: number}[] = [];
        for (let q = 0; q < 15; q++) for (const side of ['left', 'right'] as const) {
          const x = Math.round((xmin + (xmax - xmin) * (q + jitter) / 15) * 10) / 10;
          if (!fitsOn(x, side, tab) || banned[j]?.has(`${side}${q}`)) continue;
          const out = side === 'left' ? w - RIVER.gutter - x - R : x - R - RIVER.gutter;
          places.push({x, side, q, room: out >= need ? 2 : out >= ROOM ? 1 : 0});
        }
        const strictOk = (p: {x: number; side: 'left' | 'right'}) => p.side === 'left' && p.x <= planetX - .3 * w;
        const want = !a ? null : fromPlanet ? null : plan[planAt]!;
        const order = shuffledBy(places, rnd).sort((p, q) => q.room - p.room || (closing ? Number(strictOk(q)) - Number(strictOk(p)) : 0));
        const best: {pick: {t: Try; got: ReturnType<typeof settle>} | null} = {pick: null};
        // (The first screen's three nodes start each stretch from its kind's least height, and compare more places.)
        const early = !!input.view && k < 3;
        const tryOne = (t: Try, upTo?: number) => {
          const base = Math.max(28, (t.space[0] + (early ? 0 : rnd()) * (t.space[1] - t.space[0])) * scale);
          const place = (gap: number) => { const b = nodeAt(id, t.x, y + gap + R, t.side); return {b, extra: [tabBox(id, t.x, b.y, t.side, tab, 1)]}; };
          const got = a ? settle(a, place, base, upTo) : {gap: Math.round(base), fault: 0, ...place(Math.round(base))};
          const better = !best.pick || got.fault < best.pick.got.fault - 1e-6 || (got.fault === best.pick.got.fault && got.gap < best.pick.got.gap);
          if (better) best.pick = {t, got};
          return got.fault === 0;
        };
        if (!a) tryOne({...order[0] ?? {x: w / 2, side: 'right', q: -1}, kind: 'swing', space: [40, 90]});
        else {
          // The planned kind first (judged by the stretch's own shape, `stretchKind`), then the others in a seeded order; for
          // each, up to four of its places that keep every rule within its kind's height (its space + 60 px) — the one that
          // needs the least height. Failing every kind: any place, with more height.
          // (Out of a planet the kinds are a drift, a swing or a sweep — the plan's turn first where it is one of them.)
        const across = shuffledBy(['drift', 'swing', 'sweep'] as StretchKind[], rnd), turn = plan[planAt]!;
        const kinds = want ? [want, ...shuffledBy(KINDS.filter(kd => kd !== want), rnd)] : turn !== 'bow' ? [turn, ...across.filter(kd => kd !== turn)] : across;
          const probe = (p: {x: number; side: 'left' | 'right'}) => nodeAt(id, p.x, a.y + 160 * scale, p.side);
          const shaped = order.map(p => ({p, kind: stretchKind(stretch(a, probe(p)), a, probe(p), w)}));
          if (compact && early) {
            // (Compact, where the first screen would hold too few: the place, of any kind, that needs the least height.)
            let passed = 0;
            for (const {p, kind} of shaped) if (tryOne({x: p.x, side: p.side, q: p.q, kind, space: fromPlanet ? [40, 90] : SPACE[kind]}, (fromPlanet ? 150 : SPACE[kind][1] + 60) * scale) && ++passed >= 12) break;
            if (!passed) best.pick = null;
          }
          if (!best.pick || best.pick.got.fault) found: for (const strict of closing ? [true, false] : [false]) for (const kind of kinds) {
            // (Out of a planet: a drift or a swing from 40 px, a sweep from 70 px — it travels further.)
            const space: [number, number] = fromPlanet ? (kind === 'sweep' ? [70, 140] : [40, 90]) : SPACE[kind];
            let passed = 0;
            // (A bow reads as a loop when its two nodes stand nearly one above the other: the nearest place below first, taken.)
            const list = kind === 'bow' ? [...shaped].sort((p, q) => Math.abs(p.p.x - a.x) - Math.abs(q.p.x - a.x)) : shaped;
            for (const {p, kind: k2} of list) {
              if (k2 !== kind || (strict && !strictOk(p))) continue;
              if (tryOne({x: p.x, side: p.side, q: p.q, kind, space}, (space[1] + (kind === 'bow' ? 110 : 60)) * scale) && ++passed >= (kind === 'bow' ? 1 : early ? 8 : 4)) break;
            }
            if (passed) break found;
            best.pick = null;
          }
          // (Last resort — a long name that fits only far across: as much height as its loop needs, up to 460 px more.)
          if (!best.pick) for (const p of order) if (tryOne({x: p.x, side: p.side, q: p.q, kind: 'swing', space: [50, 110]})) break;
          if (best.pick && best.pick.got.fault > 0) { const t = best.pick.t; tryOne(t, Math.max(28, t.space[0] * scale) + 460); }
        }
        const pick = best.pick;
        if (pick && pick.got.fault > 0 && j > 0 && backs < 4 && !(input.view && k - 1 < 3) && (lanes[k - 1]!.q >= 0 || !banned[j - 1]?.size)) {
          // (Undo the node above and place it again elsewhere.)
          backs++;
          const prev = saved[j - 1]!, at = lanes[k - 1]!;
          (banned[j - 1] ??= new Set()).add(`${at.side}${at.q}`);
          banned[j] = new Set();
          lanes.length = prev.lanes; rings.length = prev.rings; boxes.length = prev.boxes; last = prev.last; y = prev.y; planAt = prev.planAt; plan.splice(0, plan.length, ...prev.plan);
          j -= 2; k -= 2;
          continue;
        }
        let lane: RiverLane, b: FlowNode, extra: FlowBox[];
        if (pick) {
          ({b, extra} = pick.got);
          lane = {x: pick.t.x, side: pick.t.side, wrap: false, maxTab: tab, lines: 1, zigi: 'side', gap: pick.got.gap, kind: a ? stretchKind(stretch(a, b), a, b, w) : 'drift', q: pick.t.q};
          if (a) take(lane.kind);
        } else {
          // (A name too long for one line even at the edge: it wraps there, every line shown — never "…" — its node near the
          // edge with room on its way out for the next stretch's bow; on whichever side keeps the rules.)
          let wrapped: {got: ReturnType<typeof settle>; x: number; side: 'left' | 'right'; maxTab: number; lines: number} | null = null;
          for (const side of ['right', 'left'] as const) {
            const nudge = (banned[j]?.size ?? 0) * .06 * w, x = Math.round((side === 'right' ? Math.max(xmin, RIVER.gutter + R + need + nudge) : Math.min(xmax, w - RIVER.gutter - R - need - nudge)) * 10) / 10;
            const maxTab = Math.max(80, side === 'right' ? w - RIVER.margin - x - RIVER.tabReach : x - RIVER.tabReach - RIVER.margin), lines = Math.ceil(tab / maxTab);
            const place = (gap: number) => { const q = nodeAt(id, x, y + gap + R, side); return {b: q, extra: [tabBox(id, x, q.y, side, maxTab, lines)]}; };
            const got = a ? settle(a, place, 90) : {gap: 90, fault: 0, ...place(90)};
            if (!wrapped || got.fault < wrapped.got.fault - 1e-6) wrapped = {got, x, side, maxTab, lines};
          }
          ({b, extra} = wrapped!.got);
          lane = {x: wrapped!.x, side: wrapped!.side, wrap: true, maxTab: wrapped!.maxTab, lines: wrapped!.lines, zigi: 'above', gap: wrapped!.got.gap, kind: a ? stretchKind(stretch(a, b), a, b, w) : 'drift', q: -1};
        }
        const zigiRoom = lane.side === 'right' ? b.x - R - RIVER.halo - 10 - input.zigi >= RIVER.margin : b.x + R + RIVER.halo + 10 + input.zigi <= w - RIVER.margin;
        if (!lane.wrap) lane.zigi = zigiRoom ? 'side' : 'above';
        lane.x = Math.round(lane.x * 10) / 10;
        lanes.push(lane); rings.push(ringOf(b)); boxes.push(...extra);
        last = b; y = b.y + R;
      }
    });
    if (wantFinale && n && last) {
      const a: FlowNode = last;
      finaleGap = settle(a, gap => ({b: finaleAt(y + gap + RIVER.finaleR), extra: []}), 40).gap;
    }
  };
  let model!: ReturnType<typeof build>;
  // The first screen (owner Part 1.4): three or four whole nodes. Where the third just misses it, the first spaces give back
  // what the rules let them (6 px at a time, 90 px at most); where a fifth shows, it moves down past the screen's foot.
  const whole = (m: typeof model) => input.view ? m.nodes.filter(q => nodeIds.includes(q.id) && q.y - R >= input.view!.top && q.y + R <= input.view!.bottom).length : 0;
  const fitFirst = (view: {top: number; bottom: number}) => {
    for (let budget = 90; budget > 0 && whole(model) < 3; budget -= 6) {
      let done = false;
      for (const at of [2, 1, 0]) {
        if (lanes[at]!.gap - 6 < 28) continue;
        lanes[at]!.gap -= 6;
        const trial = build();
        if (!trial.bad.some(x => !model.bad.includes(x))) { model = trial; done = true; break; }
        lanes[at]!.gap += 6;
      }
      if (!done) break;
    }
    const ys = model.nodes.filter(q => nodeIds.includes(q.id)).map(q => q.y);
    if (ys.length >= 5 && whole(model) >= 5) { lanes[4]!.gap += Math.ceil(view.bottom - (ys[4]! - R)) + 2; model = build(); }
  };
  // (A drift, a sweep and a bow somewhere in the first two screens — owner amendment 7's look: the stretches that end there.)
  const gate = (m: typeof model) => {
    if (!input.view) return 3;
    const by = new Map(m.nodes.map(q => [q.id, q])), seen = new Set<StretchKind>();
    for (const sg of m.segments) { const a = sg.from ? by.get(sg.from) : undefined, b = sg.to ? by.get(sg.to) : undefined; if (a && b && b.y < 2 * input.view.bottom - 12) seen.add(stretchKind(sg, a, b, w)); }
    return (['drift', 'sweep', 'bow'] as const).filter(k => seen.has(k)).length;
  };
  // One try: the walk with its first run in one order; where the first screen holds too few nodes, its first spaces give
  // back what they can, then (still too few) the walk again with its first three nodes compact — each the place, of any
  // kind, needing the least height.
  const attempt = (turn: number) => {
    walk(false, turn); model = build();
    if (!input.view || (orbits[0] ?? 0) < 3 || n < 3) return;
    fitFirst(input.view);
    if (whole(model) < 3) {
      const keep = {lanes, orbitGaps, finaleGap, model};
      walk(true, turn); model = build(); fitFirst(input.view);
      if (whole(model) < whole(keep.model) || model.bad.length > keep.model.bad.length) ({lanes, orbitGaps, finaleGap, model} = keep);
    }
  };
  // The first order that shows all three kinds in the first two screens (and three whole nodes on the first), else the best.
  const score = (m: typeof model) => (m.bad.length ? 0 : 100) + (!input.view || (orbits[0] ?? 0) < 3 || whole(m) >= 3 ? 10 : 0) + gate(m);
  attempt(0);
  let best = {lanes, orbitGaps, finaleGap, model, score: score(model)};
  for (let turn = 1; turn < 6 && best.score < 113 && input.view; turn++) {
    attempt(turn);
    const sc = score(model);
    if (sc > best.score) best = {lanes, orbitGaps, finaleGap, model, score: sc};
  }
  ({lanes, orbitGaps, finaleGap, model} = best);
  // In every orbit of four nodes or more, the spaces spread 60 px or more (owner amendment 7): where they happen to lie
  // closer, the widest opens further or the closest closes in — kept only while every stretch keeps the rules and the first
  // screen keeps its three nodes.
  {
    let i0 = 0;
    for (const count of orbits) {
      const at = Array.from({length: Math.max(0, count - 1)}, (_, q) => i0 + 1 + q), spread = () => { const g = at.map(i => lanes[i]!.gap); return Math.max(...g) - Math.min(...g); };
      if (count >= 4 && spread() < 60) {
        // (Each space, opened or closed just enough that the orbit's spaces spread 62 px: the widest first, then the closest.)
        const wide = [...at].sort((p, q) => lanes[q]!.gap - lanes[p]!.gap), others = (i: number) => at.filter(x => x !== i).map(x => lanes[x]!.gap);
        const tries: [number, number][] = [...wide.map((i): [number, number] => [i, Math.max(0, Math.min(...others(i)) + 62 - lanes[i]!.gap)]),
          ...[...wide].reverse().map((i): [number, number] => [i, Math.min(0, Math.max(...others(i)) - 62 - lanes[i]!.gap)])].filter(([, d]) => d !== 0 && Math.abs(d) <= 120);
        for (const [i, d] of tries) {
          if (lanes[i]!.gap + d < 28) continue;
          lanes[i]!.gap += d;
          const trial = build(), seen = whole(model);
          if (spread() >= 60 && !trial.bad.some(x => !model.bad.includes(x)) && (!input.view || whole(trial) >= Math.min(3, seen))) { model = trial; break; }
          lanes[i]!.gap -= d;
        }
      }
      i0 += count;
    }
  }
  return {lanes, orbitGaps, finaleGap, ...model, swing};

  /** The whole river from the lanes and spaces: every station, box and stretch, and which stretches break a rule. */
  function build() {
    const nodes: FlowNode[] = [], bx: FlowBox[] = [], banners: {top: number; bottom: number}[] = [];
    let at = RIVER.stageTop, i = 0;
    orbits.forEach((count, s) => {
      const top = at + orbitGaps[s]!;
      banners.push({top, bottom: top + bh}); bx.push(bannerBox(s, top));
      if (hasPlanet(s) && count > 0) nodes.push(planetAt(s, top));
      at = top + bh + RIVER.sectionGap;
      for (let j = 0; j < count; j++, i++) {
        const l = lanes[i]!, ny = at + l.gap + R;
        nodes.push(nodeAt(nodeIds[i]!, l.x, ny, l.side)); bx.push(tabBox(nodeIds[i]!, l.x, ny, l.side, l.wrap ? l.maxTab : tabs[i]!, l.lines));
        at = ny + R;
      }
    });
    if (wantFinale && n) { const fy = at + finaleGap + RIVER.finaleR; nodes.push(finaleAt(fy)); at = fy + RIVER.finaleR; }
    const h = at + RIVER.finaleFoot, segments = flowSegments(nodes, {w, seed, swing, gutter: RIVER.gutter}), all = nodes.map(ringOf);
    const bad = segments.filter(sg => stretchFault(sg, all, bx, {w, minRadius}).fault > 0).map(sg => sg.id);
    return {nodes, boxes: bx, segments, bad, h, banners};
  }
}
