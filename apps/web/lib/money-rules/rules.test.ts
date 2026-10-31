import {describe, expect, test} from 'vitest';
import {applyChanges, applyRule, applyRules, describeRule, moveRule, previewPast, removeRule, ruleFromEntry, ruleIssue, ruleMatches, saveRule, subjectOf, undoChanges, type RuleDraft} from './engine';
import {loggedWithRules, ruleHint} from './imports';
import {MAX_RULES, emptyMoneyRules, moneyRulesSchema, type MoneyRule} from './schema';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry} from '../money-log/schema';
import type {BankTransaction} from '../bankfiles';

const e = (id: string, note: string | undefined, amount = '10.00', kind: 'expense' | 'income' = 'expense', date = '2026-10-20', category = 'Other'): MoneyEntry => ({id, kind, amount, currency: 'EUR', category, ...(note ? {note} : {}), date, createdAt: `${date}T10:00:00.000Z`});
const rule = (id: string, over: Partial<MoneyRule>): MoneyRule => ({id, field: 'either', op: 'contains', text: 'x', direction: 'any', enabled: true, ...over});
const now = new Date('2026-10-31T10:00:00Z');

describe('transaction rules: matching (Session AK lane M, item 1)', () => {
  test('payee and memo come from the note, split at " · "', () => {
    expect(subjectOf(e('a', 'ALBERT HEIJN 1234 · Card payment'))).toMatchObject({payee: 'ALBERT HEIJN 1234', memo: 'Card payment', cents: 1000});
    expect(subjectOf(e('a', 'Lunch with Sam'))).toMatchObject({payee: 'Lunch with Sam', memo: ''});
    expect(subjectOf(e('a', undefined))).toMatchObject({payee: '', memo: '', whole: ''});
  });
  test('contains, equals and starts with: case-insensitive, spaces folded', () => {
    const s = subjectOf(e('a', 'Albert  Heijn 1234 · Card payment'));
    expect(ruleMatches(rule('r', {text: 'albert heijn'}), s)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'ALBERT HEIJN 1234', op: 'equals', field: 'payee'}), s)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'albert heijn', op: 'equals', field: 'payee'}), s)).toBe(false);
    expect(ruleMatches(rule('r', {text: 'card', op: 'starts-with', field: 'memo'}), s)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'card', op: 'starts-with', field: 'payee'}), s)).toBe(false);
    expect(ruleMatches(rule('r', {text: 'card payment', op: 'equals'}), s)).toBe(true);
  });
  test('the text is plain, never a pattern: regex characters match only themselves', () => {
    expect(ruleMatches(rule('r', {text: '.*'}), subjectOf(e('a', 'Anything at all')))).toBe(false);
    expect(ruleMatches(rule('r', {text: '.*'}), subjectOf(e('a', 'Shop .* sale')))).toBe(true);
    expect(ruleMatches(rule('r', {text: '(a+)+$'}), subjectOf(e('a', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')))).toBe(false);
    expect(ruleMatches(rule('r', {text: '[x]'}), subjectOf(e('a', 'x')))).toBe(false);
  });
  test('direction and amount range (inclusive, exact cents)', () => {
    const out = subjectOf(e('a', 'Shop', '10.00')), inn = subjectOf(e('b', 'Shop', '10.00', 'income'));
    expect(ruleMatches(rule('r', {text: 'shop', direction: 'out'}), out)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'shop', direction: 'out'}), inn)).toBe(false);
    expect(ruleMatches(rule('r', {text: 'shop', direction: 'in'}), inn)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'shop', min: '10.00', max: '10'}), out)).toBe(true);
    expect(ruleMatches(rule('r', {text: 'shop', min: '10.01'}), out)).toBe(false);
    expect(ruleMatches(rule('r', {text: 'shop', max: '9.99'}), out)).toBe(false);
  });
  test('a switched-off rule never matches', () => expect(ruleMatches(rule('r', {text: 'shop', enabled: false}), subjectOf(e('a', 'Shop')))).toBe(false));
});

