/**
 * Session AL (PR-018, P-PR-22, P-MO-55; MO-025, MO-115, MO-132, M-136): ONE rule for every Health timer, wherever it is
 * stopped (the Health page, the Checklist corner, ZIGi): a timer stopped before its minimum saves nothing, says so in
 * these words, and offers Undo where the stop can be taken back. The minimum is stated once, here (fifth pass: one
 * minute for all; the fourth pass had ten minutes for sleep and fasts and one second for meditation, which the owner's
 * scope for PR-018 replaced with one minimum for every timer).
 * Before this, Sleep and the Checklist's fast dropped anything under ten minutes while Health's own fast Stop kept
 * "0.0 h" fasts, and nothing said which rule applied where.
 */
export type TimedKind = 'sleep' | 'fast' | 'meditation' | 'focus';
/**
 * Session AL fifth pass (PR-018, replay L2 round 2): ONE minimum for every timer, wherever it is stopped: one minute.
 * Sleep and Fast dropped anything under ten minutes while Meditate kept 21 seconds and Focus under a minute was dropped,
 * so three rules applied. A minute is Focus's rule already; a stop in the first minute is a tap by mistake for each of
 * them, and the stop that drops it offers Undo. (Deliberate: an 8-second breathing exercise is no longer kept;
 * tests/meditation.spec.ts runs it past the minute.)
 */
export const TIMER_MINIMUM_MS: Readonly<Record<TimedKind, number>> = {sleep: 60_000, fast: 60_000, meditation: 60_000, focus: 60_000};

/** True when a timer that ran for `ms` is too short to save. */
export const tooShortToSave = (kind: TimedKind, ms: number) => !(ms >= TIMER_MINIMUM_MS[kind]);
const NOUN: Record<TimedKind, string> = {sleep: 'Sleep', fast: 'The fast', meditation: 'Meditation', focus: 'Focus'};
/** The words said when it is not saved: "Stopped after less than a minute, so nothing was saved." (`named`: "Focus stopped…"). */
export const tooShortText = (kind: TimedKind, named = false) => `${named ? `${NOUN[kind]} stopped` : 'Stopped'} after less than a minute, so nothing was saved.`;
/** The rule itself, for a page's fine print. */
export const timerRuleText = 'A timer stopped within its first minute saves nothing: sleep, fasts, meditation and focus alike.';
