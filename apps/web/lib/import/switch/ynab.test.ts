import {describe, expect, test} from 'vitest';
import {emptyMoneyLog, moneyLogSchema} from '../../money-log/schema';
import {dateOrderOf, isYnabHeader, mergeMoneyEntries, readYnab, ynabAmount, ynabDate} from './ynab';

// Session AK (A15): YNAB's register export. Fictional transactions.
const HEADER = '"Account","Flag","Date","Payee","Category Group/Category","Category Group","Category","Memo","Outflow","Inflow","Cleared"';
const CSV = [HEADER,
  '"Checking","","13/10/2026","Albert Heijn","Everyday: Groceries","Everyday","Groceries","","€45,20","€0,00","Cleared"',
  '"Checking","","14/10/2026","Café Noir","Fun: Eating out","Fun","Eating out","=HYPERLINK(""x"")","€1.234,56","€0,00","Cleared"',
  '"Checking","","15/10/2026","Employer","Inflow: Ready to Assign","Inflow","Ready to Assign","Salary October","€0,00","€2.500,00","Cleared"',
  '"Checking","","15/10/2026","Transfer : Savings","","","","","€100,00","€0,00","Cleared"',
  '"Checking","","16/10/2026","Mystery","","","","","lots","€0,00","Cleared"',
  '"Checking","","30/12/2026","Insurance","Bills: Insurance","Bills","Insurance","","€20,00","€0,00","Uncleared"',
  '"Checking","","13/10/2026","Albert Heijn","Everyday: Groceries","Everyday","Groceries","","€45,20","€0,00","Cleared"',
].join('\n');
const opts = {currency: 'EUR', today: '2026-10-31', now: new Date('2026-10-31T09:00:00Z')};

describe('YNAB register', () => {
  test('recognised by its header', () => { expect(isYnabHeader(HEADER)).toBe(true); expect(isYnabHeader('Date,Amount')).toBe(false); });
  test('amounts in the plan’s own format', () => {
    expect(['€1.234,56', '$1,234.56', '1 234,56 kr', '12.5', '1,234', '€0,00', '', 'lots', '-12.00', '12.345.678,9'].map(ynabAmount))
      .toEqual(['1234.56', '1234.56', '1234.56', '12.50', '1234.00', undefined, undefined, null, null, '12345678.90']);
  });
  test('date order from the dates themselves; ambiguous when every date could be either', () => {
    expect(dateOrderOf(['13/10/2026', '01/02/2026'])).toEqual({order: 'dmy', ambiguous: false});
    expect(dateOrderOf(['10/13/2026'])).toEqual({order: 'mdy', ambiguous: false});
    expect(dateOrderOf(['2026-10-13'])).toEqual({order: 'ymd', ambiguous: false});
    expect(dateOrderOf(['01/02/2026', '03/04/2026'])).toEqual({order: null, ambiguous: true});
    expect([ynabDate('13.10.2026', 'dmy'), ynabDate('02/30/2026', 'mdy'), ynabDate('1/2/26', 'mdy')]).toEqual(['2026-10-13', null, null]);
  });
  test('expenses and income, categories mapped by words, transfers and future rows left out, payee and memo kept as text', async () => {
    const plan = await readYnab(CSV, opts);
    expect(plan.dateOrder).toBe('dmy');
    expect(plan.entries.map(e => [e.kind, e.date, e.amount, e.category, e.note])).toEqual([
      ['expense', '2026-10-13', '45.20', 'Groceries', 'Albert Heijn'],
      ['expense', '2026-10-14', '1234.56', 'Food & drink', 'Café Noir · HYPERLINK("x")'],
      ['income', '2026-10-15', '2500.00', 'Salary', 'Employer · Salary October'],
      ['expense', '2026-10-13', '45.20', 'Groceries', 'Albert Heijn'],
    ]);
    expect(plan.entries[0]).toMatchObject({currency: 'EUR', importedFrom: 'ynab', importedCategory: 'Everyday: Groceries'});
    expect(new Set(plan.entries.map(e => e.id)).size).toBe(4); // the same purchase twice in a day stays two purchases
    expect(plan.warnings.join(' ')).toMatch(/1 transfer between your own accounts/);
    expect(plan.warnings.join(' ')).toMatch(/1 row has a date or amount/);
    expect(plan.warnings.join(' ')).toMatch(/1 transaction is dated after today/);
  });
  test('tab-separated, an ambiguous file read as asked, and merged without duplicates; the money log accepts the new fields', async () => {
    const tsv = ['Account\tFlag\tDate\tPayee\tCategory Group/Category\tCategory Group\tCategory\tMemo\tOutflow\tInflow\tCleared', 'Cash\t\t01/02/2026\tBakery\t\t\t\t\t3,50\t0,00\tCleared'].join('\n');
    expect((await readYnab(tsv, opts)).entries[0]).toMatchObject({date: '2026-01-02', amount: '3.50'});
    expect((await readYnab(tsv, {...opts, dateOrder: 'dmy'})).entries[0]!.date).toBe('2026-02-01');
    const plan = await readYnab(CSV, opts);
    const once = mergeMoneyEntries(emptyMoneyLog(), plan.entries), twice = mergeMoneyEntries(once.next, plan.entries);
    expect([once.added, twice.added, twice.duplicates]).toEqual([4, 0, 4]);
    expect(moneyLogSchema.parse(JSON.parse(JSON.stringify(once.next))).entries[0]).toMatchObject({importedFrom: 'ynab'});
  });
  test('refusals', async () => {
    await expect(readYnab(CSV, {...opts, currency: 'euro'})).rejects.toThrow(/currency/);
    await expect(readYnab('a,b\n1,2', opts)).rejects.toThrow(/not a YNAB register/);
    await expect(readYnab(`${HEADER}\n"A","","13/10/2026","Transfer : B","","","","","€1,00","€0,00",""`, opts)).rejects.toThrow(/no spending or income/);
  });
});
