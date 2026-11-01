/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-15): the weekly coach check-in on Today and the Life review
 * ("Log a weight or two…") shows only where Health is part of the person's app: the Health page is shown, or a weight is
 * already logged. A setup without Health is never asked for weights.
 */
export const coachSlotShown = ({healthShown, weights}: {healthShown: boolean; weights: number}): boolean => healthShown || weights > 0;
