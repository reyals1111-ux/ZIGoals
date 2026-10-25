import {describe, expect, it} from 'vitest';
import {seeded} from './flow-geometry';
import {phoneWave, WAVE, type PhoneWave, type WaveInput} from './phone-wave';
import {waveRules, waveSpread, type WaveDrawn} from './wave-rules.test-helper';

/**
 * Session AG Polish 3 (ADR-032 L21; owner amendment 9, "line first, nodes on the line"): over 200 seeded paths (1–4
 * orbits of 1–12 nodes, names 60–220 px wide) at 320, 360, 390 and 430 px phones, every layout keeps the owner's rules
 * (lib/path/wave-rules.test-helper.ts): apexes alternating within their bands, each river across ≥ 70 % of the width,
 * no turn under 40 px × width/390, always downward, nodes on the river ≥ a node + 46 px apart down the page and 12 px
 * clear of every other ring, spaces spread ≥ 60 px in orbits of four or more, tabs clear, planets straight down; no
 * 20 % band holds more than 45 % of the nodes; the same seed gives the same layout. Amendment 8's stacked layout,
 * reference 06's left stack and a strict zig-zag fail the same rules.
 */
const planetROf = (w: number) => w + 24 < 360 ? 42 : Math.min(50, Math.max(44, .13 * w));
function sample(seed: number, vw: number): WaveInput {
  const r = seeded(`wave-sample-${seed}`), w = vw - 24, orbits: WaveInput['orbits'] = [], tabs: number[] = [], words: number[] = [];
  const count = 1 + Math.floor(r() * 4);
  let k = 0;
  for (let o = 0; o < count; o++) {
    const n = 1 + Math.floor(r() * 12);
    orbits.push({id: `o${o}`, planet: true, steps: Array.from({length: n}, () => { tabs.push(60 + Math.floor(r() * 160)); return {id: `n${++k}`}; })});
    words.push(Math.min(214, w * .6) - Math.floor(r() * 40));
  }
  return {w, seed: `path-${seed}`, orbits, finale: true, planetR: planetROf(w), tabs, words};
}
export function drawnOf(input: WaveInput, wave: PhoneWave, vw: number): WaveDrawn {
  const bh = 2 * input.planetR + 10, ids = input.orbits.flatMap((o, oi) => o.steps.map(s => ({id: s.id, orbit: oi})));
  return {w: input.w, vw, rivers: wave.rivers,
    nodes: wave.lanes.map((l, i) => ({id: ids[i]!.id, x: l.x, y: l.y, r: WAVE.r, orbit: ids[i]!.orbit})),
    planets: wave.stations.filter(s => s.id.startsWith('planet:')).map(s => ({x: s.x, y: s.y, r: s.r})),
    tabs: wave.lanes.map((l, i) => {
      const width = l.wrap ? l.maxTab : input.tabs[i]!, top = l.y + l.tabDy, bottom = top + WAVE.tabLine + (l.lines - 1) * WAVE.tabLineStep;
      return {id: ids[i]!.id, top, bottom, ...(l.side === 'right' ? {left: l.x + WAVE.tabReach, right: l.x + WAVE.tabReach + width} : {left: l.x - WAVE.tabReach - width, right: l.x - WAVE.tabReach})};
    }),
    banners: wave.banners.map((b, i) => ({left: 0, right: input.words[i]!, top: b.top + bh / 2 - 20, bottom: b.top + bh / 2 + 20}))};
}

describe('the phone river: line first, nodes on the line (owner amendment 9)', () => {
  it('keeps the owner\'s rules over 200 seeded paths at 320, 360, 390 and 430 px', () => {
    const broken: string[] = [], drawn: WaveDrawn[] = [];
    for (let seed = 0; seed < 200; seed++) for (const vw of [320, 360, 390, 430]) {
      const input = sample(seed, vw), wave = phoneWave(input), d = drawnOf(input, wave, vw);
      drawn.push(d);
      for (const e of waveRules(d)) broken.push(`${seed}@${vw}: ${e}`);
    }
    const kinds = new Map<string, number>(); for (const b of broken) { const key = b.replace(/^\d+@(\d+): /, '$1 ').replace(/n\d+|o\d+|orbit \d+|[\d.]+ px|[\d.]+ %/g, '#'); kinds.set(key, (kinds.get(key) ?? 0) + 1); }
    expect([...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`), `${broken.length} broken`).toEqual([]);
    expect(waveSpread(drawn)).toEqual([]);
  }, 240_000);
  it('is the same for the same seed, and a tick (the same shape) moves nothing', () => {
    const input = sample(7, 390);
    expect(JSON.stringify(phoneWave(input))).toBe(JSON.stringify(phoneWave(structuredClone(input))));
    expect(JSON.stringify(phoneWave({...input, seed: 'another'}))).not.toBe(JSON.stringify(phoneWave(input)));
  });
  it('amendment 8\'s stacked layout, reference 06\'s left stack and a strict zig-zag fail the rules', () => {
    const w = 366, vw = 390, planets = [{x: 316, y: 52, r: 46}], banners = [{left: 0, right: 214, top: 32, bottom: 72}];
    const node = (id: string, x: number, y: number) => ({id, x, y, r: 31, orbit: 0});
    // Amendment 8: the computer × 0.47 — nodes 54 px apart in the middle third, its line within the centre.
    const stacked: WaveDrawn = {w, vw, planets, banners, tabs: [], rivers: ['M316 98 C316 140 230 150 180 170 C140 186 170 210 200 224 C230 238 230 262 180 278 C150 290 160 320 200 332'],
      nodes: [node('a', 180, 170), node('b', 200, 224), node('c', 180, 278), node('d', 200, 332)]};
    // Reference 06: four nodes down the left side, a near-vertical wiggle, the right half empty.
    const left: WaveDrawn = {w, vw, planets, banners, tabs: [], rivers: ['M316 98 C316 140 60 140 60 200 C60 260 70 280 60 320 C50 360 60 400 60 440 C60 480 60 520 60 560'],
      nodes: [node('a', 60, 200), node('b', 60, 320), node('c', 60, 440), node('d', 60, 560)]};
    // A strict zig-zag: left, right, left, right, the same space each time, straight down through every node.
    const zig: WaveDrawn = {w, vw, planets, banners, tabs: [], rivers: ['M316 98 C316 150 73 150 73 200 C73 265 275 265 275 330 C275 395 73 395 73 460 C73 525 275 525 275 590'],
      nodes: [node('a', 73, 200), node('b', 275, 330), node('c', 73, 460), node('d', 275, 590)]};
    for (const [name, d] of [['amendment 8', stacked], ['reference 06', left], ['zig-zag', zig]] as const) expect(waveRules(d), name).not.toEqual([]);
    expect(waveRules(stacked).join(' ')).toMatch(/apart, under 108|spans/);
    expect(waveRules(left).join(' ')).toMatch(/no flat apex|spans/);
    expect(waveSpread([left]), 'reference 06: every node in one band').not.toEqual([]);
    expect(waveRules(zig).join(' ')).toMatch(/no flat apex|spread under 60/);
  });
});
