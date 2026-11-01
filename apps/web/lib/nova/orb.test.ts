import {describe, expect, it} from 'vitest';
import {OPENING, ORB_STATES, ORB_STATE_LABEL, greetingFor, isOrbState, motionAllowedBy, settleDelay, typedLength} from './orb';
import {DRIFT, MAX_STARS, driftX, lowEnd, makeStars, nebulaClouds, seeded, skyMode, starCount, twinkleAt} from './orb-starfield';

describe('the orb', () => {
  it('has four states, each also said in words', () => {
    expect(ORB_STATES).toEqual(['idle', 'listening', 'thinking', 'speaking']);
    for (const s of ORB_STATES) expect(ORB_STATE_LABEL[s].length).toBeGreaterThan(3);
    expect(isOrbState('thinking')).toBe(true); expect(isOrbState('dancing')).toBe(false);
  });
  it('moves only when the device and the app allow it', () => {
    expect(motionAllowedBy({reducedMotion: false, appMotion: undefined})).toBe(true);
    expect(motionAllowedBy({reducedMotion: false, appMotion: 'system'})).toBe(true);
    expect(motionAllowedBy({reducedMotion: true, appMotion: 'system'})).toBe(false);
    expect(motionAllowedBy({reducedMotion: false, appMotion: 'off'})).toBe(false);
  });
});

describe('the opening sequence', () => {
  it('lasts about two seconds; widgets settle one by one inside it, however many there are', () => {
    expect(OPENING.end).toBeGreaterThanOrEqual(1800); expect(OPENING.end).toBeLessThanOrEqual(2400);
    for (const count of [1, 4, 8, 24]) {
      const delays = Array.from({length: count}, (_, i) => settleDelay(i, count));
      expect(delays[0]).toBe(OPENING.widgets);
      for (let i = 1; i < count; i++) expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
      expect(delays.at(-1)!).toBeLessThanOrEqual(OPENING.end - 420);
    }
  });
  it('the greeting types in, and is whole once the sequence ends (or is skipped)', () => {
    const text = 'Good evening. NOVA is online.';
    expect(typedLength(text, 0)).toBe(0);
    expect(typedLength(text, OPENING.greeting + OPENING.typeStep * 5)).toBe(5);
    expect(typedLength(text, OPENING.end)).toBe(text.length);
    expect(typedLength(text, 1e9)).toBe(text.length);
  });
  it('greets by the hour in NOVA’s name, calmly', () => {
    expect(greetingFor(8, 'NOVA')).toBe('Good morning. NOVA is online.');
    expect(greetingFor(14, 'Vega')).toBe('Good afternoon. Vega is online.');
    expect(greetingFor(20, 'NOVA')).toBe('Good evening. NOVA is online.');
    expect(greetingFor(2, 'NOVA')).toBe('Still up? NOVA is online.');
    for (let h = 0; h < 24; h++) expect(greetingFor(h, 'NOVA')).not.toContain('!');
  });
});

describe('the starfield', () => {
  it('is the same sky every visit (seeded), bounded in size', () => {
    expect(makeStars(50)).toEqual(makeStars(50));
    expect(makeStars(10_000)).toHaveLength(MAX_STARS);
    expect(starCount(390, 844)).toBeGreaterThanOrEqual(60); expect(starCount(3840, 2160)).toBe(MAX_STARS); expect(starCount(0, 0)).toBe(60);
    const r = seeded(1); for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('drifts very slowly and wraps; twinkles within 0–1', () => {
    const star = makeStars(1)[0]!;
    expect(Math.abs(driftX(star, 1) - star.x)).toBeLessThanOrEqual(DRIFT[2] + 1e-9);
    expect(driftX({x: 0.9999, layer: 2}, 600)).toBeLessThan(1);
    for (let t = 0; t < 60; t += 7) { const a = twinkleAt(star, t); expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); }
    expect(nebulaClouds()).toHaveLength(14);
  });
  it('does not run on a low-end device, with Save-Data or a low battery; a still frame under reduced motion or Motion Off (and, since P3 ND-17, on a low-end device)', () => {
    expect(lowEnd({hardwareConcurrency: 4})).toBe(true); expect(lowEnd({deviceMemory: 4})).toBe(true); expect(lowEnd({saveData: true})).toBe(true); expect(lowEnd({lowBattery: true})).toBe(true);
    expect(lowEnd({hardwareConcurrency: 8, deviceMemory: 8})).toBe(false); expect(lowEnd({})).toBe(false);
    expect(skyMode({motion: true, hints: {hardwareConcurrency: 8}})).toBe('running');
    expect(skyMode({motion: false, hints: {hardwareConcurrency: 8}})).toBe('still');
    // Session AK P3 (ND-17), a deliberate change: a low-end device or a low battery paints ONE still frame (never a running
    // sky) instead of the nearly empty CSS sky; only Save-Data draws nothing.
    expect(skyMode({motion: true, hints: {hardwareConcurrency: 2}})).toBe('still');
    expect(skyMode({motion: true, hints: {hardwareConcurrency: 8, lowBattery: true}})).toBe('still');
    expect(skyMode({motion: true, hints: {hardwareConcurrency: 8, saveData: true}})).toBe('none');
    for (const hints of [{hardwareConcurrency: 2}, {deviceMemory: 2}, {lowBattery: true}, {saveData: true}]) expect(skyMode({motion: true, hints})).not.toBe('running');
  });
});
