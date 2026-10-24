import {describe, expect, it} from 'vitest';
import {seeded} from './flow-geometry';
import {COMPUTER, COMPUTER_BAND, computerLayout, computerLine, phoneScale, phoneTransform, type ScaleOrbit} from './phone-scale';

/**
 * Session AG Polish 3 (ADR-032 L20; owner amendment 8): the phone's path IS the computer's path × scale. Over 200 seeded
 * paths (1–4 orbits of 1–12 nodes, planets plain or ringed, tab sides either way) at phones of 320, 360, 390 and 430 px,
 * every node, planet, finale and every point of the line's path data equals the computer's own × s (with the one shift
 * into the phone's column) within 0.5 px, and each node's place on the page (its lane) is exactly its scaled centre.
 * The virtual computer itself is pinned to the real computer measured at 1440 × 900.
 */
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
function samplePath(seed: number): {orbits: ScaleOrbit[]; finale: boolean; tabs: number[]; words: number[]} {
  const r = seeded(`phone-scale-${seed}`), orbits: ScaleOrbit[] = [], tabs: number[] = [], words: number[] = [];
  const count = 1 + Math.floor(r() * 4);
  let k = 0;
  for (let o = 0; o < count; o++) {
    const n = 1 + Math.floor(r() * 12);
    orbits.push({id: `o${o}`, planet: r() < .15 ? null : r() < .5 ? 1 : 1.48, steps: Array.from({length: n}, () => { tabs.push(70 + Math.floor(r() * 160)); return {id: `n${++k}`, side: r() < .5 ? 'left' : 'right'}; })});
    words.push(150 + Math.floor(r() * 70));
  }
  return {orbits, finale: r() < .9, tabs, words};
}

describe('phone = computer × scale (owner amendment 8)', () => {
  it('every node, planet, finale and line point is the computer\'s own × s, within 0.5 px, at 320, 360, 390 and 430 px', () => {
    const outside: string[] = [];
    for (let seed = 0; seed < 200; seed++) {
      const p = samplePath(seed), layout = computerLayout(p.orbits, p.finale), line = computerLine(layout, `seed-${seed}`);
      for (const vw of [320, 360, 390, 430]) {
        const w = vw - 24, planetR = 44, got = phoneScale({w, seed: `seed-${seed}`, planetR, ...p});
        const {s, dx, dy} = phoneTransform(w, layout.bannerMids[0]!, 2 * planetR + 10);
        expect(got.s).toBe(s);
        expect(s, 'one scale: the phone column over the band the computer draws in').toBeCloseTo((w - 12) / (COMPUTER_BAND.right - COMPUTER_BAND.left), 9);
        layout.nodes.forEach((n, i) => {
          const q = got.nodes[i]!;
          expect(q.id).toBe(n.id);
          expect(Math.abs(q.x - (n.x * s + dx)), `${seed}@${vw} ${n.id} x`).toBeLessThan(.5);
          expect(Math.abs(q.y - (n.y * s + dy)), `${seed}@${vw} ${n.id} y`).toBeLessThan(.5);
        });
        expect(got.segments.map(sg => sg.id)).toEqual(line.map(sg => sg.id));
        line.forEach((sg, i) => {
          const a = nums(sg.d), b = nums(got.segments[i]!.d);
          expect(b).toHaveLength(a.length);
          a.forEach((v, j) => expect(Math.abs(b[j]! - (v * s + (j % 2 ? dy : dx))), `${seed}@${vw} ${sg.id}[${j}]`).toBeLessThan(.5));
        });
        // (Where the page puts each node: its lane is its scaled centre; a tab may move, a node never.)
        const steps = p.orbits.flatMap(o => o.steps);
        got.lanes.forEach((lane, i) => { const n = got.nodes.find(q => q.id === steps[i]!.id)!; expect(lane.x).toBe(n.x); expect(lane.y).toBe(n.y); });
        // (Inside the column: every point of every curve — the lead-in's start excepted, which rises out of nothing, fully
        // transparent, and is clipped at the stage's edge — and the stage tall enough for all of it.)
        for (const sg of got.segments) {
          const n = nums(sg.d);
          for (let i = 2; i + 5 < n.length; i += 6) for (let t = 0; t <= 1; t += 1 / 32) {
            const u = 1 - t, x = u ** 3 * n[i - 2]! + 3 * u * u * t * n[i]! + 3 * u * t * t * n[i + 2]! + t ** 3 * n[i + 4]!, y = u ** 3 * n[i - 1]! + 3 * u * u * t * n[i + 1]! + 3 * u * t * t * n[i + 3]! + t ** 3 * n[i + 5]!;
            if ((sg.kind !== 'lead' || t > .5) && (x < -.5 || x > w + .5)) outside.push(`${seed}@${vw} ${sg.id} x ${x.toFixed(1)}`);
            if (y > got.h + .5) outside.push(`${seed}@${vw} ${sg.id} y ${y.toFixed(1)} below the stage`);
          }
        }
      }
    }
    expect(outside, 'the line inside the column and the stage').toEqual([]);
  }, 120_000);
  it('the virtual computer is the real one: the Checklist at 1440 × 900, measured (13 items in four orbits, two planets ringed)', () => {
    const sides = ['left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left'] as const;
    let k = 0;
    const orbits: ScaleOrbit[] = [5, 3, 3, 2].map((n, o) => ({id: ['morning', 'afternoon', 'evening', 'anytime'][o]!, planet: [1, 189.7 / 128, 1, 188.2 / 128][o]!, steps: Array.from({length: n}, () => ({id: `ck_river-${++k}`, side: sides[k - 1]!}))}));
    const at = new Map(computerLayout(orbits, true).nodes.map(n => [n.id, [n.x, n.y]]));
    const measured: [string, number, number][] = [
      ['planet:morning', 805.2, 84], ['ck_river-1', 488, 232], ['ck_river-2', 595.4, 346], ['ck_river-3', 702.7, 460], ['ck_river-4', 595.4, 574], ['ck_river-5', 488, 688],
      ['planet:afternoon', 774.4, 840], ['ck_river-6', 380.6, 988], ['ck_river-7', 273.3, 1102], ['ck_river-8', 380.6, 1216],
      ['planet:evening', 805.2, 1368], ['ck_river-9', 488, 1516], ['ck_river-10', 595.4, 1630], ['ck_river-11', 702.7, 1744],
      ['planet:anytime', 775.1, 1896], ['ck_river-12', 595.4, 2044], ['ck_river-13', 488, 2158], ['finale:end', 488, 2302],
    ];
    for (const [id, x, y] of measured) { expect(Math.abs(at.get(id)![0]! - x), `${id} x`).toBeLessThan(.6); expect(Math.abs(at.get(id)![1]! - y), `${id} y`).toBeLessThan(.6); }
    expect(computerLayout(orbits, true).h).toBeCloseTo(2408.8, 0);
    expect(COMPUTER.w).toBe(976);
    // (And its own line: the first stretches' path data as the computer drew them.)
    const line = computerLine(computerLayout(orbits, true), 'checklist-today');
    expect(line[0]!.d).toBe('M747.8 0 C747.8 11 805.2 9 805.2 20');
    expect(line[1]!.d).toBe('M805.2 148 C805.2 170.6 631.2 179.9 613.6 184.5 C590.6 190.5 448 202.5 448 232');
  });
});
