import {describe, expect, it} from 'vitest';
import {currentMotionLevel, effectiveMotion, entrancesAllowed, MOTION_CHOICES, MOTION_KEY, MOTION_LABELS, movementAllowed, parseMotionChoice, readMotionChoice} from './level';

const win = (stored: string | null, reduced = false, throws = false) => ({
  localStorage: {getItem: (key: string) => { if (throws) throw new Error('denied'); return key === MOTION_KEY ? stored : null; }},
  matchMedia: (q: string) => ({matches: reduced && q.includes('reduce')}),
});

describe('the Motion setting (Full / Calm / Off)', () => {
  it('keeps the stored words older builds write and read: "system" is Full, "off" is Off; "calm" is new', () => {
    expect(MOTION_CHOICES).toEqual(['system', 'calm', 'off']);
    expect(MOTION_KEY).toBe('zigoals:motion:v1');
    expect(parseMotionChoice('system')).toBe('system');
    expect(parseMotionChoice('off')).toBe('off');
    expect(parseMotionChoice('calm')).toBe('calm');
    // What an older build does with the new value (its reader is `getItem(key) !== 'off'`): its Full; nothing breaks.
    const olderBuildReads = (stored: string | null) => stored !== 'off';
    expect(olderBuildReads('calm')).toBe(true);
  });
  it('maps missing, empty and "full" to Full; unknown words to Calm (never more motion than Full); non-strings to Calm', () => {
    for (const raw of [null, undefined, '', '  ', 'full', 'FULL', ' System ']) expect(parseMotionChoice(raw), String(raw)).toBe('system');
    for (const raw of ['gentle', 'minimal', 'on', '1', '{"version":1}']) expect(parseMotionChoice(raw), raw).toBe('calm');
    for (const raw of [1, true, {}, []]) expect(parseMotionChoice(raw)).toBe('calm');
    expect(parseMotionChoice(' OFF ')).toBe('off');
  });
  it('lets the device reduced-motion setting win over every choice', () => {
    for (const choice of MOTION_CHOICES) expect(effectiveMotion(choice, true)).toBe('off');
    expect(effectiveMotion('system', false)).toBe('full');
    expect(effectiveMotion('calm', false)).toBe('calm');
    expect(effectiveMotion('off', false)).toBe('off');
  });
  it('reads the device: unreadable storage and no window read as Off (still), never throwing', () => {
    expect(readMotionChoice(win('calm'))).toBe('calm');
    expect(readMotionChoice(win(null))).toBe('system');
    expect(readMotionChoice(win('x', false, true))).toBe('off');
    expect(readMotionChoice(undefined)).toBe('off');
    expect(currentMotionLevel(win('system'))).toBe('full');
    expect(currentMotionLevel(win('system', true))).toBe('off');
    expect(currentMotionLevel(win('calm'))).toBe('calm');
    expect(currentMotionLevel(undefined)).toBe('off');
  });
  it('Calm keeps entrances and drops movement; Off drops both', () => {
    expect([movementAllowed('full'), movementAllowed('calm'), movementAllowed('off')]).toEqual([true, false, false]);
    expect([entrancesAllowed('full'), entrancesAllowed('calm'), entrancesAllowed('off')]).toEqual([true, true, false]);
    expect(Object.values(MOTION_LABELS)).toEqual(['Full', 'Calm (entrances only)', 'Off']);
  });
});
