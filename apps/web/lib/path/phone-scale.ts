import {orbitOffset} from './model';
import {flowSegments, sidesFor, type FlowNode, type FlowSegment} from './flow-geometry';
import {lineFaults, linePointsOf, phoneLine, planetSweep} from './phone-line';

/**
 * Session AG Polish 3 (ADR-032 L20; owner amendment 8, "phone = computer × scale"): the phone's path IS the computer's
 * path, shrunk. Pure: the computer's own layout is computed in a virtual computer column, its own line is drawn there by
 * the unchanged `flowSegments` (the computer's swing and seed), and every x and y is then multiplied by one scale `s`
 * (plus the one shift that puts the drawing in the phone's column). There is no phone placement rule and no phone line.
 * Only the readable pieces sit on top at the phone's own size: the nodes (centred on the scaled centres), the name tabs
 * (on the computer's side; flipped to the other side when they would leave the column or cover a ring or the line;
 * wrapped as a last resort) and the one-row orbit banner (centred on its scaled planet).
 *
 * The virtual column is the computer's stage at a 1440 × 900 window, measured once (`COMPUTER`): its width, its rhythm
 * (the step pitch, the banner, the gaps), where its planets and finale stand. The phone's column maps onto the band of
 * that stage the computer's drawing covers (`COMPUTER_BAND`): from the furthest a bow can swing out on the left to the
 * planets' right edge. So s = (the phone's stage − 2 × 6 px) / the band's width: about 0.46 on a 390 px phone.
 */
export const COMPUTER = {
  /** The path stage's width at 1440 × 900 (measured: the Checklist's stage, 976 px). */
  w: 976,
  /** The stage's top padding, an orbit banner's height (its 128 px planet and margins), banner → steps, the steps' top padding. */
  stageTop: 2, banner: 164, bannerToSteps: 8, stepsTop: 18,
  /** A node (80 px) and the space between two (34 px): a pitch of 114 px. */
  dot: 80, stepGap: 34,
  /** Between two orbits: the stage's 12 px gap and the section's 18 px margin. */
  sectionGap: 30,
  /** The planet's sphere and its box's right edge (the banner's end less its 4 % margin); a ringed planet's box is wider. */
  planet: 128, planetRight: 869.2,
  /** The finale: 34 px after the last node plus its 26 px margin; its node 88 px; its box (node, gap, words) 126.8 px. */
  finaleGap: 60, finaleNode: 88, finaleBox: 126.8,
  /** The stage's bottom padding. */
  stageFoot: 24,
} as const;
/** The computer's swing at that width (`min(220px, 22cqi)`), as its line and its wave use it. */
export const COMPUTER_SWING = Math.min(220, COMPUTER.w * .22);
/** The band of the virtual column the drawing covers: a bow's furthest reach on the left (the wave's far left node, its rim
 *  and 0.55 × the swing), to the planets' right edge plus 8 px. */
export const COMPUTER_BAND = {left: COMPUTER.w / 2 - COMPUTER_SWING * 1.55 - COMPUTER.dot / 2, right: COMPUTER.planetRight + 8};
/** The phone's own readable pieces: its node, a tab's place and height, the finale's node, the column's margin. */
export const PHONE = {dot: 62, tabTop: 62 * .2, tabDys: [62 * .2, -14, -42, 40, 26, -28, 54], tabOuts: [0, 18, 36, 54], edge: 11, tabReach: 62 * .3, tabLine: 28.5, tabLineStep: 17.5, finaleNode: 62 * 1.1, finaleFoot: 110, margin: 6, clear: 0,
  /** Owner amendment 10c: the band an orbit's nodes span (20–80 % of the width), a tab's greatest gap from its own ring,
   *  the line's gutter, and the room added locally (a step, and at most) where no tab spot is clear. */
  band: [.2, .8] as const, hug: 4, gutter: 8, roomStep: 8, roomRounds: 40,
  /** Under its node (its top 4 px into the ring's foot): a tab may start at the node's middle (1 px past it) or, for a
   *  long word on a narrow phone, 12 px before it — the inner edges, from the middle, on the tab's own side. */
  underDy: 62 / 2 - 4, underEdges: [1, -12]};

