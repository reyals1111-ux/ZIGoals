import {describe, expect, it} from 'vitest';
import manifest from '../../components/zigi/manifest.json';
import rules from '../../components/zigi/actions.json';
import {transition} from '../../components/zigi/events';
import {CELEBRATIONS, CELEBRATIONS_PER_DAY, EVENT_TO_MACHINE, NUDGES, REACTION_GAP_MS, SEMANTIC_EVENTS, VALIDATED_ONLY, validateSemanticEvent, ZigiController, type SemanticEventType} from '../../components/zigi/semantic';

/**
 * Session X-Local Part 4: the companion controller, the port of Studio-2's `controller.test.mjs` (every test there, on
 * ZIGoals' events), plus the owner's rules: calm celebrations with a daily cap, the reaction rate limit, sensitive
 * screens, and the mapping of every semantic event onto a state the manifest knows.
 */
const T0 = 1_000_000, NOON = () => 12, mk = (o: ConstructorParameters<typeof ZigiController>[0] = {}) => new ZigiController({hourOfDay: NOON, dayOf: () => '2026-10-08', ...o});
const STUDIO = ['user_opened_panel', 'assistant_listening', 'assistant_thinking', 'assistant_speaking', 'assistant_replied', 'assistant_replied_with_proposals', 'goal_milestone_reached', 'habit_completed', 'health_log_recorded', 'connection_lost', 'connection_restored', 'recoverable_error', 'user_idle', 'user_dismissed', 'user_typing_started', 'user_typing_stopped', 'idle'];

