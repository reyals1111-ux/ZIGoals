import {describe, expect, test} from 'vitest';
import {addOwnCategory, budgetMonthParts, bulkCategory, bulkExcluded, categoryChoices, changesBetween, isCounted, removeOwnCategory, withMarks} from './counted';
import {byCategory, totals} from './engine';
import {searchEntries, usedPayees} from './search';
import {emptyMoneyLog, type MoneyEntry, type MoneyLog} from './schema';
import {monthView} from '../budgets/engine';
import {monthRecap} from '../budgets/recap';
import {vsLastMonth} from '../money-insights/month-compare';

/** Session AV lane 2 (money; YNAB, Rocket Money, Monarch, Copilot): left out, spread, own categories, bulk changes, history, filters. */
let n = 0;
const e = (date: string, amount: string, category = 'Groceries', more: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `t${n++}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...more});
const AT = '2026-11-22T10:00:00.000Z';

describe('left out of the figures', () => {
  const interest = e('2026-11-03', '12.00', 'Bills', {excluded: true, note: 'Card interest'}), shop = e('2026-11-04', '40.00'), pay = e('2026-11-05', '300.00', 'Other', {transfer: 'x'});
  const log = [interest, shop, pay];
  test('an entry left out and a transfer count in no total, category, budget, recap or comparison', () => {
    expect(isCounted(interest)).toBe(false); expect(isCounted(pay)).toBe(false); expect(isCounted(shop)).toBe(true);
    expect(totals(log, '2026-11-01', '2026-11-30')).toEqual([{currency: 'EUR', expenses: 4000, income: 0, count: 1}]);
    expect(byCategory(log, '2026-11-01', '2026-11-30').map(c => c.category)).toEqual(['Groceries']);
    const view = monthView(log, {version: 1, budgets: [{id: 'b', category: 'Bills', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-11'}]}, '2026-11', '2026-11-22');
    expect(view.rows[0]!.spent).toBe(0);
    expect(view.unbudgeted).toEqual([{category: 'Groceries', currency: 'EUR', spent: 4000}]);
    expect(monthRecap(log, {version: 1, budgets: []}, '2026-11', '2026-11-22')[0]!.spent).toBe(4000);
    expect(vsLastMonth(log, 'EUR', '2026-11-22').rows.map(r => r.category)).toEqual(['Groceries']);
  });
  test('search finds them, and "only what counts" / "only what is left out" split them', () => {
    expect(searchEntries(log, {counted: 'counted'}).map(x => x.id)).toEqual([shop.id]);
    expect(searchEntries(log, {counted: 'left-out'}).map(x => x.id).sort()).toEqual([interest.id, pay.id].sort());
  });
});

describe('spread over months in budgets', () => {
  test('a yearly insurance at a twelfth a month, the shares adding up exactly; the month it was paid shows it whole in totals', () => {
    const insurance = e('2026-01-15', '100.00', 'Bills', {spread: 12});
    const shares = Array.from({length: 13}, (_, i) => budgetMonthParts(insurance, `2026-${String(i + 1).padStart(2, '0')}`).reduce((s, p) => s + p.cents, 0));
    expect(shares.slice(0, 12).reduce((s, c) => s + c, 0)).toBe(10000);
    expect(shares[0]).toBe(834); expect(shares[11]).toBe(833); expect(shares[12]).toBe(0);
    expect(budgetMonthParts(insurance, '2025-12')).toEqual([]);
    const record = {version: 1 as const, budgets: [{id: 'b', category: 'Bills', currency: 'EUR', monthly: '20.00', rollover: false, since: '2026-01'}]};
    expect(monthView([insurance], record, '2026-06', '2026-06-10').rows[0]!.spent).toBe(833);
    expect(totals([insurance], '2026-01-01', '2026-01-31')[0]!.expenses).toBe(10000);
  });
});

describe('own categories', () => {
  test('added once, offered after the usual ones, removed from the choices only', () => {
    let log: MoneyLog = addOwnCategory(emptyMoneyLog(), 'expense', '  Pets ');
    expect(categoryChoices(log, 'expense').at(-1)).toBe('Pets');
    expect(categoryChoices(log, 'income')).not.toContain('Pets');
    expect(() => addOwnCategory(log, 'expense', 'pets')).toThrow('Pets is already a category.');
    expect(() => addOwnCategory(log, 'expense', 'groceries')).toThrow('already a category');
    expect(() => addOwnCategory(log, 'expense', 'x'.repeat(41))).toThrow('at most 40');
    log = removeOwnCategory(log, 'expense', 'Pets');
    expect(categoryChoices(log, 'expense')).not.toContain('Pets');
  });
});

describe('several at once, with history', () => {
  test('a new category for the selected entries only; each keeps what it was', () => {
    const a = e('2026-11-01', '5.00', 'Other'), b = e('2026-11-02', '6.00', 'Food & drink'), c = e('2026-11-03', '7.00', 'Other');
    const log = bulkCategory({...emptyMoneyLog(), entries: [a, b, c]}, new Set([a.id, b.id]), 'Pets', AT);
    expect(log.entries.map(x => x.category)).toEqual(['Pets', 'Pets', 'Other']);
    expect(log.entries[0]!.history).toEqual([{at: AT, by: 'bulk', field: 'category', from: 'Other', to: 'Pets'}]);
    expect(log.entries[2]!.history).toBeUndefined();
    const out = bulkExcluded(log, new Set([c.id]), true, AT);
    expect(out.entries[2]).toMatchObject({excluded: true, history: [{by: 'bulk', field: 'excluded', from: 'counted', to: 'left out'}]});
    const back = bulkExcluded(out, new Set([c.id]), false, AT);
    expect(back.entries[2]!.excluded).toBeUndefined();
    expect(back.entries[2]!.history).toHaveLength(2);
  });
  test('an edit records each field that changed, the last 20 kept; marks are set and cleared', () => {
    const before = e('2026-11-01', '5.00', 'Other', {note: 'Lunch'});
    const after = changesBetween(before, {...before, amount: '6.00', note: 'Lunch with Sam'}, 'you', AT);
    expect(after.history!.map(h => h.field)).toEqual(['amount', 'note']);
    let many = after; for (let i = 0; i < 30; i++) many = changesBetween(many, {...many, amount: `${i + 10}.00`}, 'you', AT);
    expect(many.history).toHaveLength(20);
    const marked = withMarks(before, {excluded: true, taxDeductible: true, spread: 12}, AT);
    expect(marked).toMatchObject({excluded: true, taxDeductible: true, spread: 12});
    expect(marked.history!.map(h => h.field)).toEqual(['excluded', 'spread']);
    const cleared = withMarks(marked, {excluded: false, taxDeductible: false, spread: null}, AT);
    expect(cleared.excluded).toBeUndefined(); expect(cleared.taxDeductible).toBeUndefined(); expect(cleared.spread).toBeUndefined();
  });
});

describe('exclude, payee and tag filters (Monarch); the total follows them', () => {
  const rows = [e('2026-11-01', '5.00', 'Food & drink', {note: 'Café Noël · card'}), e('2026-11-02', '20.00', 'Groceries', {note: 'Market'}), e('2026-11-03', '9.00', 'Food & drink', {note: 'Café Noël'}), e('2026-11-04', '3.00', 'Transport', {note: 'Tram transfer'})];
  test('words to leave out, one payee, a tag set, tax-deductible only', () => {
    expect(searchEntries(rows, {not: 'transfer, market'}).map(x => x.note)).toEqual(['Café Noël', 'Café Noël · card']);
    expect(searchEntries(rows, {payee: 'cafe noel'}).map(x => x.amount)).toEqual(['9.00', '5.00']);
    expect(searchEntries(rows, {tagged: new Set([rows[1]!.id])}).map(x => x.note)).toEqual(['Market']);
    expect(searchEntries([...rows, e('2026-11-05', '50.00', 'Health', {taxDeductible: true})], {tax: true}).map(x => x.category)).toEqual(['Health']);
    expect(usedPayees(rows)[0]).toBe('Café Noël');
  });
});
