import {addLocalDays} from '../local-date';
import {moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';

/** Session AI: the Showcase's fictional spending and income for the last five weeks, with a weekly budget. Deterministic for a day. */
export function showcaseMoneyLog(day: string): MoneyLog {
  const at = (offset: number) => `${addLocalDays(day, offset)}T12:00:00.000Z`;
  const rows: [number, 'expense' | 'income', string, string, string][] = [
    [0, 'expense', '4.20', 'Food & drink', 'Coffee'], [-1, 'expense', '12.50', 'Food & drink', 'Lunch'], [-1, 'expense', '38.90', 'Groceries', 'Weekly shop'], [-2, 'expense', '2.80', 'Transport', 'Tram'],
    [-3, 'expense', '9.99', 'Subscriptions', 'Music'], [-4, 'expense', '24.00', 'Fun', 'Cinema'], [-5, 'expense', '61.30', 'Groceries', 'Market'], [-7, 'expense', '14.00', 'Food & drink', 'Lunch'],
    [-8, 'expense', '42.10', 'Groceries', 'Weekly shop'], [-9, 'expense', '120.00', 'Bills', 'Energy'], [-10, 'expense', '18.40', 'Food & drink', 'Dinner'], [-12, 'expense', '35.00', 'Shopping', 'Shoes (sale)'],
    [-14, 'expense', '44.80', 'Groceries', 'Weekly shop'], [-15, 'expense', '7.60', 'Transport', 'Train'], [-17, 'expense', '22.50', 'Food & drink', 'Pizza'], [-21, 'expense', '39.70', 'Groceries', 'Weekly shop'],
    [-23, 'expense', '15.00', 'Health', 'Pharmacy'], [-26, 'expense', '58.00', 'Gifts', 'Birthday present'], [-30, 'expense', '41.20', 'Groceries', 'Weekly shop'],
    [-3, 'income', '2400.00', 'Salary', 'October salary'], [-16, 'income', '150.00', 'Freelance', 'Logo design'],
  ];
  const entries: MoneyEntry[] = rows.map(([offset, kind, amount, category, note], i) => ({id: `showcase-money-${i}`, kind, amount, currency: 'EUR', category, note: `${note} · SHOWCASE DATA`, date: addLocalDays(day, offset), createdAt: at(offset), source: 'form'}));
  return moneyLogSchema.parse({version: 1, entries, budget: {weekly: '200.00', currency: 'EUR'}, weekStartsOn: 'monday', currency: 'EUR'});
}
