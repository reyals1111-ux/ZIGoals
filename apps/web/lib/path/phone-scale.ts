import {orbitOffset} from './model';
import {flowSegments, sidesFor, type FlowNode, type FlowSegment} from './flow-geometry';

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
export const PHONE = {dot: 62, tabTop: 62 * .2, tabDys: [62 * .2, -14, -42, 40, 26, -28, 54], tabOuts: [0, 18, 36, 54], edge: 11, tabReach: 62 * .3, tabLine: 28.5, tabLineStep: 17.5, finaleNode: 62 * 1.1, finaleFoot: 110, margin: 6, clear: 0};

export type ScaleOrbit = {id: string; /** the planet's box width in spheres (`--ex`), or null where the orbit has no planet */ planet: number | null; steps: {id: string; side: 'left' | 'right'}[]};
export type ScaleInput = {/** the phone stage's width */ w: number; seed: string; orbits: ScaleOrbit[]; finale: boolean;
  /** the phone planet's sphere radius, each tab's one-line width, where each banner's pill ends and its height */
  planetR: number; tabs: number[]; words: number[]; pillH?: number};
/** `tabDy`: the tab's top below the node's centre (its usual place is 0.2 of a node; a tab may move up beside it);
 *  `tabOut`: how much further out from the node than usual it starts. */
