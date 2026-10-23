import {describe, expect, test} from 'vitest';
import {MIN_TRAVEL, phoneLanes} from './phone-lanes';

describe('the phone path\'s lanes (Session AG Polish 2, ADR-031; owner Part 1 and amendment 5)', () => {
  const opts = (w: number, extra: object = {}) => ({w, node: 62, zigi: 64, seed: 'today', ...extra});
  const tabEnd = (l: {x: number; side: string}, tab: number) => l.side === 'right' ? l.x + 62 * .3 + tab : l.x - 62 * .3 - tab;
  const travels = (xs: number[]) => xs.slice(1).map((x, i) => Math.abs(x - xs[i]!));
  test('nodes use the whole width: neighbours travel 30 % of the stage or more on average, in wide and short sweeps', () => {
    for (const w of [296, 351, 366, 406]) {
      const tabs = [70, 84, 76, 92, 66, 80, 74, 88, 70, 95, 81, 77], lanes = phoneLanes(tabs, opts(w)), t = travels(lanes.map(l => l.x));
      expect(t.reduce((a, b) => a + b, 0) / t.length / w, `${w}: mean travel`).toBeGreaterThanOrEqual(.3);
      expect(Math.min(...t) / w, `${w}: no near-straight drop between neighbours`).toBeGreaterThanOrEqual(MIN_TRAVEL * .8);
      expect(new Set(t.map(x => Math.round(x / 15))).size, `${w}: wide and short`).toBeGreaterThan(2);
      expect(Math.max(...lanes.map(l => l.x)) - Math.min(...lanes.map(l => l.x)), `${w}: edge to edge`).toBeGreaterThan(w * .5);
      lanes.forEach((l, i) => {
        expect(l.wrap, `${w}/${i}: one line`).toBe(false);
        const end = tabEnd(l, tabs[i]!); expect(end, `${w}/${i}: inside`).toBeGreaterThanOrEqual(6); expect(end).toBeLessThanOrEqual(w - 6);
        expect(l.x - 37).toBeGreaterThanOrEqual(6 - .01); expect(l.x + 37).toBeLessThanOrEqual(w - 6 + .01);
      });
    }
  });
  test('each tab hangs toward the free side, and a long name moves its node to an edge so the whole name fits on one line', () => {
    const lanes = phoneLanes([224, 60, 220, 70], opts(296));
    lanes.forEach((l, i) => { expect(l.wrap, `${i}`).toBe(false); expect(tabEnd(l, [224, 60, 220, 70][i]!)).toBeGreaterThanOrEqual(6); expect(tabEnd(l, [224, 60, 220, 70][i]!)).toBeLessThanOrEqual(296 - 6); });
    for (const l of lanes) expect(l.side, 'toward the middle').toBe(l.x <= 148 ? 'right' : 'left');
  });
  // Owner amendment 5 (ADR-031 K16): the lanes keep the smooth line clean around the planets.
  test('an orbit\'s first node stands a short step under and left of its planet, its tab on the left', () => {
    for (const w of [296, 351, 366, 406]) {
      const planet = w - 52, [first] = phoneLanes([80, 80, 80], opts(w, {from: [planet, null, null]}));
      expect(first!.side, `${w}`).toBe('left');
      expect(planet - first!.x, `${w}: left of it`).toBeGreaterThanOrEqual(w * .04);
      expect(planet - first!.x, `${w}: a short step`).toBeLessThanOrEqual(w * .3);
    }
  });
  test('an orbit\'s last node stands a third to a half of the width aside of the next planet, its tab toward it; the node before it at an edge', () => {
    for (const w of [296, 351, 366, 406]) for (const seed of ['today', 'a', 'b', 'c']) {
      const planet = w - 52, lanes = phoneLanes([80, 90, 76, 84, 70], opts(w, {seed, from: [planet, null, null, null, null], to: [null, null, null, planet, null]}));
      const last = lanes[3]!, before = lanes[2]!;
      expect(last.side, `${w}/${seed}: its tab toward the planet`).toBe('right');
      expect(planet - last.x, `${w}/${seed}`).toBeGreaterThanOrEqual(w * .3 - .01); expect(planet - last.x).toBeLessThanOrEqual(w * .56 + .01);
      expect(Math.min(before.x - 43, w - 43 - before.x), `${w}/${seed}: the node before it at an edge`).toBeLessThanOrEqual(w * .06 + 1);
      expect(Math.abs(last.x - before.x), `${w}/${seed}: and the line sweeps on to it`).toBeGreaterThanOrEqual(MIN_TRAVEL * w * .85);
    }
  });
  test('the path\'s last node stands aside of the day\'s finale (at the middle), never straight above it', () => {
    for (const w of [296, 351, 366, 406]) {
      const lanes = phoneLanes([80, 90, 76], opts(w, {to: [null, null, w / 2]})), last = lanes[2]!;
      expect(Math.abs(last.x - w / 2), `${w}`).toBeGreaterThanOrEqual(w * .3 - .01);
      expect(last.side, `${w}: its tab toward the middle`).toBe(last.x < w / 2 ? 'right' : 'left');
    }
  });
  test('a one-node orbit\'s node stands farther under its planet\'s left, so the line loops out to it and back', () => {
    const w = 366, planet = 314, [only] = phoneLanes([80, 80], opts(w, {from: [planet, planet], to: [planet, null]}));
    expect(only!.side).toBe('left');
    expect(planet - only!.x).toBeGreaterThanOrEqual(w * .2);
  });
  test('under its planet, a name too long for one line on the planet\'s left wraps there (the narrowest phones)', () => {
    const [l] = phoneLanes([258, 80], opts(296, {from: [250, null]}));
    expect(l).toMatchObject({side: 'left', wrap: true, zigi: 'above'});
    expect(l!.x - 62 * .3 - l!.maxTab, 'inside the screen').toBeGreaterThanOrEqual(6 - .01);
    expect(l!.x).toBeLessThan(250);
  });
  test('only a name too long even for the leftmost lane wraps (320 px); ZIGi then stands above it — never an ellipsis', () => {
    const [l] = phoneLanes([330], opts(288));
    expect(l).toMatchObject({side: 'right', wrap: true, zigi: 'above'});
    expect(l!.maxTab).toBeGreaterThan(150);
    expect(l!.x + 62 * .3 + l!.maxTab).toBeLessThanOrEqual(288 - 6 + .01);
  });
  test('the same names, width and path give the same lanes (a tick moves nothing; the same on every visit)', () => {
    const tabs = [90, 214, 70, 120, 66];
    expect(phoneLanes(tabs, opts(358))).toEqual(phoneLanes([...tabs], opts(358)));
    expect(phoneLanes(tabs, opts(358, {seed: 'another day'})).map(l => l.x)).not.toEqual(phoneLanes(tabs, opts(358)).map(l => l.x));
  });
});
