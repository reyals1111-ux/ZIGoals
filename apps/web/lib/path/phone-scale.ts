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
export const PHONE = {dot: 62, tabTop: 62 * .2, tabDys: [62 * .2, -14, -42, 40], tabOuts: [0, 18, 36, 54], tabReach: 62 * .3, tabLine: 28.5, tabLineStep: 17.5, finaleNode: 62 * 1.1, finaleFoot: 110, margin: 6, clear: 0};

export type ScaleOrbit = {id: string; /** the planet's box width in spheres (`--ex`), or null where the orbit has no planet */ planet: number | null; steps: {id: string; side: 'left' | 'right'}[]};
export type ScaleInput = {/** the phone stage's width */ w: number; seed: string; orbits: ScaleOrbit[]; finale: boolean;
  /** the phone planet's sphere radius, each tab's one-line width, where each banner's words end */
  planetR: number; tabs: number[]; words: number[]};
/** `tabDy`: the tab's top below the node's centre (its usual place is 0.2 of a node; a tab may move up beside it);
 *  `tabOut`: how much further out from the node than usual it starts. */
export type PhoneLane = {x: number; y: number; side: 'left' | 'right'; wrap: boolean; maxTab: number; lines: number; zigi: 'side' | 'above'; tabDy: number; tabOut: number};
export type PhoneScale = {s: number; dx: number; dy: number; h: number; nodes: FlowNode[]; segments: FlowSegment[]; lanes: PhoneLane[];
  banners: {top: number; planetX: number | null}[]; finale: {x: number; y: number} | null};

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
/** A stretch's path data and ends, moved by x → x·s + dx and y → y·s + dy. */
export function scaleSegment(sg: FlowSegment, s: number, dx: number, dy: number): FlowSegment {
  let k = 0;
  const d = sg.d.replace(/-?\d+(?:\.\d+)?/g, n => f(Number(n) * s + (k++ % 2 ? dy : dx)));
  return {...sg, d, x1: sg.x1 * s + dx, y1: sg.y1 * s + dy, x2: sg.x2 * s + dx, y2: sg.y2 * s + dy};
}
/** The scale and shift that put the virtual band in the phone's column (6 px from each side). */
export function phoneTransform(w: number, firstBannerMid: number, bannerH: number): {s: number; dx: number; dy: number} {
  const s = (w - 2 * PHONE.margin) / (COMPUTER_BAND.right - COMPUTER_BAND.left), dx = PHONE.margin - COMPUTER_BAND.left * s;
  // (Down only as far as the first banner needs to stand whole inside the stage.)
  return {s, dx, dy: Math.max(0, COMPUTER.stageTop + bannerH / 2 - firstBannerMid * s)};
}

