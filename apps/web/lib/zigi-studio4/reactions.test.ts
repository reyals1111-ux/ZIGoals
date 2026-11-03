import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {transition} from '../../components/zigi/events';
import {CELEBRATING_REACTIONS, CELEBRATIONS, CELEBRATIONS_PER_DAY, EVENT_TO_MACHINE, FOLLOW_UPS, REACTION_COOLDOWN_MS, REACTION_EVENTS, REACTION_GAP_MS, SEMANTIC_EVENTS, VALIDATED_ONLY, ZigiController, type SemanticEventType} from '../../components/zigi/semantic';

/**
 * Session AK Part 12 (Studio-4 preparation): the reaction events. Until a reaction's art lands each is only noted, and
 * nothing else the controller decides changes; with art, the rules (validated-only celebrations, sensitive screens,
 * holds, cooldown, the reaction gap, the daily cap) apply. Each event is wired at a real moment in the app, and the
 * celebrating ones only through the host's validation.
 */
const T0 = 1_000_000, mk = (o: ConstructorParameters<typeof ZigiController>[0] = {}) => new ZigiController({hourOfDay: () => 12, dayOf: () => '2026-10-31', ...o});
const NEW = ['assistant_acknowledged', 'assistant_unsure', 'assistant_working', 'insight_consistent', 'checkin_low', 'checkin_milestone', 'journey_step', 'action_undone', 'wrapup_finished', 'feedback_received', 'journal_reflecting', 'companion_hidden'] as const;
const send = (c: ZigiController, type: SemanticEventType, at: number) => VALIDATED_ONLY.has(type) ? c.dispatchValidated({type}, at) : c.dispatch({type}, at);

describe('the reaction events', () => {
  it('are semantic events that keep the state (the machine never changes for one); connection_lost/restored already existed', () => {
    for (const type of NEW) { expect(SEMANTIC_EVENTS, type).toContain(type); expect(REACTION_EVENTS.has(type), type).toBe(true); expect(EVENT_TO_MACHINE[type], type).toBe('reaction'); }
    expect([...REACTION_EVENTS].sort()).toEqual([...NEW].sort());
    expect(SEMANTIC_EVENTS).toContain('connection_lost'); expect(SEMANTIC_EVENTS).toContain('connection_restored');
    for (const state of ['idle', 'listening', 'speaking', 'thinking', 'offline', 'celebrate', 'sleepy'] as const) expect(transition(state, 'reaction', {open: true, greetedToday: false}), state).toBeNull();
    // No reaction is a celebration of the state machine: the calm-celebration list is unchanged.
    for (const type of NEW) expect(CELEBRATIONS.has(type), type).toBe(false);
  });
  it('celebrate only on validated events: the celebrating reactions are refused from a plain signal', () => {
    expect([...CELEBRATING_REACTIONS].sort()).toEqual(['checkin_milestone', 'insight_consistent', 'journey_step', 'wrapup_finished']);
    for (const type of CELEBRATING_REACTIONS) {
      expect(VALIDATED_ONLY.has(type), type).toBe(true);
      const c = mk(); c.setReactionArt([type]);
      expect(c.dispatch({type}, T0), type).toMatchObject({reason: 'needs_host_validation', event: null, reaction: null});
      expect(c.dispatchValidated({type}, T0 + 1), type).toMatchObject({reason: 'reaction', reaction: type, event: null});
    }
    for (const type of NEW.filter(t => !CELEBRATING_REACTIONS.has(t))) expect(VALIDATED_ONLY.has(type), type).toBe(false);
  });
  it('without art (today) a reaction is noted only: no machine event, no reaction, and nothing later decides differently', () => {
    for (const type of NEW) {
      const c = mk(), r = send(c, type, T0);
      expect(r, type).toMatchObject({reason: 'noted', event: null, reaction: null, state: 'idle', code: 'F001', playId: null});
    }
    // A run with every reaction in between decides exactly as the same run without them (no cooldown, gap or cap spent).
    const run = (withReactions: boolean) => {
      const c = mk(), out: string[] = [];
      const steps: SemanticEventType[] = ['assistant_replied', 'hint_curious', 'all_habits_done', 'goal_funded', 'meditation_finished', 'first_sleep_logged', 'hint_surprised', 'assistant_thinking'];
      steps.forEach((type, i) => {
        if (withReactions) for (const r of NEW) send(c, r, T0 + i * 9_000 + 1);
        c.sync('idle');
        const d = send(c, type, T0 + i * 9_000 + 2);
        out.push(`${d.reason}:${d.code}:${d.event}`);
      });
      return out;
    };
    expect(run(true)).toEqual(run(false));
  });
  it('with art: a reaction plays over the current state without changing it, with its own cooldown, the reaction gap and holds', () => {
    const c = mk(); c.setReactionArt(NEW);
    expect(c.dispatch({type: 'assistant_speaking'}, T0).code).toBe('F005');
    const ack = c.dispatch({type: 'assistant_acknowledged'}, T0 + 100);
    expect(ack).toMatchObject({reason: 'reaction', reaction: 'assistant_acknowledged', event: null, state: 'speaking', code: 'F005'});
    // The flow's reactions are never held by the gap; the same one waits for its cooldown.
    expect(c.dispatch({type: 'assistant_unsure'}, T0 + 200).reason).toBe('reaction');
    expect(c.dispatch({type: 'assistant_acknowledged'}, T0 + 300).reason).toBe('cooldown');
    expect(c.dispatch({type: 'assistant_acknowledged'}, T0 + 100 + REACTION_COOLDOWN_MS).reason).toBe('reaction');
    // Other reactions keep the gap between reactions.
    const d = mk(); d.setReactionArt(NEW);
    expect(d.dispatch({type: 'action_undone'}, T0).reason).toBe('reaction');
    expect(d.dispatch({type: 'feedback_received'}, T0 + 1000).reason).toBe('rate_limited');
    expect(d.dispatch({type: 'feedback_received'}, T0 + REACTION_GAP_MS + 1).reason).toBe('reaction');
    // A celebration still settling holds a reaction.
    const e = mk(); e.setReactionArt(NEW);
    expect(e.dispatchValidated({type: 'all_habits_done'}, T0).code).toBe('F009');
    expect(e.dispatch({type: 'companion_hidden'}, T0 + 500).reason).toBe('priority_hold');
    expect(e.dispatch({type: 'companion_hidden'}, T0 + 3000 + REACTION_GAP_MS).reason).toBe('reaction');
  });
  it('with art: celebrating reactions are refused on a sensitive screen and count towards the day\'s cap; the others stay allowed there', () => {
    const c = mk(); c.setReactionArt(NEW); c.setPreferences({sensitive: true});
    expect(c.dispatchValidated({type: 'checkin_milestone'}, T0).reason).toBe('sensitive_screen');
    expect(c.dispatch({type: 'journal_reflecting'}, T0).reason).toBe('reaction');
    const d = mk(); d.setReactionArt(NEW);
    const types: SemanticEventType[] = ['checkin_milestone', 'journey_step', 'wrapup_finished', 'insight_consistent'];
    const reasons = types.map((type, i) => d.dispatchValidated({type}, T0 + i * 60_000).reason);
    expect(reasons.slice(0, CELEBRATIONS_PER_DAY)).toEqual(Array(CELEBRATIONS_PER_DAY).fill('reaction'));
    expect(reasons[CELEBRATIONS_PER_DAY]).toBe('celebration_cap');
    expect(d.snapshot().celebrationsToday).toBe(CELEBRATIONS_PER_DAY);
  });
  it('reaction art is a list of reaction events only; the follow-ups name real moments of the chat', () => {
    const c = mk();
    expect(() => c.setReactionArt(['celebrate'])).toThrow(/INVALID_REACTION/);
    expect(() => c.setReactionArt(['goal_funded'])).toThrow(/INVALID_REACTION/);
    expect(() => c.setReactionArt([{type: 'checkin_low'}])).toThrow(/INVALID_REACTION/);
    c.setReactionArt([]);
    expect(FOLLOW_UPS).toEqual({ambiguity: 'assistant_unsure', not_understood: 'assistant_unsure', hint_curious: 'assistant_unsure', hint_confused: 'assistant_unsure', assistant_reading_records: 'assistant_working'});
    for (const [from, to] of Object.entries(FOLLOW_UPS)) { expect(SEMANTIC_EVENTS).toContain(from); expect(REACTION_EVENTS.has(to!)).toBe(true); }
  });
});