describe('transaction rules: actions and order', () => {
  test('first match wins, in order', () => {
    const rules = [rule('1', {text: 'heijn', category: 'Groceries'}), rule('2', {text: 'albert', category: 'Fun'})];
    const out = applyRules([e('a', 'Albert Heijn'), e('b', 'Albert Cuyp'), e('c', 'Bakery')], rules);
    expect(out.entries.map(x => x.category)).toEqual(['Groceries', 'Fun', 'Other']);
    expect(out.changes.map(c => [c.id, c.ruleId])).toEqual([['a', '1'], ['b', '2']]);
  });
  test('rename keeps the memo; tag is added once; a Goal links the whole entry', () => {
    const r = rule('1', {text: 'ah 12', renameTo: 'Albert Heijn', tag: 'food', goalId: '7'});
    const after = applyRule(e('a', 'AH 1234 · Card payment'), r);
    expect(after.note).toBe('Albert Heijn · Card payment #food');
    expect(after.parts).toEqual([{amount: '10.00', goalId: '7'}]);
    expect(applyRule(after, r)).toBe(after); // idempotent: nothing would change
    expect(applyRule(e('b', undefined), rule('2', {text: '', tag: 'x'}))).toMatchObject({note: '#x'});
    expect(applyRule(e('c', 'A'.repeat(200)), rule('3', {text: 'a', tag: 'long'})).note).toHaveLength(200);
  });
  test('an entry already split keeps its parts', () => {
    const split = {...e('a', 'Shop', '10.00'), parts: [{amount: '4.00', category: 'Home'}, {amount: '6.00', category: 'Fun'}]};
    expect(applyRule(split, rule('1', {text: 'shop', goalId: '3'}))).toBe(split);
  });
  test('the result is still a valid money log', () => {
    const log = {...emptyMoneyLog(), entries: applyRules([e('a', 'AH 1 · x')], [rule('1', {text: 'ah', category: 'Groceries', renameTo: 'Albert Heijn', tag: 'weekly', goalId: '12'})]).entries};
    expect(moneyLogSchema.safeParse(log).success).toBe(true);
  });
});

describe('apply to the past 90 days, with Undo', () => {
  const rules = [rule('1', {text: 'shop', category: 'Groceries'})];
  const log = {...emptyMoneyLog(), entries: [e('old', 'Shop', '1.00', 'expense', '2026-08-02'), e('in', 'Shop', '2.00', 'expense', '2026-08-03'), e('new', 'Shop', '3.00', 'expense', '2026-10-31'), e('other', 'Cafe')]};
  test('the preview covers the 90 days up to today only', () => {
    expect(previewPast(log, rules, '2026-10-31').map(c => c.id)).toEqual(['in', 'new']);
  });
  test('apply, then undo exactly what changed; an entry changed since is left alone', () => {
    const changes = previewPast(log, rules, '2026-10-31');
    const applied = applyChanges(log, changes);
    expect(applied.applied).toHaveLength(2);
    expect(applied.log.entries.map(x => x.category)).toEqual(['Other', 'Groceries', 'Groceries', 'Other']);
    const edited = {...applied.log, entries: applied.log.entries.map(x => x.id === 'new' ? {...x, category: 'Fun'} : x)};
    const undone = undoChanges(edited, changes);
    expect(undone.restored).toBe(1);
    expect(undone.log.entries.map(x => x.category)).toEqual(['Other', 'Other', 'Fun', 'Other']);
    // A change previewed on an entry that changed before Apply is skipped.
    expect(applyChanges(edited, changes).applied).toHaveLength(0);
  });
});

