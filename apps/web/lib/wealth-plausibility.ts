import {VALUE_LIMITS} from './limits/plausibility';
import {formatCurrencyAmount} from './visual-format';

/**
 * Session AL (P-TK-49: TK-039, N-TK-12, W6): a "check this?" tier between "fine" and "refused". A money amount the
 * store accepts (up to VALUE_LIMITS.money.max, a trillion) but that is far beyond what one person's account, debt or
 * asset usually holds asks once before it is saved. It never refuses: saving the same amount again keeps it.
 */
/** A thousandth of the money limit: a billion. Amounts at or above it ask "check this?". */
export const PLAUSIBLE_MONEY_MAX = VALUE_LIMITS.money.max / 1000;

export type PlausibleWhat = 'balance' | 'debt' | 'value';
const NOUN: Record<PlausibleWhat, string> = {balance: 'a balance', debt: 'a debt', value: 'a value'};

/**
 * The sentence to show beside the field, or null when the amount is ordinary (or not a number: the field's own
 * validation answers that). The amount is written with the format layer: USD/EUR as money, any other code as typed.
 */
export function plausibilityWarning(amount: number, currency: string, what: PlausibleWhat): string | null {
  if (!Number.isFinite(amount) || Math.abs(amount) < PLAUSIBLE_MONEY_MAX) return null;
  return `${formatCurrencyAmount(String(Math.abs(amount)), currency)} is more than a billion — unusually large for ${NOUN[what]}. Check the digits; if it is right, save again to keep it.`;
}

/**
 * One form's "asked once" memory: `check(key, warning)` answers true when the form may save now. The first submit of
 * an implausible amount answers false (show the warning); a second submit of the same field and amount answers true.
 * Changing the amount asks again.
 */
export function plausibleConfirm() {
  let asked: string | null = null;
  return {
    check(key: string, warning: string | null): boolean {
      if (!warning) { asked = null; return true; }
      if (asked === key) { asked = null; return true; }
      asked = key; return false;
    },
    reset() { asked = null; },
  };
}
