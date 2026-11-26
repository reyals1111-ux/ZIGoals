import {describe, expect, test} from 'vitest';
import {expenseCategory} from '../money-log/category';
import {previewCategory, toMoneyEntries} from '../bankfiles';
import type {BankTransaction} from '../bankfiles/types';
import {detectBills} from '../bills/detect';

/**
 * Session AW (p5-fixes; FR-L-14): Lina's imported "Fictional Phone" landed as Other, so the bill she confirmed and its
 * spending sat under Other, not Bills. Phone, mobile, internet and the like now read as Bills, in the preview and in the
 * import alike, and the bill is still found from those rows.
 */
const row = (index: number, date: string, payee: string, amount: string): BankTransaction => ({index, date, amount, currency: 'EUR', direction: 'out', payee, reference: `r${index}`, description: ''});
const NOW = new Date('2026-11-20T10:00:00Z');

describe('FR-L-14: phone, mobile and internet providers read as Bills', () => {
  test('payees and words in English and Dutch', () => {
    for (const words of ['Fictional Phone', 'Fictional Mobile BV', 'Fictional Telecom', 'Fictional Broadband Ltd', 'Fibre Fictional', 'Fictional Wi-Fi', 'Fictional Utilities', 'Fictional Telefoon', 'Mobiel abonnement Fictional', 'Fictional Glasvezel', 'phone bill', 'internet']) {
      expect(expenseCategory(undefined, words), words).toBe('Bills');
    }
  });
  test('the earlier rules still win where they came first; other words are unchanged', () => {
    expect(expenseCategory(undefined, 'Fictional Grocer')).toBe('Groceries');
    expect(expenseCategory(undefined, 'Shell gas station')).toBe('Transport');
    expect(expenseCategory(undefined, 'Fictional Rent Co')).toBe('Home');
    expect(expenseCategory(undefined, 'Netflix')).toBe('Subscriptions');
    expect(expenseCategory(undefined, 'Fictional Shop')).toBe('Other');
    expect(expenseCategory('Fun', 'Fictional Phone')).toBe('Fun'); // a category the person named wins
  });
  test('Lina\'s CSV rows: the preview and the import say Bills, and the stepped bill is still found', () => {
    const rows = [row(1, '2026-08-04', 'Fictional Phone', '15.00'), row(2, '2026-09-04', 'Fictional Phone', '15.00'), row(3, '2026-10-04', 'Fictional Phone', '17.50'), row(4, '2026-11-04', 'Fictional Phone', '17.50')];
    expect(rows.map(r => previewCategory(r, []))).toEqual(['Bills', 'Bills', 'Bills', 'Bills']);
    let n = 0; const out = toMoneyEntries(rows, {entries: []}, NOW, () => `e${++n}`);
    expect(out.entries.map(e => e.category)).toEqual(['Bills', 'Bills', 'Bills', 'Bills']);
    const [bill] = detectBills(out.entries, '2026-11-20');
    expect(bill).toMatchObject({title: 'Fictional Phone', category: 'Bills'});
  });
});
