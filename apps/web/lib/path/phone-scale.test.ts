import {describe, expect, it} from 'vitest';
import {flowSegments, seeded} from './flow-geometry';
import {COMPUTER, COMPUTER_SWING, PHONE, computerLayout, computerLine, phoneAcross, phoneScale, phoneSpread, phoneTransform, syRange, type ScaleOrbit} from './phone-scale';
import {lineFaults, phoneLine, piecesOf, stretchFaults} from './phone-line';

/**
 * Session AG Polish 3 (ADR-032 L20, L22, L24; owner amendments 8, 10, 10b and 10c): the phone's path is the computer's
 * layout × (kx, sy) — sy the least value in [2 × sx, 1] at which every check passes; across, every orbit of three nodes
 * or more spans 20–80 % of the width in the computer's order, smaller orbits keep the computer's place — with room added
 * locally only where even sy = 1 leaves a tab no clear spot. Over 200 seeded paths (1–4 orbits of 1–12 nodes, planets
 * plain or ringed, tab sides either way, one-word names of 3–12 letters) at phones of 320, 360, 390 and 430 px:
 * - every station stands exactly where that says; planets at the right;
 * - the line (lib/path/phone-line.ts) is never clamped and passes the owner's line checks: at most 2 cubics a stretch,
 *   joins within 1° curving the same way, at most 2 curvature sign changes, inflections 60 px apart, no bump under
 *   14 px, nothing within 2° of upright for more than 24 px except into or out of a planet;
 * - every tab touches its own ring (4 px at most from it), and the overlap checks pass — no tab over a ring, the line,
 *   another tab or the column's edge, no node within 10 px of another, nothing over a banner or a planet;
 * - the spread checks pass in every orbit of four nodes or more.
 * The checks bite: amendment 10b's line on the same places (the computer's, clamped to the gutter) fails them. The virtual
 * computer is pinned to the real one at 1440 × 900.
 */
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

