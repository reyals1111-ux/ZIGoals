import {describe, expect, it} from 'vitest';
import {SKY_LAG, skyAllowed, skyDriver, skyOffset, skyRange} from './sidebar-sky';

describe('Session AF (L5a, Part 10.1, ADR-028 H28): the sidebar sky parallax', () => {
  it('moves the stars at 45 % of the content’s speed: back by 55 % of every scrolled pixel', () => {
    expect(SKY_LAG).toBe(.55);
    expect(skyOffset(0)).toBe(0);
    expect(skyOffset(300)).toBe(165);
    expect(skyOffset(101)).toBe(55.6);
    // On screen the stars move by −s + 0.55·s = −0.45·s: slower than the content, never ahead of it, never still.
    for (const s of [40, 240, 777]) { const onScreen = -s + skyOffset(s); expect(onScreen).toBeLessThan(0); expect(onScreen).toBeGreaterThan(-s); expect(Math.abs(onScreen / s + .45)).toBeLessThan(.001); }
    expect(skyOffset(-20)).toBe(0); // an overscroll bounce never lifts the sky above its pinned place
  });
  it('the scroll-driven animation runs to the same value at the end of the scroll as the resting offset', () => {
    expect(skyRange(1498, 720)).toBe(428);
    expect(skyRange(1498, 720)).toBe(Math.round(skyOffset(1498 - 720)));
    expect(skyRange(600, 720)).toBe(0); // nothing to scroll: no drift
  });
  it('uses the scroll timeline where the engine has one, else the listener', () => {
    expect(skyDriver(true)).toBe('timeline');
    expect(skyDriver(false)).toBe('listener');
  });
  it('is still under reduced motion, Motion Off and on the tablet header', () => {
    expect(skyAllowed({desktop: true, reduced: false, motionOff: false})).toBe(true);
    expect(skyAllowed({desktop: true, reduced: true, motionOff: false})).toBe(false);
    expect(skyAllowed({desktop: true, reduced: false, motionOff: true})).toBe(false);
    expect(skyAllowed({desktop: false, reduced: false, motionOff: false})).toBe(false);
  });
});
