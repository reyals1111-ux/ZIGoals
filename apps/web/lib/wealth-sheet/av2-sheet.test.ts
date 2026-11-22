import {describe, expect, test} from 'vitest';
import {addFlow, equityOf, groupTotals, irr, linkMortgage, oneTotal, removeFlow, setEvery, setGroup, setRate, setShare, shareTotals, staleAccounts} from './sheet';
import {emptyWealthSheet, wealthSheetSchema} from './schema';
import {docFileName} from './docs';
import {accountsSchema, type Account} from '../accounts/schema';
import {moneyAttention, attentionLinks} from '../money-attention';
import {eventsAt, inMoneyOf} from '../fi-model/model';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {freshAll, zigiEnv} from '../ai/evals/as/harness';
import {WEALTH_SHEET_KEY} from './schema';
import {AV2_MONEY_CATALOG_LABELS, AV2_MONEY_DATABASES, AV2_MONEY_ERASE_KEYS, AV2_MONEY_EXPORT_KEYS, WEALTH_SHEET_KEY_LITERAL} from '../av2-money-device-keys';

/** Session AV lane 2 (money; Kubera): mortgage equity, shares, groups, stale reminders, one total from typed rates, IRR, documents, Fast Forward. */
const TODAY = '2026-11-14', AT = '2026-01-01T09:00:00.000Z';
const acct = (id: string, kind: Account['kind'], name: string, currency: string, snaps: [string, string][]): Account => ({id, kind, name, currency, snapshots: snaps.map(([date, value], i) => ({id: `${id.slice(0, -4)}${String(i).padStart(4, '0')}`, date, value, decimals: 2})), payments: [], createdAt: AT, updatedAt: AT});
const HOME = '00000000-0000-4000-8000-0000000a0001', MORT = '00000000-0000-4000-8000-0000000b0001', JOINT = '00000000-0000-4000-8000-0000000c0001', USD = '00000000-0000-4000-8000-0000000d0001';
const accounts = accountsSchema.parse({version: 1, items: [acct(HOME, 'property', 'Home', 'EUR', [['2026-03-01', '40000000']]), acct(MORT, 'mortgage', 'Mortgage', 'EUR', [['2026-11-01', '25000000']]), acct(JOINT, 'savings', 'Joint savings', 'EUR', [['2026-10-20', '1000000']]), acct(USD, 'investment', 'US fund', 'USD', [['2026-11-10', '500000']])]});