type Box = {l: number; t: number; r: number; b: number};
const hits = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
/** The phone's path: the computer's layout and line × s, with the phone's readable pieces placed on top. */
export function phoneScale(input: ScaleInput): PhoneScale {
  const layout = computerLayout(input.orbits, input.finale), bh = 2 * input.planetR + 10;
  const {s, dx, dy} = phoneTransform(input.w, layout.bannerMids[0] ?? 0, bh);
  const X = (x: number) => x * s + dx, Y = (y: number) => y * s + dy;
  const nodes = layout.nodes.map(n => ({...n, x: X(n.x), y: Y(n.y), r: n.r * s}));
  const segments = computerLine(layout, input.seed).map(sg => scaleSegment(sg, s, dx, dy));
  const banners = input.orbits.map((o, si) => ({top: Y(layout.bannerMids[si]!) - bh / 2, planetX: nodes.find(n => n.id === `planet:${o.id}`)?.x ?? null}));
  const fin = nodes.find(n => n.id === 'finale:end') ?? null;
  // The tabs: on the computer's side, unless that leaves the column or covers a ring, a planet, a banner's words or the line.
  const line: {x: number; y: number}[] = [];
  for (const sg of segments) {
    const n = (sg.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    for (let i = 2; i + 5 < n.length; i += 6) for (let t = 0; t <= 1; t += 1 / 24) {
      const u = 1 - t, [x0, y0, x1, y1, x2, y2, x3, y3] = [n[i - 2]!, n[i - 1]!, n[i]!, n[i + 1]!, n[i + 2]!, n[i + 3]!, n[i + 4]!, n[i + 5]!];
      line.push({x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3});
    }
  }
  const R = PHONE.dot / 2, rings = nodes.map(n => ({id: n.id, x: n.x, y: n.y, r: n.id.startsWith('planet:') ? input.planetR : n.id === 'finale:end' ? PHONE.finaleNode / 2 : R}));
  const words: Box[] = banners.map((b, si) => ({l: 0, t: b.top + bh / 2 - 20, r: input.words[si] ?? 0, b: b.top + bh / 2 + 20}));
  const steps = input.orbits.flatMap(o => o.steps);
  const lanes: PhoneLane[] = steps.map((st, i) => {
    const node = nodes.find(n => n.id === st.id)!, tab = input.tabs[i] ?? 120, other: 'left' | 'right' = st.side === 'left' ? 'right' : 'left';
    const boxOf = (side: 'left' | 'right', width: number, lines: number, dy: number, out: number): Box => {
      const t = node.y + dy, b = t + PHONE.tabLine + (lines - 1) * PHONE.tabLineStep, reach = PHONE.tabReach + out;
      return side === 'right' ? {l: node.x + reach, t, r: node.x + reach + width, b} : {l: node.x - reach - width, t, r: node.x - reach, b};
    };
    const room = (side: 'left' | 'right', out: number) => side === 'right' ? input.w - PHONE.margin - node.x - PHONE.tabReach - out : node.x - PHONE.tabReach - out - PHONE.margin;
    const fault = (box: Box) => {
      const c = PHONE.clear, grown = {l: box.l - c, t: box.t - c, r: box.r + c, b: box.b + c};
      // (The column first, then a ring or a banner's words, then the line: a point of it under the tab.)
      let n = box.l < PHONE.margin - .5 || box.r > input.w - PHONE.margin + .5 ? 1e5 : 0;
      for (const ring of rings) if (ring.id !== st.id && Math.max(grown.l - ring.x, 0, ring.x - grown.r) ** 2 + Math.max(grown.t - ring.y, 0, ring.y - grown.b) ** 2 < ring.r ** 2) n += 1e3;
      for (const w of words) if (hits(grown, w)) n += 1e3;
      for (const p of line) if (p.x > grown.l && p.x < grown.r && p.y > grown.t && p.y < grown.b) n += 1;
      return n;
    };
    // (In order: the computer's side, the other side, then each wrapped; each at its usual height, then beside the node's
    // middle, then higher — the first that is clear, else the least in the way.)
    const options = ([{side: st.side, wrap: false}, {side: other, wrap: false}, {side: st.side, wrap: true}, {side: other, wrap: true}] as const).flatMap(o => PHONE.tabOuts.flatMap(out => PHONE.tabDys.map(dy => {
      const max = o.wrap ? Math.max(80, Math.floor(room(o.side, out))) : tab, lines = o.wrap ? Math.max(1, Math.ceil(tab / max)) : 1;
      return {...o, dy, out, maxTab: o.wrap ? max : tab, lines, fault: fault(boxOf(o.side, o.wrap ? Math.min(tab, max) : tab, lines, dy, out))};
    })));
    const pick = options.find(o => o.fault === 0) ?? options.reduce((a, b) => b.fault < a.fault ? b : a);
    return {x: node.x, y: node.y, side: pick.side, wrap: pick.wrap && pick.lines > 1, maxTab: pick.maxTab, lines: pick.lines, zigi: 'side', tabDy: pick.dy, tabOut: pick.out};
  });
  const h = Math.max(Y(layout.h), fin ? fin.y + PHONE.finaleFoot : 0, ...lanes.map(l => l.y + R + 40));
  return {s, dx, dy, h, nodes, segments, lanes, banners, finale: fin ? {x: fin.x, y: fin.y} : null};
}
