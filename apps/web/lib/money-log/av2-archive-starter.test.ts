import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {addOwnCategory, categoryChoices} from './counted';
import {archiveCategory, archivedOf, entriesIn, isArchived, unarchiveCategory} from './category';
import {applyStarterSet, previewStarterSet, removeStarterAdds, STARTER_SETS, starterSet} from './starter-sets';
import {categoriesRecentFirst} from '../recent-categories/recent';
import {byCategory} from './engine';
import {searchEntries} from './search';
import {subsOf} from '../money-more/quick';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import CategoryMore from '../../components/wealth/spending/category-more';

/**
 * Session AV lane 2, round 4 (money; Lunch Money, LEDGER #342 archive a category, #347 starter sets).
 */
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Gifts', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});
const log = (over: Partial<MoneyLog> = {}): MoneyLog => ({...emptyMoneyLog(), entries: [e({}), e({category: 'Fun'})], ...over});

describe('archive a category (#342)', () => {
  test('it leaves the pickers and the recent chips; entries, reports and search keep it; it can come back', () => {
    const l = archiveCategory(log(), 'expense', 'gifts');
    expect(archivedOf(l, 'expense')).toEqual(['Gifts']);
    expect(categoryChoices(l, 'expense')).not.toContain('Gifts');
    expect(categoryChoices(l, 'income')).toContain('Gift'); // the other kind is its own list
    expect(categoriesRecentFirst(l.entries, 'expense', categoryChoices(l, 'expense'), '2026-11-14', 3, new Set(['gifts'])).chips).not.toContain('Gifts');
    expect(l.entries.every(x => x.category)).toBe(true);
    expect(byCategory(l.entries, '2026-11-01', '2026-11-30').map(r => r.category)).toContain('Gifts');
    expect(searchEntries(l.entries, {category: 'Gifts'})).toHaveLength(1);
    expect(entriesIn(l.entries, 'expense', 'Gifts')).toBe(1);
    expect(isArchived(unarchiveCategory(l, 'expense', 'Gifts'), 'expense', 'Gifts')).toBe(false);
    expect(categoryChoices(unarchiveCategory(l, 'expense', 'Gifts'), 'expense')).toContain('Gifts');
  });
  test('an own category too; adding its name again says it is archived; twice is once; the record still reads', () => {
    const own = addOwnCategory(log(), 'expense', 'Pets'), l = archiveCategory(archiveCategory(own, 'expense', 'Pets'), 'expense', 'Pets');
    expect(archivedOf(l, 'expense')).toEqual(['Pets']);
    expect(() => addOwnCategory(l, 'expense', 'pets')).toThrow('Pets is archived: bring it back under Archived categories.');
    expect(moneyLogSchema.parse(l).archived).toEqual({expense: ['Pets']});
  });
  test('the last category offered cannot be archived', () => {
    let l = log();
    for (const c of categoryChoices(l, 'income').slice(1)) l = archiveCategory(l, 'income', c);
    expect(() => archiveCategory(l, 'income', categoryChoices(l, 'income')[0]!)).toThrow('Keep at least one category to choose from.');
  });
});

describe('starter sets (#347)', () => {
  test('four written sets, each in English and Dutch', () => {
    expect(STARTER_SETS.map(s => s.id)).toEqual(['student', 'household', 'freelancer', 'traveller']);
    for (const s of STARTER_SETS) for (const c of s.categories) { expect(c.name.en).toBeTruthy(); expect(c.name.nl).toBeTruthy(); for (const sub of c.subs) { expect(sub.en.length).toBeLessThanOrEqual(40); expect(sub.nl.length).toBeLessThanOrEqual(40); } }
  });
  test('added in one go, nothing already there changed, with an exact undo', () => {
    const before = addOwnCategory(log(), 'expense', 'Study');
    const r = applyStarterSet(before, starterSet('student')!, 'en');
    expect(r.log.own?.expense).toEqual(['Study']); // already there: kept, not doubled
    expect(r.log.own?.income).toEqual(['Student grant', 'Side job']);
    expect(subsOf(r.log, 'Study')).toEqual(['Books', 'Tuition', 'Supplies', 'Printing']);
    expect(subsOf(r.log, 'Food & drink')).toEqual(['Canteen', 'Coffee', 'Takeaway']);
    expect(r).toMatchObject({categories: 2, skipped: 1, full: 0});
    expect(r.log.entries).toBe(before.entries);
    const again = applyStarterSet(r.log, starterSet('student')!, 'en');
    expect(again.categories + again.subs).toBe(0);
    const undone = removeStarterAdds(r.log, r.added);
    expect(undone.own).toEqual({expense: ['Study'], income: []}); expect(undone.subs).toEqual({}); expect(undone.entries).toBe(before.entries);
    expect(moneyLogSchema.safeParse(r.log).success).toBe(true);
  });
  test('Dutch names; the preview says what is new', () => {
    const r = applyStarterSet(log(), starterSet('household')!, 'nl');
    expect(r.log.own?.expense).toEqual(['Kinderen', 'Huisdieren', 'Auto']);
    expect(subsOf(r.log, 'Bills')).toContain('Energie');
    const preview = previewStarterSet(r.log, starterSet('household')!, 'nl');
    expect(preview.every(c => !c.isNew && c.subs.every(s => !s.isNew))).toBe(true);
    expect(previewStarterSet(log(), starterSet('traveller')!, 'en')[0]).toMatchObject({name: 'Travel', isNew: true});
  });
  test('a full list is said, never forced', () => {
    let l = log();
    for (let i = 0; i < 30; i++) l = addOwnCategory(l, 'expense', `Mine ${i}`);
    const r = applyStarterSet(l, starterSet('freelancer')!, 'en');
    expect(r.log.own?.expense).toHaveLength(30);
    expect(r.full).toBeGreaterThan(0);
  });
  test('the settings render: archive picker, archived list, set preview', () => {
    const html = renderToStaticMarkup(createElement(CategoryMore, {log: archiveCategory(log(), 'expense', 'Gifts'), update: () => undefined, kind: 'expense', say: () => undefined, refuse: () => undefined}));
    expect(html).toContain('Archive a category');
    expect(html).toContain('aria-label="Bring back Gifts"');
    expect(html).toContain('Start from a set');
    expect(html).toContain('aria-label="What A student adds"');
  });
});
