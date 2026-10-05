import {describe, expect, it} from 'vitest';
import {SLEEPY_AFTER_MS, TRANSIENT_MS, stateForEvent, transition, type ZigiEvent} from '../../components/zigi/events';
import manifest from '../../components/zigi/manifest.json';

const open = {open: true, greetedToday: true}, firstOpen = {open: true, greetedToday: false}, closed = {open: false, greetedToday: true};
describe('ZIGi state machine (ADR-012 follow-up part E)', () => {
  it('greets on the first open of the day only, and every state it reaches exists in the manifest', () => {
    expect(transition('idle', 'open', firstOpen)).toBe('greeting');
    expect(transition('idle', 'open', open)).toBe('idle');
    const events: ZigiEvent[] = ['open', 'close', 'reply-pending', 'reply-streaming', 'reply-done', 'reply-with-proposals', 'action-applied', 'error', 'listening', 'speaking', 'idle', 'sleepy'];
    for (const event of events) for (const from of Object.keys(manifest.states) as (keyof typeof manifest.states)[]) {
      const next = transition(from, event, firstOpen); if (next) expect(Object.keys(manifest.states), `${from} + ${event}`).toContain(next);
    }
  });
  it('listens while the microphone records, thinks until the first token, speaks while streaming', () => {
    expect(transition('idle', 'listening', open)).toBe('listening');
    expect(transition('listening', 'idle', open)).toBe('idle');
    expect(transition('idle', 'reply-pending', open)).toBe('thinking');
    expect(transition('thinking', 'reply-streaming', open)).toBe('speaking');
    expect(transition('speaking', 'reply-done', open)).toBe('insight');
    expect(transition('speaking', 'reply-with-proposals', open)).toBe('presenting');
  });
  it('celebrates only after the app applied an action, never on a reply that merely claims it', () => {
    expect(transition('presenting', 'action-applied', open)).toBe('celebrate');
    for (const event of ['reply-done', 'reply-with-proposals', 'reply-streaming'] as const) expect(transition('idle', event, open)).not.toBe('celebrate');
    expect(TRANSIENT_MS.celebrate).toBeGreaterThan(0);
  });
  it('shows error on failures, goes idle on close, and gets sleepy only while idle with the panel open', () => {
    expect(transition('speaking', 'error', open)).toBe('error');
    expect(transition('error', 'close', open)).toBe('idle');
    expect(transition('idle', 'sleepy', open)).toBe('sleepy');
    expect(transition('idle', 'sleepy', closed)).toBeNull();
    expect(transition('thinking', 'sleepy', open)).toBeNull();
    expect(transition('sleepy', 'idle', open)).toBe('idle');
    expect(transition('sleepy', 'reply-pending', open)).toBe('thinking');
    expect(SLEEPY_AFTER_MS).toBeGreaterThanOrEqual(60_000);
  });
  it('an idle event while already idle changes nothing (no flicker)', () => {
    expect(transition('idle', 'idle', open)).toBeNull();
    expect(stateForEvent('idle')).toBe('idle');
  });
});
