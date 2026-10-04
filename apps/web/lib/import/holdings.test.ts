import {describe, expect, test} from 'vitest';
import {parseCsv} from '../csv/parse';
import {guessMapping, TRANSACTION_FIELDS, HOLDINGS_FIELDS} from '../csv/mapping';
import {emptyPortfolioData, type PortfolioCoin} from '../portfolio/schema';
import {createPortfolio, readPortfolios, updatePortfolios} from '../portfolio/store';
import {emptyPlatform, platformSchema} from '../positions';
import {addedCoinIds, applyHoldingsImport, applyTransactionImport, manualCategory, planHoldingsImport, planTransactionImport, resolveCoinWith, undoImport, UndoRefused, WEALTH_UNDO_REFUSED} from './holdings';
import {IMPORT_UNDO_KEY, MAX_IMPORT_RECORDS, emptyImportUndo} from './undo-schema';
import {forgetImport, liveImports, readImportUndo, recordImport, startOverImportUndo, updateImportUndo} from './undo-store';

// W3 (docs/product/features/W3-holdings-import.md, "Tests" 5-8).
const AT = '2026-10-01T10:00:00.000Z', TODAY = '2026-10-01', IMPORT = '0f1e2d3c-4b5a-4697-8899-aabbccddeeff';
const BTC: PortfolioCoin = {ref: {kind: 'coin', provider: 'coingecko', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'};
const ETH: PortfolioCoin = {ref: {kind: 'coin', provider: 'coingecko', id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'};
const resolve = resolveCoinWith([{ref: BTC.ref, name: 'Bitcoin', symbol: 'BTC'}, {ref: ETH.ref, name: 'Ethereum', symbol: 'ETH'}, {ref: {kind: 'coin', provider: 'coingecko', id: 'bitcoin-cash'}, name: 'Bitcoin Cash', symbol: 'BCH'}], [BTC]);
const CSV = 'Date,Type,Pair,Amount,Price,Fee,Note\n2026-09-01,Buy,BTC,0.5,60000,10,first\n2026-09-02,Deposit,ETH,2,,,\n2026-09-03,Sell,BTC,0.2,65000,,\n2026-09-04,Buy,DOGE,100,0.1,,\n';
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }
const parsed = parseCsv(CSV), mapping = guessMapping(parsed.header, TRANSACTION_FIELDS);

describe('transactions', () => {
  test('the plan: kinds, prices, unknown coins and refusals', () => {
    const plan = planTransactionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve});
    expect(plan.ready.map(r => [r.row, r.coin.symbol, r.kind, r.quantity, r.price, r.fee])).toEqual([[1, 'BTC', 'buy', '0.5', '60000', '10'], [2, 'ETH', 'transfer-in', '2', undefined, undefined], [3, 'BTC', 'sell', '0.2', '65000', undefined]]);
    expect(plan.unknownCoins).toEqual([{row: 4, text: 'DOGE'}]);
    expect(plan.refused).toEqual([]);
    const rows = [['2026-09-01', '', 'BTC', '1', '', '', ''], ['2026-09-01', 'Gift', 'BTC', '1', '', '', ''], ['2026-09-01', 'Buy', 'BTC', '0', '1', '', ''], ['31/09/2026', 'Buy', 'BTC', '1', '1', '', ''], ['2027-01-01', 'Buy', 'BTC', '1', '1', '', ''], ['2026-09-01', '', 'BTC', '1', '5', '', '']];
    const refused = planTransactionImport({rows, mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve});
    expect(refused.refused.map(r => r.reason)).toEqual(['Row 1: say whether this is a buy, a sell, a transfer in or a transfer out.', 'Row 2: "Gift" is not a buy, a sell, a transfer in or a transfer out.', 'Row 3: the quantity is not a number above zero.', 'Row 4: the date is not ISO (2026-10-01).', 'Row 5: the date is in the future.']);
    expect(refused.ready.map(r => [r.row, r.kind])).toEqual([[6, 'buy']]);
    expect(planTransactionImport({rows: [['2026-09-01', 'Buy', 'BTC', '1', '', '', '']], mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve}).refused[0]!.reason).toBe('Row 1: a buy or a sell needs its price per coin.');
    // Choices from the preview: a chosen coin or a skipped row.
    const chosen = planTransactionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve, choices: {doge: 'skip'}});
    expect(chosen.unknownCoins).toEqual([]); expect(chosen.ready).toHaveLength(3);
    expect(planTransactionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve, choices: {doge: ETH}}).ready.at(-1)!.coin).toEqual(ETH);
  });
  test('the holdings headers of the runsheet are all recognised', () => {
    const header = parseCsv('Name,Asset,Quantity,Kind of asset,Value,Currency\nGold,XAU,2,Precious metals,,EUR\n');
    expect(guessMapping(header.header, HOLDINGS_FIELDS)).toEqual({name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5});
    const plan = planHoldingsImport({rows: header.rows, mapping: guessMapping(header.header, HOLDINGS_FIELDS), numberStyle: 'point'});
    expect(plan.ready[0]!.input.category).toBe('Precious metals');
  });
  test('resolveCoin: exact symbol, then name; the featured coins stand in without a catalog; several matches are a list', () => {
    expect(resolve('btc')).toEqual(BTC); expect(resolve('Bitcoin Cash')).toMatchObject({symbol: 'BCH'}); expect(resolve('DOGE')).toBeNull();
    expect(resolveCoinWith(null, [BTC])('btc')).toEqual(BTC); expect(resolveCoinWith(null, [BTC])('ETH')).toBeNull();
    const twins = resolveCoinWith([{ref: BTC.ref, name: 'Bitcoin', symbol: 'BTC'}, {ref: {kind: 'coin', provider: 'coingecko', id: 'btc-2'}, name: 'Other BTC', symbol: 'BTC'}], [])('BTC');
    expect(Array.isArray(twins) && twins.length).toBe(2);
  });
  test('apply: ids per row, the coin list extended once, atomic on a sale below zero', () => {
    const data = createPortfolio(emptyPortfolioData(), {id: 'p1', name: 'Long-term', kind: 'real', currency: 'USD', createdAt: AT});
    const plan = planTransactionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve, choices: {doge: 'skip'}});
    const next = applyTransactionImport(data, 'p1', plan.ready, {importId: IMPORT, at: AT});
    expect(next.portfolios[0]!.transactions.map(t => t.id)).toEqual([`imp_${IMPORT}_1`, `imp_${IMPORT}_2`, `imp_${IMPORT}_3`]);
    expect(next.portfolios[0]!.coins.map(c => c.symbol)).toEqual(['BTC', 'ETH']);
    expect(next.portfolios[0]!.transactions[1]).toMatchObject({kind: 'transfer-in', createdAt: AT}); expect(next.portfolios[0]!.transactions[1]).not.toHaveProperty('price');
    const bad = planTransactionImport({rows: [['2026-09-01', 'Sell', 'BTC', '1', '60000', '', '']], mapping, numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve});
    expect(() => applyTransactionImport(data, 'p1', bad.ready, {importId: IMPORT, at: AT})).toThrow('Row 1 would sell more BTC than the portfolio holds on 2026-09-01. Nothing was imported.');
    // Undo removes exactly the created ids; a later sale that needs them refuses.
    expect(addedCoinIds(data, next, 'p1')).toEqual(['coin:coingecko:coin:bitcoin', 'coin:coingecko:coin:ethereum']);
    const record = {id: IMPORT, kind: 'portfolio' as const, at: AT, label: 'test', portfolioId: 'p1', createdIds: [...next.portfolios[0]!.transactions.map(t => t.id), ...addedCoinIds(data, next, 'p1')], expiresAt: '2026-10-08T10:00:00.000Z'};
    expect(undoImport(record, {portfolio: next})).toMatchObject({removed: 3});
    expect(undoImport(record, {portfolio: next}).portfolio).toEqual(data);
    const later = {...next, portfolios: next.portfolios.map(p => ({...p, transactions: [...p.transactions, {id: 'later', coin: p.transactions[0]!.coin, kind: 'sell' as const, quantity: '0.3', price: '70000', date: '2026-09-20', note: '', createdAt: '2026-09-20T10:00:00.000Z'}]}))};
    expect(() => undoImport(record, {portfolio: later})).toThrow(UndoRefused);
    // An edited transaction (removed and re-added with a new createdAt) is left alone: the ETH transfer stays, the BTC rows go.
    const edited = {...next, portfolios: next.portfolios.map(p => ({...p, transactions: p.transactions.map(t => t.id === `imp_${IMPORT}_2` ? {...t, createdAt: '2026-10-02T10:00:00.000Z'} : t)}))};
    expect(undoImport(record, {portfolio: edited})).toMatchObject({removed: 2});
    expect(undoImport(record, {portfolio: edited}).portfolio!.portfolios[0]!.transactions.map(t => t.id)).toEqual([`imp_${IMPORT}_2`]);
    expect(undoImport(record, {portfolio: edited}).portfolio!.portfolios[0]!.coins.map(c => c.symbol)).toEqual(['ETH']);
    // An edited sale that needs the imported buy refuses the whole undo, with the sale named.
    const editedSale = {...next, portfolios: next.portfolios.map(p => ({...p, transactions: p.transactions.map(t => t.id === `imp_${IMPORT}_3` ? {...t, createdAt: '2026-10-02T10:00:00.000Z'} : t)}))};
    expect(() => undoImport(record, {portfolio: editedSale})).toThrow('A later sale of coingecko:coin:bitcoin on 2026-09-03 needs what this import brought in. Remove the sale first.');
  });
});

