/**
 * Session AL (L4; DV-001/P-DVR-01, DV-003, DV-025, DV-033, DV-049, DV-050, DV-055, DV-097, DV-098; D-071, D-101, D-102,
 * M-123, N-143, N-155, N-157, BUG-011): one reading of every Goal amount a person types — the wizard's target, Edit
 * details, a contribution plan, history and funding — through the shared limits table (validateValue). One vocabulary:
 * "Enter an amount above 0." for 0 and negatives, a plain cap of a trillion, and the reason every time (never a bare
 * "Could not save." or "History was not saved.").
 */
import {validateValue, LIMITS} from '../limits/plausibility';
import {parseNumberInput} from '../numbers/parse';
import {parseAmountInput} from '../amount-input';

export type GoalAmountRead = {ok: true; text: string; error: null} | {ok: false; text: null; error: string};
export type GoalAmountWhat = 'target' | 'amount' | 'plan';

const MISSING: Record<GoalAmountWhat, string> = {target: 'Enter your target.', amount: 'Enter an amount.', plan: 'Enter the planned amount.'};
export const ABOVE_ZERO = 'Enter an amount above 0.';
export const UNREADABLE = 'Enter a number, like 1500 or 12.50.';
export const OVER_CAP = 'Enter an amount up to a trillion (1,000,000,000,000).';

/**
 * Reads `raw` for a Goal counted in `unit` (USD/EUR for money, else a coin or the person's own word). On success `text`
 * is the canonical decimal, ready for parseAmountInput(text, decimals).
 */
export function readGoalAmount(raw: string, unit: string, what: GoalAmountWhat = 'target'): GoalAmountRead {
 const typed = String(raw ?? '').trim();
 if (!typed) return {ok: false, text: null, error: MISSING[what]};
 // The sign first: "-5" and "0" get the same sentence (DV-003a: they said two different things).
 const signed = parseNumberInput(typed, {allowNegative: true});
 if (signed.ok && signed.value <= 0) return {ok: false, text: null, error: ABOVE_ZERO};
 if (signed.ok && signed.value > LIMITS.amountMax) return {ok: false, text: null, error: OVER_CAP};
 // Unreadable text: the reason parseAmountInput gives (an ambiguous "1,234" says why), but never the jargon "non-negative
 // decimal" (DV-003c: 0 is refused too, so the old words were wrong); Session AL second pass, COPY_AUDIT §2.
 try { parseAmountInput(typed, 18); } catch (e) { const said = e instanceof Error ? e.message : ''; return {ok: false, text: null, error: said && !/non-negative decimal/i.test(said) ? said : UNREADABLE}; }
 const money = unit === 'USD' || unit === 'EUR';
 const read = money ? validateValue('money', typed, unit) : validateValue('goalTarget', typed);
 if (!read.ok) return {ok: false, text: null, error: read.error};
 if (read.value <= 0) return {ok: false, text: null, error: ABOVE_ZERO};
 return {ok: true, text: read.text, error: null};
}

/** The sentence to show beside the field, or null when the amount is fine. */
export function goalAmountIssue(raw: string, unit: string, what: GoalAmountWhat = 'target'): string | null {
 return readGoalAmount(raw, unit, what).error;
}
