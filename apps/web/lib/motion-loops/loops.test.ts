import {describe, expect, it} from 'vitest';
import {ambientSkyState, graphMotion, loopLevel, loopRuns} from './loops';
import {skyAllowed} from '../sidebar-sky';
import {motionAllowedBy, novaMotionLevel, openingSkippedNote} from '../nova/orb';
import {skyMode} from '../nova/orb-starfield';

/**
 * Session AK (lane FU): loops drawn by JavaScript follow the three Motion levels. Full runs them; Calm draws one still
 * frame and never loops; Off and the device's reduced motion keep everything still, exactly as before.
 */
describe('the level a JavaScript loop reads', () => {
  it('reads html[data-app-motion] with the device setting; the device always wins', () => {
    expect(loopLevel(undefined, false)).toBe('full'); // before the app's sync has run: as before
    expect(loopLevel('system', false)).toBe('full');
    expect(loopLevel('calm', false)).toBe('calm');
    expect(loopLevel('off', false)).toBe('off');
    expect(loopLevel('calm', true)).toBe('off');
    expect(loopLevel('system', true)).toBe('off');
    expect(loopLevel('sparkly-new-level', false)).toBe('calm'); // unknown: less motion than Full, never more
  });
  it('loops run only at Full', () => {
    expect(loopRuns('full')).toBe(true);
    expect(loopRuns('calm')).toBe(false);
    expect(loopRuns('off')).toBe(false);
  });
});

describe('the sidebar sky', () => {
  it('drifts at Full only; Calm shows the pinned sky, as Off does', () => {
    expect(skyAllowed({desktop: true, reduced: false, motionOff: false, calm: false})).toBe(true);
    expect(skyAllowed({desktop: true, reduced: false, motionOff: false, calm: true})).toBe(false);
    expect(skyAllowed({desktop: true, reduced: false, motionOff: true, calm: false})).toBe(false);
    expect(skyAllowed({desktop: true, reduced: false, motionOff: false})).toBe(true); // older callers: unchanged
  });
});

describe('the Checklist ambient sky', () => {
  it('Off and reduced motion: off (nothing drawn), as before', () => {
    for (const paused of [false, true]) for (const hidden of [false, true]) expect(ambientSkyState({level: loopLevel('off', false), paused, hidden})).toBe('off');
    expect(ambientSkyState({level: loopLevel('system', true), paused: false, hidden: false})).toBe('off');
  });
  it('Calm: still — no sparkles, no shooting stars, whatever else is going on', () => {
    for (const paused of [false, true]) for (const hidden of [false, true]) expect(ambientSkyState({level: 'calm', paused, hidden})).toBe('still');
  });
  it('Full: runs, and rests while paused or hidden', () => {
    expect(ambientSkyState({level: 'full', paused: false, hidden: false})).toBe('running');
    expect(ambientSkyState({level: 'full', paused: true, hidden: false})).toBe('paused');
    expect(ambientSkyState({level: 'full', paused: false, hidden: true})).toBe('paused');
  });
});

describe('NOVA', () => {
  it('the starfield drifts and the opening plays at Full only; Calm draws one still frame', () => {
    expect(novaMotionLevel({reducedMotion: false, appMotion: 'calm'})).toBe('calm');
    expect(motionAllowedBy({reducedMotion: false, appMotion: 'calm'})).toBe(false);
    expect(motionAllowedBy({reducedMotion: false, appMotion: 'system'})).toBe(true);
    expect(motionAllowedBy({reducedMotion: true, appMotion: 'calm'})).toBe(false);
    const hints = {hardwareConcurrency: 8, deviceMemory: 8};
    expect(skyMode({motion: motionAllowedBy({reducedMotion: false, appMotion: 'calm'}), hints})).toBe('still');
    expect(skyMode({motion: motionAllowedBy({reducedMotion: false, appMotion: 'off'}), hints})).toBe('still');
    expect(skyMode({motion: motionAllowedBy({reducedMotion: false, appMotion: undefined}), hints})).toBe('running');
  });
  it('a replay asked for under Calm says Calm, not Off', () => {
    expect(openingSkippedNote('calm')).toBe('Motion is calm on this device, so the opening does not play. Everything is already in place.');
    expect(openingSkippedNote('off')).toBe('Motion is off on this device, so the opening does not play. Everything is already in place.');
  });
});

describe('the notes graph', () => {
  it('turns at Full; Calm shows the star system still; Off and reduced motion open the list first', () => {
    expect(graphMotion('full')).toEqual({turn: true, listFirst: false});
    expect(graphMotion('calm')).toEqual({turn: false, listFirst: false});
    expect(graphMotion('off')).toEqual({turn: false, listFirst: true});
    expect(graphMotion(loopLevel('calm', true))).toEqual({turn: false, listFirst: true});
  });
});