describe('holdings', () => {
  test('the plan and the positions it makes', () => {
    const file = parseCsv('Name,Symbol,Quantity,Category,Value,Currency\nGold,XAU,2,Precious metals,,EUR\nApple,AAPL,10,Stocks,1500,USD\nBank,,500,Cash,,EUR\nOdd,,1,Custom,,EURO\n'), m = guessMapping(file.header, HOLDINGS_FIELDS);
    const plan = planHoldingsImport({rows: file.rows, mapping: m, numberStyle: 'point'});
    expect(plan.ready.map(r => [r.row, r.input.category, r.input.name, r.input.value])).toEqual([[1, 'Precious metals', 'Gold', undefined], [2, 'Stocks', 'Apple', '1500'], [3, 'Cash', 'Bank', undefined]]);
    expect(plan.refused).toEqual([{row: 4, reason: 'Row 4: the currency must be three letters, for example EUR.'}]);
    expect(manualCategory('crypto')).toBe('Crypto'); expect(manualCategory('ETF')).toBe('Stocks'); expect(manualCategory('')).toBe('Custom asset'); expect(manualCategory('stablecoin')).toBe('Stablecoins');
    const platform = applyHoldingsImport(emptyPlatform(), plan.ready, {importId: IMPORT, at: AT});
    expect(platform.positions.map(p => [p.id, p.assetClass, p.valuation?.value])).toEqual([[`imp_${IMPORT}_1`, 'Precious Metals', undefined], [`imp_${IMPORT}_2`, 'Stocks', '150000'], [`imp_${IMPORT}_3`, 'Cash', '50000']]);
    expect(platformSchema.parse(platform)).toEqual(platform);
    const record = {id: IMPORT, kind: 'wealth' as const, at: AT, label: 'test', createdIds: platform.positions.map(p => p.id), expiresAt: '2026-10-08T10:00:00.000Z'};
    const undone = undoImport(record, {platform});
    expect(undone.removed).toBe(3); expect(undone.platform!.positions).toEqual([]); expect(undone.platform!.snapshots).toEqual([]);
    const allocated = {...platform, goals: [], allocations: [{goalId: 'g', positionId: `imp_${IMPORT}_2`, quantity: '1'}]};
    expect(() => undoImport(record, {platform: allocated})).toThrow(WEALTH_UNDO_REFUSED);
    // The save's own bookkeeping (a valuation snapshot captured a moment later, the "added" event) is not an edit: it leaves with the position.
    const bookkept = platformSchema.parse({...platform, valuationSnapshots: [{id: 'v1', positionId: `imp_${IMPORT}_2`, quantity: '1', quantityDecimals: 0, value: '150000', decimals: 2, currency: 'USD', source: 'MANUAL', capturedAt: '2026-10-01T10:00:00.250Z'}], assetEvents: [{id: 'e1', positionId: `imp_${IMPORT}_2`, name: 'Fund', assetClass: 'Stocks', kind: 'added', at: AT, provenance: 'PRIVATE_EDIT'}]});
    const cleaned = undoImport(record, {platform: bookkept});
    expect(cleaned.removed).toBe(3); expect(cleaned.platform!.valuationSnapshots).toEqual([]); expect(cleaned.platform!.assetEvents).toEqual([]);
    // A later edit of a position (a new observedAt) refuses the whole undo.
    const edited = {...platform, positions: platform.positions.map(p => p.id === `imp_${IMPORT}_1` ? {...p, observedAt: '2026-10-02T10:00:00.000Z'} : p)};
    expect(() => undoImport(record, {platform: edited})).toThrow(WEALTH_UNDO_REFUSED);
  });
});

