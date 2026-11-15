import {describe, expect, it} from 'vitest';
import {detectMoneyAppExport} from './app-exports';
import {planMoneyRows} from './money-rows';
import {guessMapping} from '../mapping';
import {MONEY_FIELDS} from './presets';

// Session AL Part 15 (AL-COMPETITOR-GAP-008, C-DVG-51; GAP-177, C-DVG-83): Mint, Monarch and YNAB exports are recognised by
// their header rows. Fictional rows only.
const MINT = ['Date', 'Description', 'Original Description', 'Amount', 'Transaction Type', 'Category', 'Account Name', 'Labels', 'Notes'];
const MONARCH = ['Date', 'Merchant', 'Category', 'Account', 'Original Statement', 'Notes', 'Amount', 'Tags'];
const COPILOT = ['date', 'name', 'amount', 'status', 'category', 'parent category', 'excluded', 'tags', 'type', 'account', 'account mask', 'note', 'recurring'];
const YNAB = ['Account', 'Flag', 'Date', 'Payee', 'Category Group/Category', 'Category Group', 'Category', 'Memo', 'Outflow', 'Inflow', 'Cleared'];

describe('detectMoneyAppExport', () => {
  it('a Mint export: Transaction Type decides in or out; amounts are all positive', () => {
    const app = detectMoneyAppExport(MINT)!;
    expect(app).toMatchObject({id: 'mint', label: 'Mint', dateFormat: 'mdy', mapping: {date: 0, payee: 1, amount: 3, direction: 4, category: 5, note: 8}});
    const plan = planMoneyRows({rows: [['10/02/2026', 'Corner Grocery', 'CORNER GROCERY 123', '42.10', 'debit', 'Groceries', 'Checking', '', ''], ['10/15/2026', 'Example Payroll', 'PAYROLL', '1500.00', 'credit', 'Paycheck', 'Checking', '', 'October']], mapping: app.mapping, numberStyle: 'point', dateFormat: app.dateFormat!, currency: 'USD'});
    expect(plan.refused).toEqual([]);
    expect(plan.transactions.map(t => [t.date, t.amount, t.direction, t.payee])).toEqual([['2026-10-02', '42.1', 'out', 'Corner Grocery'], ['2026-10-15', '1500', 'in', 'Example Payroll']]);
  });
  it('a Monarch export: Merchant is the payee, a minus sign is money out, the Original Statement is not imported', () => {
    const app = detectMoneyAppExport(MONARCH)!;
    expect(app).toMatchObject({id: 'monarch', dateFormat: 'iso', mapping: {date: 0, payee: 1, category: 2, note: 5, amount: 6}});
    expect(Object.values(app.mapping)).not.toContain(4);
    const plan = planMoneyRows({rows: [['2026-10-03', 'Streaming Service', 'Subscriptions', 'Checking', 'STREAMING*SVC', '', '-12.99', ''], ['2026-10-25', 'Example Employer', 'Paychecks', 'Checking', 'PAYROLL OCT', 'Salary', '2400.00', '']], mapping: app.mapping, numberStyle: 'point', dateFormat: 'iso', currency: 'USD'});
    expect(plan.transactions.map(t => [t.date, t.amount, t.direction, t.payee])).toEqual([['2026-10-03', '12.99', 'out', 'Streaming Service'], ['2026-10-25', '2400', 'in', 'Example Employer']]);
    expect(plan.warnings).toEqual([]);
  });
  // Session AO (C-DVG-51): a Copilot Money export, recognised by its lower-case header; spending is positive there.
  it('a Copilot export: name is the payee, a positive amount is money out, a minus sign money in', () => {
    const app = detectMoneyAppExport(COPILOT)!;
    expect(app).toMatchObject({id: 'copilot', label: 'Copilot', dateFormat: 'iso', positiveIsOut: true, mapping: {date: 0, payee: 1, amount: 2, category: 4, note: 11}});
    expect(Object.values(app.mapping)).not.toContain(8); // type (regular/income/internal transfer) is not the direction
    const rows = [
      ['2026-10-04', 'Corner Bakery', '8.40', 'posted', 'Coffee', 'Food & Drink', 'false', '', 'regular', 'Everyday Card', '1234', '', 'false'],
      ['2026-10-28', 'Example Employer', '-2100.00', 'posted', 'Paycheck', 'Income', 'false', '', 'income', 'Checking', '5678', 'October', 'true'],
      ['2026-10-30', 'Shoe Shop', '-35.00', 'pending', 'Shopping', 'Shopping', 'false', 'refund', 'regular', 'Everyday Card', '1234', 'Returned', 'false'],
    ];
    const plan = planMoneyRows({rows, mapping: app.mapping, numberStyle: 'point', dateFormat: app.dateFormat!, currency: 'USD', positiveIsOut: app.positiveIsOut});
    expect(plan.refused).toEqual([]);
    expect(plan.transactions.map(t => [t.date, t.amount, t.direction, t.payee])).toEqual([['2026-10-04', '8.4', 'out', 'Corner Bakery'], ['2026-10-28', '2100', 'in', 'Example Employer'], ['2026-10-30', '35', 'in', 'Shoe Shop']]);
    expect(plan.warnings).toEqual([]);
    // without the preset's sign rule the same rows read the other way round: the rule is what makes them right
    expect(planMoneyRows({rows, mapping: app.mapping, numberStyle: 'point', dateFormat: 'iso', currency: 'USD'}).transactions.map(t => t.direction)).toEqual(['in', 'out', 'out']);
  });
  it('a Copilot export in title case is still recognised; a plain date/name/amount file is not', () => {
    expect(detectMoneyAppExport(COPILOT.map(h => h.replace(/\b\w/g, c => c.toUpperCase())))?.id).toBe('copilot');
    expect(detectMoneyAppExport(['date', 'name', 'amount'])).toBeNull();
  });
  it('a YNAB register is named and pointed to its own reader, with nothing pre-matched', () => {
    expect(detectMoneyAppExport(YNAB)).toMatchObject({id: 'ynab', mapping: {}, note: expect.stringContaining('Bring your history with you')});
  });
  it('any other bank file is not called an app export; a header in another case still matches', () => {
    expect(detectMoneyAppExport(['Date', 'Description', 'Amount'])).toBeNull();
    expect(detectMoneyAppExport(['Booking date', 'Name', 'Amount', 'Debit/Credit'])).toBeNull();
    expect(detectMoneyAppExport(MONARCH.map(h => h.toUpperCase()))?.id).toBe('monarch');
  });
  it('the general guess alone would also read these columns (the preset only makes it explicit and names the app)', () => {
    expect(guessMapping(MONARCH, MONEY_FIELDS)).toMatchObject({date: 0, payee: 1, category: 2, note: 5, amount: 6});
  });
});
