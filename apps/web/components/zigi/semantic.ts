import rules from './actions.json';
import type {ZigiEvent} from './bus';
import {ZIGI_MANIFEST} from './manifest';

/**
 * ZIGi's companion controller (Session X-Local Part 4, ADR-017 section 4): the port of Studio-2's `controller.mjs`
 * and its tests, on ZIGoals' own semantic events. One enumerated `{type}` is all it ever receives: no text, records,
 * health values, balances, notes, chat history, tokens or identifiers (the studio's privacy boundary). The host app
 * validates facts before it signals them (the store confirmed the write, the engine counted the milestone); the AI never
 * names a state, never picks an asset and may only hint at a mood from a fixed list. The rules, all here, pure, with
 * `now` and the hour as inputs so the tests are exact:
 * - success events (celebrations and small successes) play only when the host validated them; a plain signal is refused;
 * - calm celebrations (owner decision D5): celebrate and proud only for the meaningful validated moments; an ordinary
 *   check-in, a logged entry or an accepted card is a small success at most; at most CELEBRATIONS_PER_DAY a day;
 * - one proactive nudge (the knock) per session, none after the person dismissed one, none in the quiet hours, none
 *   while the person types;
 * - per-state cooldowns (actions.json), priority holds (a one-shot that settles first is not cut by a lower-priority
 *   reaction; the panel opening or closing, going offline, resting and dozing are host facts and are never held),
 *   loops yield to the host (the next event decides when a loop ends), markers fire once per play, a replay never
 *   creates a new play or resets a cooldown;
 * - a reaction rate limit: non-conversational reactions at least REACTION_GAP_MS apart (listening, thinking, speaking
 *   and the rest of the conversation flow are exempt);
 * - sensitive screens: states the contract keeps off them (celebrate, proud, attention, reminder, peek) are refused there;
 * - reduced motion, Motion Off and ZIGi's Off give the poster; hidden gives nothing to play.
 * State is private (`#fields`): nothing outside can bypass a cooldown or re-arm a nudge.
 */
export const SEMANTIC_EVENTS = Object.freeze([
  // The studio's schema (semantic-event.schema.json), as named there.
  'user_opened_panel', 'assistant_listening', 'assistant_thinking', 'assistant_speaking', 'assistant_replied', 'assistant_replied_with_proposals',
  'goal_milestone_reached', 'habit_completed', 'health_log_recorded', 'connection_lost', 'connection_restored', 'recoverable_error', 'user_idle', 'user_dismissed', 'user_typing_started', 'user_typing_stopped', 'idle',
  // ZIGoals' own (ZIGI_ALIVE_X.md "The state and emotion table").
  'user_closed_panel', 'assistant_reading_records', 'assistant_writing_proposal', 'local_answer', 'ambiguity', 'not_understood', 'careful_topic', 'week_opened', 'reminder_due', 'model_loading', 'model_ready',
  'all_habits_done', 'streak_milestone', 'goal_funded', 'challenge_milestone', 'meditation_finished', 'first_sleep_logged', 'card_accepted',
  // The AI's one hint per reply, from a fixed list (lib/ai/emotion-hint.ts); never a celebration, never a nudge.
  'hint_insight', 'hint_curious', 'hint_encouraging', 'hint_empathetic', 'hint_surprised', 'hint_confused',
] as const);
export type SemanticEventType = (typeof SEMANTIC_EVENTS)[number];
export type SemanticEvent = {readonly type: SemanticEventType};
/** Success events: they play only through `dispatchValidated` (the host validated the fact). */
export const VALIDATED_ONLY: ReadonlySet<SemanticEventType> = new Set(['goal_milestone_reached', 'habit_completed', 'health_log_recorded', 'all_habits_done', 'streak_milestone', 'goal_funded', 'challenge_milestone', 'meditation_finished', 'first_sleep_logged', 'card_accepted']);
/** The meaningful validated moments that celebrate (D5); every other success is small. */
export const CELEBRATIONS: ReadonlySet<SemanticEventType> = new Set(['all_habits_done', 'streak_milestone', 'goal_milestone_reached', 'goal_funded', 'challenge_milestone', 'meditation_finished', 'first_sleep_logged']);
/** Proactive nudges: the knock. One per session, none after a dismissal, none in quiet hours, none while typing. */
export const NUDGES: ReadonlySet<SemanticEventType> = new Set(['reminder_due']);
/** The conversation's own flow is never rate-limited; everything else is a reaction. Success belongs to the flow too
 * (Session X-Local Part 6c, found live): it answers the person's own act (a check-in, an added card, a local answer),
 * and an added card comes seconds after the reply that presented it, so a gap counted from that reply would swallow it. */
