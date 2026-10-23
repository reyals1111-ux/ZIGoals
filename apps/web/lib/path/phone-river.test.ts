import {describe, expect, test} from 'vitest';
import {flowSegments, seeded, type FlowNode, type FlowSegment} from './flow-geometry';
import {phoneRiver, phoneSwing, RIVER, type RiverLayout} from './phone-river';
import {deg, hard, kinds, read, variety, type Drawn} from './river-rules.test-helper';

/**
 * Session AG Polish 3 (ADR-032 L13; owner Part 1.7 and amendment 7): the phone's river, checked as a property over 240
 * seeded paths — 1 to 12 nodes per orbit, 1 to 4 orbits, names of 3 to 40 characters, phones 320, 360, 390 and 430 px wide —
 * with the test's own geometry (lib/path/river-rules.test-helper.ts reads the drawn path data and the stations, never the
 * module's own measures). The hard rules hold on every path; the variety rules over all of them; a strict zig-zag and the
 * session's own wrong preview (reference 06) fail the variety rules.
 */
type Pt = {x: number; y: number};
/** A stage is the screen less the shell's 2 × 12 px; a planet's sphere is 84–100 px (`clamp(88px, 26cqi, 100px)`, 84 under 360). */
const PHONES = [{vw: 320, w: 296, pr: 42}, {vw: 360, w: 336, pr: 44}, {vw: 390, w: 366, pr: 47.6}, {vw: 430, w: 406, pr: 50}] as const;
/** The first screen, in the stage's coordinates: from the first banner's foot to the timer row's top (measured: the stage
 *  starts 69 px down at 390 × 844 and 71 px at 360 × 780; the timer row is the last 64 px). */
const FIRST_VIEW = {390: {h: 844, top: 69}, 360: {h: 780, top: 71}} as const;
const WORDS = ['Water', 'Read', 'Walk', 'Stretch', 'Journal', 'Meditate', 'Exercise', 'Vitamins', 'Piano', 'Spanish', 'Sleep', 'Breathe', 'Cold', 'shower', 'ten', 'pages', 'before', 'bed', 'steps', 'minutes', 'Learn', 'Save', 'for', 'the', 'trip', 'No', 'sugar'];
/** A name of 3–40 characters, and its tab's one-line width: about 8 px a character at 14 px bold, plus the tab's 47 px. */
function nameOf(r: () => number): string {
  const len = 3 + Math.floor(r() ** 1.6 * 38); let s = '';
  while (s.length < len) s += (s ? ' ' : '') + WORDS[Math.floor(r() * WORDS.length)];
  return s.slice(0, len).trim().padEnd(3, 'x');
}
const tabOf = (name: string) => Math.ceil(name.length * 7.9) + 47;
type Phone = typeof PHONES[number];
type Case = {seed: string; orbits: number[]; names: string[]; phone: Phone};
function cases(): Case[] {
  const out: Case[] = [];
  for (let i = 0; i < 240; i++) {
    const r = seeded(`river-case|${i}`), k = 1 + Math.floor(r() * 4), orbits = Array.from({length: k}, () => 1 + Math.floor(r() * 12));
    const names = orbits.flatMap(c => Array.from({length: c}, () => nameOf(r)));
    out.push({seed: `path-${i}`, orbits, names, phone: PHONES[i % 4]!});
  }
  return out;
}
/** The first screen where the test measures it (390 × 844 and 360 × 780), passed as the page passes it. */
const viewOf = (phone: Phone) => phone.vw === 390 || phone.vw === 360 ? {top: RIVER.stageTop + 2 * phone.pr + RIVER.bannerPad, bottom: FIRST_VIEW[phone.vw].h - 64 - FIRST_VIEW[phone.vw].top} : undefined;
const lay = (c: Case, phone = c.phone) => phoneRiver({w: phone.w, vw: phone.vw, seed: c.seed, tabs: c.names.map(tabOf), orbits: c.orbits, planetR: phone.pr, zigi: Math.min(92, phone.vw * .26) * .838, ...(viewOf(phone) ? {view: viewOf(phone)} : {})});
const drawn = (l: RiverLayout, phone: Phone): Drawn => ({w: phone.w, vw: phone.vw, nodes: l.nodes, boxes: l.boxes, segments: l.segments});
const isNode = (n: FlowNode) => !n.id.startsWith('planet:') && (n.inSide === 'left' || n.inSide === 'right');

