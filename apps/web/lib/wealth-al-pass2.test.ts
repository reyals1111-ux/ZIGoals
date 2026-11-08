// Session AL (lane L1, second pass): plausibility tier, Undo restores, goal fit, search hint, import class words, calculator.
import {afterEach, expect, it} from 'vitest';
import {PLAUSIBLE_MONEY_MAX, plausibilityWarning, plausibleConfirm} from './wealth-plausibility';
import {VALUE_LIMITS} from './limits/plausibility';
import {reinsertAccount, reinsertFavourite, unarchiveAccount} from './wealth-undo';
import {addAccount, editAccount, removeAccount} from './accounts/net-worth';
import {emptyAccounts, type Accounts} from './accounts/schema';
import {emptyPlatform, type Platform} from './positions';
import {addFavourite, removeFavourite} from './asset-management';
import {FEATURED_MARKETS} from './product-insights';
import {hideToast, showUndo, shownToasts} from '../components/ui/undo-toast';
import {fileClassNote, planHoldingsImport} from './import/holdings';
import {elsewhereHint} from '../components/platform/asset-search';
import {referenceNote} from '../components/platform/asset-picker';
import {automaticUnitLabel} from '../components/platform/asset-source';
import {calculatorCsv, contributionFor} from '../components/calculator/calculator-extras';
import {compound, DEFAULT_INPUT} from './compound/engine';
import {amountText} from '../components/calculator/calculator';

afterEach(() => { hideToast(); hideToast(); });
const at = '2026-11-04T10:00:00.000Z';
const A1 = '11111111-1111-4111-8111-111111111111', A2 = '22222222-2222-4222-8222-222222222222', A3 = '33333333-3333-4333-8333-333333333333';
/** A store as the pages have one: update reads the latest record and replaces it. */
function store<T>(data: T) { const s = {data, update: (fn: (latest: T) => T) => { s.data = fn(s.data); return s.data; }}; return s; }
const runUndo = async () => { const t = shownToasts().at(-1)!; expect(typeof t.undo).toBe('function'); return t.undo!(); };

it('P-TK-49: the "check this?" tier starts at a thousandth of the money limit and never refuses', () => {
  expect(PLAUSIBLE_MONEY_MAX).toBe(VALUE_LIMITS.money.max / 1000);
  expect(plausibilityWarning(999_999_999.99, 'EUR', 'balance')).toBeNull();
  expect(plausibilityWarning(999_999_999_999, 'EUR', 'debt')).toMatch(/^€999,999,999,999\.00 is more than a billion — unusually large for a debt\./);
  // Not USD or EUR: the amount and the code as typed, never converted or made into money.
  // Session AL (TK-199, deliberate): GBP is a real ISO code, so it reads as money with its own symbol (never converted).
  expect(plausibilityWarning(2e9, 'GBP', 'value')).toMatch(/^£2,000,000,000\.00 is more than a billion/);
  expect(plausibilityWarning(2e9, 'XYZ', 'value')).toMatch(/^2,000,000,000 XYZ is more than a billion/);
  expect(plausibilityWarning(NaN, 'USD', 'value')).toBeNull();
  const confirm = plausibleConfirm(), warning = plausibilityWarning(5e9, 'USD', 'value');
  expect(confirm.check('a:5e9', warning)).toBe(false); // asks
  expect(confirm.check('a:5e9', warning)).toBe(true); // the same amount again saves
  expect(confirm.check('a:6e9', warning)).toBe(false); // a new amount asks again
  expect(confirm.check('a:6e9', null)).toBe(true);
});

it('A7 (accounts): Undo of Archive and of Remove puts the store record back; later accounts are kept', async () => {
  const s = store<Accounts>(addAccount(emptyAccounts(), {id: A1, kind: 'savings', name: 'Savings', currency: 'EUR'}, at));
  s.update(g => addAccount(g, {id: A2, kind: 'loan', name: 'Car loan', currency: 'EUR'}, at));
  const before = structuredClone(s.data.items[0]!);
  s.update(g => editAccount(g, A1, {archived: true}, at));
  showUndo({message: 'Savings archived.', restore: () => s.update(unarchiveAccount(A1)), undone: 'Savings is back.'});
  expect(s.data.items[0]!.archivedAt).toBeTruthy();
  await runUndo();
  expect(s.data.items[0]!.archivedAt).toBeUndefined();
  const index = s.data.items.findIndex(a => a.id === A1), account = s.data.items[index]!;
  s.update(g => removeAccount(g, A1));
  s.update(g => addAccount(g, {id: A3, kind: 'cash', name: 'Wallet', currency: 'USD'}, at)); // added after the removal
  showUndo({message: 'Savings removed.', restore: () => s.update(reinsertAccount(account, index))});
  await runUndo();
  expect(s.data.items.map(a => a.id)).toEqual([A1, A2, A3]);
  expect(s.data.items[0]!.name).toBe(before.name);
  // Undo twice does not duplicate it.
  s.update(reinsertAccount(account, index));
  expect(s.data.items.filter(a => a.id === A1)).toHaveLength(1);
});

