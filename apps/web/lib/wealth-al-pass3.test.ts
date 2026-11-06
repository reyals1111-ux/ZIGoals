// Session AL (lane L1, third pass): one default currency, over-allocation and "available" words, CSV column reasons,
// stablecoins as cash, HIFO lots, range returns, Mint columns and the format/number primitives in the Wealth files.
import {describe, expect, it} from 'vitest';
import {defaultMoneyCurrency} from './wealth-currency';
import {availableUnits, quantityShortfall} from './wealth-goal-fit';
import {allocate, emptyPlatform, positionSchema, type Platform} from './positions';
import {columnsText, missingFieldsText, type CsvSetup} from '../components/import/csv-import-steps';
import {HOLDINGS_FIELDS, TRANSACTION_FIELDS, guessMapping} from './csv/mapping';
import {MONEY_FIELDS} from './csv/templates/presets';
import {planMoneyRows} from './csv/templates/money-rows';
import {parseNumberCell} from './csv/numbers';
import {rateE4} from './debt-planner/plan';
import {STABLECOINS_AS_CASH_KEY, shownWealthClass, wealthOverview} from './wealth';
import {manualSourcePosition} from './manual-source';
import {lotResults} from './portfolio/lots';
import {priceChange, rangeReturns, type PricePoint} from './portfolio/performance';
import {centsText, moneyWhole, moneyCents} from '../components/wealth/money-tools/format';
import {formatCurrencyAmount, formatPercent} from './visual-format';

