/**
 * Session AL third pass (L4): the checks a Goal's form makes before saving, one place for the wizard and Edit details.
 * - TK-176: a target of a billion or more is possible but unusual: it asks once ("check this?"), never refuses. The tier
 *   is Wealth's (lib/wealth-plausibility.ts PLAUSIBLE_MONEY_MAX), so a Goal and an account ask at the same size.
 * - N-BN-19: a target date has a year bound (the native field took years up to 275760).
 * - BN-140: a name pasted past its limit says what was left out (it was cut silently at 80).
 */
import {PLAUSIBLE_MONEY_MAX} from '../wealth-plausibility';
import {formatGoalAmount} from '../goal-summary';

/** The sentence to show under the target, or null for an ordinary amount. `text` is readGoalAmount's canonical decimal. */
export function goalTargetCheck(text: string, unit: string): string | null {
 const n = Number(text);
 if (!Number.isFinite(n) || n < PLAUSIBLE_MONEY_MAX) return null;
 return `${formatGoalAmount(text, unit)} is more than a billion — unusually large for a goal. Check the digits; if it is right, choose “Keep this amount”.`;
}

/** The latest target date a Goal takes: the end of the year a hundred years from `today` (YYYY-MM-DD). */
export const goalDateMax = (today: string) => `${Number(today.slice(0, 4)) + 100}-12-31`;
/** Why a target date is refused, or null. An unchanged stored date is the caller's to allow. */
export function goalDateIssue(date: string, today: string): string | null {
 if (!date) return null;
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choose a date.';
 if (date < today) return 'Choose today or a future target date.';
 const max = goalDateMax(today);
 if (date > max) return `Choose a target date up to ${max.slice(0, 4)}.`;
 return null;
}

/**
 * A paste into a field of `max` characters that would not fit: what the field says ("Names hold up to 80 characters; the
 * last 220 were left out."), or null when it fits.
 */
export function pasteCutNote(value: string, selected: number, pasted: string, max: number, noun = 'Names'): string | null {
 const over = value.length - selected + pasted.length - max;
 return over > 0 ? `${noun} hold up to ${max} characters; the last ${over} ${over === 1 ? 'was' : 'were'} left out.` : null;
}
