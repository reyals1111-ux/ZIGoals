/**
 * Session AL (PR-018, P-PR-22, P-MO-55; MO-025, MO-115, MO-132, M-136): ONE rule for every Health timer, wherever it is
 * stopped (the Health page, the Checklist corner, ZIGi): a timer stopped before its minimum saves nothing, says so in
 * these words, and offers Undo where the stop can be taken back. The minimums are stated once, here:
 *   - sleep and fasting: 10 minutes (a sleep or a fast that short is a tap by mistake, not a night or a fast);
 *   - meditation: 1 second (a breathing exercise of a few breaths is real practice; the page and the Checklist both keep
 *     it and say its length in seconds). A longer minimum would drop the pinned 8-second breathing session
 *     (tests/meditation.spec.ts); raising it is an owner decision.
 * Before this, Sleep and the Checklist's fast dropped anything under ten minutes while Health's own fast Stop kept
 * "0.0 h" fasts, and nothing said which rule applied where.
 */
export type TimedKind = 'sleep' | 'fast' | 'meditation';
export const TIMER_MINIMUM_MS: Readonly<Record<TimedKind, number>> = {sleep: 10 * 60_000, fast: 10 * 60_000, meditation: 1_000};
const LIMIT: Record<TimedKind, string> = {sleep: 'ten minutes', fast: 'ten minutes', meditation: 'a second'};

/** True when a timer that ran for `ms` is too short to save. */
export const tooShortToSave = (kind: TimedKind, ms: number) => !(ms >= TIMER_MINIMUM_MS[kind]);
/** The words said when it is not saved (the Checklist's words, kept): "Stopped after less than ten minutes, so nothing was saved." */
export const tooShortText = (kind: TimedKind) => `Stopped after less than ${LIMIT[kind]}, so nothing was saved.`;
/** The rule itself, for a page's fine print. */
export const timerRuleText = 'Sleep and fasts stopped within ten minutes are not saved; meditation is saved from one second.';