export type ScaleOrbit = {id: string; /** the planet's box width in spheres (`--ex`), or null where the orbit has no planet */ planet: number | null; steps: {id: string; side: 'left' | 'right'}[]};
export type ScaleInput = {/** the phone stage's width */ w: number; seed: string; orbits: ScaleOrbit[]; finale: boolean;
  /** the phone planet's sphere radius, each tab's one-line width, where each banner's pill ends and its height */
  planetR: number; tabs: number[]; words: number[]; pillH?: number};
/** `tabDy`: the tab's top below the node's centre (its usual place is 0.2 of a node; always on the node's lower side);
 *  `tabOut`: how much further out from the node than usual it starts. */
export type PhoneLane = {x: number; y: number; side: 'left' | 'right' | 'below'; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above'; tabDy: number; tabOut: number};
export type PhoneScale = {sx: number; sy: number; /** across: the path's scale (orbits of 1–2 nodes) and each orbit's own */ kx: number; kxs: number[]; dx: number; dy: number;
  /** room added locally above a station (owner amendment 10c), in px */ room: Record<string, number>;
  /** stretches drawn smaller than seeded, or mirrored, to fit the column (owner amendment 10d) */ fitted: string[]; h: number; nodes: FlowNode[]; segments: FlowSegment[]; lanes: PhoneLane[];
  banners: {top: number; planetX: number | null}[]; pills: {l: number; t: number; r: number; b: number}[]; finale: {x: number; y: number} | null;
  /** what still breaks an overlap check at the greatest sy (none in a good layout) */ faults: string[]};

/** The computer's own layout of a path in the virtual column: every node, planet and the finale, as its stage places them. */
export function computerLayout(orbits: readonly ScaleOrbit[], finale: boolean): {nodes: FlowNode[]; bannerMids: number[]; h: number} {
  const C = COMPUTER, nodes: FlowNode[] = [], bannerMids: number[] = [], lastOrbit = orbits.map(o => o.steps.length > 0).lastIndexOf(true);
  let top: number = C.stageTop, i = 0;
  orbits.forEach((o, si) => {
    if (si) top += C.sectionGap;
    bannerMids.push(top + C.banner / 2);
    if (o.planet !== null && o.steps.length) nodes.push({id: `planet:${o.id}`, x: C.planetRight - C.planet / 2 * o.planet, y: top + C.banner / 2, r: C.planet / 2, inSide: 'top', outSide: 'bottom', colour: '', done: false});
    let y = top + C.banner + C.bannerToSteps + C.stepsTop;
    o.steps.forEach((st, j) => {
      if (j) y += C.stepGap;
      nodes.push({id: st.id, x: C.w / 2 + orbitOffset(i++) * COMPUTER_SWING, y: y + C.dot / 2, r: C.dot / 2, ...sidesFor(st.side), colour: '', done: false});
      y += C.dot;
    });
    if (finale && si === lastOrbit) {
      const last = nodes.at(-1)!;
      nodes.push({id: 'finale:end', x: C.w / 2, y: y + C.finaleGap + C.finaleNode / 2, r: C.finaleNode / 2, inSide: last.outSide, outSide: last.inSide, colour: '', done: false});
      y += C.finaleGap + C.finaleBox;
    }
    top = y;
  });
  return {nodes, bannerMids, h: top + C.stageFoot};
}
/** The computer's own line in the virtual column: `flowSegments` with the computer's swing, lead-in and tail. */
export function computerLine(layout: ReturnType<typeof computerLayout>, seed: string): FlowSegment[] {
  const fin = layout.nodes.find(n => n.id === 'finale:end');
  return flowSegments(layout.nodes, {w: COMPUTER.w, seed, swing: COMPUTER_SWING, leadFrom: 0, tailTo: fin ? layout.h - 4 : null});
}
const f = (n: number) => (Math.round(n * 10) / 10).toString();
/** A stretch's path data and ends, moved by x → x·sx + dx and y → y·sy + dy. */
export function scaleSegment(sg: FlowSegment, sx: number, sy: number, dx: number, dy: number): FlowSegment {
  let k = 0;
  const d = sg.d.replace(/-?\d+(?:\.\d+)?/g, n => f(k++ % 2 ? Number(n) * sy + dy : Number(n) * sx + dx));
  return {...sg, d, x1: sg.x1 * sx + dx, y1: sg.y1 * sy + dy, x2: sg.x2 * sx + dx, y2: sg.y2 * sy + dy};
}
/** Across: the virtual band onto the phone's column (6 px from each side); down: sy, shifted only as far as the first
 *  banner and its planet need to stand whole inside the stage. */
export function phoneTransform(w: number, sy: number, firstBannerMid: number, half: number): {sx: number; dx: number; dy: number} {
  const sx = (w - 2 * PHONE.margin) / (COMPUTER_BAND.right - COMPUTER_BAND.left), dx = PHONE.margin - COMPUTER_BAND.left * sx;
  return {sx, dx, dy: Math.max(0, COMPUTER.stageTop + half - firstBannerMid * sy)};
}
/** The phone's least and greatest vertical scale (owner amendment 10): twice the width's scale, and the computer's own. */
export const syRange = (w: number) => { const sx = (w - 2 * PHONE.margin) / (COMPUTER_BAND.right - COMPUTER_BAND.left); return {min: Math.min(1, 2 * sx), max: 1}; };

type Box = {l: number; t: number; r: number; b: number};
const hits = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
type Pt = {x: number; y: number};
/** What a phone layout's overlap checks see: rings (nodes, planets, the finale), tabs, banners' pills and the line. */
export type PhoneScene = {w: number; nodes: {id: string; x: number; y: number; r: number}[]; planets: {x: number; y: number; r: number}[];
  tabs: (Box & {id: string; node: Pt})[]; pills: Box[]; line: Pt[]};
/**
 * The owner's overlap checks (amendment 10), never loosened: no tab over a ring, the line, another tab or the column's
 * edge; no node within 10 px of another; nothing over a banner or a planet. Each returns what breaks it.
 */
export function phoneFaults(sc: PhoneScene): string[] {
  const out: string[] = [], inside = (b: Box, p: Pt) => p.x > b.l + 1 && p.x < b.r - 1 && p.y > b.t + 1 && p.y < b.b - 1;
  const ringHit = (b: Box, c: {x: number; y: number; r: number}) => Math.max(b.l - c.x, 0, c.x - b.r) ** 2 + Math.max(b.t - c.y, 0, c.y - b.b) ** 2 < (c.r - .5) ** 2;
  sc.tabs.forEach((t, i) => {
    if (t.l < -.5 || t.r > sc.w + .5) out.push(`${t.id}'s tab leaves the column`);
    for (const n of sc.nodes) if (ringHit(t, n.id === t.id ? {x: n.x, y: n.y, r: 18} : n)) out.push(`${t.id}'s tab over ${n.id === t.id ? 'its own glyph' : `${n.id}'s ring`}`);
    for (const p of sc.planets) if (ringHit(t, p)) out.push(`${t.id}'s tab over a planet`);
    for (const p of sc.pills) if (hits(t, p)) out.push(`${t.id}'s tab over a banner`);
    // (The line keeps 0.7 px out of the tab's box — 0.3 px more than the browser's check, which reads the drawn line every
    // 1 px and allows 1 px: the drawn tab and line can differ from these by a fraction of a pixel.)
    if (sc.line.some(p => p.x > t.l + .7 && p.x < t.r - .7 && p.y > t.t + .7 && p.y < t.b - .7)) out.push(`${t.id}'s tab over the line`);
    for (const u of sc.tabs.slice(i + 1)) if (hits({l: t.l + 1, t: t.t + 1, r: t.r - 1, b: t.b - 1}, u)) out.push(`${t.id}'s tab over ${u.id}'s`);
  });
  sc.nodes.forEach((n, i) => {
    for (const m of sc.nodes.slice(i + 1)) if (Math.hypot(n.x - m.x, n.y - m.y) < n.r + m.r + 10 - .01) out.push(`${n.id} within 10 px of ${m.id}`);
    for (const p of sc.planets) if (Math.hypot(n.x - p.x, n.y - p.y) < n.r + p.r) out.push(`${n.id} over a planet`);
    for (const b of sc.pills) if (ringHit(b, n)) out.push(`${n.id} over a banner`);
  });
  for (const b of sc.pills) if (sc.line.some(p => inside(b, p))) out.push('the line over a banner');
  return out;
}
/** The owner's spread checks (amendments 10b, 10c), for each orbit of four nodes or more: its centres span 60 % of the
 *  width or more, one stands in an outer 25 % and one in the middle 40 %. (1e-6 px: floating point only.) */
export function phoneSpread(w: number, orbits: readonly number[][]): string[] {
  const out: string[] = [];
  orbits.forEach((xs, o) => {
    if (xs.length < 4) return;
    const span = Math.max(...xs) - Math.min(...xs);
    if (span < .6 * w - 1e-6) out.push(`orbit ${o}: its nodes span ${Math.round(span / w * 100)} % of the width`);
    if (!xs.some(x => x <= .25 * w + 1e-6 || x >= .75 * w - 1e-6)) out.push(`orbit ${o}: no node in an outer 25 %`);
    if (!xs.some(x => x >= .3 * w - 1e-6 && x <= .7 * w + 1e-6)) out.push(`orbit ${o}: no node in the middle 40 %`);
  });
  return out;
}
/**
 * The phone's path: the computer's layout × (kx, sy) — sy the least value in [2 × sx, 1] at which every check passes
 * (owner amendment 10); across, each orbit of three nodes or more spans 20–80 % of the width, smaller orbits keep the
 * computer's place (10c) — its line drawn by the phone's own rules (lib/path/phone-line.ts), its readable pieces on top.
 * Where even sy = 1 leaves a tab with no clear spot (a narrow phone), room is added locally: the gap above the station the
 * line comes into there (and below the node) grows 8 px at a time, and the line is drawn again over it, until every check passes (10c).
 */
export function phoneScale(input: ScaleInput, opts: {planetSweeps?: boolean} = {}): PhoneScale {
  const {min, max} = syRange(input.w);
  let last: ReturnType<typeof build> | null = null;
  for (let sy = min; sy <= max + 1e-9; sy = Math.min(max, sy + .02)) {
    last = build(input, sy, {}, opts);
    if (!last.faults.length || sy >= max) break;
  }
  const room: Record<string, number> = {};
  // (It stops as soon as every check passes, or after 16 rounds that bring neither fewer faults nor less of the line under
  // the tabs: room that does not help is taken back.)
  let best = last!, stale = 0;
  for (let round = 0; round < PHONE.roomRounds && last!.faults.length && last!.asks.length && stale < 16; round++) {
    for (const id of last!.asks) room[id] = (room[id] ?? 0) + PHONE.roomStep;
    last = build(input, max, room, opts);
    if (last.faults.length < best.faults.length || (last.faults.length === best.faults.length && last.badness < best.badness)) { best = last; stale = 0; } else stale++;
  }
  last = best;
  const out: PhoneScale & {asks?: string[]; badness?: number} = {...last};
  delete out.asks; delete out.badness;
  return out;
}
/** The line's swing (owner amendment 10d): amendment 10b's — the computer's swing stretched as 10b stretched the path, its
 *  outermost node centres 42 px in from the column's edges — so the computer's loops keep their strength. */
export function lineSwing(w: number, xs: readonly number[]): number {
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return COMPUTER_SWING * (xs.length && hi - lo > 1e-6 ? (w - 2 * (PHONE.dot / 2 + PHONE.edge)) / (hi - lo) : (PHONE.band[1] - PHONE.band[0]) * w / (2 * COMPUTER_SWING));
}
/** Across (owner amendment 10c): each orbit of three nodes or more maps its own computer node range onto 20–80 % of the
 *  width, keeping the computer's order; an orbit of one or two keeps the computer's place (its wave onto the same band). */
export function phoneAcross(w: number, orbits: readonly number[][]): {kx: number; kxs: number[]; at: (orbit: number, x: number) => number} {
  const [b0, b1] = PHONE.band, kx = (b1 - b0) * w / (2 * COMPUTER_SWING), kxs: number[] = [];
  const maps = orbits.map(xs => {
    const lo = Math.min(...xs), hi = Math.max(...xs);
    if (xs.length >= 3 && hi - lo > 1e-6) { const k = (b1 - b0) * w / (hi - lo); kxs.push(k); return (x: number) => b0 * w + (x - lo) * k; }
    kxs.push(kx);
    return (x: number) => w / 2 + (x - COMPUTER.w / 2) * kx;
  });
  return {kx, kxs, at: (o, x) => maps[o]!(x)};
}
type Box4 = {l: number; t: number; r: number; b: number};
function build(input: ScaleInput, sy: number, room: Record<string, number>, opts: {planetSweeps?: boolean} = {}): PhoneScale & {asks: string[]; badness: number} {
  const layout = computerLayout(input.orbits, input.finale), bh = 2 * input.planetR + 10, pill = input.pillH ?? 40;
  const {sx, dx, dy} = phoneTransform(input.w, sy, layout.bannerMids[0] ?? 0, Math.max(bh / 2, input.planetR));
  const R = PHONE.dot / 2;
  // (Which orbit each station belongs to, and the room added above each, carried down to everything after it.)
  const orbitOf = new Map<string, number>(), stepIds = input.orbits.map(o => o.steps.map(st => st.id));
  input.orbits.forEach((o, oi) => { orbitOf.set(`planet:${o.id}`, oi); for (const st of o.steps) orbitOf.set(st.id, oi); });
  let carried = 0;
  const shift = layout.nodes.map(n => (carried += room[n.id] ?? 0));
  const total = carried, Y = (y: number, k: number) => y * sy + dy + k;
  const across = phoneAcross(input.w, stepIds.map(ids => ids.map(id => layout.nodes.find(n => n.id === id)!.x))), px = input.w - 4 - input.planetR;
  // (Planets at the right, as on Alpha #48, level with their banner; the finale mid-column; the nodes across each orbit.)
  const placed0 = layout.nodes.map((n, i) => ({...n, x: n.id.startsWith('planet:') ? px : n.id === 'finale:end' ? input.w / 2 : across.at(orbitOf.get(n.id)!, n.x), y: Y(n.y, shift[i]!),
    r: n.id.startsWith('planet:') ? input.planetR : n.id === 'finale:end' ? PHONE.finaleNode / 2 : R}));
  // The name's side (owner amendment 10d): the computer's, where the one-word tab fits beside the node on that side; else
  // the other side (a node at the column's edge, its name toward the middle). The computer's rule then holds on the
  // phone too: the line comes in on the name's side and leaves on the other, and the finale takes it in where the last
  // node lets it out.
  const stepList = input.orbits.flatMap(o => o.steps), nameSide = new Map<string, 'left' | 'right'>();
  stepList.forEach((st, i) => {
    const n = placed0.find(q => q.id === st.id)!, tab = input.tabs[i] ?? 120, fits = (sd: 'left' | 'right') => sd === 'right' ? n.x + PHONE.tabReach + tab <= input.w - PHONE.margin : n.x - PHONE.tabReach - tab >= PHONE.margin;
    const other = st.side === 'left' ? 'right' : 'left';
    nameSide.set(st.id, fits(st.side) || !fits(other) ? st.side : other);
  });
  const nodes = placed0.map(n => nameSide.has(n.id) ? {...n, ...sidesFor(nameSide.get(n.id)!)} : n);
  const lastStep = [...nodes].reverse().find(n => nameSide.has(n.id)), finIdx = nodes.findIndex(n => n.id === 'finale:end');
  if (finIdx >= 0 && lastStep) nodes[finIdx] = {...nodes[finIdx]!, inSide: lastStep.outSide, outSide: lastStep.inSide};
  const h = Y(layout.h, total), fin = nodes.find(n => n.id === 'finale:end') ?? null;
  // (Each banner moves with its planet; an orbit without one, with the room carried to its first node.)
  const banners = input.orbits.map((o, si) => {
    const pi = layout.nodes.findIndex(n => n.id === `planet:${o.id}`), fi = layout.nodes.findIndex(n => n.id === o.steps[0]?.id);
    const k = pi >= 0 ? shift[pi]! : fi > 0 ? shift[fi - 1]! : 0;
    return {top: Y(layout.bannerMids[si]!, k) - bh / 2, planetX: pi >= 0 ? nodes[pi]!.x : null};
  });
  const pills: Box4[] = banners.map((b, si) => ({l: 0, t: b.top + bh / 2 - pill / 2, r: input.words[si] ?? 0, b: b.top + bh / 2 + pill / 2}));
  const fitted = new Set<string>(), swing = lineSwing(input.w, layout.nodes.filter(n => orbitOf.has(n.id) && !n.id.startsWith('planet:')).map(n => n.x));
  const segments = phoneLine(nodes, {w: input.w, seed: input.seed, swing, gutter: PHONE.gutter, leadFrom: 0, tailTo: fin ? h - 4 : null, avoid: pills, fitted});
  const bySeg = segments.map(sg => ({sg, pts: linePointsOf([sg])})), line = bySeg.flatMap(x => x.pts);
  const rings = nodes.map(n => ({id: n.id, x: n.x, y: n.y, r: n.r}));
  const steps = input.orbits.flatMap(o => o.steps), placed: (Box4 & {id: string; node: {x: number; y: number}})[] = [], asks = new Set<string>();
  let badness = 0;
  const nextOf = (id: string) => nodes[nodes.findIndex(n => n.id === id) + 1]?.id ?? null;
  // The tabs, one line each, touching their own ring (4 px at most from it): on the computer's side, else the other, at
  // the usual height, beside the node's middle, higher or lower — or just under it — the first clear of the column's edge,
  // every ring, the banners, the line and the tabs before it; else the least in the way, and room is asked for there.
  const lanes: PhoneLane[] = steps.map((st, i) => {
    const node = nodes.find(n => n.id === st.id)!, tab = input.tabs[i] ?? 120, own = nameSide.get(st.id)!, other: 'left' | 'right' = own === 'left' ? 'right' : 'left';
    const boxOf = (side: PhoneLane['side'], dyy: number, out: number): Box4 => {
      const t = node.y + dyy, b = t + PHONE.tabLine, reach = PHONE.tabReach + out;
      return side === 'below' ? {l: node.x + out - tab / 2, t, r: node.x + out + tab / 2, b} : side === 'right' ? {l: node.x + reach, t, r: node.x + reach + tab, b} : {l: node.x - reach - tab, t, r: node.x - reach, b};
    };
    // (Only the line near this node can touch its tab: a tab spans at most 54 px above and 62 px below its centre.)
    const near = line.filter(p => Math.abs(p.y - node.y) < 90);
    const hugs = (box: Box4) => Math.hypot(Math.max(box.l - node.x, 0, node.x - box.r), Math.max(box.t - node.y, 0, node.y - box.b)) - R <= PHONE.hug;
    const faultOf = (box: Box4) => {
      let n = box.l < PHONE.margin - .5 || box.r > input.w - PHONE.margin + .5 ? 1e5 : 0;
      if (Math.max(box.l - node.x, 0, node.x - box.r) ** 2 + Math.max(box.t - node.y, 0, node.y - box.b) ** 2 < 18 ** 2) n += 1e3;
      // (The node's glyph, as the path's own check reads it: 0.35 of the node either side, from 0.35 above its middle to 0.07
      // below — 0.37 here, for the next node's larger size.)
      if (box.l < node.x + PHONE.dot * .37 && box.r > node.x - PHONE.dot * .37 && box.t < node.y + PHONE.dot * .074 && box.b > node.y - PHONE.dot * .37) n += 1e3;
      for (const ring of rings) if (ring.id !== st.id && Math.max(box.l - ring.x, 0, ring.x - box.r) ** 2 + Math.max(box.t - ring.y, 0, ring.y - box.b) ** 2 < ring.r ** 2) n += 1e3;
      for (const p of pills) if (hits(box, p)) n += 1e3;
      for (const t of placed) if (hits(box, t)) n += 1e3;
      for (const p of near) if (p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b) n += 1;
      return n;
    };
    // (The spots, all on the node's lower side — never beside its crown, where the NEXT badge sits (owner amendment 10c):
    // the usual height, then lower, on the computer's side and then the other; then slid in under the node, from its
    // middle — clear of the line leaving the other rim — or, for a long word on a narrow phone, from 12 px before it.)
    // (And, where the line leaves the node on the tab's side, the usual spot 4 px off the ring, so the line runs between.)
    const sides = [own, other] as const, lower = PHONE.tabDys.filter(d => d > 0), off = R + PHONE.hug - PHONE.tabReach;
    const options = [...sides.flatMap(side => lower.flatMap(dyy => PHONE.tabOuts.map(out => ({side: side as PhoneLane['side'], dy: dyy, out})))),
      ...PHONE.underEdges.flatMap(edge => sides.map(side => ({side: side as PhoneLane['side'], dy: PHONE.underDy, out: edge - PHONE.tabReach}))),
      ...sides.flatMap(side => lower.map(dyy => ({side: side as PhoneLane['side'], dy: dyy, out: off})))]
      .filter(o => hugs(boxOf(o.side, o.dy, o.out))).map(o => ({...o, fault: faultOf(boxOf(o.side, o.dy, o.out))}));
    const pick = options.find(o => o.fault === 0) ?? options.reduce((a, b) => b.fault < a.fault ? b : a);
    const box = boxOf(pick.side, pick.dy, pick.out);
    badness += pick.fault;
    if (pick.fault) {
      // (Room where it helps: above the station each stretch in the way comes into, and below this node — so the line
      // leaving it drops further before it swings under its tab.)
      const through = bySeg.filter(x => x.pts.some(p => p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b)).map(x => x.sg.to ?? x.sg.from!);
      for (const id of [...through, nextOf(st.id)]) if (id) asks.add(id);
    }
    placed.push({...box, id: st.id, node});
    return {x: node.x, y: node.y, side: pick.side, wrap: false, maxTab: tab, lines: 1, zigi: 'side', tabDy: pick.dy, tabOut: pick.out};
  });
  const lineBad = segments.flatMap(sg => { const bad = lineFaults([sg], input.w, PHONE.gutter); if (bad.length && sg.to) asks.add(sg.to); return bad; });
  const faults = [...phoneFaults({w: input.w, nodes: rings.filter(n => !n.id.startsWith('planet:')), planets: rings.filter(n => n.id.startsWith('planet:')), tabs: placed, pills, line}), ...lineBad];
  // (Owner fix 1 after the 10d checkpoint: a planet's stretch whose node stands nearly above or below it sweeps gently to
  // the inner side — drawn last, only where it crosses nothing, so every place above stays exactly as it is.)
  const avoid = [...pills, ...placed.map(t => ({l: t.l, t: t.t, r: t.r, b: t.b}))];
  const drawn = opts.planetSweeps === false ? segments : segments.map(sg => { const d = planetSweep(sg, nodes, {w: input.w, gutter: PHONE.gutter, seed: input.seed, avoid}); return d ? {...sg, d} : sg; });
  const stageH = Math.max(h, fin ? fin.y + PHONE.finaleFoot : 0, ...lanes.map(l => l.y + R + 40));
  return {sx, sy, kx: across.kx, kxs: across.kxs, room: {...room}, dx, dy, h: stageH, nodes, segments: drawn, lanes, banners, pills, finale: fin ? {x: fin.x, y: fin.y} : null, faults, fitted: [...fitted], asks: [...asks], badness};
}
