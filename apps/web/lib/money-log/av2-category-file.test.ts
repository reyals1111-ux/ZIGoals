// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {applyCategoryFile, categoryFile, planCategoryFile, readCategoryFile, undoCategoryLog, undoCategoryRules} from './category-file';
import {moneyLogSchema, type MoneyLog} from './schema';
import {moneyRulesSchema, type MoneyRules} from '../money-rules/schema';
import {applyRules} from '../money-rules/engine';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's category backup and restore, LEDGER #390): one small file of the
 * person's own categories, subcategories and rules; read back as data only, under caps; a plan of what is new; only what
 * is new added; Undo takes out exactly that.
 */
const A = '2026-01-01T09:00:00.000Z', AT = '2026-11-14T10:00:00.000Z';
const MINE: MoneyLog = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: [{id: 'e1', kind: 'expense', amount: '12.00', currency: 'EUR', category: 'Pets', date: '2026-11-01', createdAt: A, note: 'Vet'}],
  own: {expense: ['Pets', 'Car'], income: ['Side job']}, subs: {Groceries: ['Market'], Pets: ['Vet']}});
const MY_RULES: MoneyRules = moneyRulesSchema.parse({version: 1, rules: [{id: 'r1', field: 'payee', op: 'contains', text: 'Albert Heijn', direction: 'out', category: 'Groceries', enabled: true, goalId: '17', createdAt: A}]});
let k = 0;
const ids = () => `new-${k++}`;

describe('saving', () => {
  it('own categories, subcategories and rules — never an entry, an amount spent, an id or a Goal link', () => {
    const text = categoryFile(MINE, MY_RULES, AT), json = JSON.parse(text);
    expect(json).toEqual({kind: 'zigoals-categories-and-rules', version: 1, saved: AT, categories: {expense: ['Pets', 'Car'], income: ['Side job']}, subs: {Groceries: ['Market'], Pets: ['Vet']},
      rules: [{field: 'payee', op: 'contains', text: 'Albert Heijn', direction: 'out', category: 'Groceries', enabled: true}]});
    expect(text).not.toMatch(/e1|12\.00|goalId|r1|"id"/);
  });
});