describe('the privacy boundary', () => {
  it('only {type} with an allowed value crosses; nothing is echoed', () => {
    for (const name of STUDIO) expect(SEMANTIC_EVENTS).toContain(name);
    for (const bad of [null, 'idle', {type: 'idle', text: 'hello'}, {type: 'delete everything'}, {type: 'idle', health: {weight: 80}}, Object.create({type: 'idle'}), {type: 'celebrate'}, {type: 'hint_celebrate'}]) {
      let thrown: unknown = null;
      try { validateSemanticEvent(bad); } catch (e) { thrown = e; }
      expect(thrown).toBeInstanceOf(TypeError); expect((thrown as Error).message).toBe('INVALID_EVENT'); expect(String(thrown)).not.toMatch(/hello|weight|delete/);
    }
    expect(validateSemanticEvent({type: 'idle'})).toEqual({type: 'idle'});
  });
  it('every semantic event maps onto a machine event that leads to a state the manifest knows', () => {
    for (const type of SEMANTIC_EVENTS) {
      const machine = EVENT_TO_MACHINE[type];
      if (machine === null) { expect(type).toBe('user_dismissed'); continue; }
      const next = transition('idle', machine, {open: true, greetedToday: false}) ?? transition('listening', machine, {open: true, greetedToday: false}) ?? transition('offline', machine, {open: true, greetedToday: false}) ?? 'idle';
      expect(Object.keys(manifest.states), `${type} → ${machine}`).toContain(next);
    }
    expect(Object.keys(rules.states).sort()).toEqual(Object.keys(manifest.states).sort());
  });
});
describe('the studio\'s tests, on ZIGoals\' events', () => {
  it('the demo chain listening → thinking → speaking → idle selects the allowlisted codes', () => {
    const c = mk();
    expect(['assistant_listening', 'assistant_thinking', 'assistant_speaking', 'idle'].map((t, i) => c.dispatch({type: t}, T0 + i * 1000).code)).toEqual(['F004', 'T001', 'F005', 'F001']);
  });
  it('celebrate never plays from a plain dispatch; only a host-validated event triggers F009', () => {
    const c = mk();
    const r1 = c.dispatch({type: 'goal_milestone_reached'}, T0);
    expect(r1.code).toBe('F001'); expect(r1.reason).toBe('needs_host_validation'); expect(r1.event).toBeNull();
    const r2 = c.dispatchValidated({type: 'goal_milestone_reached'}, T0 + 10);
    expect(r2.code).toBe('F009'); expect(r2.reason).toBe('validated_event'); expect(r2.event).toBe('action-applied');
    for (const type of VALIDATED_ONLY) expect(mk().dispatch({type}, T0).reason, type).toBe('needs_host_validation');
  });
  it('cooldowns cannot be bypassed: replay keeps the play id and a second request inside the cooldown is refused', () => {
    const c = mk();
    const a = c.dispatchValidated({type: 'goal_milestone_reached'}, T0);
    expect(a.code).toBe('F009');
    const rp = c.replay(T0 + 500)!;
    expect(rp.playId).toBe(a.playId); expect(rp.reason).toBe('replay');
    c.sync('idle');
    const b = c.dispatchValidated({type: 'goal_funded'}, T0 + 5000);
    expect(b.reason).toBe('cooldown'); expect(b.event).toBeNull();
    const d = c.dispatchValidated({type: 'goal_funded'}, T0 + 31_000);
    expect(d.code).toBe('F009');
  });
  it('markers fire once per play: replay and seeking back never double-knock', () => {
    const c = mk();
    const r = c.dispatch({type: 'reminder_due'}, T0);
    expect(r.code).toBe('F020');
    const names = r.markers.map(m => m.name);
    expect(names).toContain('knock_contact_1'); expect(names).toContain('knock_contact_2');
    expect(r.markers.find(m => m.name === 'knock_contact_1')!.seconds).toBeCloseTo(19 / 24);
    expect(c.markerFired(r.playId!, 'knock_contact_1')).toBe(true);
    expect(c.markerFired(r.playId!, 'knock_contact_1')).toBe(false);
    c.replay(T0 + 1000);
    expect(c.markerFired(r.playId!, 'knock_contact_1')).toBe(false);
    expect(c.markerFired(r.playId!, 'knock_contact_2')).toBe(true);
    expect(c.markerFired(99, 'knock_contact_1')).toBe(false);
  });
  it('one proactive nudge per session, none after dismissal, none in quiet hours, none while typing', () => {
    expect([...NUDGES]).toEqual(['reminder_due']);
    const c = mk();
    expect(c.dispatch({type: 'reminder_due'}, T0).code).toBe('F020');
    c.sync('idle');
    expect(c.dispatch({type: 'reminder_due'}, T0 + 120_000).reason).toBe('nudge_budget_spent');
    expect(c.nudgeAllowed(T0 + 120_000)).toBe('nudge_budget_spent');
    const d = mk();
    d.dispatch({type: 'user_dismissed'}, T0);
    expect(d.dispatch({type: 'reminder_due'}, T0 + 1).reason).toBe('nudge_suppressed_after_dismissal');
    const q = mk({hourOfDay: () => 23});
    expect(q.dispatch({type: 'reminder_due'}, T0).reason).toBe('nudge_suppressed_quiet_hours');
    expect(mk({hourOfDay: () => 7}).nudgeAllowed(T0)).toBe('nudge_suppressed_quiet_hours');
    expect(mk({hourOfDay: () => 8}).nudgeAllowed(T0)).toBe('allowed');
    const t = mk();
    t.dispatch({type: 'user_typing_started'}, T0);
    expect(t.dispatch({type: 'reminder_due'}, T0 + 1).reason).toBe('nudge_suppressed_while_typing');
    t.dispatch({type: 'user_typing_stopped'}, T0 + 2);
    expect(t.dispatch({type: 'reminder_due'}, T0 + 3).code).toBe('F020');
    expect(mk({maxNudgesPerSession: 2}).nudgeAllowed(T0)).toBe('allowed');
    // A snooze is the person's own request: one more nudge is granted for it.
    const g = mk(); g.dispatch({type: 'reminder_due'}, T0); g.sync('idle');
    expect(g.nudgeAllowed(T0 + 1)).toBe('nudge_budget_spent'); g.grant(); expect(g.nudgeAllowed(T0 + 2)).toBe('allowed');
  });
  it('priority and settle holds: a one-shot after_settle clip finishes before a lower-priority request', () => {
    const c = mk();
    const g = c.dispatch({type: 'user_opened_panel'}, T0);
    expect(g.code).toBe('F002');
    const l = c.dispatch({type: 'assistant_listening'}, T0 + 500);
    expect(l.reason).toBe('priority_hold'); expect(l.code).toBe('F002'); expect(l.event).toBeNull();
    const l2 = c.dispatch({type: 'assistant_listening'}, T0 + 2600);
    expect(l2.code).toBe('F004'); expect(l2.event).toBe('listening');
    // Loops yield to the host: a loop never holds the next event.
    const s = c.dispatch({type: 'assistant_speaking'}, T0 + 2700);
    expect(s.code).toBe('F005');
    // Host facts are never held: closing the panel while a reaction plays still waves goodbye; opening still greets.
    const d = mk();
    expect(d.dispatch({type: 'not_understood'}, T0).code).toBe('F016');
    expect(d.dispatch({type: 'user_closed_panel'}, T0 + 300)).toMatchObject({code: 'F019', event: 'close'});
    const e = mk();
    expect(e.dispatch({type: 'assistant_replied'}, T0).code).toBe('F003');
    expect(e.dispatch({type: 'user_opened_panel'}, T0 + 100)).toMatchObject({code: 'F002', event: 'open'});
    expect(e.dispatch({type: 'connection_lost'}, T0 + 200)).toMatchObject({code: 'F021', event: 'offline'});
  });
  it('reduced motion and Motion Off return the static poster; hidden returns nothing to play', () => {
    const c = mk();
    c.setPreferences({motion: 'reduced'});
    const r = c.dispatch({type: 'assistant_speaking'}, T0);
    expect(r.mode).toBe('static');
    c.setPreferences({hidden: true});
    expect(c.dispatch({type: 'assistant_thinking'}, T0 + 1).mode).toBe('hidden');
    expect(() => c.setPreferences({motion: 'fast' as never})).toThrow(/INVALID_PREFERENCE/);
    expect(() => c.setPreferences({volume: 1} as never)).toThrow(/INVALID_PREFERENCE/);
  });
  it('controller state is private: no public field can reset a cooldown', () => {
    const c = mk();
    c.dispatchValidated({type: 'goal_milestone_reached'}, T0);
    expect(Object.keys(c)).toEqual([]);
    (c as unknown as Record<string, unknown>).current = 'idle'; (c as unknown as Record<string, unknown>).last = new Map();
    c.sync('idle');
    expect(c.dispatchValidated({type: 'goal_funded'}, T0 + 5000).reason).toBe('cooldown');
  });
});
describe('ZIGoals\' own rules', () => {
  it('calm celebrations: meaningful validated moments celebrate or make ZIGi proud; ordinary successes stay small', () => {
    expect([...CELEBRATIONS].sort()).toEqual(['all_habits_done', 'challenge_milestone', 'first_sleep_logged', 'goal_funded', 'goal_milestone_reached', 'meditation_finished', 'streak_milestone']);
    for (const type of ['habit_completed', 'health_log_recorded', 'card_accepted'] as const) { const c = mk(); const r = c.dispatchValidated({type}, T0); expect(r.code, type).toBe('F012'); expect(r.event).toBe('success'); }
    expect(mk().dispatchValidated({type: 'streak_milestone'}, T0)).toMatchObject({code: 'F013', event: 'streak-milestone'});
    for (const type of ['all_habits_done', 'goal_funded', 'challenge_milestone', 'meditation_finished', 'first_sleep_logged'] as const) expect(mk().dispatchValidated({type}, T0), type).toMatchObject({code: 'F009', event: 'action-applied'});
  });
  it(`at most ${CELEBRATIONS_PER_DAY} celebrations a day; past the cap a celebration is a small success; a new day starts over`, () => {
    let day = '2026-10-08';
    const c = mk({dayOf: () => day});
    const moments: SemanticEventType[] = ['goal_funded', 'meditation_finished', 'first_sleep_logged', 'all_habits_done', 'streak_milestone'];
    const results = moments.map((type, i) => { c.sync('idle'); return c.dispatchValidated({type}, T0 + i * 60_000); });
    expect(results.slice(0, CELEBRATIONS_PER_DAY).map(r => r.code)).toEqual(['F009', 'F009', 'F009']);
    expect(results[3]!).toMatchObject({code: 'F012', event: 'success', reason: 'celebration_cap'});
    expect(results[4]!).toMatchObject({code: 'F012', reason: 'celebration_cap'});
    expect(c.snapshot().celebrationsToday).toBe(CELEBRATIONS_PER_DAY);
    day = '2026-10-09'; c.sync('idle');
    expect(c.dispatchValidated({type: 'goal_funded'}, T0 + 10 * 60_000).code).toBe('F009');
  });
  it(`reactions are at least ${REACTION_GAP_MS} ms apart; the conversation's own flow never waits`, () => {
    const c = mk();
    expect(c.dispatch({type: 'assistant_replied'}, T0).code).toBe('F003');
    c.sync('idle');
    expect(c.dispatch({type: 'hint_curious'}, T0 + 3100).reason).toBe('rate_limited');
    expect(c.dispatch({type: 'assistant_thinking'}, T0 + 3200).code).toBe('T001');
    expect(c.dispatch({type: 'assistant_speaking'}, T0 + 3300).code).toBe('F005');
    c.sync('idle');
    expect(c.dispatch({type: 'hint_curious'}, T0 + REACTION_GAP_MS + 1).code).toBe('F014');
  });
  it('Session X-Local Part 6c: an added card seconds after the reply that presented it shows success; the gap holds reactions, never the answer to the person\'s own act', () => {
    const c = mk();
    expect(c.dispatch({type: 'assistant_replied_with_proposals'}, T0).code).toBe('F006');
    const accepted = c.dispatchValidated({type: 'card_accepted'}, T0 + 2000);
    expect(accepted.state).toBe('success'); expect(accepted.code).toBe('F012'); expect(accepted.reason).toBe('validated_event'); expect(accepted.event).not.toBeNull();
    c.sync('idle');
    // A reaction in that same window still waits for the gap.
    expect(c.dispatch({type: 'hint_curious'}, T0 + 2500).reason).toBe('rate_limited');
  });
  it('Phase 2 (P2.5): the panel opened again inside the greeting\'s cooldown still reaches the machine (a host fact), and a held reaction at a reply\'s end rests a talking ZIGi', () => {
    const c = mk();
    expect(c.dispatch({type: 'user_opened_panel'}, T0).event).toBe('open');
    c.sync('greeting');
    expect(c.dispatch({type: 'user_closed_panel'}, T0 + 500).event).toBe('close');
    c.sync('idle');
    expect(c.dispatch({type: 'user_opened_panel'}, T0 + 1_000).event).toBe('open');
    // A reply with cards presented, then a plain reply two seconds later: insight is held by the gap, speaking must still end.
    c.sync('idle');
    expect(c.dispatch({type: 'assistant_replied_with_proposals'}, T0 + 20_000).code).toBe('F006');
    c.sync('speaking');
    const heldEnd = c.dispatch({type: 'assistant_replied'}, T0 + 22_000);
    expect(heldEnd.reason).toBe('rate_limited'); expect(heldEnd.event).toBe('idle');
  });
  it('Phase 2 (P2.5): a knock consumes its nudge even when its clip is held, so a second due reminder never knocks in the same session', () => {
    const c = mk();
    c.sync('reminder');
    const first = c.dispatch({type: 'reminder_due'}, T0);
    expect(['current_hold', 'validated_event', 'semantic_event']).toContain(first.reason);
    expect(c.nudgeAllowed(T0 + 1_000)).toBe('nudge_budget_spent');
  });
  it('sensitive screens: celebrations, knocks and peeks are refused there; the conversation goes on', () => {
    const c = mk();
    c.setPreferences({sensitive: true});
    expect(c.dispatchValidated({type: 'goal_funded'}, T0).reason).toBe('sensitive_screen');
    expect(c.dispatch({type: 'reminder_due'}, T0).reason).toBe('sensitive_screen');
    expect(c.nudgeAllowed(T0)).toBe('sensitive_screen');
    expect(c.dispatch({type: 'assistant_thinking'}, T0).code).toBe('T001');
    c.setPreferences({sensitive: false});
    expect(c.dispatchValidated({type: 'goal_funded'}, T0 + 10_000).code).toBe('F009');
  });
  it('the AI\'s hints reach only the listed moods, never a celebration or a nudge', () => {
    const hints = SEMANTIC_EVENTS.filter(t => t.startsWith('hint_'));
    expect(hints).toEqual(['hint_insight', 'hint_curious', 'hint_encouraging', 'hint_empathetic', 'hint_surprised', 'hint_confused']);
    const codes = hints.map(type => { const c = mk(); return c.dispatch({type}, T0).code; });
    expect(codes).toEqual(['F003', 'F014', 'F018', 'F017', 'F015', 'F016']);
    for (const type of hints) { expect(VALIDATED_ONLY.has(type)).toBe(false); expect(NUDGES.has(type)).toBe(false); expect(CELEBRATIONS.has(type)).toBe(false); }
  });
  it('typing and a dismissal note the state and lead to listening, idle or nothing', () => {
    const c = mk();
    expect(c.dispatch({type: 'user_typing_started'}, T0)).toMatchObject({reason: 'typing', event: 'listening'});
    expect(c.dispatch({type: 'user_typing_stopped'}, T0 + 1)).toMatchObject({reason: 'typing_stopped', event: 'idle'});
    expect(c.dispatch({type: 'user_dismissed'}, T0 + 2)).toMatchObject({reason: 'dismissed', event: null});
    expect(c.snapshot()).toMatchObject({dismissed: true, typing: false});
  });
});