export type PhoneLane = {x: number; y: number; side: 'left' | 'right' | 'below'; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above'; tabDy: number; tabOut: number};
export type PhoneScale = {sx: number; sy: number; kx: number; dx: number; dy: number; h: number; nodes: FlowNode[]; segments: FlowSegment[]; lanes: PhoneLane[];
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
    if (sc.line.some(p => inside(t, p))) out.push(`${t.id}'s tab over the line`);
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
/** The owner's spread checks (amendment 10b): in every orbit of four nodes or more the centres span 60 % of the width or
 *  more; somewhere a node in an outer 25 % and one in the middle 40 %. */
export function phoneSpread(w: number, orbits: readonly number[][]): string[] {
  const out: string[] = [], all = orbits.flat();
  orbits.forEach((xs, o) => { if (xs.length >= 4 && Math.max(...xs) - Math.min(...xs) < .6 * w) out.push(`orbit ${o}: its nodes span ${Math.round((Math.max(...xs) - Math.min(...xs)) / w * 100)} % of the width`); });
  if (all.length && !all.some(x => x < .25 * w || x > .75 * w)) out.push('no node in an outer 25 %');
  if (all.length && !all.some(x => x >= .3 * w && x <= .7 * w)) out.push('no node in the middle 40 %');
  return out;
}
/** Points along path data, `per` to each cubic. */
export function linePoints(segments: readonly {d: string}[], per = 24): Pt[] {
  const out: Pt[] = [];
  for (const sg of segments) {
    const n = (sg.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    for (let i = 2; i + 5 < n.length; i += 6) for (let j = 0; j <= per; j++) {
      const t = j / per, u = 1 - t;
      out.push({x: u ** 3 * n[i - 2]! + 3 * u * u * t * n[i]! + 3 * u * t * t * n[i + 2]! + t ** 3 * n[i + 4]!, y: u ** 3 * n[i - 1]! + 3 * u * u * t * n[i + 1]! + 3 * u * t * t * n[i + 3]! + t ** 3 * n[i + 5]!});
    }
  }
  return out;
}

/**
 * The phone's path: the computer's layout and line × (sx, sy) — sx fits the width, sy is the least in [2 × sx, 1] at
 * which every overlap check passes (owner amendment 10) — with the phone's readable pieces placed on top.
 */
export function phoneScale(input: ScaleInput): PhoneScale {
  const {min, max} = syRange(input.w);
  let last: PhoneScale | null = null;
  for (let sy = min; sy <= max + 1e-9; sy = Math.min(max, sy + .02)) {
    last = build(input, sy);
    if (!last.faults.length || sy >= max) break;
  }
  return last!;
}
/** Across (owner amendment 10b): one stretch per path, the computer's leftmost and rightmost node centres mapped so their
 *  rings stand 11 px from the column's edges; every other node keeps its proportional place in the computer's order. */
export function phoneAcross(w: number, xs: readonly number[]): {kx: number; at: (x: number) => number} {
  const lo = Math.min(...xs), hi = Math.max(...xs), inner = w - 2 * (PHONE.dot / 2 + PHONE.edge);
  if (!xs.length || hi - lo < 1e-6) return {kx: 0, at: () => w / 2};
  const kx = inner / (hi - lo), mid = (lo + hi) / 2;
  return {kx, at: x => w / 2 + (x - mid) * kx};
}
function build(input: ScaleInput, sy: number): PhoneScale {
  const layout = computerLayout(input.orbits, input.finale), bh = 2 * input.planetR + 10, pill = input.pillH ?? 40;
  const {sx, dx, dy} = phoneTransform(input.w, sy, layout.bannerMids[0] ?? 0, Math.max(bh / 2, input.planetR));
  const Y = (y: number) => y * sy + dy;
  const R = PHONE.dot / 2, isNode = (id: string) => !id.startsWith('planet:') && id !== 'finale:end';
  const across = phoneAcross(input.w, layout.nodes.filter(n => isNode(n.id)).map(n => n.x)), px = input.w - 4 - input.planetR;
  // (Planets at the right, as on Alpha #48, level with their banner; the finale mid-column; the nodes stretched across.)
  const nodes = layout.nodes.map(n => ({...n, x: n.id.startsWith('planet:') ? px : n.id === 'finale:end' ? input.w / 2 : across.at(n.x), y: Y(n.y),
    r: n.id.startsWith('planet:') ? input.planetR : n.id === 'finale:end' ? PHONE.finaleNode / 2 : R}));
  // The line: the computer's own flowSegments on the phone's stations — its seed, sides, bows and swings — with its swing
  // stretched as the nodes are, inside an 8 px gutter.
  const h = Y(layout.h), fin = nodes.find(n => n.id === 'finale:end') ?? null;
  const segments = flowSegments(nodes, {w: input.w, seed: input.seed, swing: COMPUTER_SWING * across.kx, gutter: 8, leadFrom: 0, tailTo: fin ? h - 4 : null});
  const banners = input.orbits.map((o, si) => ({top: Y(layout.bannerMids[si]!) - bh / 2, planetX: nodes.find(n => n.id === `planet:${o.id}`)?.x ?? null}));
  const pills: Box[] = banners.map((b, si) => ({l: 0, t: b.top + bh / 2 - pill / 2, r: input.words[si] ?? 0, b: b.top + bh / 2 + pill / 2}));
  const line = linePoints(segments);
  const rings = nodes.map(n => ({id: n.id, x: n.x, y: n.y, r: n.r}));
  const steps = input.orbits.flatMap(o => o.steps), placed: (Box & {id: string; node: Pt})[] = [];
  // The tabs, one line each: on the computer's side, else the other, at the usual height, beside the node's middle, higher
  // or lower, and up to 54 px further out — the first clear of the column's edge, every ring, the banners, the line and
  // the tabs before it; else the least in the way (and the next sy is tried).
  const lanes: PhoneLane[] = steps.map((st, i) => {
    const node = nodes.find(n => n.id === st.id)!, tab = input.tabs[i] ?? 120, other: 'left' | 'right' = st.side === 'left' ? 'right' : 'left';
    const boxOf = (side: 'left' | 'right' | 'below', dyy: number, out: number): Box => {
      const t = node.y + dyy, b = t + PHONE.tabLine, reach = PHONE.tabReach + out;
      return side === 'below' ? {l: node.x - tab / 2, t, r: node.x + tab / 2, b} : side === 'right' ? {l: node.x + reach, t, r: node.x + reach + tab, b} : {l: node.x - reach - tab, t, r: node.x - reach, b};
    };
    const faultOf = (box: Box) => {
      let n = box.l < PHONE.margin - .5 || box.r > input.w - PHONE.margin + .5 ? 1e5 : 0;
      if (Math.max(box.l - node.x, 0, node.x - box.r) ** 2 + Math.max(box.t - node.y, 0, node.y - box.b) ** 2 < 18 ** 2) n += 1e3;
      for (const ring of rings) if (ring.id !== st.id && Math.max(box.l - ring.x, 0, ring.x - box.r) ** 2 + Math.max(box.t - ring.y, 0, ring.y - box.b) ** 2 < ring.r ** 2) n += 1e3;
      for (const p of pills) if (hits(box, p)) n += 1e3;
      for (const t of placed) if (hits(box, t)) n += 1e3;
      for (const p of line) if (p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b) n += 1;
      return n;
    };
    // (Last, centred just under the node: where a narrow phone leaves too little room on either side.)
    const options = [...([st.side, other] as const).flatMap(side => PHONE.tabOuts.flatMap(out => PHONE.tabDys.map(dyy => ({side: side as PhoneLane['side'], dy: dyy, out, fault: faultOf(boxOf(side, dyy, out))})))),
      ...[R + 6, R + 18].map(dyy => ({side: 'below' as const, dy: dyy, out: 0, fault: faultOf(boxOf('below', dyy, 0))}))];
    const pick = options.find(o => o.fault === 0) ?? options.reduce((a, b) => b.fault < a.fault ? b : a);
    placed.push({...boxOf(pick.side, pick.dy, pick.out), id: st.id, node});
    return {x: node.x, y: node.y, side: pick.side, wrap: false, maxTab: tab, lines: 1, zigi: 'side', tabDy: pick.dy, tabOut: pick.out};
  });
  const faults = phoneFaults({w: input.w, nodes: rings.filter(n => !n.id.startsWith('planet:')), planets: rings.filter(n => n.id.startsWith('planet:')), tabs: placed, pills, line});
  const stageH = Math.max(h, fin ? fin.y + PHONE.finaleFoot : 0, ...lanes.map(l => l.y + R + 40));
  return {sx, sy, kx: across.kx, dx, dy, h: stageH, nodes, segments, lanes, banners, pills, finale: fin ? {x: fin.x, y: fin.y} : null, faults};
}