describe('each reaction is wired at its real moment in the app', () => {
  const root = join(__dirname, '..', '..', 'components');
  const sources: {file: string; text: string}[] = [];
  const walk = (dir: string) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.tsx?$/.test(name)) sources.push({file: path.slice(root.length + 1), text: readFileSync(path, 'utf8')}); } };
  walk(root);
  const emitted = (type: string) => sources.flatMap(({file, text}) => [...text.matchAll(new RegExp(`zigiSignals\\.(emit|emitValidated)\\('${type}'\\)`, 'g'))].map(m => `${file}:${m[1]}`));
  it('every reaction is sent from its place, or follows a chat signal in the alive chunk', () => {
    const where: Record<string, string> = {
      assistant_acknowledged: 'ai/use-chat-session.ts:emit', insight_consistent: 'insights/cross-insights-card.tsx:emitValidated', checkin_low: 'ai/zigi-checkin.tsx:emit', checkin_milestone: 'ai/zigi-checkin.tsx:emitValidated',
      journey_step: 'game/celebration.tsx:emitValidated', action_undone: 'ui/undo-toast.tsx:emit', wrapup_finished: 'for-you/wrap-up-card.tsx:emitValidated', feedback_received: 'ai/use-chat-session.ts:emit',
      journal_reflecting: 'journal/journal-compose.tsx:emit', companion_hidden: 'ai/ai-launcher.tsx:emit',
    };
    for (const [type, at] of Object.entries(where)) expect(emitted(type), type).toEqual([at]);
    for (const type of ['assistant_unsure', 'assistant_working']) { expect(emitted(type), type).toEqual([]); expect(Object.values(FOLLOW_UPS)).toContain(type); }
    expect(sources.find(s => s.file === 'zigi/alive.ts')!.text).toMatch(/const follow = FOLLOW_UPS\[signal\.type\];\s*if \(follow\) decide\(follow, false\);/);
  });
  it('a celebrating reaction is never sent as a plain signal, and the wrap-up only after the save succeeded', () => {
    for (const type of CELEBRATING_REACTIONS) expect(emitted(type).every(at => at.endsWith(':emitValidated')), type).toBe(true);
    const wrap = sources.find(s => s.file === 'for-you/wrap-up-card.tsx')!.text;
    expect(wrap).toMatch(/if \(!await onWrap\(text\)\) setError\([^)]*\); else if \(text !== null\) zigiSignals\.emitValidated\('wrapup_finished'\)/);
    const undo = sources.find(s => s.file === 'ui/undo-toast.tsx')!.text;
    expect(undo.indexOf("zigiSignals.emit('action_undone')")).toBeGreaterThan(undo.indexOf('const out = await toast.undo();'));
    expect(undo.indexOf("zigiSignals.emit('action_undone')")).toBeLessThan(undo.indexOf('} catch (e) {', undo.indexOf('const out = await toast.undo();')));
  });
});
