import {afterEach, describe, expect, it} from 'vitest';
import {clearGazeHolds, gazeFor, heldGazes, holdGaze, watchGaze} from '../../components/zigi/gaze';
import {gazeOf, skinOf} from '../../components/zigi/manifest';
import {MOVE_TEXT} from '../../components/zigi/state-gallery';

/**
 * Session AL Part 14 (lane P14-B; AL_SCOPE D13, STATUS AK "Studio-4 X020–X022 delivered, not played"): the held gaze plays
 * while ZIGi waits on the person — the chat box focused (X020), cards waiting for a decision (X022), a "which one?"
 * question waiting (X021) — only at rest or while listening, and never without motion.
 */
afterEach(() => clearGazeHolds());
const set = (...h: Parameters<typeof holdGaze>[1][]) => new Set(h.filter(Boolean) as NonNullable<Parameters<typeof holdGaze>[1]>[]);
describe('D13: the held gaze', () => {
  it('listening with the chat box focused looks at the box; at rest, cards come before a question', () => {
    expect(gazeFor('listening', set('composer'), true)).toBe('chatInput');
    expect(gazeFor('listening', set('cards'), true)).toBeNull();
    expect(gazeFor('idle', set('cards'), true)).toBe('target');
    expect(gazeFor('idle', set('question'), true)).toBe('viewer');
    expect(gazeFor('idle', set('question', 'cards', 'composer'), true)).toBe('target');
    // Focus alone at rest is not a wait: the idle rotation keeps playing there (tests/zigi-alive.spec.ts).
    expect(gazeFor('idle', set('composer'), true)).toBeNull();
  });
  it('never over a reply, a mood or a celebration, and never without motion (reduced motion, Motion Off, ZIGi Off)', () => {
    for (const state of ['thinking', 'speaking', 'presenting', 'curious', 'celebrate', 'success', 'sleepy', 'offline', 'error']) expect(gazeFor(state, set('cards', 'question', 'composer'), true), state).toBeNull();
    for (const state of ['idle', 'listening']) expect(gazeFor(state, set('cards', 'question', 'composer'), false), state).toBeNull();
  });
  it('holds are per owner, released one by one, and watchers hear only real changes', () => {
    let heard = 0; const off = watchGaze(() => { heard++; });
    holdGaze('a', 'cards'); holdGaze('a', 'cards'); holdGaze('b', 'question');
    expect([...heldGazes()].sort()).toEqual(['cards', 'question']);
    expect(heard).toBe(2);
    holdGaze('a', null); holdGaze('a', null);
    expect([...heldGazes()]).toEqual(['question']);
    expect(heard).toBe(3);
    off(); holdGaze('b', null);
    expect(heard).toBe(3);
    expect(heldGazes().size).toBe(0);
  });
  it('plays Studio-4’s own delivered clips (the look is unchanged): X020, X021, X022 as loops', () => {
    const skin = skinOf('origami-nebula');
    expect(gazeOf(skin, 'chatInput')?.name).toBe('X020-gaze-chat-input');
    expect(gazeOf(skin, 'viewer')?.name).toBe('X021-gaze-viewer');
    expect(gazeOf(skin, 'target')?.name).toBe('X022-gaze-target');
    for (const slot of ['chatInput', 'viewer', 'target'] as const) expect(gazeOf(skin, slot)?.kind).toBe('loop');
    expect(gazeOf(skin, null)).toBeNull();
    // A skin without gaze art changes nothing.
    expect(gazeOf({...skin, extras: undefined}, 'target')).toBeNull();
  });
  it('Meet ZIGi says when each gaze plays (no longer "Not used yet")', () => {
    for (const code of ['X020', 'X021', 'X022']) expect(MOVE_TEXT[code]!.when, code).not.toBe('Not used yet.');
    expect(MOVE_TEXT.X020!.when).toMatch(/chat box has the focus/);
    expect(MOVE_TEXT.X021!.when).toMatch(/which one you mean/);
    expect(MOVE_TEXT.X022!.when).toMatch(/cards/);
  });
});
