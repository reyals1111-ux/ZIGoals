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