describe('saving rules', () => {
  const draft: RuleDraft = {field: 'payee', op: 'contains', text: ' Albert Heijn ', direction: 'out', category: 'Groceries'};
  test('the issues are plain', () => {
    expect(ruleIssue({...draft, text: ' '})).toMatch(/text to look for/);
    expect(ruleIssue({field: 'either', op: 'contains', text: 'x', direction: 'any'})).toMatch(/what the rule does/);
    expect(ruleIssue({...draft, min: '20', max: '10'})).toMatch(/lowest amount/);
    expect(ruleIssue({...draft, min: '1.234'})).toMatch(/two decimals/);
    expect(ruleIssue({...draft, tag: 'Big Tag'})).toMatch(/tag/);
    expect(ruleIssue(draft)).toBeNull();
  });
  test('add, replace, move, remove; at most 200', () => {
    let r = saveRule(emptyMoneyRules(), draft, 'a', now);
    expect(r.rules[0]).toMatchObject({id: 'a', text: 'Albert Heijn', enabled: true, createdAt: now.toISOString()});
    r = saveRule(r, {...draft, text: 'Jumbo'}, 'b', now);
    r = saveRule(r, {...draft, text: 'Lidl', category: 'Fun'}, 'a', now, true);
    expect(r.rules.map(x => [x.id, x.text, x.category])).toEqual([['a', 'Lidl', 'Fun'], ['b', 'Jumbo', 'Groceries']]);
    expect(moveRule(r, 'b', -1).rules.map(x => x.id)).toEqual(['b', 'a']);
    expect(moveRule(r, 'a', -1)).toBe(r);
    expect(removeRule(r, 'a').rules.map(x => x.id)).toEqual(['b']);
    const full = moneyRulesSchema.parse({version: 1, rules: Array.from({length: MAX_RULES}, (_, i) => ({id: `r${i}`, text: 't', category: 'Fun'}))});
    expect(() => saveRule(full, draft, 'z', now)).toThrow(/Up to 200/);
    expect(moneyRulesSchema.safeParse({version: 1, rules: Array.from({length: MAX_RULES + 1}, (_, i) => ({id: `r${i}`, text: 't'}))}).success).toBe(false);
    expect(() => saveRule(r, draft, 'nope', now, true)).toThrow(/no longer/);
  });
  test('the record reads tolerantly: defaults filled, a later field kept', () => {
    expect(moneyRulesSchema.parse({version: 1})).toEqual({version: 1, rules: []});
    expect(moneyRulesSchema.parse({version: 1, rules: [{id: 'a', text: 'x', later: 1}]}).rules[0]).toMatchObject({field: 'either', op: 'contains', direction: 'any', enabled: true, later: 1});
  });
  test('make a rule from an entry, and a rule in words', () => {
    expect(ruleFromEntry({...e('a', 'Corner Grocery · Card'), category: 'Groceries'})).toEqual({field: 'payee', op: 'contains', text: 'Corner Grocery', direction: 'out', category: 'Groceries'});
    expect(describeRule(rule('1', {text: 'ah', direction: 'out', min: '1.00', max: '9.00', category: 'Groceries', renameTo: 'AH', goalId: '4'}), id => id === '4' ? 'House' : undefined)).toEqual({when: 'Payee or memo contains “ah”, money out, 1.00 to 9.00', then: 'category Groceries, renamed “AH”, Goal House'});
  });
});

describe('rules in the import preview', () => {
  const t = (over: Partial<BankTransaction> = {}): BankTransaction => ({date: '2026-10-20', amount: '12.50', currency: 'EUR', direction: 'out', payee: 'AH 1234', reference: '', description: 'Card', index: 1, ...over});
  const rules = [rule('1', {text: 'ah 12', renameTo: 'Albert Heijn', category: 'Groceries'})];
  test('the hint names what the rule sets', () => {
    expect(ruleHint(t(), rules)).toBe('Rule: category Groceries, renamed “Albert Heijn”');
    expect(ruleHint(t({payee: 'Bakery'}), rules)).toBeNull();
  });
  test('a row renamed by a rule before is still recognised as already logged', () => {
    const log = {entries: [{...e('x', 'Albert Heijn · Card', '12.50'), category: 'Groceries'}]};
    expect(loggedWithRules(t(), log, rules)).toBe(true);
    expect(loggedWithRules(t(), log, [])).toBe(false);
    expect(loggedWithRules(t({amount: '12.51'}), log, rules)).toBe(false);
  });
});
