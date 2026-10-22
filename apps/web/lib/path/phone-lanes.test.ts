import {describe, expect, test} from 'vitest';
import {MIN_TRAVEL, phoneLanes} from './phone-lanes';

describe('the phone path\'s lanes (Session AG Polish 2, ADR-031; owner Part 1)', () => {
  const opts = (w: number, extra: object = {}) => ({w, node: 62, zigi: 64, seed: 'today', ...extra});
  const tabEnd = (l: {x: number; side: string}, tab: number) => l.side === 'right' ? l.x + 62 * .3 + tab : l.x - 62 * .3 - tab;
  const travels = (xs: number[]) => xs.slice(1).map((x, i) => Math.abs(x - xs[i]!));
  test('nodes use the whole width: neighbours travel a quarter of the stage or more on average, in wide and short sweeps', () => {
    for (const w of [296, 351, 366, 406]) {
      const tabs = [70, 84, 76, 92, 66, 80, 74, 88, 70, 95, 81, 77], lanes = phoneLanes(tabs, opts(w)), t = travels(lanes.map(l => l.x));
      expect(t.reduce((a, b) => a + b, 0) / t.length / w, `${w}: mean travel`).toBeGreaterThanOrEqual(.25);
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
  test('an orbit\'s first node travels from its planet (at the banner\'s right) back across the screen', () => {
    const [first] = phoneLanes([80, 80], opts(366, {from: [300, null]}));
    expect(300 - first!.x, 'away from the planet').toBeGreaterThanOrEqual(MIN_TRAVEL * 366 * .85);
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