it('A7 (favourites, Wealth and Markets): Undo of Remove puts the favourite back in its place in the store', async () => {
  const [btc, eth, sol] = [FEATURED_MARKETS[0]!, FEATURED_MARKETS[1]!, FEATURED_MARKETS[4]!];
  const s = store<Platform>([btc, eth, sol].reduce((p, a) => addFavourite(p, a), emptyPlatform()));
  const was = s.data.watchlist[1]!, key = 'coingecko:coin:ethereum';
  s.update(p => removeFavourite(p, key));
  showUndo({message: 'Ethereum removed from your favourites.', restore: () => s.update(reinsertFavourite(was, 1))});
  expect(s.data.watchlist.map(a => a.symbol)).toEqual(['BTC', 'SOL']);
  await runUndo();
  expect(s.data.watchlist.map(a => a.symbol)).toEqual(['BTC', 'ETH', 'SOL']);
  expect(s.update(reinsertFavourite(was, 1)).watchlist).toHaveLength(3);
});

it('N-TK-16: a search in the wrong tab names the tab that lists it', () => {
  const catalog = FEATURED_MARKETS.map(a => ({...a}));
  expect(elsewhereHint('VOO', catalog, 'Crypto')).toBe('VOO (Vanguard S&P 500 ETF) is listed under ETFs. Choose the ETFs tab above to add it.');
  expect(elsewhereHint('voo', catalog, 'ETFs')).toBeNull();
  expect(elsewhereHint('gold', catalog, 'Stocks')).toMatch(/under Precious metals/);
  expect(elsewhereHint('btc', catalog, 'Stablecoins')).toBeNull();
  expect(elsewhereHint('', catalog, 'Crypto')).toBeNull();
});

it('DV-145: a tokenized stock, ETF or metal is explained for what it is, without "RWA" or metal words under a stock', () => {
  const [apple, gold] = [FEATURED_MARKETS.find(a => a.symbol === 'AAPL')!, FEATURED_MARKETS.find(a => a.symbol === 'XAU')!];
  expect(automaticUnitLabel(apple)).toBe('Shares you hold');
  expect(automaticUnitLabel(gold)).toBe('Reference units you hold');
  const stock = referenceNote('stock', 'AAPL');
  expect(stock).toMatch(/shares you hold.*not your broker’s quote/);
  expect(stock).not.toMatch(/RWA|metal/i);
  expect(referenceNote('commodity', 'XAU')).toMatch(/not a physical metal spot price/);
});

it('TK-010: the file’s class word is kept in the note when Wealth files it under a broader kind', () => {
  expect(fileClassNote('ETF', 'Stocks')).toBe('Class in your file: ETF (kept as Stocks).');
  expect(fileClassNote('Vehicle', 'Custom asset')).toBe('Class in your file: Vehicle (kept as a custom asset).');
  expect(fileClassNote('Stocks', 'Stocks')).toBeNull();
  expect(fileClassNote('equity', 'Stocks')).toBeNull();
  const plan = planHoldingsImport({rows: [['Vanguard S&P 500 ETF', 'VOO', '4', 'ETF', '2100', 'USD'], ['Old Skoda', '', '1', 'Vehicle', '3000', 'EUR']], mapping: {name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5}, numberStyle: 'point'});
  expect(plan.refused).toEqual([]);
  expect(plan.ready.map(r => [r.input.category, r.fileClass, r.input.notes])).toEqual([
    // Session AL (COPY_AUDIT, deliberate): TK-010 fourth pass — an ETF row is now shown under Wealth's ETFs class.
    ['Stocks', 'ETF', 'Class in your file: ETF (shown under ETFs).'],
    ['Custom asset', 'Vehicle', 'Class in your file: Vehicle (kept as a custom asset).'],
  ]);
});

it('C-TK-29: the contribution that reaches a target is the smallest whole-cent amount that does', () => {
  const input = {...DEFAULT_INPUT, start: '1000', years: 10};
  const solved = contributionFor(input, '50000');
  expect('contribution' in solved).toBe(true);
  const c = (solved as {contribution: string}).contribution;
  expect(Number(compound({...input, contribution: c}).final)).toBeGreaterThanOrEqual(50000);
  expect(Number(compound({...input, contribution: (Number(c) - 0.01).toFixed(2)}).final)).toBeLessThan(50000);
  expect(contributionFor(input, '1000')).toEqual({reached: true});
  expect(contributionFor({...input, years: 1, ratePercent: 0}, '1e20')).toEqual({outOfRange: true});
});

