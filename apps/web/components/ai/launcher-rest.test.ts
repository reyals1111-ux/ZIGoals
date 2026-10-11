import {describe, expect, test} from 'vitest';
import {restLift, type Box} from './launcher-rest';

const launcher: Box = {left: 322, top: 674, right: 378, bottom: 776};
const box = (top: number, bottom: number, left = 16, right = 374): Box => ({left, top, right, bottom});

describe('restLift (ADR-017 S81): the phone launcher rests clear of first-screen controls', () => {
  test('clear where it is: no lift', () => {
    expect(restLift(launcher, [box(100, 140), box(600, 660)])).toBe(0);
    expect(restLift(launcher, [box(780, 820)])).toBe(0);
  });
  test('a control under it: the smallest lift that clears it by the 4 px margin, in steps of 8', () => {
    // "Send feedback" 725–769 under the launcher's lower half: the launcher's bottom must end 4 px above 725.
    expect(restLift(launcher, [box(725, 769)])).toBe(56);
    expect(restLift(launcher, [box(696, 740, 294, 361)])).toBe(88);
  });
  test('several controls stacked: the first free band above them', () => {
    expect(restLift(launcher, [box(653, 705), box(715, 761)])).toBe(128);
  });
  test('a control beside it, not under it, does not count', () => {
    expect(restLift(launcher, [box(700, 760, 16, 300)])).toBe(0);
  });
  test('nothing free within reach: it stays put (reachable first), and minTop bounds the search', () => {
    expect(restLift(launcher, [box(60, 790)])).toBe(0);
    expect(restLift(launcher, [box(500, 790)], {minTop: 650})).toBe(0);
    expect(restLift(launcher, [box(500, 790)], {minTop: 72})).toBe(280);
  });
});
