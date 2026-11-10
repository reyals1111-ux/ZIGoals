import {isDebtKind, type Accounts, type AccountKind} from '../accounts/schema';
import {balanceOn, moneyText, type Money} from '../accounts/net-worth';

/**
 * Session AL (RR-2): what the goal wizard says about Wealth's accounts. A goal counts Wealth's assets (positions, through
 * the allocation model); an account (Accounts, debts & net worth, `zigoals:accounts:v1`) is a balance the person notes
 * for net worth, kept in a separate record whose fields are exactly its synced home's, so it cannot be allocated without a
 * stored-format change. The wizard therefore names the person's accounts, says plainly that they are not counted, and
 * offers the way: record a cash or savings balance in the goal's currency as a Cash asset (the asset form opens filled
 * in; the person reviews and saves it). Nothing is moved, archived or saved here. Pure.
 */
export type AccountCashDraft = {category: 'Cash'; name: string; quantity: string; currency: string; notes: string};
export type AccountOffer = {id: string; name: string; kind: AccountKind; currency: string; balance: (Money & {date: string}) | null;
  /** Present for a cash or savings account with a positive balance in the goal's currency. */ draft?: AccountCashDraft;
  /** Why there is no draft, in plain words; absent when there is one. */ why?: string};
const CASH_LIKE: readonly AccountKind[] = ['cash', 'savings'];

export function accountsForGoal(accounts: Accounts, goalCurrency: string, today: string): AccountOffer[] {
  const currency = goalCurrency.trim().toUpperCase();
  return accounts.items.filter(a => !a.archivedAt && !isDebtKind(a.kind)).map(a => {
    const balance = balanceOn(a, today), base = {id: a.id, name: a.name, kind: a.kind, currency: a.currency, balance};
    if (!CASH_LIKE.includes(a.kind)) return {...base, why: 'not a cash or savings balance'};
    if (!balance) return {...base, why: 'no balance recorded yet'};
    if (a.currency !== currency) return {...base, why: `in ${a.currency}, and this goal counts ${currency || 'its own currency'}`};
    if (balance.value <= 0n) return {...base, why: 'its balance is zero'};
    return {...base, draft: {category: 'Cash', name: a.name, quantity: moneyText(balance), currency: a.currency, notes: `Recorded from the Wealth account “${a.name}” (balance on ${balance.date}).`}};
  });
}