it('C-TK-31: the CSV carries the assumptions and every year, plain decimals', () => {
  const r = compound(DEFAULT_INPUT), csv = calculatorCsv(DEFAULT_INPUT, r, 'Assumes $1,000.00 to start; no fees or taxes.');
  const lines = csv.trim().split('\n');
  expect(lines[0]).toMatch(/not a promise/);
  expect(lines[1]).toBe('"Assumes $1,000.00 to start; no fees or taxes."');
  expect(lines[3]).toBe('Year,Months,Put in that year (USD),Put in so far (USD),Growth so far (USD),Balance (USD)');
  expect(lines).toHaveLength(4 + r.rows.length);
  expect(lines.at(-1)!.split(',')[5]).toBe(r.final);
});

it('BN-089: the calculator says why an amount is refused (negative, too large) instead of a decimals hint', () => {
  expect(amountText('-50').error).toBe('Enter an amount of 0 or more.');
  expect(amountText('99999999999999999999').error).toMatch(/more than this calculator models/);
  expect(amountText('99,50').value).toBe('99.50');
});

it('C-TK-12: Wealth hands its total to the calculator as the starting amount, USD or EUR only', async () => {
  const {wealthPrefill} = await import('../components/calculator/calculator');
  expect(wealthPrefill('?from=wealth&start=1500.50&currency=EUR')).toEqual({start: '1500.50', currency: 'EUR'});
  // CI3 (privacy): Wealth's link keeps the amount in the hash, read together with the query's marker.
  expect(wealthPrefill('from=wealth&start=1500.50&currency=EUR')).toEqual({start: '1500.50', currency: 'EUR'});
  expect(wealthPrefill('?from=wealth&start=1500.50&currency=GBP')).toBeNull();
  expect(wealthPrefill('?from=earn&start=10&currency=USD')).toBeNull();
  expect(wealthPrefill('?from=wealth&start=abc&currency=USD')).toBeNull();
});

it('C-TK-19: the cost level is read as exact units at the chart’s precision (cut, never rounded)', async () => {
  const {decimalUnits} = await import('../components/platform/price-chart');
  expect(decimalUnits('150.5', 2)).toBe(15050n);
  expect(decimalUnits('0.123456789', 4)).toBe(1234n);
  expect(decimalUnits('42', 0)).toBe(42n);
  expect(decimalUnits('-1', 2)).toBeNull();
  expect(decimalUnits('1e5', 2)).toBeNull();
});

it('A7 (money log): the spending Undo and the rules Undo put the store record back, keeping what changed since', async () => {
  const {emptyMoneyLog} = await import('./money-log/schema');
  const {addEntry, removeEntry} = await import('./money-log/engine');
  const {applyChanges, previewPast} = await import('./money-rules/engine');
  const {removeWithUndo} = await import('../components/ui/remove-with-undo');
  const {undoRuleChanges} = await import('../components/wealth/money-tools/rules-panel');
  const entry = (id: string, note: string) => ({id, kind: 'expense' as const, amount: '12.50', currency: 'EUR', category: 'Other', note, date: '2026-11-02', createdAt: at});
  const log = store([entry('e1', 'Fictional Grocer'), entry('e2', 'Fictional Cafe')].reduce((l, e) => addEntry(l, e), emptyMoneyLog()));
  // Spending: remove, something else is added, then Undo.
  await removeWithUndo(log.update, l => removeEntry(l, 'e2'), 'Removed: Other €12.50.', 'Put back.');
  log.update(l => addEntry(l, entry('e3', 'Fictional Bakery')));
  await runUndo();
  expect(log.data.entries.map(e => e.id).sort()).toEqual(['e1', 'e2', 'e3']);
  // Rules: a run changes the grocer's category; Undo puts it back as before.
  const rule = {id: 'r1', field: 'either' as const, op: 'contains' as const, text: 'grocer', direction: 'any' as const, category: 'Groceries', enabled: true};
  let done: ReturnType<typeof applyChanges>['applied'] = [];
  log.update(l => { const out = applyChanges(l, previewPast(l, [rule], '2026-11-04')); done = out.applied; return out.log; });
  expect(log.data.entries.find(e => e.id === 'e1')!.category).toBe('Groceries');
  showUndo({message: '1 entry changed.', restore: () => ({undone: `Undone: ${undoRuleChanges(log.update, done)}`})});
  await runUndo();
  expect(log.data.entries.find(e => e.id === 'e1')!.category).toBe('Other');
});