describe('the phone path: the computer\'s layout across the whole width, taller, with a calm line (owner amendments 8, 10, 10b, 10c)', () => {
  it('stations where the computer\'s layout × (kx, sy) puts them (plus any local room); a line never clamped that passes the owner\'s line checks; tabs touching their node; every overlap and spread check passes; at 320, 360, 390 and 430 px', () => {
    const faults: string[] = [], spread: string[] = [];
    for (let seed = 0; seed < 200; seed++) {
      const p = samplePath(seed), layout = computerLayout(p.orbits, p.finale), steps = p.orbits.flatMap(o => o.steps);
      for (const vw of [320, 360, 390, 430]) {
        const w = vw - 24, planetR = 44, got = phoneScale({w, seed: `seed-${seed}`, planetR, pillH: 40, ...p}), sy = got.sy, at = `${seed}@${vw}`;
        const {dy} = phoneTransform(w, sy, layout.bannerMids[0]!, planetR + 5);
        expect(sy, 'down: at least twice across, at most the computer\'s own').toBeGreaterThanOrEqual(syRange(w).min - 1e-9); expect(sy).toBeLessThanOrEqual(1);
        if (Object.keys(got.room).length) expect(sy, `${at}: room is added only where even sy = 1 is not enough`).toBe(1);
        // Down: y × sy, plus the room added above each station, carried to everything after it.
        // Across: each orbit of three nodes or more onto 20–80 % of the width; orbits of one or two by the path's own scale.
        const orbitXs = p.orbits.map(o => o.steps.map(st => layout.nodes.find(n => n.id === st.id)!.x)), across = phoneAcross(w, orbitXs);
        let carried = 0;
        layout.nodes.forEach((n, i) => {
          const q = got.nodes[i]!; carried += got.room[n.id] ?? 0;
          expect(q.id).toBe(n.id);
          expect(Math.abs(q.y - (n.y * sy + dy + carried)), `${at} ${n.id} y`).toBeLessThan(.5);
          if (n.id.startsWith('planet:')) expect(q.x, `${at} ${n.id}: at the right`).toBe(w - 4 - planetR);
          else if (n.id === 'finale:end') expect(q.x).toBe(w / 2);
          else { const o = p.orbits.findIndex(or => or.steps.some(st => st.id === n.id)); expect(Math.abs(q.x - across.at(o, n.x)), `${at} ${n.id} x`).toBeLessThan(1e-6); }
        });
        p.orbits.forEach((o, oi) => {
          const xs = o.steps.map(st => got.nodes.find(n => n.id === st.id)!.x);
          if (xs.length >= 3) { expect(Math.min(...xs), `${at} orbit ${oi}: from 20 %`).toBeCloseTo(.2 * w, 6); expect(Math.max(...xs), `${at} orbit ${oi}: to 80 %`).toBeCloseTo(.8 * w, 6); }
          else o.steps.forEach(st => expect(got.nodes.find(n => n.id === st.id)!.x).toBeCloseTo(w / 2 + (layout.nodes.find(n => n.id === st.id)!.x - COMPUTER.w / 2) * got.kx, 6));
        });
        // The line: the phone's own, the same on every visit, never clamped (every control point inside the gutter).
        const fin = got.nodes.find(n => n.id === 'finale:end');
        const again = phoneLine(got.nodes, {w, seed: `seed-${seed}`, swing: COMPUTER_SWING * got.kx, gutter: PHONE.gutter, leadFrom: 0, tailTo: fin ? layout.h * sy + dy + Object.values(got.room).reduce((x, y) => x + y, 0) - 4 : null, avoid: got.pills});
        expect(got.segments.map(sg => sg.d), `${at}: the same line`).toEqual(again.map(sg => sg.d));
        // (A clamped point sits exactly on the gutter's edge; the phone's line keeps 2 px inside it, or is mirrored.)
        for (const sg of got.segments) for (const c of piecesOf(sg.d)) for (const q of c) if (q.x < PHONE.gutter + .05 || q.x > w - PHONE.gutter - .05) faults.push(`${at}: ${sg.id} clamped or outside (${q.x})`);
        // (Planets: the line leaves and enters upright.)
        for (const sg of got.segments) {
          const c = piecesOf(sg.d);
          if (sg.from?.startsWith('planet:')) expect(c[0]![1].x, `${at} ${sg.id}: upright out of its planet`).toBeCloseTo(c[0]![0].x, 6);
          if (sg.to?.startsWith('planet:')) expect(c.at(-1)![2].x, `${at} ${sg.id}: upright into its planet`).toBeCloseTo(c.at(-1)![3].x, 6);
        }
        // Tabs touch their own ring.
        got.lanes.forEach((lane, i) => {
          const tab = p.tabs[i]!, t = lane.y + lane.tabDy, reach = PHONE.tabReach + lane.tabOut;
          const box = lane.side === 'below' ? {l: lane.x + lane.tabOut - tab / 2, r: lane.x + lane.tabOut + tab / 2} : lane.side === 'right' ? {l: lane.x + reach, r: lane.x + reach + tab} : {l: lane.x - reach - tab, r: lane.x - reach};
          const gap = Math.hypot(Math.max(box.l - lane.x, 0, lane.x - box.r), Math.max(t - lane.y, 0, lane.y - t - PHONE.tabLine)) - PHONE.dot / 2;
          if (gap > PHONE.hug + 1e-9) faults.push(`${at}: ${steps[i]!.id}'s tab ${gap.toFixed(1)} px from its ring`);
        });
        for (const e of got.faults) faults.push(`${at} (sy ${sy.toFixed(2)}): ${e}`);
        for (const e of lineFaults(got.segments, w, PHONE.gutter)) faults.push(`${at}: ${e}`);
        let k = 0; for (const e of phoneSpread(w, p.orbits.map(o => o.steps.map(() => got.lanes[k++]!.x)))) spread.push(`${at}: ${e}`);
      }
    }
    const group = (list: string[]) => { const kinds = new Map<string, number>(); for (const f of list) { const key = f.replace(/^\d+@(\d+)( \(sy [\d.]+\))?: /, '$1 ').replace(/n\d+|o\d+|orbit \d+|planet:\w+|finale:end|-?\d+(\.\d+)?/g, '#'); kinds.set(key, (kinds.get(key) ?? 0) + 1); } return [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([key, n]) => `${n}× ${key}`); };
    expect({overlap: group(faults), spread: group(spread)}, `${faults.length} faults, ${spread.length} spread faults`).toEqual({overlap: [], spread: []});
  }, 600_000);

  it('the line checks bite: amendment 10b\'s line on the 13-item path (the computer\'s, clamped to the gutter) runs along the edge, kinked, and trembles out of its planets', () => {
    const sides = ['left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left'] as const;
    let k = 0;
    const orbits: ScaleOrbit[] = [5, 3, 3, 2].map((n, o) => ({id: ['morning', 'afternoon', 'evening', 'anytime'][o]!, planet: [1, 189.7 / 128, 1, 188.2 / 128][o]!, steps: Array.from({length: n}, () => ({id: `ck_river-${++k}`, side: sides[k - 1]!}))}));
    const layout = computerLayout(orbits, true), w = 366, sy = .93, {dy} = phoneTransform(w, sy, layout.bannerMids[0]!, 49);
    // (Amendment 10b: one stretch across the path, the outermost rings 11 px from the edges; the computer's line, clamped.)
    const xs = layout.nodes.filter(n => n.id.startsWith('ck_')).map(n => n.x), lo = Math.min(...xs), hi = Math.max(...xs), kx = (w - 2 * 42) / (hi - lo);
    const nodes = layout.nodes.map(n => ({...n, x: n.id.startsWith('planet:') ? w - 48 : n.id === 'finale:end' ? w / 2 : w / 2 + (n.x - (lo + hi) / 2) * kx, y: n.y * sy + dy, r: n.id.startsWith('planet:') ? 44 : n.id === 'finale:end' ? 34.1 : 31}));
    const old = flowSegments(nodes, {w, seed: 'checklist-today', swing: COMPUTER_SWING * kx, gutter: 8, leadFrom: 0, tailTo: null});
    const bad = lineFaults(old, w, 8), edge = old.find(sg => sg.id === 'ck_river-3>ck_river-4')!;
    // (Owner pointer 1: Read → Meditate runs down the right edge — its loop clamped onto the gutter, kinked at the clamp.)
    expect(piecesOf(edge.d).flat().some(q => Math.abs(q.x - (w - 8)) < .05), 'clamped onto the gutter').toBe(true);
    expect(bad.filter(e => e.startsWith('ck_river-3>ck_river-4')).join(), 'its join kinked by the clamp').toMatch(/join turns/);
    // (Pointers 2 and 3: planet → Walk, planet → Journal tremble — three curvature sign changes, bumps of a pixel.)
    for (const id of ['planet:afternoon>ck_river-6', 'planet:evening>ck_river-9']) expect(bad.filter(e => e.startsWith(id)).join(), id).toMatch(/3 curvature sign changes.*bump of/);
    // And the phone's own line on the same path, at 320–430 px, passes every check.
    for (const vw of [320, 360, 390, 430]) expect(lineFaults(phoneScale({w: vw - 24, seed: 'checklist-today', planetR: 44, pillH: 40, finale: true, orbits, tabs: orbits.flatMap(o => o.steps).map(() => 116), words: [190, 214, 190, 200]}).segments, vw - 24, 8)).toEqual([]);
  });

  it('each line check catches its own fault', () => {
    const one = (d: string, from: string | null = 'a', to: string | null = 'b') => stretchFaults({id: 's', from, to, d}, 366, 8);
    expect(one('M100 0 C100 60 250 40 250 100'), 'one calm swing').toEqual([]);
    expect(one('M100 0 C100 30 250 30 250 50 C250 70 100 70 100 100 C100 130 250 130 250 150').join(), 'three cubics').toMatch(/3 cubic pieces/);
    expect(one('M358 0 C358 40 358 60 358 100 C358 140 200 160 200 200').join(), 'a straight run down the edge').toMatch(/within 2° of upright/);
    expect(one('M358 0 C358 40 358 60 358 100', 'planet:x', 'b'), 'straight out of a planet is allowed').toEqual([]);
    expect(one('M100 0 C100 50 130 50 130 100 C140 150 100 150 100 200').join(), 'a kinked join').toMatch(/join turns/);
    expect(one('M100 0 C100 20 120 20 120 40 C120 60 104 60 104 80 C104 100 160 120 160 200').join(), 'wiggles').toMatch(/sign changes|inflections|bump|pieces/);
    expect(one('M2 0 C2 60 150 40 150 100').join(), 'outside the column').toMatch(/leaves the column/);
  });

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
