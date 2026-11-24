// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything, DEVICE_KEYS} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';
import {BUDGETS_KEY, budgetsSchema} from '../budgets/schema';
import {WEALTH_SHEET_KEY, wealthSheetSchema} from '../wealth-sheet/schema';
import {MONEY_MORE_KEY, moneyMoreSchema} from '../money-more/schema';
import {STORE_CARDS_KEY, storeCardsSchema} from '../store-cards/schema';
import {MONEY_LOG_BUSINESS, BUDGETS_BUSINESS} from '../money-more/spaces';
import {AV2_MONEY_R2_CATALOG_LABELS, AV2_MONEY_R2_ERASE_KEYS, AV2_MONEY_R2_EXPORT_KEYS, AV2_MONEY_R2_PERSONAL_KEYS} from '../av2-money-r2-keys';

/**
 * Session AV lane 2, round 2 (money): every new optional stored field survives Export everything → Erase everything →
 * Restore (replace), read back through its own schema exactly as written; the four new records do so once the lead has
 * wired lib/av2-money-r2-keys.ts into the shared registries (until then those tests are skipped and the schema tests run).
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });

async function roundTrip(records: Record<string, unknown>): Promise<Record<string, unknown>> {
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)]));
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-11-22', showcase: false, now: NOW});
  const opened = await openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  await eraseEverything({localStorage, sessionStorage, indexedDB: null});
  for (const k of Object.keys(values)) expect(localStorage.getItem(k)).toBeNull();
  const parts = planParts(opened.json).filter(p => Object.keys(values).includes(p.key));
  expect(parts.length).toBe(Object.keys(values).length);
  const outcome = await applyRestore(opened, parts.map(part => ({part, mode: 'replace' as const})), {vision: false, progress: false});
  expect(outcome.failed).toEqual([]);
  return Object.fromEntries(Object.keys(values).map(k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')]));
}

const at = '2026-11-20T10:00:00.000Z';
export const R2_LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', subs: {'Food & drink': ['Coffee', 'Lunch']}, entries: [
  {id: 'e1', kind: 'expense', amount: '60.00', currency: 'EUR', category: 'Food & drink', sub: 'Lunch', note: 'Dinner with Sam', date: '2026-11-03', createdAt: at, paidWith: 'credit', share: '20.00', fine: true},
  {id: 'e2', kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Food & drink', sub: 'Coffee', date: '2026-11-04', createdAt: at, paidWith: 'cash'},
]});
export const R2_BUDGETS = budgetsSchema.parse({version: 1, budgets: [], payees: [{payee: 'Albert Heijn', currency: 'EUR', amount: '250.00'}]});
const SHEET = wealthSheetSchema.parse({version: 1, limits: {'00000000-0000-4000-8000-000000000001': {below: '500.00', above: '20000.00'}}});
export const R2_MORE = moneyMoreSchema.parse({version: 1,
  saved: [{id: 's1', name: 'Coffee', kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Food & drink', sub: 'Coffee', paidWith: 'debit'}],
  budgets: [{id: 'b1', name: 'Holiday', currency: 'EUR', amount: '1200.00', tag: 'holiday', every: 'once', from: '2026-12-01', to: '2026-12-20'}, {id: 'b2', name: 'Eating out', currency: 'EUR', amount: '150.00', categories: ['Food & drink', 'Fun'], every: 'month'}],
  owed: [{id: 'o1', name: 'Sam', amount: '20.00', currency: 'EUR', date: '2026-11-03', entryId: 'e1'}, {id: 'o2', name: 'Lee', amount: '20.00', currency: 'EUR', date: '2026-11-03', entryId: 'e1', settled: '2026-11-05'}],
  loans: [{id: 'l1', kind: 'lent', name: 'Noor', amount: '100.00', currency: 'EUR', date: '2026-10-01', due: '2026-12-01', remind: true, repaid: [{date: '2026-11-01', amount: '40.00'}]}, {id: 'l2', kind: 'borrowed', name: 'Mum', amount: '50.00', currency: 'EUR', date: '2026-09-01', closed: '2026-10-01', forgiven: true}],
  space: 'business', business: {name: 'Studio'}});
export const R2_CARDS = storeCardsSchema.parse({version: 1, cards: [{id: 'c1', name: 'Albert Heijn Bonus', number: '2620001234567', format: 'ean13', addedAt: at}, {id: 'c2', name: 'Library', number: 'LIB-00042', format: 'code128', note: 'Back door', addedAt: at}]});

describe('Session AV lane 2, round 2 (money): new fields on records already in the registries', () => {
  test('money log: paid with, subcategory, my share, that-is-fine; the subcategory list', async () => {
    const back = await roundTrip({[MONEY_LOG_KEY]: R2_LOG});
    expect(moneyLogSchema.parse(back[MONEY_LOG_KEY])).toEqual(R2_LOG);
    expect(R2_LOG.entries[0]).toMatchObject({paidWith: 'credit', sub: 'Lunch', share: '20.00', fine: true});
  });
  test('budgets: an amount on a watched payee; the wealth sheet: limits per account', async () => {
    const back = await roundTrip({[BUDGETS_KEY]: R2_BUDGETS, [WEALTH_SHEET_KEY]: SHEET});
    expect(budgetsSchema.parse(back[BUDGETS_KEY])).toEqual(R2_BUDGETS);
    expect(wealthSheetSchema.parse(back[WEALTH_SHEET_KEY])).toEqual(SHEET);
  });
  test('a value this build cannot read is dropped on read, never failing the record', () => {
    const odd = moneyLogSchema.parse({...R2_LOG, subs: 'x', entries: [{...R2_LOG.entries[0]!, paidWith: 'gold', share: '-1', fine: 'yes', sub: ''}]});
    expect(odd.subs).toBeUndefined();
    expect(odd.entries[0]!.paidWith).toBeUndefined(); expect(odd.entries[0]!.share).toBeUndefined(); expect(odd.entries[0]!.fine).toBeUndefined(); expect(odd.entries[0]!.sub).toBeUndefined();
    const budgets = budgetsSchema.parse({...R2_BUDGETS, payees: [{payee: 'X', currency: 'EUR', amount: 'lots'}]});
    expect(budgets.payees![0]).toEqual({payee: 'X', currency: 'EUR', amount: undefined});
  });
});

const wired = Object.values(DEVICE_KEYS as Record<string, string>).includes(MONEY_MORE_KEY);
describe('Session AV lane 2, round 2 (money): the new records', () => {
  test.skipIf(!wired)('money extras, store cards and the business space survive export → erase → restore', async () => {
    const bizLog = moneyLogSchema.parse({...R2_LOG}), bizBudgets = budgetsSchema.parse({version: 1, budgets: [{id: 'b1', category: 'Bills', currency: 'EUR', monthly: '90.00', rollover: false, since: '2026-11'}]});
    const back = await roundTrip({[MONEY_MORE_KEY]: R2_MORE, [STORE_CARDS_KEY]: R2_CARDS, [MONEY_LOG_BUSINESS.key]: bizLog, [BUDGETS_BUSINESS.key]: bizBudgets});
    expect(moneyMoreSchema.parse(back[MONEY_MORE_KEY])).toEqual(R2_MORE);
    expect(storeCardsSchema.parse(back[STORE_CARDS_KEY])).toEqual(R2_CARDS);
    expect(moneyLogSchema.parse(back[MONEY_LOG_BUSINESS.key])).toEqual(bizLog);
    expect(budgetsSchema.parse(back[BUDGETS_BUSINESS.key])).toEqual(bizBudgets);
  });
  test('each record reads every field and drops a part it cannot read', () => {
    expect(R2_MORE.loans![0]!.repaid).toHaveLength(1);
    const odd = moneyMoreSchema.parse({...R2_MORE, saved: 'x', loans: [{...R2_MORE.loans![0]!, due: 'soon', repaid: 'x'}], space: 'work', future: {kept: true}});
    expect(odd.saved).toBeUndefined(); expect(odd.space).toBeUndefined(); expect(odd.loans![0]!.due).toBeUndefined(); expect(odd.loans![0]!.repaid).toBeUndefined();
    expect((odd as Record<string, unknown>).future).toEqual({kept: true});
    expect(storeCardsSchema.safeParse({version: 1, cards: [{...R2_CARDS.cards[0]!, number: 'a\nb'}]}).success).toBe(false);
  });
  test('the registry literals name every new record once', () => {
    expect([...AV2_MONEY_R2_PERSONAL_KEYS].sort()).toEqual([MONEY_MORE_KEY, STORE_CARDS_KEY, MONEY_LOG_BUSINESS.key, BUDGETS_BUSINESS.key].sort());
    expect(Object.values(AV2_MONEY_R2_EXPORT_KEYS).sort()).toEqual([...AV2_MONEY_R2_PERSONAL_KEYS].sort());
    expect(AV2_MONEY_R2_ERASE_KEYS).toEqual(AV2_MONEY_R2_PERSONAL_KEYS);
    expect(Object.keys(AV2_MONEY_R2_CATALOG_LABELS).sort()).toEqual(Object.keys(AV2_MONEY_R2_EXPORT_KEYS).sort());
  });
});
