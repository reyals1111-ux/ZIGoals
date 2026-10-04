import {addTransaction, checkHistories, removeTransaction} from '../portfolio/store';
import {coinKey, type PortfolioCoin, type PortfolioData, type PortfolioTransaction} from '../portfolio/schema';
import {HoldingsBelowZero} from '../portfolio/math';
import {MANUAL_SOURCES, manualSourcePosition, type ManualSource} from '../manual-source';
import {platformSchema, saveManualPosition, type Platform} from '../positions';
import type {MarketCatalogAsset} from '../market-assets';
import {parseNumberCell, type NumberStyle} from '../csv/numbers';
import {parseDateCell, DATE_FORMAT_LABELS, type DateFormat} from '../csv/dates';
import type {ImportRecord} from './undo-schema';

/**
 * CSV import for holdings and transactions (Session P, PR 3, W3; docs/product/features/W3-holdings-import.md).
 * Pure plans from parsed rows and an explicit mapping; nothing is guessed from a ticker, nothing is priced, and an
 * unknown coin is the person's to choose or skip. The apply steps write through the existing mutators only.
 */
export type TransactionKind = PortfolioTransaction['kind'];
export type Mapping = Partial<Record<string, number>>;
export type ReadyTransaction = {row: number; coinText: string; coin: PortfolioCoin; kind: TransactionKind; quantity: string; price?: string; fee?: string; date: string; note: string};
export type TransactionPlan = {ready: ReadyTransaction[]; unknownCoins: {row: number; text: string}[]; refused: {row: number; reason: string}[]};
const KINDS: Record<string, TransactionKind> = {buy: 'buy', bought: 'buy', purchase: 'buy', purchased: 'buy', sell: 'sell', sold: 'sell', sale: 'sell', deposit: 'transfer-in', receive: 'transfer-in', received: 'transfer-in', 'transfer in': 'transfer-in', transferin: 'transfer-in', in: 'transfer-in', withdraw: 'transfer-out', withdrawal: 'transfer-out', send: 'transfer-out', sent: 'transfer-out', 'transfer out': 'transfer-out', transferout: 'transfer-out', out: 'transfer-out'};
const cell = (row: readonly string[], mapping: Mapping, field: string) => { const index = mapping[field]; return index === undefined ? '' : (row[index] ?? '').trim(); };
/** Exact symbol (any case) in the catalog, then exact name; several matches are the list; none is unknown. The featured coins stand in when the catalog is unavailable. */
export function resolveCoinWith(catalog: readonly MarketCatalogAsset[] | null, featured: readonly PortfolioCoin[]): (text: string) => PortfolioCoin | PortfolioCoin[] | null {
  const coins: PortfolioCoin[] = catalog ? catalog.flatMap(a => a.ref.kind === 'coin' ? [{ref: a.ref, name: a.name, symbol: a.symbol}] : []) : [...featured];
  return text => {
    const query = text.trim().toLowerCase(); if (!query) return null;
    const bySymbol = coins.filter(c => c.symbol.toLowerCase() === query);
    if (bySymbol.length === 1) return bySymbol[0]!; if (bySymbol.length > 1) return bySymbol;
    const byName = coins.filter(c => c.name.toLowerCase() === query);
    return byName.length === 1 ? byName[0]! : byName.length > 1 ? byName : null;
  };
}
export function planTransactionImport({rows, mapping, numberStyle, dateFormat, today, resolveCoin, choices = {}}: {rows: readonly (readonly string[])[]; mapping: Mapping; numberStyle: NumberStyle; dateFormat: DateFormat; today: string; resolveCoin: (text: string) => PortfolioCoin | PortfolioCoin[] | null; choices?: Record<string, PortfolioCoin | 'skip'>}): TransactionPlan {
  const plan: TransactionPlan = {ready: [], unknownCoins: [], refused: []};
  rows.forEach((cells, index) => {
    const row = index + 1, refuse = (reason: string) => plan.refused.push({row, reason: `Row ${row}: ${reason}`});
    const coinText = cell(cells, mapping, 'coin');
    if (!coinText) return refuse('the coin is blank.');
    let quantity: string | null, price: string | null, fee: string | null;
    try { quantity = parseNumberCell(cell(cells, mapping, 'quantity'), numberStyle); } catch { return refuse('the quantity is not a number above zero.'); }
    if (quantity === null || !/[1-9]/.test(quantity)) return refuse('the quantity is not a number above zero.');
    try { price = parseNumberCell(cell(cells, mapping, 'price'), numberStyle); } catch { return refuse('the price is not a number.'); }
    try { fee = parseNumberCell(cell(cells, mapping, 'fee'), numberStyle); } catch { return refuse('the fee is not a number.'); }
    const kindText = cell(cells, mapping, 'kind').toLowerCase().replace(/[_-]+/g, ' ').trim();
    let kind = KINDS[kindText] ?? KINDS[kindText.replace(/\s+/g, '')];
    if (!kind) { if (kindText) return refuse(`"${cell(cells, mapping, 'kind')}" is not a buy, a sell, a transfer in or a transfer out.`); if (price !== null) kind = 'buy'; else return refuse('say whether this is a buy, a sell, a transfer in or a transfer out.'); }
    if ((kind === 'buy' || kind === 'sell') && price === null) return refuse('a buy or a sell needs its price per coin.');
    const date = parseDateCell(cell(cells, mapping, 'date'), dateFormat);
    if (!date) return refuse(`the date is not ${DATE_FORMAT_LABELS[dateFormat]}.`);
    if (date > today) return refuse('the date is in the future.');
    const choice = choices[coinText.trim().toLowerCase()];
    if (choice === 'skip') return;
    const resolved = choice ?? resolveCoin(coinText);
    if (!resolved || Array.isArray(resolved)) { plan.unknownCoins.push({row, text: coinText}); return; }
    plan.ready.push({row, coinText, coin: resolved, kind, quantity, ...(price !== null ? {price} : {}), ...(fee !== null ? {fee} : {}), date, note: cell(cells, mapping, 'note').slice(0, 500)});
  });
  return plan;
}
export const transactionImportId = (importId: string, row: number) => `imp_${importId}_${row}`;
/** The coins a portfolio did not list before an import: named in the undo ledger as `coin:<key>`, so Undo can drop them again. */
export const addedCoinIds = (before: PortfolioData, after: PortfolioData, portfolioId: string) => { const had = new Set((before.portfolios.find(p => p.id === portfolioId)?.coins ?? []).map(c => coinKey(c.ref))); return (after.portfolios.find(p => p.id === portfolioId)?.coins ?? []).map(c => coinKey(c.ref)).filter(key => !had.has(key)).map(key => `coin:${key}`); };
/** One reducer over addTransaction; the history check refuses the whole import when a sale would go below zero. */
export function applyTransactionImport(data: PortfolioData, portfolioId: string, ready: readonly ReadyTransaction[], {importId, at}: {importId: string; at: string}): PortfolioData {
  const next = ready.reduce((current, item) => addTransaction(current, portfolioId, item.coin, {id: transactionImportId(importId, item.row), kind: item.kind, quantity: item.quantity, ...(item.price ? {price: item.price} : {}), ...(item.fee ? {fee: item.fee} : {}), date: item.date, note: item.note, createdAt: at}), data);
  try { checkHistories(next); } catch (error) {
    if (error instanceof HoldingsBelowZero) { const culprit = ready.find(item => coinKey(item.coin.ref) === error.coin && item.date <= error.date && item.kind !== 'buy' && item.kind !== 'transfer-in'); throw Error(`${culprit ? `Row ${culprit.row}` : 'This import'} would sell more ${culprit?.coin.symbol ?? error.coin} than the portfolio holds on ${error.date}. Nothing was imported.`); }
    throw error;
  }
  return next;
}
/** Kinds of asset a file may name; anything else is a custom asset. */
export function manualCategory(text: string): typeof MANUAL_SOURCES[number] {
  const t = text.trim().toLowerCase();
  if (!t) return 'Custom asset';
  if (/cash|bank|savings|fiat/.test(t)) return 'Cash';
  if (/stable/.test(t)) return 'Stablecoins';
  if (/crypto|coin|token/.test(t)) return 'Crypto';
  if (/stock|share|equity|etf|fund/.test(t)) return 'Stocks';
  if (/gold|silver|metal|platinum/.test(t)) return 'Precious metals';
  if (/propert|real estate|house|apartment|land/.test(t)) return 'Property';
  return MANUAL_SOURCES.find(s => s.toLowerCase() === t) ?? 'Custom asset';
}
export type ReadyHolding = {row: number; input: ManualSource};
export type HoldingsPlan = {ready: ReadyHolding[]; refused: {row: number; reason: string}[]};
export function planHoldingsImport({rows, mapping, numberStyle}: {rows: readonly (readonly string[])[]; mapping: Mapping; numberStyle: NumberStyle}): HoldingsPlan {
  const plan: HoldingsPlan = {ready: [], refused: []};
  rows.forEach((cells, index) => {
    const row = index + 1, refuse = (reason: string) => plan.refused.push({row, reason: `Row ${row}: ${reason}`});
    const name = cell(cells, mapping, 'name'), currency = cell(cells, mapping, 'currency').toUpperCase();
    if (!name) return refuse('the name is blank.');
    if (!/^[A-Z]{3}$/.test(currency)) return refuse('the currency must be three letters, for example EUR.');
    let quantity: string | null, value: string | null;
    try { quantity = parseNumberCell(cell(cells, mapping, 'quantity'), numberStyle); } catch { return refuse('the quantity is not a number.'); }
    try { value = parseNumberCell(cell(cells, mapping, 'value'), numberStyle); } catch { return refuse('the value is not a number.'); }
    const category = manualCategory(cell(cells, mapping, 'class')), symbol = cell(cells, mapping, 'asset').toUpperCase();
    const input: ManualSource = {category, name, quantity: quantity ?? '', currency, ...(symbol ? {symbol} : {}), ...(value !== null ? {value} : {}), ...(cell(cells, mapping, 'notes') ? {notes: cell(cells, mapping, 'notes').slice(0, 500)} : {})};
    try { manualSourcePosition(input, 'imp_check', '2000-01-01T00:00:00.000Z'); } catch (error) { return refuse(error instanceof Error ? error.message.replace(/\.$/, '').toLowerCase() + '.' : 'this holding cannot be added.'); }
    plan.ready.push({row, input});
  });
  return plan;
}
export const holdingImportId = (importId: string, row: number) => `imp_${importId}_${row}`;
/** Every ready holding becomes an ordinary manual position, in order; the store writes once, so a refusal anywhere leaves the record unchanged. */
export function applyHoldingsImport(platform: Platform, ready: readonly ReadyHolding[], {importId, at}: {importId: string; at: string}): Platform {
  return ready.reduce((current, item) => saveManualPosition(current, manualSourcePosition(item.input, holdingImportId(importId, item.row), at)), platform);
}
export class UndoRefused extends Error { constructor(message: string) { super(message); this.name = 'UndoRefused'; } }
export const WEALTH_UNDO_REFUSED = 'Some imported assets were already changed or used for a Goal. Remove them in Wealth instead.';
/** Removes exactly the records an import created, only while they are untouched. */
export function undoImport(record: ImportRecord, stores: {portfolio?: PortfolioData; platform?: Platform}): {portfolio?: PortfolioData; platform?: Platform; removed: number} {
  const ids = new Set(record.createdIds);
  if (record.kind === 'portfolio') {
    if (!stores.portfolio || !record.portfolioId) throw new UndoRefused('This import cannot be undone here.');
    const portfolio = stores.portfolio.portfolios.find(p => p.id === record.portfolioId);
    if (!portfolio) return {portfolio: stores.portfolio, removed: 0};
    const mine = portfolio.transactions.filter(t => ids.has(t.id) && t.createdAt === record.at);
    const removed = mine.reduce((current, t) => removeTransaction(current, record.portfolioId!, t.id), stores.portfolio);
    try { checkHistories(removed); } catch (error) { throw new UndoRefused(error instanceof HoldingsBelowZero ? `A later sale of ${error.coin} on ${error.date} needs what this import brought in. Remove the sale first.` : 'This import cannot be undone now.'); }
    // The coins this import added leave the list again when no transaction uses them any more.
    const addedCoins = new Set(record.createdIds.filter(id => id.startsWith('coin:')).map(id => id.slice('coin:'.length)));
    const next = {...removed, portfolios: removed.portfolios.map(p => p.id !== record.portfolioId ? p : {...p, coins: p.coins.filter(c => !addedCoins.has(coinKey(c.ref)) || p.transactions.some(t => t.coin === coinKey(c.ref)))})};
    return {portfolio: next, removed: mine.length};
  }
  if (record.kind === 'wealth') {
    if (!stores.platform) throw new UndoRefused('This import cannot be undone here.');
    const platform = stores.platform, mine = platform.positions.filter(p => ids.has(p.id));
    // Touched: edited since (a new observedAt), allocated to a Goal, or an asset event beyond the "added" one. The valuation
    // history the save itself recorded is the app's own bookkeeping, not an edit, and leaves with the position.
    const touched = mine.some(p => p.observedAt !== record.at || platform.allocations.some(a => a.positionId === p.id) || platform.assetEvents.some(e => e.positionId === p.id && e.kind !== 'added'));
    if (touched) throw new UndoRefused(WEALTH_UNDO_REFUSED);
    const gone = new Set(mine.map(p => p.id));
    try { return {platform: platformSchema.parse({...platform, positions: platform.positions.filter(p => !gone.has(p.id)), snapshots: platform.snapshots.filter(s => !gone.has(s.positionId)), valuationSnapshots: platform.valuationSnapshots.filter(v => !gone.has(v.positionId)), assetEvents: platform.assetEvents.filter(e => !gone.has(e.positionId))}), removed: mine.length}; }
    catch { throw new UndoRefused(WEALTH_UNDO_REFUSED); }
  }
  throw new UndoRefused('This import is undone from Health.');
}
