import {accountsSchema, type Accounts} from '../accounts/schema';
import {addLocalDays} from '../local-date';

/**
 * Session AK (BUILD list 2 #11), for the lead to wire in lib/showcase-data.ts: the Showcase's accounts are in US dollars
 * while its money log, bills and budgets are in euros, so "Next 60 days" would draw a flat dollar line and leave the euro
 * bills out. This adds one fictional euro cash account (named SHOWCASE DATA), with a balance a month ago and today, so
 * the Showcase's euro bills, budgets and money log make a labelled example line. Deterministic for a day; the input
 * accounts are not changed.
 */
export const SHOWCASE_EURO_CASH_ID = '93000000-0000-4000-8000-000000000900';
export function withShowcaseEuroCash(accounts: Accounts, day: string): Accounts {
  if (accounts.items.some(a => a.id === SHOWCASE_EURO_CASH_ID)) return accounts;
  const at = `${addLocalDays(day, -60)}T09:00:00.000Z`;
  return accountsSchema.parse({...accounts, items: [...accounts.items, {
    id: SHOWCASE_EURO_CASH_ID, kind: 'cash', name: 'Euro everyday account', currency: 'EUR', institution: 'SHOWCASE DATA · fictional bank',
    snapshots: [{id: '93000000-0000-4000-8000-000000000901', date: addLocalDays(day, -30), value: '164000', decimals: 2}, {id: '93000000-0000-4000-8000-000000000902', date: day, value: '185000', decimals: 2}],
    payments: [], createdAt: at, updatedAt: `${day}T09:00:00.000Z`,
  }]});
}