describe('reading', () => {
  const theirs = JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, categories: {expense: ['pets', 'Hobbies'], income: []}, subs: {Hobbies: ['Paint', 'Hobbies'], Groceries: ['market', 'Bakery']},
    rules: [{field: 'payee', op: 'contains', text: 'albert heijn', direction: 'out', category: 'groceries', enabled: true}, {field: 'memo', op: 'equals', text: 'Brush shop', direction: 'out', category: 'Hobbies', tag: 'art', enabled: true}, {op: 'run', text: ''}, {field: 'either', op: 'contains', text: 'Brush shop', direction: 'out', category: 'Hobbies', tag: 'art', enabled: true}],
    entries: [{id: 'x'}], script: 'alert(1)'});
  it('data only, under caps; a rule it cannot read is left out and counted; anything else is ignored', () => {
    const out = readCategoryFile(theirs);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.file.rules).toHaveLength(3); expect(out.file.dropped).toBe(1);
    expect(Object.keys(out.file)).toEqual(['categories', 'subs', 'rules', 'dropped']);
    expect(readCategoryFile('not json').ok).toBe(false);
    expect(readCategoryFile(JSON.stringify({kind: 'something else', version: 1})).ok).toBe(false);
    // Session AV lane 2 (review b5k #5: a list over its limit is refused in words, never emptied silently, deliberate)
    expect(readCategoryFile(JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, categories: {expense: Array.from({length: 31}, (_, i) => `C${i}`), income: []}}))).toEqual({ok: false, problem: 'That file holds 31 of your own categories for spending; ZIGoals keeps up to 30. Nothing was read.'});
    expect(readCategoryFile('x'.repeat(256 * 1024 + 1)).ok).toBe(false);
  });
  it('the plan: what is new and what is already there (any case)', () => {
    const out = readCategoryFile(theirs); if (!out.ok) throw new Error('unreadable');
    const plan = planCategoryFile(MINE, MY_RULES, out.file);
    expect(plan.own).toEqual([{kind: 'expense', name: 'pets', isNew: false}, {kind: 'expense', name: 'Hobbies', isNew: true}]);
    expect(plan.subs).toEqual([{category: 'Hobbies', name: 'Paint', isNew: true}, {category: 'Hobbies', name: 'Hobbies', isNew: false}, {category: 'Groceries', name: 'market', isNew: false}, {category: 'Groceries', name: 'Bakery', isNew: true}]);
    expect(plan.rules.map(r => r.isNew)).toEqual([false, true, true]);
    expect(plan.fresh).toBe(5);
  });
  it('adds only what is new, nothing changed; the rules then work; Undo takes out exactly that', () => {
    const out = readCategoryFile(theirs); if (!out.ok) throw new Error('unreadable');
    const r = applyCategoryFile(MINE, MY_RULES, out.file, ids, AT);
    expect(r.log.own).toEqual({expense: ['Pets', 'Car', 'Hobbies'], income: ['Side job']});
    expect(r.log.subs).toEqual({Groceries: ['Market', 'Bakery'], Pets: ['Vet'], Hobbies: ['Paint']});
    expect(r.log.entries).toEqual(MINE.entries);
    expect(r.rules.rules.slice(0, 1)).toEqual(MY_RULES.rules);
    expect(r.rules.rules.slice(1).map(x => [x.field, x.text, x.category, x.tag])).toEqual([['memo', 'Brush shop', 'Hobbies', 'art'], ['either', 'Brush shop', 'Hobbies', 'art']]);
    expect(moneyRulesSchema.parse(r.rules)).toEqual(r.rules);
    expect(moneyLogSchema.parse(r.log)).toEqual(r.log);
    expect(r.full).toBe(0);
    expect(applyRules([{...MINE.entries[0]!, id: 'e2', category: 'Other', note: 'Brush shop · paint'}], r.rules.rules).entries[0]!.category).toBe('Hobbies');
    expect(undoCategoryLog(r.log, r.added)).toEqual(MINE);
    expect(undoCategoryRules(r.rules, r.added)).toEqual(MY_RULES);
  });
  it('a full list: what is past the limits is left out and counted', () => {
    const full = {...MINE, own: {expense: Array.from({length: 30}, (_, i) => `Own ${i}`)}} as MoneyLog;
    const out = readCategoryFile(JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, categories: {expense: ['One more'], income: []}})); if (!out.ok) throw new Error('unreadable');
    const r = applyCategoryFile(full, MY_RULES, out.file, ids, AT);
    expect(r.full).toBe(1); expect(r.added.own).toEqual([]);
  });
  it('review b5k #5: over a limit is refused in words; one item it cannot read is left out and counted, the rest kept', () => {
    const file = (over: object) => JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, ...over});
    expect(readCategoryFile(file({rules: Array.from({length: 201}, () => ({text: 'x'}))}))).toEqual({ok: false, problem: 'That file holds 201 rules; ZIGoals keeps up to 200. Nothing was read.'});
    expect(readCategoryFile(file({subs: {Pets: Array.from({length: 21}, (_, i) => `S${i}`)}}))).toEqual({ok: false, problem: 'That file holds 21 subcategories under Pets; ZIGoals keeps up to 20. Nothing was read.'});
    const out = readCategoryFile(file({categories: {expense: ['Pets', 'x'.repeat(41)], income: ['Side job']}, subs: {Pets: ['Vet', ''], ['y'.repeat(41)]: ['A', 'B']}, rules: [{text: 'Albert Heijn'}, {text: ''}]}));
    expect(out).toEqual({ok: true, file: {categories: {expense: ['Pets'], income: ['Side job']}, subs: {Pets: ['Vet']}, rules: [{field: 'either', op: 'contains', text: 'Albert Heijn', direction: 'any', enabled: true}], dropped: 5}});
  });
  it('review b5k #6: a name with doubled spaces is read as the log keeps it, and Undo finds it', () => {
    const out = readCategoryFile(JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, categories: {expense: ['Pet  care', ' Car '], income: []}, subs: {'Pet  care': ['Dog   food']}}));
    if (!out.ok) throw new Error('unreadable');
    expect(out.file.categories.expense).toEqual(['Pet care', 'Car']);
    expect(planCategoryFile(MINE, MY_RULES, out.file).own.map(c => c.isNew)).toEqual([true, false]);
    const r = applyCategoryFile(MINE, MY_RULES, out.file, ids, AT);
    expect(r.added.own).toEqual([{kind: 'expense', name: 'Pet care'}]);
    expect(r.added.subs).toEqual([{category: 'Pet care', name: 'Dog food'}]);
    expect(undoCategoryLog(r.log, r.added).own).toEqual(MINE.own);
    expect(undoCategoryLog(r.log, r.added).subs?.['Pet care'] ?? []).toEqual([]);
  });
});
