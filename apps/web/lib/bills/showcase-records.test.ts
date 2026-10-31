import {expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {BILLS_KEY, billsSchema} from './schema';
import {BUDGETS_KEY, budgetsSchema} from '../budgets/schema';

// Session AK (lane WW): the Showcase carries the fictional bills and budgets (lib/bills/showcase.ts), valid for their schemas.
test('the Showcase writes its bills and budgets records', () => {
  const {records} = buildShowcase('2026-10-31', 'UTC');
  const bills = billsSchema.parse(JSON.parse(records[BILLS_KEY]!)), budgets = budgetsSchema.parse(JSON.parse(records[BUDGETS_KEY]!));
  expect(bills.bills.length).toBeGreaterThan(0);
  expect(bills.bills.every(b => b.title.includes('SHOWCASE DATA'))).toBe(true);
  expect(budgets.budgets.map(b => b.category)).toContain('Groceries');
});
