import {describe, expect, it} from 'vitest';
import {seeded} from './flow-geometry';
import {COMPUTER, COMPUTER_SWING, computerLayout, computerLine, phoneAcross, phoneScale, phoneSpread, phoneTransform, syRange, type ScaleOrbit} from './phone-scale';
import {flowSegments} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032 L20, L22; owner amendments 8 and 10): the phone's path IS the computer's path × (sx, sy) —
 * sx fits the width, sy is the least value in [2 × sx, 1] at which every overlap check passes. Over 200 seeded paths
 * (1–4 orbits of 1–12 nodes, planets plain or ringed, tab sides either way, one-word names) at phones of 320, 360, 390
 * and 430 px: every node, planet, finale and every point of the line's path data equals the computer's own × (sx, sy)
 * (with the one shift into the phone's column) within 0.5 px; each node's place on the page is exactly its scaled centre;
 * and the owner's overlap checks pass — no tab over a ring, the line, another tab or the column's edge, no node within
 * 10 px of another, nothing over a banner or a planet. The virtual computer is pinned to the real one at 1440 × 900.
 */
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
function samplePath(seed: number): {orbits: ScaleOrbit[]; finale: boolean; tabs: number[]; words: number[]} {
  const r = seeded(`phone-scale-${seed}`), orbits: ScaleOrbit[] = [], tabs: number[] = [], words: number[] = [];
  const count = 1 + Math.floor(r() * 4);
  let k = 0;
  for (let o = 0; o < count; o++) {
    const n = 1 + Math.floor(r() * 12);
    // (A one-word name on the path: up to 12 letters at 14 px, plus the tab's 47 px of padding, border and check room.)
    orbits.push({id: `o${o}`, planet: r() < .5 ? 1 : 1.48, steps: Array.from({length: n}, () => { tabs.push(47 + Math.ceil((3 + Math.floor(r() * 10)) * 8.6)); return {id: `n${++k}`, side: r() < .5 ? 'left' : 'right'}; })});
    words.push(150 + Math.floor(r() * 70));
  }
  return {orbits, finale: r() < .9, tabs, words};
}

describe('the phone path: the computer\'s path, taller and stretched across (owner amendments 8, 10 and 10b)', () => {
  it('y is the computer\'s × sy (2 × sx ≤ sy ≤ 1); x stretches the computer\'s own order across; the line is the computer\'s flowSegments on those places; every overlap check passes; at 320, 360, 390 and 430 px', () => {
    const faults: string[] = [], spread: string[] = [];
    for (let seed = 0; seed < 200; seed++) {
      const p = samplePath(seed), layout = computerLayout(p.orbits, p.finale);
      for (const vw of [320, 360, 390, 430]) {
        const w = vw - 24, planetR = 44, got = phoneScale({w, seed: `seed-${seed}`, planetR, pillH: 40, ...p}), sy = got.sy;
        const {dy} = phoneTransform(w, sy, layout.bannerMids[0]!, planetR + 5);
        expect(sy, 'down: at least twice across, at most the computer\'s own').toBeGreaterThanOrEqual(syRange(w).min - 1e-9); expect(sy).toBeLessThanOrEqual(1);
        const isNode = (id: string) => !id.startsWith('planet:') && id !== 'finale:end', across = phoneAcross(w, layout.nodes.filter(n => isNode(n.id)).map(n => n.x));
        layout.nodes.forEach((n, i) => {
          const q = got.nodes[i]!;
          expect(q.id).toBe(n.id);
          expect(Math.abs(q.y - (n.y * sy + dy)), `${seed}@${vw} ${n.id} y`).toBeLessThan(.5);
          if (isNode(n.id)) expect(Math.abs(q.x - across.at(n.x)), `${seed}@${vw} ${n.id} x`).toBeLessThan(.5);
        });
        // (The outermost rings 8–14 px from the column's edges, where the path's nodes stand apart at all.)
        const xs = got.nodes.filter(n => isNode(n.id)).map(n => n.x);
        if (Math.max(...xs) - Math.min(...xs) > 1) { expect(Math.min(...xs) - 31).toBeGreaterThanOrEqual(8); expect(Math.min(...xs) - 31).toBeLessThanOrEqual(14); expect(w - Math.max(...xs) - 31).toBeGreaterThanOrEqual(8); expect(w - Math.max(...xs) - 31).toBeLessThanOrEqual(14); }
        // (The line: exactly the computer's flowSegments on these stations, its swing stretched as the nodes are.)
        const fin = got.nodes.find(n => n.id === 'finale:end');
        const again = flowSegments(got.nodes, {w, seed: `seed-${seed}`, swing: COMPUTER_SWING * got.kx, gutter: 8, leadFrom: 0, tailTo: fin ? layout.h * sy + dy - 4 : null});
        expect(got.segments.map(sg => sg.d)).toEqual(again.map(sg => sg.d));
        const steps = p.orbits.flatMap(o => o.steps);
        got.lanes.forEach((lane, i) => { const n = got.nodes.find(q => q.id === steps[i]!.id)!; expect(lane.x).toBe(n.x); expect(lane.y).toBe(n.y); });
        for (const e of got.faults) faults.push(`${seed}@${vw} (sy ${sy.toFixed(2)}): ${e}`);
        let k = 0; for (const e of phoneSpread(w, p.orbits.map(o => o.steps.map(() => got.lanes[k++]!.x)))) spread.push(`${seed}@${vw}: ${e}`);
      }
    }
    const group = (list: string[]) => { const kinds = new Map<string, number>(); for (const f of list) { const key = f.replace(/^\d+@(\d+)( \(sy [\d.]+\))?: /, '$1 ').replace(/n\d+|o\d+|orbit \d+|\d+ %/g, '#'); kinds.set(key, (kinds.get(key) ?? 0) + 1); } return [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([key, n]) => `${n}× ${key}`); };
    expect({overlap: group(faults), spread: group(spread)}, `${faults.length} overlap faults, ${spread.length} spread faults`).toEqual({overlap: [], spread: []});
  }, 240_000);
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
