import {addLocalDays} from '../local-date';
import {billsSchema, type BillsRecord} from './schema';
import {budgetsSchema, type BudgetsRecord} from '../budgets/schema';

/** Session AK (7.3, 7.7): the Showcase's fictional bills and budgets, deterministic for a day (for lib/showcase-data.ts). */
export function showcaseBills(day: string): BillsRecord {
  const at = `${day}T09:00:00.000Z`;
  return billsSchema.parse({version: 1, dismissed: [], bills: [
    {id: 'showcase-bill-rent', title: 'Rent · SHOWCASE DATA', amount: '950.00', currency: 'EUR', cadence: 'monthly', nextDue: `${addLocalDays(day, 32).slice(0, 7)}-01`, origin: 'manual', category: 'Home', createdAt: at},
    {id: 'showcase-bill-music', title: 'Music · SHOWCASE DATA', amount: '9.99', currency: 'EUR', cadence: 'monthly', nextDue: addLocalDays(day, 27), origin: 'manual', category: 'Subscriptions', cancelNote: 'Fictional: check the family plan before renewing', createdAt: at},
    {id: 'showcase-bill-energy', title: 'Energy · SHOWCASE DATA', amount: '120.00', currency: 'EUR', cadence: 'monthly', nextDue: addLocalDays(day, 21), origin: 'manual', category: 'Bills', createdAt: at},
    {id: 'showcase-bill-insurance', title: 'Home insurance · SHOWCASE DATA', amount: '180.00', currency: 'EUR', cadence: 'yearly', nextDue: addLocalDays(day, 45), origin: 'manual', category: 'Bills', createdAt: at},
  ]});
}
export function showcaseBudgets(day: string): BudgetsRecord {
  const since = day.slice(0, 7);
  return budgetsSchema.parse({version: 1, budgets: [
    {id: 'showcase-budget-groceries', category: 'Groceries', currency: 'EUR', monthly: '250.00', rollover: true, since},
    {id: 'showcase-budget-food', category: 'Food & drink', currency: 'EUR', monthly: '120.00', rollover: false, since},
    {id: 'showcase-budget-fun', category: 'Fun', currency: 'EUR', monthly: '60.00', rollover: false, since},
  ]});
}