describe('the undo ledger', () => {
  test('newest first, 20 kept, expiry pruned, unreadable left alone', () => {
    const storage = memoryStorage(), now = new Date(AT);
    const first = updateImportUndo(storage, now, current => recordImport(current, {id: IMPORT, kind: 'portfolio', at: AT, label: 'Long-term', portfolioId: 'p1', createdIds: ['a', 'b']}));
    expect(first.imports[0]).toMatchObject({id: IMPORT, expiresAt: '2026-10-08T10:00:00.000Z'});
    let data = first;
    for (let i = 0; i < MAX_IMPORT_RECORDS + 2; i++) data = recordImport(data, {id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, kind: 'wealth', at: AT, label: `n${i}`, createdIds: []});
    expect(data.imports).toHaveLength(MAX_IMPORT_RECORDS); expect(data.imports[0]!.label).toBe(`n${MAX_IMPORT_RECORDS + 1}`);
    expect(liveImports(first, new Date('2026-10-09T10:00:00.000Z'))).toEqual([]);
    expect(updateImportUndo(storage, new Date('2026-10-09T10:00:00.000Z'), current => current).imports).toEqual([]);
    expect(forgetImport(first, IMPORT).imports).toEqual([]);
    storage.setItem(IMPORT_UNDO_KEY, '{"version":1,"imports":[{"id":1}]}');
    expect(readImportUndo(storage)).toEqual({data: emptyImportUndo(), unreadable: true});
    expect(() => updateImportUndo(storage, now, c => c)).toThrow('could not be read');
    expect(storage.getItem(IMPORT_UNDO_KEY)).toBe('{"version":1,"imports":[{"id":1}]}');
    startOverImportUndo(storage);
    expect(readImportUndo(storage).unreadable).toBe(false);
    expect(readPortfolios(storage).data).toEqual(emptyPortfolioData()); void updatePortfolios;
  });
});
