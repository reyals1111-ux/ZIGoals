import {describe, expect, test} from 'vitest';
import {curveFacts, flowSegments, passOf, RIBBON_MIN_RADIUS, rimPoint, sidesFor, type FlowBox, type FlowNode} from './flow-geometry';
import {phoneLanes} from './phone-lanes';

const nodes = (n: number, w: number): FlowNode[] => Array.from({length: n}, (_, i) => {
  const side = i % 2 ? 'left' : 'right' as const, x = w / 2 + [0, .5, 1, .5, 0, -.5, -1, -.5][i % 8]! * w * .3;
  return {id: `ck_${i}`, x, y: 80 + i * 130, r: 40, ...sidesFor(side), colour: '#23eaff', done: i < 3};
});
const numbers = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number);

describe('the orbit path\'s flowing line (Session AG)', () => {
  test('one stretch between each two nodes, plus a lead-in and a tail', () => {
    const segs = flowSegments(nodes(6, 1000), {w: 1000, seed: 'today', swing: 220, leadFrom: 0, tailTo: 900});
    expect(segs.map(s => s.kind)).toEqual(['lead', 'step', 'step', 'step', 'step', 'step', 'tail']);
  });
  test('it meets every ring at its side point, heading straight down (tangent to the ring)', () => {
    const ns = nodes(8, 900);
    for (const s of flowSegments(ns, {w: 900, seed: 's', swing: 200}).filter(x => x.kind === 'step')) {
      const a = ns.find(n => n.id === s.from)!, b = ns.find(n => n.id === s.to)!, v = numbers(s.d), p0 = rimPoint(a, a.outSide), p3 = rimPoint(b, b.inSide);
      expect([v[0], v[1]]).toEqual([Math.round(p0.x * 10) / 10, Math.round(p0.y * 10) / 10]);
      expect(v[2], 'leaves straight down').toBe(v[0]);
      expect(v[3]!).toBeGreaterThan(v[1]!);
      expect([v.at(-2), v.at(-1)]).toEqual([Math.round(p3.x * 10) / 10, Math.round(p3.y * 10) / 10]);
      expect(v.at(-4), 'arrives straight down').toBe(v.at(-2));
      expect(v.at(-3)!).toBeLessThan(v.at(-1)!);
    }
  });
  test('deterministic, varied, and inside the column at a phone\'s width', () => {
    const a = flowSegments(nodes(10, 320), {w: 320, seed: 'x', swing: 60, leadFrom: 0, tailTo: 1500}), b = flowSegments(nodes(10, 320), {w: 320, seed: 'x', swing: 60, leadFrom: 0, tailTo: 1500});
    expect(a.map(s => s.d)).toEqual(b.map(s => s.d));
    for (const s of a) { const v = numbers(s.d).filter((_, i) => i % 2 === 0); for (const x of v) { expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(312); } }
    const wide = flowSegments(nodes(10, 1000), {w: 1000, seed: 'x', swing: 220}).map(s => numbers(s.d)[8]! - numbers(s.d)[0]!);
    expect(new Set(wide.map(n => Math.round(n / 10))).size, 'the stretches are not all one curve').toBeGreaterThan(4);
  });
});

