import {describe, expect, it} from 'vitest';
import {accountsSchema, type Account, type Accounts} from '../accounts/schema';
import {balanceOn} from '../accounts/net-worth';
import {moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import {totals} from './engine';
import {bankNamesFor, defaultAsName, doubleOf, mergeAccounts, mergeAccountsRecord, mergeLog, mergeProblem, mergeTargets, planMerge, undoMergeAccounts, undoMergeLog, type MergeUndo} from './merge-accounts';

/**
 * Session AV lane 2, round 5 (money; Tiller's Data Cleanup, LEDGER #387): merge two accounts — balances, payments, the
 * note, the order and the last check carried over, the entries of the chosen bank-file names renamed, exact doubles
 * offered for removal, the one merged archived with its history; Undo puts everything back.
 */
const A = '2026-01-01T09:00:00.000Z', AT = '2026-11-20T10:00:00.000Z';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const acc = (n: number, over: Partial<Account>): Account => ({id: id(n), kind: 'cash', name: `Account ${n}`, currency: 'EUR', snapshots: [], payments: [], createdAt: A, updatedAt: A, ...over});
const snap = (n: number, date: string, value: string) => ({id: id(9000 + n), date, value, decimals: 2});
const OLD = acc(1, {name: 'ING Current', snapshots: [snap(1, '2026-01-31', '100000'), snap(2, '2026-02-28', '120000'), snap(3, '2026-03-31', '90000')]});
const NEW = acc(2, {name: 'ING Betaalrekening', snapshots: [snap(4, '2026-03-31', '91000'), snap(5, '2026-04-30', '95000')]});
const USD = acc(3, {name: 'Wise USD', currency: 'USD'}), CARD = acc(4, {name: 'Card', kind: 'credit-card'}), CARD2 = acc(5, {name: 'Old card', kind: 'credit-card', payments: [{id: id(9100), date: '2026-02-01', value: '5000', decimals: 2}]});
const ACCOUNTS: Accounts = accountsSchema.parse({version: 1, items: [NEW, OLD, USD, CARD, CARD2]});
let k = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `m-${k++}`, kind: 'expense', amount: '20.00', currency: 'EUR', category: 'Groceries', date: '2026-03-02', createdAt: A, ...over});
const ENTRIES = [e({account: 'ING Current', ref: 'R1'}), e({account: 'ING Current', ref: 'R2', amount: '35.00'}), e({account: 'ing current', ref: 'R3', date: '2026-03-09'}), e({account: 'NL12 OLD FILE', ref: 'R4'}),
  e({account: 'ING Betaalrekening', ref: 'R1'}), e({account: 'ING Betaalrekening', ref: 'R9'}), e({}), e({account: 'ING Current', currency: 'USD'})];
const LOG: MoneyLog = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: ENTRIES, accounts: {notes: {[OLD.id]: 'Closed in March', [NEW.id]: 'Joint'}, order: [USD.id, OLD.id, NEW.id], checked: {[OLD.id]: '2026-03-31', [NEW.id]: '2026-02-28'}}});

describe('which two can be merged', () => {
  it('the same currency, both owned or both owed, active and different', () => {
    expect(mergeProblem(ACCOUNTS, OLD.id, NEW.id)).toBeNull();
    expect(mergeProblem(ACCOUNTS, OLD.id, OLD.id)).toBe('Choose two different accounts.');
    expect(mergeProblem(ACCOUNTS, OLD.id, USD.id)).toMatch(/only accounts in the same currency/);
    expect(mergeProblem(ACCOUNTS, OLD.id, CARD.id)).toBe('An account you own and a debt cannot be merged.');
    expect(mergeTargets(ACCOUNTS, OLD.id).map(a => a.id)).toEqual([NEW.id]);
    expect(mergeTargets(ACCOUNTS, CARD2.id).map(a => a.id)).toEqual([CARD.id]);
  });
  it('the bank-file names of the currency, the account’s own marked', () => {
    expect([...bankNamesFor(LOG, OLD)].sort((a, b) => a.name < b.name ? -1 : 1)).toEqual([{name: 'ING Betaalrekening', own: false}, {name: 'ING Current', own: true}, {name: 'NL12 OLD FILE', own: false}, {name: 'ing current', own: true}]);
    expect(defaultAsName(LOG, NEW)).toBe('ING Betaalrekening');
  });
});

