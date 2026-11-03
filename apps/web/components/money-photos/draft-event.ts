/**
 * Session AK (BUILD list 2 #10): the receipt photo's draft travels to the Spending form as a page event (nothing is
 * stored, nothing leaves the page). The form fills its fields and says "Check it, then Save"; nothing is saved by itself.
 */
export const MONEY_DRAFT_EVENT = 'zigoals-money-draft';
export type MoneyDraft = {amount?: string; date?: string; payee?: string; currency?: string};
export function sendMoneyDraft(draft: MoneyDraft): void {
  window.dispatchEvent(new CustomEvent<MoneyDraft>(MONEY_DRAFT_EVENT, {detail: draft}));
}