describe('an orbit planet on the line (Session AG Polish, owner Part 4, reference 03)', () => {
  // A cubic Bézier's points, sampled, from an SVG path made of M/C commands.
  const samples = (d: string) => {
    const n = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number), pts: [number, number][] = []; let x = n[0]!, y = n[1]!;
    for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, f, g] = n.slice(i, i + 6) as [number, number, number, number, number, number]; for (let t = 0; t <= 1; t += .02) { const u = 1 - t; pts.push([u ** 3 * x + 3 * u * u * t * a + 3 * u * t * t * c + t ** 3 * f, u ** 3 * y + 3 * u * u * t * b + 3 * u * t * t * e + t ** 3 * g]); } x = f; y = g; }
    return pts;
  };
  const planet = {id: 'planet:m', x: 240, y: 300, r: 60, inSide: 'top' as const, outSide: 'bottom' as const, colour: '#23eaff', done: false};
  const nodes = [{id: 'a', x: 140, y: 120, r: 36, inSide: 'right' as const, outSide: 'left' as const, colour: '#9273ff', done: true}, planet, {id: 'b', x: 330, y: 480, r: 36, inSide: 'left' as const, outSide: 'right' as const, colour: '#23eaff', done: false}];
  const segs = flowSegments(nodes, {w: 480, seed: 'p', swing: 120, leadFrom: 0});
  test('the line enters at the planet\'s top rim heading down and leaves from its bottom rim heading down', () => {
    const into = segs.find(s => s.to === 'planet:m' && s.kind === 'step')!, out = segs.find(s => s.from === 'planet:m')!;
    expect([into.x2, into.y2]).toEqual([240, 240]);
    expect([out.x1, out.y1]).toEqual([240, 360]);
    const a = samples(into.d), b = samples(out.d);
    const endDir = [a.at(-1)![0] - a.at(-2)![0], a.at(-1)![1] - a.at(-2)![1]], startDir = [b[1]![0] - b[0]![0], b[1]![1] - b[0]![1]];
    expect(Math.abs(endDir[0]!)).toBeLessThan(Math.abs(endDir[1]!) * .2); expect(endDir[1]).toBeGreaterThan(0);
    expect(Math.abs(startDir[0]!)).toBeLessThan(Math.abs(startDir[1]!) * .2); expect(startDir[1]).toBeGreaterThan(0);
  });
  test('no stretch is ever drawn across the planet', () => {
    for (const s of segs) for (const [x, y] of samples(s.d)) expect(Math.hypot(x - planet.x, y - planet.y), s.id).toBeGreaterThanOrEqual(planet.r - .6);
  });
  test('a lead-in into a planet that opens the path comes down onto its top', () => {
    const lead = flowSegments([planet, nodes[2]!], {w: 480, seed: 'p', swing: 120, leadFrom: 0}).find(s => s.kind === 'lead')!;
    expect([lead.x2, lead.y2]).toEqual([240, 240]);
  });
});