describe('the merge', () => {
  const plan = planMerge(ACCOUNTS, LOG, OLD.id, NEW.id, ['ING Current', 'NL12 OLD FILE'], 'ING Betaalrekening');
  it('plans: balances on days the other has none, entries of the chosen names, exact doubles (same day, amount, reference)', () => {
    expect(plan.balances).toEqual({moved: 2, kept: 1, capped: 0});
    expect(plan.entries.map(x => x.ref)).toEqual(['R1', 'R2', 'R3', 'R4']); // the folded name matches too; the USD entry does not
    expect(plan.doubles.map(d => [d.remove.ref, d.keep.ref])).toEqual([['R1', 'R1']]);
    expect(plan.note).toBe('Closed in March');
  });
  it('accounts: the other gets the history, the one merged is archived with its own kept; net worth reads the latest', () => {
    const next = mergeAccountsRecord(ACCOUNTS, OLD.id, NEW.id, AT);
    const into = next.items.find(a => a.id === NEW.id)!, from = next.items.find(a => a.id === OLD.id)!;
    expect(into.snapshots.map(s => [s.date, s.value])).toEqual([['2026-01-31', '100000'], ['2026-02-28', '120000'], ['2026-03-31', '91000'], ['2026-04-30', '95000']]);
    expect(from.archivedAt).toBe(AT); expect(from.snapshots).toEqual(OLD.snapshots);
    expect(balanceOn(into, '2026-02-15')?.value).toBe(100000n);
    const {added} = mergeAccounts(ACCOUNTS, OLD.id, NEW.id, AT);
    expect([...added.snapshots].sort()).toEqual([id(9001), id(9002)]);
    expect(undoMergeAccounts(next, {fromBefore: OLD, intoBefore: NEW, added, at: AT})).toEqual(ACCOUNTS);
  });
  it('a debt’s payments go with it', () => {
    const next = mergeAccountsRecord(ACCOUNTS, CARD2.id, CARD.id, AT);
    expect(next.items.find(a => a.id === CARD.id)!.payments).toHaveLength(1);
  });
  it('money log: entries renamed, the ticked double removed, note joined, order and last check carried; spending unchanged', () => {
    const out = mergeLog(LOG, plan, 'ING Betaalrekening', new Set([plan.doubles[0]!.remove.id]), [OLD.id, NEW.id]);
    const names = out.log.entries.filter(x => x.currency === 'EUR').map(x => x.account ?? null);
    expect(names).toEqual(['ING Betaalrekening', 'ING Betaalrekening', 'ING Betaalrekening', 'ING Betaalrekening', 'ING Betaalrekening', null]);
    expect(out.log.entries).toHaveLength(ENTRIES.length - 1);
    expect(out.log.accounts?.notes?.[NEW.id]).toBe('Joint · Closed in March');
    expect(out.log.accounts?.order).toEqual([USD.id, NEW.id, OLD.id]);
    expect(out.log.accounts?.checked?.[NEW.id]).toBe('2026-03-31');
    expect(out.removed.map(r => r.index)).toEqual([0]);
    // A merge never changes what an untouched entry counts; only the removed exact double leaves the figures.
    const before = totals(LOG.entries, '2026-01-01', '2026-12-31'), after = totals(out.log.entries, '2026-01-01', '2026-12-31');
    expect(before.find(t => t.currency === 'EUR')!.expenses - after.find(t => t.currency === 'EUR')!.expenses).toBe(2000);
    expect(moneyLogSchema.parse(out.log)).toEqual(out.log);
    const undo: MergeUndo = {fromBefore: OLD, intoBefore: NEW, at: AT, added: {snapshots: [], payments: []}, renamed: out.renamed, asName: 'ING Betaalrekening', removed: out.removed, ...out.before, after: out.after};
    expect(undoMergeLog(out.log, undo)).toEqual(LOG);
  });
  it('without a kept order, the order as shown is kept with the other first; an empty name is refused', () => {
    const plain = {...LOG, accounts: {}};
    const out = mergeLog(plain, planMerge(ACCOUNTS, plain, OLD.id, NEW.id, [], 'x'), 'x', new Set(), [OLD.id, NEW.id, USD.id]);
    expect(out.log.accounts?.order).toEqual([NEW.id, OLD.id, USD.id]);
    expect(out.log.entries).toEqual(plain.entries);
    expect(undoMergeLog(out.log, {fromBefore: OLD, intoBefore: NEW, at: AT, added: {snapshots: [], payments: []}, renamed: out.renamed, asName: 'x', removed: out.removed, ...out.before, after: out.after}).accounts).toEqual({notes: {}});
    expect(() => mergeLog(plain, plan, '  ', new Set(), [])).toThrow('Type the name their entries take.');
  });
  it('review b5k #2: a copy that holds the person’s own edits is kept, the differences are said, and it is never offered ticked', () => {
    const at = '2026-03-03T10:00:00.000Z';
    const edited = e({account: 'ING Current', ref: 'R7', category: 'Fun', sub: 'Cinema', note: 'Cinema · with Sam', parts: [{amount: '10.00', category: 'Fun'}, {amount: '10.00', category: 'Food & drink'}], history: [{at, by: 'you', field: 'category', from: 'Groceries', to: 'Fun'}]});
    const fresh = e({account: 'ING Betaalrekening', ref: 'R7'});
    const log = moneyLogSchema.parse({...LOG, entries: [edited, fresh]});
    const plan2 = planMerge(ACCOUNTS, log, OLD.id, NEW.id, ['ING Current'], 'ING Betaalrekening', {[edited.id]: ['cinema']});
    expect(plan2.doubles).toHaveLength(1);
    const d = plan2.doubles[0]!;
    expect(d.keep.id).toBe(edited.id); expect(d.remove.id).toBe(fresh.id);
    expect(d.differs).toEqual(['category', 'subcategory', 'note', 'split parts', 'changes', 'tags']);
    expect(d.edited).toBe(true);
    // Removing the fresh copy keeps every edit, and the edited copy takes the account's name.
    const out = mergeLog(log, plan2, 'ING Betaalrekening', new Set([fresh.id]), []);
    expect(out.log.entries).toEqual([{...edited, account: 'ING Betaalrekening'}]);
    // Two plain copies are a plain double: the merged account's copy goes, ticked.
    const plain = doubleOf(e({ref: 'R8', account: 'B'}), e({ref: 'R8', account: 'A'}));
    expect(plain.differs).toEqual([]); expect(plain.edited).toBe(false); expect(plain.remove.account).toBe('A');
    // An edited copy on the other side stays the other side's; the merged one is offered, unticked when it differs.
    const other = doubleOf(e({ref: 'R9', note: 'Mine', history: [{at, by: 'you', field: 'note', to: 'Mine'}]}), e({ref: 'R9'}));
    expect(other.remove.note).toBeUndefined(); expect(other.edited).toBe(true); expect(other.differs).toEqual(['note', 'changes']);
  });
  it('review b5k #3: Undo reverses only the merge’s own changes; what was added since stays', () => {
    const {accounts: merged, added} = mergeAccounts(ACCOUNTS, OLD.id, NEW.id, AT);
    const later = accountsSchema.parse({...merged, items: merged.items.map(a => a.id === NEW.id ? {...a, snapshots: [...a.snapshots, snap(77, '2026-05-31', '99000')], updatedAt: '2026-11-21T10:00:00.000Z'} : a)});
    const back = undoMergeAccounts(later, {fromBefore: OLD, intoBefore: NEW, added, at: AT});
    expect(back.items.find(a => a.id === NEW.id)!.snapshots.map(x => x.date)).toEqual(['2026-03-31', '2026-04-30', '2026-05-31']);
    expect(back.items.find(a => a.id === NEW.id)!.updatedAt).toBe('2026-11-21T10:00:00.000Z');
    expect(back.items.find(a => a.id === OLD.id)).toEqual(OLD);
    const plan3 = planMerge(ACCOUNTS, LOG, OLD.id, NEW.id, ['ING Current'], 'ING Betaalrekening'), out = mergeLog(LOG, plan3, 'ING Betaalrekening', new Set(), [OLD.id, NEW.id]);
    const edited = {...out.log, accounts: {...out.log.accounts, notes: {...out.log.accounts?.notes, [NEW.id]: 'Rewritten after the merge'}}};
    const undone = undoMergeLog(edited, {fromBefore: OLD, intoBefore: NEW, at: AT, added, renamed: out.renamed, asName: 'ING Betaalrekening', removed: out.removed, ...out.before, after: out.after});
    expect(undone.accounts?.notes?.[NEW.id]).toBe('Rewritten after the merge');
    expect(undone.accounts?.order).toEqual(LOG.accounts?.order);
    expect(undone.accounts?.checked).toEqual(LOG.accounts?.checked);
  });
  it('review b5k #4: past the balance cap the other account keeps all its own balances; the merged account’s oldest stay on it, said in the plan', () => {
    const day = (k: number) => new Date(Date.UTC(2020, 0, 1 + k)).toISOString().slice(0, 10);
    const big = acc(20, {name: 'Daily', snapshots: Array.from({length: 1999}, (_, k) => ({id: id(100000 + k), date: day(k), value: '100', decimals: 2}))});
    const old = acc(21, {name: 'Old daily', snapshots: Array.from({length: 3}, (_, k) => ({id: id(200000 + k), date: day(3000 + k), value: '200', decimals: 2}))});
    const accounts = accountsSchema.parse({version: 1, items: [big, old]});
    const plan4 = planMerge(accounts, LOG, old.id, big.id, [], 'x');
    expect(plan4.balances).toEqual({moved: 1, kept: 0, capped: 2});
    const into = mergeAccountsRecord(accounts, old.id, big.id, AT).items.find(a => a.id === big.id)!;
    expect(into.snapshots).toHaveLength(2000);
    expect(into.snapshots.filter(x => x.value === '100')).toHaveLength(1999);
    expect(into.snapshots.at(-1)!.date).toBe(day(3002));
  });
});
