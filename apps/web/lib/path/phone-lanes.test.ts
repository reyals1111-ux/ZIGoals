import {describe, expect, test} from 'vitest';
import {phoneLanes} from './phone-lanes';

describe('the phone path\'s lanes (Session AG Polish, ADR-030, owner Part 2)', () => {
  const opts = (w: number) => ({w, node: 62, zigi: 64});
  const tabEnd = (l: {x: number; side: string}, tab: number) => l.side === 'right' ? l.x + 62 * .3 + tab : l.x - 62 * .3 - tab;
  test('short names keep a rhythm across lanes, each tab on one line inside the screen, ZIGi\'s room on the other side', () => {
    for (const w of [288, 343, 358, 398]) {
      const tabs = [70, 84, 76, 92, 66, 80, 74, 88], lanes = phoneLanes(tabs, opts(w));
      expect(new Set(lanes.map(l => Math.round(l.x))).size, `${w}: more than one lane`).toBeGreaterThan(1);
      lanes.forEach((l, i) => {
        expect(l.wrap, `${w}/${i}: one line`).toBe(false);
        const end = tabEnd(l, tabs[i]!); expect(end, `${w}/${i}: inside`).toBeGreaterThanOrEqual(6); expect(end).toBeLessThanOrEqual(w - 6);
        expect(l.x - 37).toBeGreaterThanOrEqual(6); expect(l.x + 37).toBeLessThanOrEqual(w - 6);
        expect(l.zigi, `${w}/${i}: ZIGi beside`).toBe('side');
      });
    }
  });
  test('a long name moves its node toward the left so its tab fits on one line to its right', () => {
    const [l] = phoneLanes([0, 0, 0, 0].map(() => 214).slice(0, 1), opts(358));
    expect(l!.side).toBe('right'); expect(l!.wrap).toBe(false);
    expect(l!.x).toBeLessThan(358 / 2);
    expect(tabEnd(l!, 214)).toBeLessThanOrEqual(358 - 6);
  });
  test('where even the leftmost lane is too narrow (320 px), the tab wraps with the room it has; ZIGi stands above it', () => {
    const [l] = phoneLanes([330], opts(288));
    expect(l).toMatchObject({side: 'right', wrap: true, zigi: 'above'});
    expect(l!.maxTab).toBeGreaterThan(150);
    expect(l!.x + 62 * .3 + l!.maxTab).toBeLessThanOrEqual(288 - 6 + .01);
  });
  test('the same names and width give the same lanes (a tick moves nothing)', () => {
    const tabs = [90, 214, 70, 120, 66];
    expect(phoneLanes(tabs, opts(358))).toEqual(phoneLanes([...tabs], opts(358)));
  });
});