const CONVERSATION: ReadonlySet<string> = new Set(['idle', 'listening', 'thinking', 'speaking', 'reading-your-data', 'writing-proposal', 'loading-model', 'offline', 'sleepy', 'greeting', 'wave-goodbye', 'peek', 'success']);
/** The states in which ZIGi is talking or working on a reply; a held reaction at the reply's end rests them. */
const TALKING: ReadonlySet<string> = new Set(['thinking', 'speaking', 'reading-your-data', 'writing-proposal', 'loading-model']);
/** The signals that end a reply. */
const REPLY_END: ReadonlySet<string> = new Set(['assistant_replied', 'assistant_replied_with_proposals', 'local_answer', 'ambiguity', 'not_understood', 'careful_topic', 'hint_insight', 'hint_curious', 'hint_encouraging', 'hint_empathetic', 'hint_surprised', 'hint_confused', 'assistant_error']);
/** Host facts that no playing clip may hold back: the panel opened or closed, the device went offline, ZIGi rests or
 * dozes, and the person's own act succeeded (a check-in, an added card: the presenting clip yields to it at once). */
const HOST_DRIVEN: ReadonlySet<string> = new Set(['greeting', 'wave-goodbye', 'offline', 'idle', 'sleepy', 'success']);
export const CELEBRATIONS_PER_DAY = 3, REACTION_GAP_MS = 8000, DEFAULT_QUIET: readonly [number, number] = [22, 8];
/** What each semantic event means for the state machine (events.ts `transition`); `null` only updates the controller. */
export const EVENT_TO_MACHINE: Readonly<Record<SemanticEventType, ZigiEvent | null>> = {
  user_opened_panel: 'open', user_closed_panel: 'close', assistant_listening: 'listening', assistant_thinking: 'reply-pending', assistant_speaking: 'reply-streaming', assistant_reading_records: 'tool-call', assistant_writing_proposal: 'writing-proposal',
  assistant_replied: 'reply-done', assistant_replied_with_proposals: 'reply-with-proposals', local_answer: 'local-answer', ambiguity: 'ambiguity', not_understood: 'not-understood', careful_topic: 'careful', week_opened: 'encourage',
  recoverable_error: 'error', connection_lost: 'offline', connection_restored: 'online', reminder_due: 'reminder-due', model_loading: 'model-loading', model_ready: 'model-ready', user_idle: 'sleepy', idle: 'idle',
  user_typing_started: 'listening', user_typing_stopped: 'idle', user_dismissed: null,
  habit_completed: 'success', health_log_recorded: 'success', card_accepted: 'success',
  all_habits_done: 'action-applied', goal_milestone_reached: 'action-applied', goal_funded: 'action-applied', challenge_milestone: 'action-applied', meditation_finished: 'action-applied', first_sleep_logged: 'action-applied', streak_milestone: 'streak-milestone',
  hint_insight: 'reply-done', hint_curious: 'ambiguity', hint_encouraging: 'encourage', hint_empathetic: 'careful', hint_surprised: 'surprise', hint_confused: 'not-understood',
};
/** The state a machine event leads to from idle (for the rules: priority, cooldown, sensitive screens). */
const EVENT_STATE: Readonly<Record<ZigiEvent, string>> = {
  open: 'greeting', close: 'wave-goodbye', 'reply-pending': 'thinking', 'reply-streaming': 'speaking', 'reply-done': 'insight', 'reply-with-proposals': 'presenting', 'action-applied': 'celebrate', error: 'error', listening: 'listening', speaking: 'speaking', idle: 'idle', sleepy: 'sleepy',
  'tool-call': 'reading-your-data', 'writing-proposal': 'writing-proposal', 'local-answer': 'success', ambiguity: 'curious', 'not-understood': 'confused', 'streak-milestone': 'proud', careful: 'empathetic', encourage: 'encouraging',
  offline: 'offline', online: 'idle', 'reminder-due': 'reminder', 'model-loading': 'loading-model', 'model-ready': 'idle', success: 'success', surprise: 'surprised',
  // Phase 2 (P2.5): not connected yet asks for attention at rest; set up, ZIGi rests.
  attention: 'attention', connected: 'idle',
};
type Rule = {code: string; priority: number; cooldownSeconds: number; interruptibility: 'anytime' | 'after_settle' | 'never'; sensitiveContextAllowed: boolean; markers: {name: string; frame: number; kind: string}[]};
const RULES = rules.states as Record<string, Rule>;
export const ruleFor = (state: string): Rule => RULES[state] ?? RULES.idle!;
/** Only `{type}` with an allowed value crosses; nothing else is accepted and nothing rejected is echoed. */
export function validateSemanticEvent(event: unknown): SemanticEvent {
  if (!event || typeof event !== 'object' || Object.getPrototypeOf(event) !== Object.prototype || Reflect.ownKeys(event).length !== 1 || !Object.hasOwn(event, 'type') || !(SEMANTIC_EVENTS as readonly string[]).includes((event as {type: unknown}).type as string)) throw new TypeError('INVALID_EVENT');
  return Object.freeze({type: (event as {type: SemanticEventType}).type});
}
export const isSemanticEvent = (value: unknown): value is SemanticEventType => typeof value === 'string' && (SEMANTIC_EVENTS as readonly string[]).includes(value);
export type Preferences = {motion: 'full' | 'reduced' | 'off'; hidden: boolean; sensitive: boolean};
export type Decision = {
  /** The state ZIGi shows now (the current one when the event changed nothing). */
  state: string; code: string;
  /** The machine event to emit, or null when the controller held, refused or only noted the signal. */
  event: ZigiEvent | null;
  reason: 'semantic_event' | 'validated_event' | 'needs_host_validation' | 'cooldown' | 'current_hold' | 'priority_hold' | 'nudge_budget_spent' | 'nudge_suppressed_after_dismissal' | 'nudge_suppressed_quiet_hours' | 'nudge_suppressed_while_typing' | 'sensitive_screen' | 'rate_limited' | 'celebration_cap' | 'dismissed' | 'typing' | 'typing_stopped' | 'noted' | 'replay';
  mode: 'animated' | 'static' | 'hidden';
  playId: number | null; loop: 'loop' | 'once'; seconds: number;
  markers: readonly {name: string; frame: number; seconds: number}[];
};
export type ControllerOptions = {quietHours?: readonly [number, number]; maxNudgesPerSession?: number; hourOfDay?: (now: number) => number; dayOf?: (now: number) => string; celebrationsPerDay?: number};
export class ZigiController {
  #current: string = 'idle'; #until = 0; #last = new Map<string, number>(); #prefs: Preferences = {motion: 'full', hidden: false, sensitive: false};
  #nudges = 0; #dismissed = false; #typing = false; #quiet: readonly [number, number]; #maxNudges: number; #playSeq = 0; #fired = new Set<string>(); #hour: (now: number) => number; #day: (now: number) => string;
  #celebrations = {day: '', count: 0}; #perDay: number; #lastReactionAt = -Infinity;
  constructor(options: ControllerOptions = {}) {
    this.#quiet = options.quietHours ?? DEFAULT_QUIET;
    this.#maxNudges = options.maxNudgesPerSession ?? 1;
    this.#hour = options.hourOfDay ?? (now => new Date(now).getHours());
    this.#day = options.dayOf ?? (now => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    this.#perDay = options.celebrationsPerDay ?? CELEBRATIONS_PER_DAY;
  }
  setPreferences(p: Partial<Preferences>): void {
    if (!p || typeof p !== 'object' || Object.keys(p).some(k => !['motion', 'hidden', 'sensitive'].includes(k)) || (Object.hasOwn(p, 'motion') && !['full', 'reduced', 'off'].includes(p.motion as string)) || (Object.hasOwn(p, 'hidden') && typeof p.hidden !== 'boolean') || (Object.hasOwn(p, 'sensitive') && typeof p.sensitive !== 'boolean')) throw new TypeError('INVALID_PREFERENCE');
    this.#prefs = {...this.#prefs, ...p};
  }
  /** The host's state machine told the controller where ZIGi is now (it rests after one-shots on its own timers). */
  sync(state: string): void { if (state !== this.#current) { this.#current = state; this.#until = 0; } }
  #inQuietHours(now: number): boolean { const h = this.#hour(now), [s, e] = this.#quiet; return s <= e ? h >= s && h < e : h >= s || h < e; }
  #result(state: string, reason: Decision['reason'], now: number, event: ZigiEvent | null, newPlay: boolean): Decision {
    const spec = ZIGI_MANIFEST.states[state] ?? ZIGI_MANIFEST.states.idle!, rule = ruleFor(state);
    if (newPlay) { this.#playSeq += 1; this.#current = state; this.#until = spec.kind === 'one-shot' ? now + spec.durationMs : 0; }
    const mode = this.#prefs.hidden ? 'hidden' : this.#prefs.motion !== 'full' ? 'static' : 'animated';
    return Object.freeze({state, code: spec.code, event, reason, mode, playId: newPlay ? this.#playSeq : this.#current === state && this.#playSeq ? this.#playSeq : null, loop: spec.kind === 'loop' ? 'loop' : 'once', seconds: spec.durationMs / 1000,
      markers: Object.freeze(rule.markers.filter(m => m.kind !== 'poster').map(m => Object.freeze({name: m.name, frame: m.frame, seconds: (m.frame - 1) / rules.fps})))});
  }
  /** Host-validated success events come through here; a plain dispatch of them is refused. */
  dispatchValidated(raw: unknown, now = Date.now()): Decision {
    const event = validateSemanticEvent(raw);
    if (!VALIDATED_ONLY.has(event.type)) return this.dispatch(event, now);
    return this.#select(event, now, true);
  }
  dispatch(raw: unknown, now = Date.now()): Decision {
    const event = validateSemanticEvent(raw);
    if (!Number.isFinite(now) || now < 0) throw new TypeError('INVALID_TIME');
    if (event.type === 'user_dismissed') { this.#dismissed = true; return this.#result(this.#current, 'dismissed', now, null, false); }
    if (event.type === 'user_typing_started') { this.#typing = true; return this.#result(this.#current, 'typing', now, EVENT_TO_MACHINE.user_typing_started, false); }
    if (event.type === 'user_typing_stopped') { this.#typing = false; return this.#result(this.#current, 'typing_stopped', now, EVENT_TO_MACHINE.user_typing_stopped, false); }
    if (VALIDATED_ONLY.has(event.type)) return this.#result(this.#current, 'needs_host_validation', now, null, false);
    return this.#select(event, now, false);
  }
  /** The person asked for a knock to come back (a snooze): one more nudge is allowed this session, their own request. */
  grant(): void { this.#maxNudges += 1; }
  /** Whether a knock may show now (the knock asks before it counts one); the same rules as a dispatch, nothing consumed. */
  nudgeAllowed(now = Date.now()): Decision['reason'] | 'allowed' {
    if (this.#dismissed) return 'nudge_suppressed_after_dismissal';
    if (this.#typing) return 'nudge_suppressed_while_typing';
    if (this.#inQuietHours(now)) return 'nudge_suppressed_quiet_hours';
    if (this.#nudges >= this.#maxNudges) return 'nudge_budget_spent';
    if (this.#prefs.sensitive) return 'sensitive_screen';
    return 'allowed';
  }
  #select(event: SemanticEvent, now: number, validated: boolean): Decision {
    let machine = EVENT_TO_MACHINE[event.type];
    if (machine === null) return this.#result(this.#current, 'noted', now, null, false);
    if (NUDGES.has(event.type)) { const nudge = this.nudgeAllowed(now); if (nudge !== 'allowed') return this.#result(this.#current, nudge, now, null, false); }
    let target = EVENT_STATE[machine];
    // Calm celebrations: past the day's cap a celebration is a small success.
    if (CELEBRATIONS.has(event.type)) {
      const day = this.#day(now); if (this.#celebrations.day !== day) this.#celebrations = {day, count: 0};
      if (this.#celebrations.count >= this.#perDay) { machine = 'success'; target = 'success'; }
    }
    const rule = ruleFor(target);
    if (this.#prefs.sensitive && !rule.sensitiveContextAllowed) return this.#result(this.#current, 'sensitive_screen', now, null, false);
    // Loops have no natural end: the host's machine decides when they stop, so only one-shots hold.
    const playing = this.#current !== 'idle' && now < this.#until && (ZIGI_MANIFEST.states[this.#current]?.kind ?? 'loop') === 'one-shot';
    // Phase 2 (P2.5, found by the states spec): a held reaction must never leave ZIGi talking. When the reply has ended
    // and the reaction it would have shown is held, the machine gets `idle` instead of nothing.
    const held = (reason: Decision['reason']) => this.#result(this.#current, reason, now, REPLY_END.has(event.type) && TALKING.has(this.#current) ? 'idle' : null, false);
    // Host facts (the panel opened or closed, offline, rest, a success) always reach the machine: no hold, no cooldown.
    const hostFact = HOST_DRIVEN.has(target);
    if (this.#current === target && now < this.#until && !hostFact) return held('current_hold');
    const currentRule = ruleFor(this.#current);
    if (playing && !hostFact && (currentRule.interruptibility === 'after_settle' || currentRule.priority > rule.priority)) return held('priority_hold');
    const last = this.#last.get(target) ?? -Infinity;
    if (!hostFact && now - last < rule.cooldownSeconds * 1000) return held('cooldown');
    if (!CONVERSATION.has(target) && now - this.#lastReactionAt < REACTION_GAP_MS) return held('rate_limited');
    this.#last.set(target, now);
    if (!CONVERSATION.has(target)) this.#lastReactionAt = now;
    if (NUDGES.has(event.type)) this.#nudges += 1;
    if (CELEBRATIONS.has(event.type) && (target === 'celebrate' || target === 'proud')) this.#celebrations.count += 1;
    const reason: Decision['reason'] = CELEBRATIONS.has(event.type) && target === 'success' ? 'celebration_cap' : validated ? 'validated_event' : 'semantic_event';
    return this.#result(target, reason, now, machine, true);
  }
  /** True the first time a marker fires for a given play; a replay or seeking back never re-fires it (no double knock). */
  markerFired(playId: number, name: string): boolean {
    if (!Number.isInteger(playId) || playId < 1 || playId > this.#playSeq || typeof name !== 'string') return false;
    const key = `${playId}:${name}`;
    if (this.#fired.has(key)) return false;
    this.#fired.add(key); return true;
  }
  /** Replaying the same clip is a player affair: it never creates a new play and never resets a cooldown. */
  replay(now = Date.now()): Decision | null {
    if (this.#current === 'idle' && !this.#playSeq) return null;
    const spec = ZIGI_MANIFEST.states[this.#current];
    if (spec?.kind === 'one-shot') this.#until = now + spec.durationMs;
    return this.#result(this.#current, 'replay', now, null, false);
  }
  snapshot() { return Object.freeze({current: this.#current, nudges: this.#nudges, dismissed: this.#dismissed, typing: this.#typing, playId: this.#playSeq, celebrationsToday: this.#celebrations.count}); }
}
