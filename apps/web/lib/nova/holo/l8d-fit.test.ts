import {describe, expect, it} from 'vitest';
import {HOLO_ROWS, HOLO_UNIT_MIN, holoHeight, holoRowsFit, holoUnit, placeOrbit, placeWords, presetWidgets, swapPartner, wideSides} from '../layout';
import {histogramBars, histogramY} from './geometry';
import {MOTE_COUNT, makeMotes, moteAt, motesAllowed} from './motes';

/**
 * Session AL review fixes (lane L8d; docs/review/session-al/NOVA_HUD_REVIEW.md): the Holo look's own panel heights (B1),
 * a first view of the HUD at 1440 × 900 (B2), the large panel as a wide hero (M2), spatial arrow keys (m9), the
 * histogram's headroom (m8) and motes that a 4-core laptop shows (m3).
 */
describe('Holo sizing (B1, B2)', () => {
  it('a 1440 × 900 stage (549 px) holds four units a side, each 128 px: two medium instruments beside the star', () => {
    expect(holoRowsFit(549)).toBe(4);
    expect(holoUnit(549)).toBeCloseTo(128.3, 1);
    expect(holoHeight('M', holoUnit(549))).toBeCloseTo(268.5, 0);
    expect(holoHeight('L', holoUnit(549))).toBeCloseTo(549, 0);
  });
  it('a 1920 × 1080 stage (730 px) holds five units; an unknown height reads as four units of the minimum', () => {
    expect(holoRowsFit(730)).toBe(5);
    expect(holoUnit(730)).toBeCloseTo(136.4, 1);
    expect(holoRowsFit(null)).toBe(4);
    expect(holoUnit(undefined)).toBe(HOLO_UNIT_MIN);
    // A very tall stage never stretches a unit past its maximum.
    expect(holoUnit(2000, 4)).toBe(168);
  });
  it('the Command preset at 1440: Health and Goals on the left, Habits and Wealth on the right, the rest on the band', () => {
    const placed = placeOrbit(presetWidgets('command'), holoRowsFit(549), HOLO_ROWS);
    expect(placed.filter(p => p.side === 'left').map(p => p.id)).toEqual(['health-hud', 'goals-hud']);
    expect(placed.filter(p => p.side === 'right').map(p => p.id)).toEqual(['habits-hud', 'wealth-hud']);
    expect(placed.filter(p => p.side === 'band').map(p => p.id)).toEqual(['agenda-clock', 'tasks', 'orbit', 'notes', 'focus', 'briefs']);
    // At 1920 the small panels join them beside the star.
    const wide = placeOrbit(presetWidgets('command'), holoRowsFit(730), HOLO_ROWS);
    expect(wide.filter(p => p.side !== 'band').map(p => p.id)).toEqual(['health-hud', 'habits-hud', 'goals-hud', 'wealth-hud', 'notes', 'focus']);
  });
});

describe('the large panel is the hero (M2)', () => {
  it('an L panel takes four units — a column of its own at 1440 — and widens that column', () => {
    const health = placeOrbit(presetWidgets('health'), 4, HOLO_ROWS);
    expect(health.filter(p => p.side === 'left').map(p => [p.id, p.size])).toEqual([['health-hud', 'L']]);
    expect(wideSides(health)).toBe('left');
    const wealth = placeOrbit(presetWidgets('wealth'), 4, HOLO_ROWS);
    expect(wideSides(wealth)).toBe('both');
    expect(wideSides(placeOrbit(presetWidgets('command'), 4, HOLO_ROWS))).toBeUndefined();
  });
});

describe('spatial arrow keys (m9)', () => {
  it('Left/Right trade places with the panel level with it in the other column; the band has no partner', () => {
    const placed = placeOrbit(presetWidgets('command'), 4, HOLO_ROWS);
    expect(swapPartner(placed, 'health-hud')).toBe('habits-hud');
    expect(swapPartner(placed, 'wealth-hud')).toBe('goals-hud');
    expect(swapPartner(placed, 'tasks')).toBeNull();
    expect(swapPartner(placed, 'gone')).toBeNull();
  });
  it('the status line says where a panel is', () => {
    const placed = placeOrbit(presetWidgets('command'), 4, HOLO_ROWS);
    expect(placeWords(placed, 'habits-hud')).toBe('2 of 10, right column');
    expect(placeWords(placed, 'tasks')).toBe('6 of 10, on the outer band');
    expect(placeWords(placed, 'gone')).toBe('');
  });
});

describe('the histogram has headroom (m8)', () => {
  it('neither the tallest bar nor the target line touches the top; without headroom nothing changes', () => {
    const bars = histogramBars([2000, null, 1000], 300, 100, {max: 2200, headroom: 1.12});
    expect(bars[0]!.height).toBeCloseTo(2000 / (2200 * 1.12) * 100, 1);
    expect(bars[1]).toBeNull();
    expect(histogramY(2200, [2000, null, 1000], 100, 2200, 1.12)).toBeCloseTo(100 - 100 / 1.12, 1);
    expect(histogramBars([2000], 100, 100)[0]!.height).toBe(100);
  });
});

describe('motes (m3)', () => {
  it('24 brighter motes; a 4-core device shows them, little memory, Save-Data or a low battery does not', () => {
    expect(makeMotes()).toHaveLength(MOTE_COUNT);
    expect(MOTE_COUNT).toBe(24);
    expect(Math.min(...makeMotes().map(m => m.r))).toBeGreaterThanOrEqual(1);
    expect(Math.max(...makeMotes().map(m => moteAt({...m, y: 0.5}, 0).a))).toBeCloseTo(0.8, 5);
    expect(motesAllowed({deviceMemory: 8})).toBe(true);
    expect(motesAllowed({})).toBe(true);
    expect(motesAllowed({deviceMemory: 4})).toBe(false);
    expect(motesAllowed({saveData: true})).toBe(false);
    expect(motesAllowed({lowBattery: true})).toBe(false);
  });
});
