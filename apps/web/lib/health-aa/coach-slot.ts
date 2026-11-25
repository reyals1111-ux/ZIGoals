/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-15): the weekly coach check-in on Today and the Life review
 * ("Log a weight or two…") shows only where Health is part of the person's app: the Health page is shown, or a weight is
 * already logged. A setup without Health is never asked for weights.
 *
 * Session AL (P-NB-10, NB-244): a fresh profile with the Health page shown but nothing logged yet (a preset such as
 * Balanced) no longer gets the coach on Today: with Health shown, the card waits for a first Health record of any kind
 * (`records`). A weight alone always shows it. `records` left out keeps the earlier rule (unknown, not zero).
 */
/*
 * Session AW (p5-fixes; FR-S-14, Today part): a person with no weight interest who logged only water or meals still got
 * "Weekly check-in · Your coach · Log a weight" on Today. When the caller says whether a goal weight is set
 * (`weightGoal`), the coach waits for a first weigh-in or that goal weight; Health's Weight view keeps the full coach.
 * `weightGoal` left out keeps the rule above (as the earlier callers had it).
 */
export const coachSlotShown = ({healthShown, weights, records, weightGoal}: {healthShown: boolean; weights: number; records?: number; weightGoal?: boolean}): boolean =>
  weights > 0 || (healthShown && (weightGoal !== undefined ? weightGoal : records === undefined || records > 0));

/** Session AL (NB-254): where "Log a weight →" goes: the Weight view, with its weight field focused (not the Diary). */
export const LOG_WEIGHT_HREF = '/app/health?view=weight&add=weight';
