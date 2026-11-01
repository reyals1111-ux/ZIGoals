import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {EVENT_TO_MACHINE, HOST_FACT_REACTIONS, REACTION_COOLDOWN_MS, REACTION_EVENTS, ZigiController} from '../../components/zigi/semantic';
import {reactionArtOf, skinOf} from '../../components/zigi/manifest';

/**
 * Session AK Part 13 (Studio-4's reactions.json): R011 offline-wait, R012 back-online and R013 hide name three host facts,
 * not reactions — connection_lost, connection_restored and user_dismissed. Each keeps its own meaning (the offline state,
 * the rest after it, no more knocks) and plays its clip as well once it has landed, under the reaction rules: R012 over
 * the rest the machine returns to, R013 as the knock is dismissed, R011 only when the drop is reported while ZIGi is
 * already offline (the studio's arbitration: the state wins the drop itself). Without the art each is exactly as before.
 */
const T0 = 1_000_000, mk = () => new ZigiController({hourOfDay: () => 12, dayOf: () => '2026-11-01'});
const FACTS = ['connection_lost', 'connection_restored', 'user_dismissed'] as const;

describe('the three host facts with a Studio-4 clip', () => {
  it('are the manifest\'s R011–R013 triggers, outside the twelve reaction events, and keep their machine meaning', () => {
    expect([...HOST_FACT_REACTIONS]).toEqual([...FACTS]);
    for (const f of FACTS) expect(REACTION_EVENTS.has(f), f).toBe(false);
    expect([EVENT_TO_MACHINE.connection_lost, EVENT_TO_MACHINE.connection_restored, EVENT_TO_MACHINE.user_dismissed]).toEqual(['offline', 'online', null]);
    expect(reactionArtOf(skinOf('origami-nebula')).filter(r => (HOST_FACT_REACTIONS as ReadonlySet<string>).has(r.event)).map(r => [r.code, r.event])).toEqual([['R011', 'connection_lost'], ['R012', 'connection_restored'], ['R013', 'user_dismissed']]);
    const c = mk(); expect(() => c.setReactionArt([...FACTS])).not.toThrow(); expect(() => c.setReactionArt(['user_typing_started'])).toThrow('INVALID_REACTION');
  });
  it('without their art: exactly the decisions of before (the offline state, back to rest, a dismissal)', () => {
    const c = mk();
    expect(c.dispatch({type: 'connection_lost'}, T0)).toMatchObject({state: 'offline', event: 'offline', reaction: null, reason: 'semantic_event'});
    expect(c.dispatch({type: 'connection_lost'}, T0 + 10_000)).toMatchObject({event: 'offline', reaction: null});
    expect(c.dispatch({type: 'connection_restored'}, T0 + 20_000)).toMatchObject({state: 'idle', event: 'online', reaction: null, reason: 'semantic_event'});
    expect(c.dispatch({type: 'user_dismissed'}, T0 + 30_000)).toMatchObject({reason: 'dismissed', event: null, reaction: null});
    expect(c.nudgeAllowed(T0 + 30_001)).toBe('nudge_suppressed_after_dismissal');
  });
  it('R011: the drop itself shows the offline state; reported again while offline, offline-wait plays over it', () => {
    const c = mk(); c.setReactionArt([...FACTS]);
    expect(c.dispatch({type: 'connection_lost'}, T0)).toMatchObject({state: 'offline', event: 'offline', reaction: null});
    c.sync('offline');
    expect(c.dispatch({type: 'connection_lost'}, T0 + 9000)).toMatchObject({state: 'offline', event: null, reaction: 'connection_lost', reason: 'reaction'});
    // The same reaction waits its cooldown.
    expect(c.dispatch({type: 'connection_lost'}, T0 + 9000 + REACTION_COOLDOWN_MS - 1)).toMatchObject({reaction: null, reason: 'cooldown'});
  });
  it('R012: back online, the machine rests and back-online plays over the rest', () => {
    const c = mk(); c.setReactionArt([...FACTS]); c.sync('offline');
    expect(c.dispatch({type: 'connection_restored'}, T0)).toMatchObject({state: 'idle', event: 'online', reaction: 'connection_restored', reason: 'semantic_event'});
    // A second restore inside the cooldown rests without the clip.
    expect(c.dispatch({type: 'connection_restored'}, T0 + 1000)).toMatchObject({event: 'online', reaction: null});
  });
  it('R013: dismissing the knock plays hide, and the dismissal stands', () => {
    const c = mk(); c.setReactionArt([...FACTS]);
    expect(c.dispatch({type: 'user_dismissed'}, T0)).toMatchObject({reason: 'dismissed', event: null, reaction: 'user_dismissed', state: 'idle'});
    expect(c.nudgeAllowed(T0 + 1)).toBe('nudge_suppressed_after_dismissal');
    // A settling one-shot holds the clip, never the dismissal.
    const d = mk(); d.setReactionArt([...FACTS]); d.sync('idle');
    d.dispatchValidated({type: 'all_habits_done'}, T0);
    expect(d.dispatch({type: 'user_dismissed'}, T0 + 100)).toMatchObject({reason: 'dismissed', reaction: null});
    expect(d.nudgeAllowed(T0 + 101)).toBe('nudge_suppressed_after_dismissal');
  });
  it('the connection signals come from the device\'s own online and offline events, told before the machine moves, once per change', () => {
    const events = readFileSync(join(__dirname, '..', '..', 'components', 'zigi', 'events.ts'), 'utf8');
    expect(events).toMatch(/const onOffline = \(\) => \{ if \(signalledOnline !== false\) \{ signalledOnline = false; zigiSignals\.emit\('connection_lost'\); \} zigiEvents\.emit\('offline'\); \};/);
    expect(events).toMatch(/const onOnline = \(\) => \{ if \(signalledOnline !== true\) \{ signalledOnline = true; zigiSignals\.emit\('connection_restored'\); \} zigiEvents\.emit\('online'\); \};/);
    const knock = readFileSync(join(__dirname, '..', '..', 'components', 'zigi', 'knock.tsx'), 'utf8');
    expect(knock).toContain("zigiSignals.emit('user_dismissed')");
  });
});