describe('the phone\'s smooth ribbon (Session AG Polish 2, ADR-031 K16; owner amendment 5)', () => {
  type Pt = {x: number; y: number};
  const cubic = (d: string): Pt[] => { const n = numbers(d), c: Pt[] = []; for (let i = 0; i + 1 < n.length; i += 2) c.push({x: n[i]!, y: n[i + 1]!}); return c.length === 2 ? [c[0]!, c[0]!, c[1]!, c[1]!] : c; };
  const unit = (v: Pt) => { const l = Math.hypot(v.x, v.y) || 1; return {x: v.x / l, y: v.y / l}; };
  const deg = (a: Pt, b: Pt) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y))) * 180 / Math.PI;
  /** A phone's day as the Checklist lays it out: four orbits (5, 3, 3, 2 nodes), each under its planet at the right, the
   *  nodes in their lanes (lib/path/phone-lanes.ts), the finale in the middle; with each tab's box and each banner's. */
  function day(w: number, seed = 'checklist-today') {
    const sizes = [5, 3, 3, 2], tabs = [180, 70, 130, 170, 90, 150, 110, 110, 230, 80, 130, 120, 170].map(t => Math.min(t, w - 80)), planetX = w - 52;
    const from: (number | null)[] = [], to: (number | null)[] = [];
    sizes.forEach(n => { for (let j = 0; j < n; j++) { from.push(j === 0 ? planetX : null); to.push(j === n - 1 ? planetX : null); } });
    to[to.length - 1] = w / 2;
    const lanes = phoneLanes(tabs, {w, node: 62, zigi: Math.min(92, w * .26) * .838, seed, from, to});
    const nodes: FlowNode[] = [], obstacles: FlowBox[] = [];
    let y = 55, k = 0;
    sizes.forEach((n, oi) => {
      nodes.push({id: `planet:${oi}`, x: planetX, y, r: 47.5, inSide: 'top', outSide: 'bottom', colour: '#9273ff', done: false});
      obstacles.push({id: `banner:${oi}`, left: -6, right: 200, top: y - 20, bottom: y + 20});
      y += 179;
      for (let j = 0; j < n; j++, k++) {
        const l = lanes[k]!, id = `n${k}`;
        nodes.push({id, x: l.x, y, r: 31, ...sidesFor(l.side), colour: '#23eaff', done: false});
        obstacles.push({id: `tab:${id}`, top: y + 13, bottom: y + 41, left: l.side === 'right' ? l.x + 18.6 : l.x - 18.6 - l.maxTab, right: l.side === 'right' ? l.x + 18.6 + l.maxTab : l.x - 18.6});
        y += j + 1 < n ? 178 : 188;
      }
    });
    const last = nodes.at(-1)!;
    nodes.push({id: 'finale', x: w / 2, y: y + 20, r: 34, inSide: last.outSide, outSide: last.inSide, colour: '#9273ff', done: false, upright: true});
    return {nodes, obstacles, segs: flowSegments(nodes, {w, seed, swing: Math.min(150, w * .4), leadFrom: 0, tailTo: y + 140, ribbon: true, obstacles})};
  }
  const widths = [296, 351, 366, 406];
  test('each stretch is ONE cubic Bézier: at most one S-turn, no radius under 42 px, never running upward, inside the column', () => {
    for (const w of widths) {
      const {segs, nodes} = day(w);
      expect(segs.filter(s => s.kind === 'step')).toHaveLength(nodes.length - 1);
      for (const s of segs) {
        if (s.kind === 'step') expect(s.d.replace(/[^A-Z]/g, ''), `${w} ${s.id}`).toBe('MC');
        const f = curveFacts(cubic(s.d), {left: 8, right: w - 8});
        expect(f.turns, `${w} ${s.id}: S-turns`).toBeLessThanOrEqual(1);
        if (!/^M\S+ \S+ L/.test(s.d)) expect(f.minRadius, `${w} ${s.id}: radius`).toBeGreaterThanOrEqual(RIBBON_MIN_RADIUS);
        expect(f.rises, `${w} ${s.id}: never upward`).toBe(false);
        expect(f.outside, `${w} ${s.id}: inside`).toBe(false);
      }
    }
  });
  test('it leaves each ring in exactly the direction it came in, tangent to a node\'s ring, through a planet\'s centre', () => {
    for (const w of widths) {
      const {segs, nodes} = day(w), at = new Map(nodes.map(n => [n.id, n]));
      for (let i = 0; i + 1 < segs.length; i++) {
        const a = cubic(segs[i]!.d), b = cubic(segs[i + 1]!.d), n = at.get(segs[i]!.to!)!;
        // (A straight lead-in's direction: from its start.)
        const pa = a[2]!.x === a[3]!.x && a[2]!.y === a[3]!.y ? a[0]! : a[2]!;
        const tin = unit({x: a[3]!.x - pa.x, y: a[3]!.y - pa.y}), tout = unit({x: b[1]!.x - b[0]!.x, y: b[1]!.y - b[0]!.y});
        expect(deg(tin, tout), `${w} at ${n.id}`).toBeLessThan(1);
        for (const [p, t] of [[a[3]!, tin], [b[0]!, tout]] as const) {
          expect(Math.abs(Math.hypot(p.x - n.x, p.y - n.y) - n.r), `${w} ${n.id}: on its rim`).toBeLessThan(.2);
          const rad = unit({x: p.x - n.x, y: p.y - n.y});
          if (n.inSide === 'top') expect(Math.abs(t.x * rad.y - t.y * rad.x), `${w} ${n.id}: through its centre`).toBeLessThan(.01);
          else expect(Math.abs(t.x * rad.x + t.y * rad.y), `${w} ${n.id}: tangent`).toBeLessThan(.01);
        }
      }
    }
  });
  test('a node leans its pass toward its name: in at the upper part of the name\'s side, out at the lower part of the other', () => {
    const n: FlowNode = {id: 'n', x: 100, y: 100, r: 31, ...sidesFor('right'), colour: '#fff', done: false};
    const p = passOf(n, .4);
    expect(p.entry.x).toBeGreaterThan(100); expect(p.entry.y).toBeLessThan(100);
    expect(p.exit.x).toBeLessThan(100); expect(p.exit.y).toBeGreaterThan(100);
    expect(p.dir.x, 'heading toward the name').toBeGreaterThan(0);
    const q = passOf({...n, ...sidesFor('left')}, .4);
    expect(q.entry.x).toBeLessThan(100); expect(q.entry.y).toBeLessThan(100); expect(q.dir.x).toBeLessThan(0);
    // (Never more than 40°; a planet and the finale pass straight down.)
    expect(Math.atan2(passOf(n, 2).dir.x, passOf(n, 2).dir.y) * 180 / Math.PI).toBeCloseTo(40, 5);
    expect(passOf({...n, upright: true}, .4).dir).toEqual({x: 0, y: 1});
    expect(passOf({...n, inSide: 'top', outSide: 'bottom'}, 0)).toEqual({entry: {x: 100, y: 69}, exit: {x: 100, y: 131}, dir: {x: 0, y: 1}});
  });
  test('the line keeps clear of every tab, banner and other ring — by its choice of curve and lean, never an extra bend', () => {
    for (const w of widths) {
      const {segs, nodes, obstacles} = day(w);
      for (const s of segs.filter(x => x.kind === 'step')) {
        const rings = nodes.filter(n => n.id !== s.from && n.id !== s.to).map(n => ({...n, r: n.r + 2}));
        const f = curveFacts(cubic(s.d), {left: 8, right: w - 8, rings, boxes: obstacles});
        expect(f.room, `${w} ${s.id}: clear of tabs and banners`).toBeGreaterThanOrEqual(6);
        expect(f.ring, `${w} ${s.id}: clear of other rings`).toBeGreaterThanOrEqual(0);
      }
    }
  });
  test('bounded and deterministic: where no clean curve exists it still draws one cubic per stretch at once (never a loop)', () => {
    const tight = [{id: 'a', x: 40, y: 100, r: 31, ...sidesFor('right'), colour: '#fff', done: false}, {id: 'b', x: 320, y: 150, r: 31, ...sidesFor('left'), colour: '#fff', done: false}, {id: 'c', x: 40, y: 200, r: 31, ...sidesFor('right'), colour: '#fff', done: false}] satisfies FlowNode[];
    const t0 = performance.now(), segs = flowSegments(tight, {w: 366, seed: 'x', swing: 146, ribbon: true, obstacles: [{id: 'wall', left: 0, right: 366, top: 120, bottom: 130}]});
    expect(performance.now() - t0).toBeLessThan(250);
    expect(segs.map(s => s.d.replace(/[^A-Z]/g, ''))).toEqual(['MC', 'MC']);
    expect(flowSegments(tight, {w: 366, seed: 'x', swing: 146, ribbon: true})).toEqual(flowSegments(tight, {w: 366, seed: 'x', swing: 146, ribbon: true}));
    expect(day(366).segs).toEqual(day(366).segs);
  });
  test('varied: no two stretches in a row have the same shape', () => {
    for (const w of widths) {
      const steps = day(w).segs.filter(s => s.kind === 'step').map(s => { const c = cubic(s.d); return c.map(p => `${Math.round(p.x - c[0]!.x)},${Math.round(p.y - c[0]!.y)}`).join(' '); });
      steps.slice(1).forEach((x, i) => expect(x, `${w}: ${i}`).not.toBe(steps[i]));
    }
  });
  test('a computer\'s line is exactly as before: the ribbon\'s options mean nothing without `ribbon`', () => {
    const ns = nodes(6, 1000), a = flowSegments(ns, {w: 1000, seed: 'today', swing: 220}), b = flowSegments(ns, {w: 1000, seed: 'today', swing: 220, obstacles: [{id: 'x', left: 0, right: 1000, top: 0, bottom: 2000}], minRadius: 500});
    expect(b.map(s => s.d)).toEqual(a.map(s => s.d));
    // (A two-waypoint stretch per pair of nodes, as Session AG drew it.)
    expect(a.filter(s => s.kind === 'step').every(s => s.d.replace(/[^A-Z]/g, '') === 'MCC')).toBe(true);
  });
});
