import {createHash} from 'node:crypto';
import {expect, test} from 'vitest';
import {flowSegments, seeded, sidesFor, type FlowNode, type FlowOptions} from './flow-geometry';

/**
 * Session AG Polish 3 (ADR-032, owner Part 1.6): the computer's Path line stays exactly as it is — the same geometry for the
 * same input. The digest below was taken from `main` `261f32a`'s own `flowSegments` (before this session touched
 * anything) over 200 seeded computer layouts (planets, nodes on both sides, lead-ins and tails); three literal cases pin
 * the exact path data too. A change to the computer's line fails here.
 */
function layout(i: number): {nodes: FlowNode[]; o: FlowOptions} {
  const r = seeded(`desktop-digest|${i}`), w = Math.round(641 + r() * 1280), n = 1 + Math.floor(r() * 14), nodes: FlowNode[] = [];
  let y = 40 + r() * 60;
  for (let k = 0; k < n; k++) {
    if (r() < .22) { const pr = 44 + r() * 20; y += pr + 20; nodes.push({id: `planet:${k}`, x: w * (.55 + r() * .3), y, r: pr, inSide: 'top', outSide: 'bottom', colour: '#23eaff', done: r() < .5}); y += pr + 40 + r() * 60; }
    nodes.push({id: `n${k}`, x: w * (.2 + r() * .6), y, r: r() < .5 ? 36 : 40, ...sidesFor(r() < .5 ? 'left' : 'right'), colour: ['#23eaff', '#9273ff', '#f06dff'][k % 3]!, done: r() < .5});
    y += 80 + r() * 120;
  }
  const o: FlowOptions = {w, seed: `path-${i}`, swing: Math.min(220, w * .22), ...(r() < .8 ? {leadFrom: 0} : {}), ...(r() < .8 ? {tailTo: y + 60} : {})};
  return {nodes, o};
}
const digest = () => {
  const h = createHash('sha256');
  for (let i = 0; i < 200; i++) { const {nodes, o} = layout(i); h.update(JSON.stringify(flowSegments(nodes, o))); }
  return h.digest('hex');
};

test('the computer\'s line: 200 seeded layouts give exactly main\'s output (digest)', () => {
  expect(digest()).toBe('211397b3151b276f84e78f586c6ea95de2c147e8648dcdcc9b6df79f2d266ed1');
});

test('the computer\'s line: three literal cases', () => {
  const lit = [0, 7, 42].map(i => { const {nodes, o} = layout(i); return flowSegments(nodes, o).map(s => s.d); });
  expect(lit).toEqual([
    ["M1050.4 0 C1050.4 46.3 1129.1 37.9 1129.1 84.1", "M1209.1 84.1 C1209.1 118.1 1304.9 118.1 1287.1 138.9 C1267 162.4 543.7 162.4 543.7 200.7", "M471.7 200.7 C471.7 278.3 432.9 286 432.9 355.9"],
    ["M971.6 0 C971.6 55.5 1026.9 45.4 1026.9 100.9", "M1026.9 206 C1026.9 226.6 1069.6 228.6 1082.4 239.3 C1102.9 256.3 1142.3 259.5 1142.3 292.5", "M1070.3 292.5 C1070.3 334.6 799.8 352 766.9 360.5 C733.9 368.9 479.4 386.3 479.4 428.5", "M407.4 428.5 C407.4 496.3 1011.3 527.4 1065 537.9 C1098.8 544.5 1422.8 564.1 1422.8 606.8", "M1422.8 710.6 C1422.8 728.2 1248 736.5 1234 738.9 C1218.4 741.7 1042.5 751 1042.5 770.6", "M1114.5 770.6 C1114.5 821.6 1181.4 814.7 1196.7 852.9 C1219.9 910.7 1206.7 900.2 1206.7 977.4", "M1206.7 1076.3 C1206.7 1105 1045.3 1114.6 1023.6 1122.6 C1002.8 1130.2 932.2 1139.5 932.2 1167", "M1004.2 1167 C1004.2 1260.9 1100 1270.2 1100 1354.7"],
    ["M720.9 45.3 C720.9 73.2 809.3 81.6 830.1 90.3 C861.4 103.4 1020.9 116.2 1020.9 158.3", "M1092.9 158.3 C1092.9 183 779.7 195.7 760 198.1 C735 201.3 294.7 217.3 294.7 248.5", "M366.7 248.5 C366.7 285 469.7 278 470.5 307.4 C471.3 336.6 387.7 329.6 387.7 365.8", "M307.7 365.8 C307.7 418.6 228.6 408.4 227.7 451 C226.5 504 279.1 491.3 279.1 557", "M351.1 557 C351.1 611.5 440.2 622.2 477.8 644.9 C508.7 663.6 645.3 672.4 645.3 717.2"],
  ]);
});
