import {describe, expect, test} from 'vitest';
import {flowSegments, rimPoint, sidesFor, type FlowNode} from './flow-geometry';

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
