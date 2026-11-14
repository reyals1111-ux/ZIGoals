import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import type {MoneyEntry} from '../money-log/schema';
import {showcaseMoneyLog} from '../money-log/showcase';
import {MAX_TAGGED_ENTRIES, MONEY_TAGS_KEY, MONEY_TAGS_RECORD, emptyMoneyTags, moneyTagsSchema} from './schema';
import {allTags, normaliseTag, parseTags, setEntryTags, tagTotals, tagsOf, withTag} from './tags';
import {showcaseMoneyTags} from './showcase';

const e = (id: string, date: string, amount: string, kind: 'expense' | 'income' = 'expense', currency = 'EUR'): MoneyEntry => ({id, kind, amount, currency, category: 'Other', date, createdAt: `${date}T10:00:00.000Z`});
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)}; };

describe('money tags, their own device record (Session AP, feature 2)', () => {
  test('the key, a strict versioned record: a later field reads as unreadable and is never rewritten', () => {
    expect(MONEY_TAGS_KEY).toBe('zigoals:money-tags:v1');
    expect(MONEY_TAGS_RECORD.key).toBe(MONEY_TAGS_KEY);
    expect(moneyTagsSchema.safeParse({version: 1, tags: {a: ['work']}}).success).toBe(true);
    expect(moneyTagsSchema.safeParse({version: 1, tags: {}, later: true}).success).toBe(false);
    expect(moneyTagsSchema.safeParse({version: 2, tags: {}}).success).toBe(false);
    const storage = memory(); storage.setItem(MONEY_TAGS_KEY, JSON.stringify({version: 1, tags: {}, later: true}));
    expect(readDeviceRecord(storage, MONEY_TAGS_RECORD)).toEqual({data: emptyMoneyTags(), unreadable: true});
    expect(storage.getItem(MONEY_TAGS_KEY)).toContain('later');
  });
  test('a tag is lower case, at most 24 characters, single spaces; at most five an entry, each once', () => {
    for (const bad of [['Work'], ['a'.repeat(25)], ['two  spaces'], [' lead'], ['x!'], [], ['a', 'a'], ['a', 'b', 'c', 'd', 'e', 'f']]) expect(moneyTagsSchema.safeParse({version: 1, tags: {a: bad}}).success, JSON.stringify(bad)).toBe(false);
    expect(moneyTagsSchema.safeParse({version: 1, tags: {'__proto__': ['x']}}).success).toBe(false);
    expect(normaliseTag('  #Holiday   Trip ')).toBe('holiday trip');
    expect(normaliseTag('Café-2026')).toBe('café-2026');
    expect(normaliseTag('a'.repeat(25))).toBeNull();
    expect(normaliseTag('!!')).toBeNull();
    expect(parseTags('Holiday, work trip; #Gifts, holiday')).toEqual({ok: true, tags: ['holiday', 'work trip', 'gifts']});
    expect(parseTags('')).toEqual({ok: true, tags: []});
    expect(parseTags('a, b, c, d, e, f')).toEqual({ok: false, problem: 'Up to 5 tags for one entry.'});
    expect(parseTags('this one is far too long to be a tag').ok).toBe(false);
  });
  test('set, change and remove one entry\'s tags through the device record', () => {
    const storage = memory(), live = new Set(['a', 'b']);
    updateDeviceRecord(storage, MONEY_TAGS_RECORD, r => setEntryTags(r, 'a', ['Work', 'travel'], live));
    updateDeviceRecord(storage, MONEY_TAGS_RECORD, r => setEntryTags(r, 'b', ['work'], live));
    expect(JSON.parse(storage.getItem(MONEY_TAGS_KEY)!)).toEqual({version: 1, tags: {a: ['work', 'travel'], b: ['work']}});
    const next = updateDeviceRecord(storage, MONEY_TAGS_RECORD, r => setEntryTags(r, 'a', [], live));
    expect(next).toEqual({version: 1, tags: {b: ['work']}});
    expect(() => setEntryTags(next, 'a', ['1', '2', '3', '4', '5', '6'], live)).toThrow('Up to 5 tags');
  });
  test('a removed entry leaves no orphan visible: filters and totals read only the ids the log holds', () => {
    const record = {version: 1 as const, tags: {a: ['work'], gone: ['work', 'old'], c: ['work'], d: ['work']}};
    const entries = [e('a', '2026-11-02', '10.00'), e('c', '2026-11-03', '2.50', 'income'), e('d', '2026-11-04', '4.00', 'expense', 'USD'), e('x', '2026-11-05', '1.00')];
    expect(allTags(record, entries)).toEqual([{tag: 'work', entries: 3}]);
    expect(withTag(entries, record, 'work').map(x => x.id)).toEqual(['a', 'c', 'd']);
    expect(withTag(entries, record, 'old')).toEqual([]);
    expect(tagsOf(record, 'x')).toEqual([]);
    expect(tagsOf(record, 'constructor')).toEqual([]);
    // Per currency, never added together; spending and income apart; a date range.
    expect(tagTotals(entries, record, '2026-11-01', '2026-11-30')).toEqual([{tag: 'work', currency: 'EUR', spent: 1000, received: 250, entries: 2}, {tag: 'work', currency: 'USD', spent: 400, received: 0, entries: 1}]);
    expect(tagTotals(entries, record, '2026-11-03', '2026-11-03')).toEqual([{tag: 'work', currency: 'EUR', spent: 0, received: 250, entries: 1}]);
  });
  test('a full record drops removed entries\' tags first, then refuses', () => {
    const full = Object.fromEntries(Array.from({length: MAX_TAGGED_ENTRIES}, (_, i) => [`e${i}`, ['x']]));
    const record = moneyTagsSchema.parse({version: 1, tags: full});
    const live = new Set(['e1', 'new']);
    expect(Object.keys(setEntryTags(record, 'new', ['y'], live).tags)).toEqual(['e1', 'new']);
    expect(() => setEntryTags(record, 'new', ['y'], new Set(Object.keys(full)))).toThrow('entries can have tags');
    expect(Object.keys(setEntryTags(record, 'e5', ['y'], new Set()).tags).length).toBe(MAX_TAGGED_ENTRIES);
  });
  test('the Showcase tags only its own example entries, and every tag says example', () => {
    const log = showcaseMoneyLog('2026-11-14'), tags = showcaseMoneyTags(log), ids = new Set(log.entries.map(x => x.id));
    expect(Object.keys(tags.tags).length).toBeGreaterThan(4);
    for (const [id, list] of Object.entries(tags.tags)) { expect(ids.has(id)).toBe(true); expect(id.startsWith('showcase-money-')).toBe(true); expect(list).toContain('example'); }
  });
});