const AT = '2026-11-05T09:00:00.000Z';
const position = (id: string, quantity: string) => positionSchema.parse({id, providerId: `Asset ${id}`, sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'ITEM', denom: 'manual:ITEM', quantity, decimals: 0, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry'});
const goal = (id: string) => ({id, network: 'zigchain-1' as const, name: `Goal ${id}`, type: 'QUANTITY' as const, status: 'active' as const, asset: 'ITEM', denom: 'manual:ITEM', decimals: 0, target: '100', notes: '', milestones: [], createdAt: AT});
const platformWith = (quantity: string, allocations: [string, string][]): Platform => {
  let s: Platform = {...emptyPlatform(), positions: [position('p', quantity)], goals: allocations.map(([g]) => goal(g))};
  for (const [g, q] of allocations) s = allocate(s, g, 'p', q);
  return s;
};

describe('P-DVR-22 (BUG-065, G-024, G-022, PR-068): one default currency for a new money record', () => {
  it('the stored choice first, then the currency holding the most, then the device', () => {
    expect(defaultMoneyCurrency({stored: 'EUR', held: [{currency: 'USD', value: 900n}], device: 'USD'})).toBe('EUR');
    expect(defaultMoneyCurrency({held: [{currency: 'EUR', value: 100n}, {currency: 'USD', value: 900n}], device: 'EUR'})).toBe('USD');
    expect(defaultMoneyCurrency({held: [{currency: 'GBP', value: 9000n}, {currency: 'EUR', value: 1n}], device: 'USD'})).toBe('EUR'); // only USD/EUR (F)
    expect(defaultMoneyCurrency({held: [{currency: 'USD', value: 0n}], device: 'EUR'})).toBe('EUR'); // nothing held: the device
    expect(defaultMoneyCurrency({device: 'USD'})).toBe('USD');
  });
});

describe('P-MO-96 (MO-158, N-MO-17): a quantity below its allocations is said, in units', () => {
  it('quantityShortfall gives what would be over-allocated, null when covered', () => {
    const s = platformWith('11', [['1', '5'], ['2', '6']]);
    expect(quantityShortfall(s, 'p', '8')).toEqual({allocated: '11', deficit: '3'});
    expect(quantityShortfall(s, 'p', '11')).toBeNull();
    expect(quantityShortfall(s, 'missing', '1')).toBeNull();
  });
  it('P-DVR-88 (G-009) / P-TK-51 (TK-194): a source card says what is still available', () => {
    expect(availableUnits(platformWith('25000', [['1', '5000']]), 'p')).toEqual({available: '20000', allocated: '5000', deficit: '0'});
    expect(availableUnits(platformWith('25000', []), 'p')).toBeNull(); // nothing allocated: the card stays as it was
    const short = platformWith('11', [['1', '11']]); short.positions[0]!.quantity = '8';
    expect(availableUnits(short, 'p')).toEqual({available: '0', allocated: '11', deficit: '3'});
  });
});

describe('P-DVR-07 (D-078, D-237): the CSV import names its columns and why Next waits', () => {
  it('names the columns, required ones first', () => {
    expect(columnsText(HOLDINGS_FIELDS)).toBe('Name and Currency (required); also Asset, Quantity, Kind of asset, Value and Notes');
    expect(columnsText(TRANSACTION_FIELDS)).toMatch(/^Coin, Quantity and Date \(required\); also /);
  });
  it('a disabled Next names the required field still missing', () => {
    const setup = {mapping: {name: 0}} as unknown as CsvSetup;
    expect(missingFieldsText(setup, HOLDINGS_FIELDS, ['name', 'currency'])).toBe('Match the required field Currency to a column to continue.');
    expect(missingFieldsText({mapping: {}} as unknown as CsvSetup, HOLDINGS_FIELDS, ['name', 'currency'])).toBe('Match the required fields Name, Currency to a column to continue.');
    expect(missingFieldsText({mapping: {name: 0, currency: 1}} as unknown as CsvSetup, HOLDINGS_FIELDS, ['name', 'currency'])).toBeNull();
  });
});

describe('GAP-008 (P-DVG-51): a Mint export reads by its own column names', () => {
  it('"Transaction Type" debit/credit is the in-or-out column', () => {
    const header = ['Date', 'Description', 'Original Description', 'Amount', 'Transaction Type', 'Category', 'Account Name', 'Labels', 'Notes'];
    const mapping = guessMapping(header, MONEY_FIELDS);
    expect(mapping).toMatchObject({date: 0, payee: 1, amount: 3, direction: 4, category: 5, note: 8});
    const plan = planMoneyRows({rows: [['10/02/2026', 'Corner Grocery', 'CORNER GROCERY 123', '42.10', 'debit', 'Groceries', 'Checking', '', ''], ['10/15/2026', 'Example Payroll', 'PAYROLL', '1500.00', 'credit', 'Paycheck', 'Checking', '', '']], mapping, numberStyle: 'point', dateFormat: 'mdy', currency: 'USD'});
    expect(plan.transactions.map(t => [t.date, t.amount, t.direction])).toEqual([['2026-10-02', '42.1', 'out'], ['2026-10-15', '1500', 'in']]);
  });
});

describe('GAP-028 (P-TK-83, C-TK-14): stablecoins can count as cash in the class view', () => {
  const positions = [manualSourcePosition({category: 'Stablecoins', name: 'Dollar coin', symbol: 'USDQ', quantity: '100', currency: 'USD', value: '100'}, 'stable'), manualSourcePosition({category: 'Cash', name: 'Wallet cash', quantity: '50', currency: 'USD'}, 'cash')];
  it('moves Stablecoins under Cash only when chosen; totals never change', () => {
    const s = {...emptyPlatform(), positions}, plain = wealthOverview(s, Date.parse(AT)), merged = wealthOverview(s, Date.parse(AT), [], {stablecoinsAsCash: true});
    expect(plain.categories.find(c => c.assetClass === 'Stablecoins')!.items).toHaveLength(1);
    expect(merged.categories.some(c => c.assetClass === 'Stablecoins')).toBe(false);
    expect(merged.categories.find(c => c.assetClass === 'Cash')!.items).toHaveLength(2);
    expect(merged.subtotals).toEqual(plain.subtotals);
    expect(shownWealthClass('Stablecoins', true)).toBe('Cash');
    expect(shownWealthClass('Stablecoins')).toBe('Stablecoins');
    expect(STABLECOINS_AS_CASH_KEY).toBe('zigoals:stablecoins-as-cash:v1');
  });
});

const tx = (kind: 'buy' | 'sell' | 'transfer-in' | 'transfer-out', quantity: string, date: string, price?: string) => ({id: `${kind}-${date}-${quantity}`, coin: 'c', kind, quantity, ...(price ? {price} : {}), date, note: '', createdAt: AT});
describe('P-TK-75 / GAP-014 (C-TK-06, C-DVG-59): HIFO, the highest cost first', () => {
  it('sells the dearest lot first; an unknown-cost lot makes the order unknown', () => {
    const portfolio = {transactions: [tx('buy', '1', '2026-01-01', '100'), tx('buy', '1', '2026-02-01', '300'), tx('buy', '1', '2026-03-01', '200'), tx('sell', '1', '2026-04-01', '250')]};
    expect(lotResults(portfolio, 'hifo').get('c')).toMatchObject({realized: '-50', heldCost: '300', heldQuantity: '2'});
    expect(lotResults(portfolio, 'fifo').get('c')).toMatchObject({realized: '150'});
    expect(lotResults(portfolio, 'lifo').get('c')).toMatchObject({realized: '50'});
    const unknown = {transactions: [tx('buy', '1', '2026-01-01', '100'), tx('transfer-in', '1', '2026-02-01'), tx('sell', '1', '2026-04-01', '250')]};
    expect(lotResults(unknown, 'hifo').get('c')!.realized).toBeUndefined();
  });
});

describe('GAP-016 (P-DVG-62, C-DVG-62): time- and money-weighted returns over a range', () => {
  const day = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const prices = new Map<string, PricePoint[]>([['c', [{at: day('2026-01-01'), price: '100'}, {at: day('2026-01-11'), price: '110'}, {at: day('2026-01-21'), price: '121'}]]]);
  const span = {start: day('2026-01-01'), end: day('2026-01-21')};
  it('chains each stretch: adding money mid-range does not move the time-weighted return', () => {
    const r = rangeReturns({transactions: [tx('buy', '1', '2025-12-01', '90'), tx('buy', '1', '2026-01-11', '110')]}, prices, span);
    expect(Number(r.twr)).toBeCloseTo(21, 9); // +10 % then +10 %
    // Money-weighted: 1 coin from the start, a second for the last half: gain 21 + 11 = 32 on 100 + 110 × ½.
    expect(Number(r.mwr)).toBeCloseTo(32 / 155 * 100, 9);
  });
  it('unknown, never zero, without a price or with nothing held', () => {
    expect(rangeReturns({transactions: [tx('buy', '1', '2025-12-01', '90')]}, new Map(), span)).toEqual({reason: 'price'});
    expect(rangeReturns({transactions: []}, prices, span)).toEqual({reason: 'empty'});
  });
  it("the comparison coin's own change over the same range", () => {
    expect(Number(priceChange(prices.get('c'), span))).toBeCloseTo(21, 9);
    expect(priceChange(undefined, span)).toBeUndefined();
  });
});

describe('PRIMITIVES 3f in the Wealth files (P14-D list): one reader, one format layer', () => {
  it('CSV cells keep their style rules and read through parseNumberInput', () => {
    expect(parseNumberCell('1.234', 'point')).toBe('1.234'); // never "ambiguous" on a device whose group sign is a point
    expect(parseNumberCell('1.234,50', 'comma')).toBe('1234.5');
    expect(parseNumberCell('12.', 'point')).toBe('12');
    expect(parseNumberCell('.5', 'point')).toBe('0.5');
    expect(() => parseNumberCell('1.2.3', 'point')).toThrow('not a number');
  });
  it('the debt rate reads like every other number', () => {
    expect(rateE4('5,25')).toBe(52_500n);
    expect(rateE4(' 21.9 ')).toBe(219_000n);
    expect(rateE4('1e2')).toBeNull();
    expect(rateE4('-3')).toBeNull();
  });
  it('bank files, spending map and cash forecast write money as the rest of the app does', () => {
    expect(formatCurrencyAmount('42.10', 'EUR')).toBe('€42.10');
    expect(formatCurrencyAmount('42.10', 'GBP')).toBe('42.1 GBP'); // another code is the amount and the code, never money
    expect(moneyCents(6000, 'EUR')).toBe('€60.00');
    expect(moneyWhole(centsText(-40_000n), 'EUR')).toBe('-€400');
    expect(formatPercent(60)).toBe('60%');
  });
});
