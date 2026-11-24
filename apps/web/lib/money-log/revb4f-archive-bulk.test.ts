import {describe, expect, test} from 'vitest';
import {archiveCategory, bulkCategoryChoices} from './category';
import {categoryChoices} from './counted';
import {usedCategories} from './search';
import {emptyMoneyLog, type MoneyEntry, type MoneyLog} from './schema';

/** Review b4f #8 (Minor): an archived category is not offered as "New category" for several at once; the search filter keeps it. */
const e = (category: string): MoneyEntry => ({id: category, kind: 'expense', amount: '5.00', currency: 'EUR', category, date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z'});

describe('review b4f #8: archived categories leave the bulk picker', () => {
  test('Fun archived while entries use it: not in New category, still in the filter', () => {
    const log: MoneyLog = archiveCategory({...emptyMoneyLog(), entries: [e('Fun'), e('Pet shop')]}, 'expense', 'fun');
    const used = usedCategories(log.entries), choices = bulkCategoryChoices(categoryChoices(log, 'expense'), used, log.archived?.expense ?? []);
    expect(choices).not.toContain('Fun');
    expect(choices).toContain('Pet shop');
    expect(used).toContain('Fun');
  });
});
