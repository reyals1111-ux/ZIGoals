import {describe, expect, test} from 'vitest';
import {detectMoneyAppExport} from './app-exports';
import {planMoneyRows, tagsCell} from './money-rows';
import {MONEY_FIELDS} from './presets';
import {guessMapping} from '../mapping';
import {toMoneyEntries} from '../../bankfiles';
import {withImportMarks} from '../../bankfiles/reimport';
import {emptyMoneyTags} from '../../money-tags/schema';
import {tagsOf, withImportTags} from '../../money-tags/tags';
import {searchEntries} from '../../money-log/search';

/**
 * Session AV lane 2, round 3 (money; Simplifi's imports keep categories, tags, notes and check numbers, LEDGER #299):
 * Monarch's Tags, Copilot's tags and Mint's Labels columns become the entries' tags (in the tags record; nothing new on
 * the entry), and a reference or cheque number column is kept with the entry (its existing `ref`) and found by search.
 * Fictional rows only.
 */
const MONARCH = ['Date', 'Merchant', 'Category', 'Account', 'Original Statement', 'Notes', 'Amount', 'Tags'];
const COPILOT = ['date', 'name', 'amount', 'status', 'category', 'parent category', 'excluded', 'tags', 'type', 'account', 'account mask', 'note', 'recurring'];
const MINT = ['Date', 'Description', 'Original Description', 'Amount', 'Transaction Type', 'Category', 'Account Name', 'Labels', 'Notes'];

describe('tags and numbers from imported files', () => {
  test('the app presets match the tags columns', () => {
    expect(detectMoneyAppExport(MONARCH)!.mapping.tags).toBe(7);
    expect(detectMoneyAppExport(COPILOT)!.mapping.tags).toBe(7);
    expect(detectMoneyAppExport(MINT)!.mapping.tags).toBe(7);
    expect(guessMapping(['Date', 'Payee', 'Amount', 'Check Number', 'Tags'], MONEY_FIELDS)).toMatchObject({reference: 3, tags: 4});
  });
  test('a tags cell as tags: split, cleaned, at most five, each once; one that cannot be a tag is left out', () => {
    expect(tagsCell('Holiday, Work Trip ;#gifts|holiday')).toEqual(['holiday', 'work trip', 'gifts']);
    expect(tagsCell('a,b,c,d,e,f')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(tagsCell('  ,  ')).toEqual([]);
    expect(tagsCell('ok, !!!')).toEqual(['ok']);
  });
  test('a Monarch file: the rows carry their tags; the import keeps them as the entries’ tags', () => {
    const app = detectMoneyAppExport(MONARCH)!;
    const plan = planMoneyRows({rows: [['2026-10-03', 'Train', 'Travel', 'Checking', 'NS', '', '-24.50', 'Holiday, Work trip'], ['2026-10-04', 'Bakery', 'Food', 'Checking', 'B', '', '-3.20', '']], mapping: app.mapping, numberStyle: 'point', dateFormat: 'iso', currency: 'EUR'});
    expect(plan.transactions.map(t => t.tags)).toEqual([['holiday', 'work trip'], undefined]);
    let n = 0;
    const out = toMoneyEntries(plan.transactions, {entries: []}, new Date('2026-11-22T10:00:00Z'), () => `imp-${n++}`);
    const {record, tagged} = withImportTags(emptyMoneyTags(), out.entries, out.indexes, plan.transactions, new Set());
    expect(tagged).toBe(1);
    expect(tagsOf(record, 'imp-0')).toEqual(['holiday', 'work trip']);
    expect(tagsOf(record, 'imp-1')).toEqual([]);
    // an entry's own tags are kept first
    const again = withImportTags({version: 1, tags: {'imp-0': ['mine']}}, out.entries, out.indexes, plan.transactions, new Set(['imp-0']));
    expect(tagsOf(again.record, 'imp-0')).toEqual(['mine', 'holiday', 'work trip']);
  });
  test('a cheque or reference number is kept with the entry and found by search', () => {
    const mapping = guessMapping(['Date', 'Payee', 'Amount', 'Check Number'], MONEY_FIELDS);
    const plan = planMoneyRows({rows: [['2026-10-05', 'Landlord', '-850.00', '1042']], mapping, numberStyle: 'point', dateFormat: 'iso', currency: 'EUR'});
    const out = toMoneyEntries(plan.transactions, {entries: []}, new Date('2026-11-22T10:00:00Z'), () => 'chq');
    const [entry] = withImportMarks(out.entries, out.indexes, plan.transactions);
    expect(entry!.ref).toBe('out|EUR|1042');
    expect(searchEntries([entry!], {text: '1042'}).map(e => e.id)).toEqual(['chq']);
  });
});