describe('the variety rules catch a template (owner amendment 7)', () => {
  const w = 366, node = (id: string, x: number, y: number, side: 'left' | 'right'): FlowNode => ({id, x, y, r: 31, inSide: side, outSide: side === 'left' ? 'right' : 'left', colour: '#9273ff', done: false});
  const planet: FlowNode = {id: 'planet:morning', x: 314.4, y: 54.6, r: 47.6, inSide: 'top', outSide: 'bottom', colour: '#23eaff', done: false};
  test('a strict zig-zag — left 20 %, right 75 %, left, right…, equal spaces, the same curve every time — fails every variety rule', () => {
    // (Eight paths of the same zig-zag, as one template would draw them all.)
    const paths: Drawn[] = Array.from({length: 8}, () => {
      const nodes = [planet, ...Array.from({length: 8}, (_, i) => node(`z${i}`, i % 2 ? .75 * w : .2 * w, 200 + i * 140, i % 2 ? 'left' : 'right'))];
      // (The same gentle S between every pair: out of one side point, into the other, the same shape mirrored.)
      const segments: FlowSegment[] = nodes.slice(1).map((b, i): FlowSegment => {
        const a = nodes[i]!, p0 = a.id.startsWith('planet') ? {x: a.x, y: a.y + a.r} : {x: a.outSide === 'right' ? a.x + 31 : a.x - 31, y: a.y}, p3 = {x: b.inSide === 'right' ? b.x + 31 : b.x - 31, y: b.y};
        return {id: `${a.id}>${b.id}`, from: a.id, to: b.id, kind: 'step', d: `M${p0.x} ${p0.y} C${p0.x} ${p0.y + 70} ${p3.x} ${p3.y - 70} ${p3.x} ${p3.y}`, x1: p0.x, y1: p0.y, x2: p3.x, y2: p3.y, fromColour: '', toColour: '', fromLit: false, toLit: false};
      });
      return {w, vw: 390, nodes, boxes: [], segments};
    });
    const fails = variety(paths);
    expect(fails.some(f => /^bow: .* under 12 %/.test(f)), fails.join('\n')).toBe(true);
    expect(fails.some(f => /^drift: .* under 12 %/.test(f))).toBe(true);
    expect(fails.some(f => /break the left\/right alternation/.test(f))).toBe(true);
    expect(fails.some(f => /in the band .* over 45 %/.test(f))).toBe(true);
    expect(fails.some(f => /spread 0 px, under 60/.test(f))).toBe(true);
  });
  test('the session\'s wrong preview (reference 06: four nodes stacked down the left, a near-vertical line) fails the variety rules', () => {
    // (Stage coordinates at 390 px: the planet at the right, then nodes at 26 %, 12 %, 26 % and 66 % of the width.)
    const at = (id: string, x: number, y: number) => node(id, x, y, 'right');
    const nodes = [planet, at('a', 97, 225), at('b', 43, 337), at('c', 94, 466), at('d', 242, 653)];
    const line = (a: Pt, b: Pt, id: string, from: string, to: string): FlowSegment => ({id, from, to, kind: 'step', d: `M${a.x} ${a.y} C${a.x} ${a.y + (b.y - a.y) * .5} ${b.x} ${b.y - (b.y - a.y) * .5} ${b.x} ${b.y}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, fromColour: '', toColour: '', fromLit: false, toLit: false});
    const segments = [line({x: 314.4, y: 102.2}, {x: 110, y: 197}, 'planet:morning>a', 'planet:morning', 'a'), line({x: 90, y: 255}, {x: 50, y: 307}, 'a>b', 'a', 'b'), line({x: 50, y: 367}, {x: 88, y: 436}, 'b>c', 'b', 'c'), line({x: 108, y: 493}, {x: 225, y: 625}, 'c>d', 'c', 'd')];
    const fails = variety([{w, vw: 390, nodes, boxes: [], segments}]);
    expect(fails.some(f => /under 12 %/.test(f)), fails.join('\n')).toBe(true);
    expect(fails.some(f => /in the band 20–40 %.*over 45 %/.test(f))).toBe(true);
  });
});

describe('the phone\'s river (Session AG Polish 3, ADR-032 L13; owner Part 1 and amendment 7)', () => {
  const all = cases().map(c => ({c, l: lay(c)}));
  test('its line is the computer\'s own: flowSegments, unchanged, with the phone\'s swing', () => {
    for (const {c, l} of all.slice(0, 40)) expect(l.segments).toEqual(flowSegments(l.nodes, {w: c.phone.w, seed: c.seed, swing: phoneSwing(c.phone.w), gutter: RIVER.gutter}));
  });
  test('the hard rules on every path: never upward, no radius under 40 px × width/390, inside the column, clear of every other ring, name tab and banner, planets top-in and bottom-out', () => {
    const fails = all.flatMap(({c, l}) => hard(drawn(l, c.phone)).map(f => `${c.seed}@${c.phone.vw}: ${f}`));
    expect(fails.slice(0, 12)).toEqual([]);
  });
  test('variety over all paths: each kind in 12 % of stretches or more, no strict alternation in most, no crowded band, spaces spread in every orbit of four or more', () => {
    const paths = all.map(({c, l}) => drawn(l, c.phone));
    expect(variety(paths)).toEqual([]);
    // (And a node's place across the width varies continuously: many different places, not a few columns.)
    const xs = new Set(paths.flatMap(d => d.nodes.filter(isNode).map(n => Math.round(n.x / d.w * 50))));
    expect(xs.size).toBeGreaterThanOrEqual(35);
  });
  test('one stream through each node: in at one side point and out at the other, both heading down (within 60°)', () => {
    const fails: string[] = [];
    for (const {c, l} of all) {
      const r = read(l.segments);
      for (const n of l.nodes.filter(isNode)) {
        const into = r.find(x => x.s.to === n.id), out = r.find(x => x.s.from === n.id);
        if (!into || !out) continue;
        const e = into.pts.at(-1)!, b = out.pts[0]!;
        if (Math.abs(Math.hypot(e.x - n.x, e.y - n.y) - n.r) >= 1 || Math.abs(Math.hypot(b.x - n.x, b.y - n.y) - n.r) >= 1) fails.push(`${c.seed} ${n.id}: not on the ring`);
        const turn = deg(into.end, out.start);
        if (turn > 60) fails.push(`${c.seed}@${c.phone.vw} ${n.id}: turns ${turn.toFixed(1)}°`);
      }
    }
    expect(fails.slice(0, 10)).toEqual([]);
  });
  test('the first screen holds 3–4 whole nodes at 390 × 844; at 360 × 780 three in nearly every path, never under two', {timeout: 120_000}, () => {
    // (Where one of the first three names is longer than ~58 % of the stage its node must stand at an edge: those paths are
    // left out — ADR-032 L6; and paths whose first orbit has fewer than three nodes.)
    let checked = 0, short = 0;
    const fails: string[] = [];
    for (const {c} of all.filter(x => x.c.orbits[0]! >= 3)) for (const vw of [390, 360] as const) {
      const phone = PHONES.find(p => p.vw === vw)!;
      if (c.names.slice(0, 3).some(nm => tabOf(nm) > phone.w * .58)) continue;
      const l = lay(c, phone), v = viewOf(phone)!;
      const seen = l.nodes.filter(n => isNode(n) && n.y - n.r >= v.top && n.y + n.r <= v.bottom).length;
      if (vw === 390 && (seen < 3 || seen > 4)) fails.push(`${c.seed}@390: ${seen}`);
      if (vw === 360) { if (seen < 2) fails.push(`${c.seed}@360: ${seen}`); if (seen < 3) short++; checked++; }
    }
    expect(fails).toEqual([]);
    expect(short / checked, `${short} of ${checked} paths show two whole nodes at 360`).toBeLessThanOrEqual(.1);
  });
  test('every path looks different: the first views of the three sample paths run different kinds of stretch', () => {
    const SAMPLES = {
      long: ['Take Vitamins & Creatine', 'Water', 'Read ten pages', 'Meditate ten minutes', 'Exercise'],
      short: ['Water', 'Weigh in', 'Log breakfast', 'Read', 'Walk', 'Stretch'],
      two: ['Fictional sunrise', 'Fictional dawn', 'Fictional tea'],
    };
    const phone = PHONES[2], firsts = Object.entries(SAMPLES).map(([seed, names]) => {
      const l = lay({seed, orbits: [names.length], names, phone}), v = viewOf(phone)!;
      return kinds({...drawn(l, phone), segments: l.segments.filter(s => {const to = l.nodes.find(n => n.id === s.to); return !!to && to.y - to.r < v.bottom * 2;})}).slice(0, 4).join(' ');
    });
    expect(new Set(firsts).size, firsts.join(' | ')).toBe(3);
  });
  test('every name on one line, unless it is too long even at the edge (then it wraps there, never cut)', () => {
    for (const {c, l} of all) l.lanes.forEach((lane, i) => {
      const tab = tabOf(c.names[i]!), edge = c.phone.w - RIVER.margin * 2 - RIVER.r - RIVER.halo - RIVER.tabReach;
      if (lane.wrap) expect(tab, `${c.seed} ${i}`).toBeGreaterThan(edge * .55);
      else {
        const end = lane.side === 'right' ? lane.x + RIVER.tabReach + tab : lane.x - RIVER.tabReach - tab;
        expect(end, `${c.seed} ${i}`).toBeGreaterThanOrEqual(RIVER.margin - .01); expect(end).toBeLessThanOrEqual(c.phone.w - RIVER.margin + .01);
      }
    });
  });
  test('the same path gives the same layout and line; another path id another', () => {
    const c = cases()[17]!;
    expect(lay(c)).toEqual(lay({...c}));
    expect(lay({...c, seed: 'another day'}).lanes.map(x => x.x)).not.toEqual(lay(c).lanes.map(x => x.x));
  });
});