describe('the sheet', () => {
  test('a mortgage linked to its home gives the equity on the home', () => {
    const s = linkMortgage(emptyWealthSheet(), MORT, HOME);
    expect(equityOf(accounts, s, HOME, TODAY)).toMatchObject({value: 40000000n, owed: 25000000n, equity: 15000000n, mortgages: [{name: 'Mortgage'}]});
    expect(equityOf(accounts, emptyWealthSheet(), HOME, TODAY)).toBeNull();
    expect(linkMortgage(s, MORT, null).secures).toBeUndefined();
  });
  test('a 50 % share counts half; groups subtotal at the shares', () => {
    let s = setShare(emptyWealthSheet(), JOINT, 50);
    expect(shareTotals(accounts, s, TODAY).find(t => t.currency === 'EUR')).toEqual({currency: 'EUR', net: 40000000n - 25000000n + 500000n, whole: 40000000n - 25000000n + 1000000n, shared: 1});
    expect(() => setShare(s, JOINT, 0)).toThrow('1 to 100');
    expect(setShare(s, JOINT, 100).share).toBeUndefined();
    s = setGroup(setGroup(s, HOME, 'Home'), MORT, ' Home ');
    expect(groupTotals(accounts, s, TODAY).filter(g => g.currency === 'EUR')).toEqual([{group: 'Home', currency: 'EUR', net: 15000000n, accounts: 2}, {group: '', currency: 'EUR', net: 500000n, accounts: 1}]);
  });
  test('stale by the person\'s own "update every"; on Today', () => {
    const s = setEvery(setEvery(emptyWealthSheet(), HOME, 'quarter'), JOINT, 'month');
    expect(staleAccounts(accounts, s, TODAY).map(x => x.name)).toEqual(['Home']);
    expect(staleAccounts(accounts, s, '2026-11-25').map(x => x.name)).toEqual(['Home', 'Joint savings']);
    expect(attentionLinks(moneyAttention({entries: [], today: TODAY, stale: staleAccounts(accounts, s, TODAY)})).map(l => l.text)).toEqual(['Home: due for an update']);
  });
  test('one total from rates the person typed (direct or inverse); a currency without one is named', () => {
    const rows = [{currency: 'EUR', cents: 1000000n}, {currency: 'USD', cents: 500000n}, {currency: 'GBP', cents: 100n}];
    let s = setRate(emptyWealthSheet(), 'USD', 'EUR', '0.92', '2026-11-20');
    expect(oneTotal(rows, s.rates, 'EUR')).toEqual({currency: 'EUR', cents: 1460000n, used: [{from: 'USD', rate: '0.92', on: '2026-11-20', inverse: false}], missing: ['GBP']});
    s = setRate(emptyWealthSheet(), 'EUR', 'USD', '1.25', '2026-11-20');
    expect(oneTotal([{currency: 'USD', cents: 500000n}], s.rates, 'EUR').cents).toBe(400000n);
    expect(() => setRate(s, 'EUR', 'EUR', '1', TODAY)).toThrow('two different');
    expect(setRate(s, 'USD', 'EUR', null, TODAY).rates).toBeUndefined();
  });
  test('the annual return from money in and out and today\'s value', () => {
    const r = irr([{date: '2025-11-14', amount: '10000.00', kind: 'in'}], 1100000n, TODAY)!;
    expect(r).toBeCloseTo(0.1, 2);
    const r2 = irr([{date: '2024-11-14', amount: '10000.00', kind: 'in'}, {date: '2025-11-14', amount: '1000.00', kind: 'out'}], 1000000n, TODAY)!;
    expect(r2).toBeGreaterThan(0.04); expect(r2).toBeLessThan(0.06);
    expect(irr([], 100n, TODAY)).toBeNull();
    expect(irr([{date: '2025-11-14', amount: '100.00', kind: 'in'}], null, TODAY)).toBeNull();
    let s = addFlow(emptyWealthSheet(), JOINT, {date: '2026-02-01', amount: '50.00', kind: 'in'});
    s = addFlow(s, JOINT, {date: '2026-01-01', amount: '20.00', kind: 'out'});
    expect(s.flows?.[JOINT]!.map(f => f.date)).toEqual(['2026-01-01', '2026-02-01']);
    expect(() => addFlow(s, JOINT, {date: '2026-02-01', amount: '0', kind: 'in'})).toThrow('above zero');
    expect(removeFlow(removeFlow(s, JOINT, 0), JOINT, 0).flows).toBeUndefined();
    expect(wealthSheetSchema.parse(s)).toEqual(s);
  });
  test('documents: their file name in Export everything', () => {
    expect(docFileName({accountId: HOME, docId: 'doc_1', name: 'Deed (2024).pdf', type: 'application/pdf'})).toBe(`wealth-docs/${HOME}/doc_1-Deed_2024_.pdf`);
  });
  test('the registry literals name the record and the database', () => {
    expect(WEALTH_SHEET_KEY_LITERAL).toBe(WEALTH_SHEET_KEY);
    expect(Object.values(AV2_MONEY_EXPORT_KEYS)).toEqual([WEALTH_SHEET_KEY]);
    expect(AV2_MONEY_ERASE_KEYS).toEqual([WEALTH_SHEET_KEY]);
    expect(AV2_MONEY_CATALOG_LABELS.wealthSheet[1]).toBe('Goals and Wealth');
    expect(AV2_MONEY_DATABASES).toEqual(['zigoals-wealth-docs-v1']);
  });
});

describe('Fast Forward (the long model)', () => {
  test('tax taken off an income stream; money of a later year beside today\'s', () => {
    expect(eventsAt([{year: 20, amount: 10000, kind: 'in', every: 'yearly', taxPct: 30}], 21)).toBe(7000);
    expect(inMoneyOf(1000, 10, 2)).toBeCloseTo(1218.99, 1);
    expect(inMoneyOf(1000, 10, 0)).toBe(1000);
  });
});

describe('answers', () => {
  const env = () => ({...zigiEnv({...freshAll(), accounts}), wealthSheet: setRate(setEvery(linkMortgage(emptyWealthSheet(), MORT, HOME), HOME, 'quarter'), 'USD', 'EUR', '0.92', '2026-11-10')});
  const text = (q: string, e = env()) => { const r = av2MoneyAnswer(q, e); return r && 'text' in r ? r.text : ''; };
  test('equity, stale, one total, IRR (EN and NL)', () => {
    const today = zigiEnv(freshAll()).habitDay;
    expect(text('what is my home equity')).toBe('Home: equity €150,000.00 (worth €400,000.00, less €250,000.00 owed on Mortgage).');
    expect(text('hoeveel overwaarde heb ik')).toMatch(/^Home: overwaarde €150[.,]000/);
    expect(text('which accounts need an update')).toMatch(today >= '2026-06-01' ? /^Due for an update: Home/ : /Nothing is due/);
    expect(text('what is my net worth in one total')).toBe('One total in EUR: €164,600.00, with your own rates (1 USD = 0.92 EUR), not live ones.');
    expect(text('what is my irr')).toContain('No account has money in and out recorded yet');
    expect(text('wat is het rendement van mijn beleggingen')).toContain('Nog geen rekening');
  });
});
