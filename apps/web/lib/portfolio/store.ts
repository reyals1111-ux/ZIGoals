import {PORTFOLIO_KEY, coinKey, emptyPortfolioData, portfolioDataSchema, type Portfolio, type PortfolioCoin, type PortfolioCurrency, type PortfolioData, type PortfolioTransaction} from './schema';
import {HoldingsBelowZero, holdings} from './math';

/** Unreadable Portfolio data is shown as such and never replaced without the reader choosing to. */
export class PortfolioUnreadable extends Error { constructor() { super('Your saved portfolios could not be read. They were not changed. Export them before starting over.'); this.name = 'PortfolioUnreadable'; } }
export const IMPORT_LIMIT = 2_000_000;
export const EXPORT_KIND = 'zigoals-portfolio';

/** What this device holds. Damaged or unreadable data reads as unreadable and is left exactly as it is. */
export function readPortfolios(storage: Pick<Storage, 'getItem'>): {data: PortfolioData; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(PORTFOLIO_KEY); } catch { return {data: emptyPortfolioData(), unreadable: true}; }
  if (raw === null) return {data: emptyPortfolioData(), unreadable: false};
  try {
    const parsed = portfolioDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? {data: parsed.data, unreadable: false} : {data: emptyPortfolioData(), unreadable: true};
  } catch { return {data: emptyPortfolioData(), unreadable: true}; }
}
/** Every portfolio's history must stay at or above zero; the first that does not is refused with its reason. */
export function checkHistories(data: PortfolioData) { for (const portfolio of data.portfolios) holdings(portfolio); }
/**
 * Applies a change and writes the result to this key only. Throws, writing nothing, when the stored data is unreadable
 * (unless `replaceUnreadable`, the reader's explicit choice), the result is invalid, a history would go below zero, or
 * storage refuses it.
 */
export function updatePortfolios(storage: Pick<Storage, 'getItem' | 'setItem'>, change: (current: PortfolioData) => PortfolioData, options: {replaceUnreadable?: boolean} = {}): PortfolioData {
  const current = readPortfolios(storage);
  if (current.unreadable && !options.replaceUnreadable) throw new PortfolioUnreadable();
  const next = portfolioDataSchema.parse(change(current.data));
  checkHistories(next);
  storage.setItem(PORTFOLIO_KEY, JSON.stringify(next));
  return next;
}

const replace = (data: PortfolioData, id: string, change: (p: Portfolio) => Portfolio): PortfolioData => {
  if (!data.portfolios.some(p => p.id === id)) throw Error('This portfolio is no longer here. Reload and try again.');
  return {...data, portfolios: data.portfolios.map(p => p.id === id ? change(p) : p)};
};
export function createPortfolio(data: PortfolioData, input: {id: string; name: string; kind: Portfolio['kind']; currency: PortfolioCurrency; createdAt: string}): PortfolioData {
  return {...data, portfolios: [...data.portfolios, {...input, name: input.name.trim(), coins: [], transactions: []}]};
}
export function renamePortfolio(data: PortfolioData, id: string, name: string): PortfolioData { return replace(data, id, p => ({...p, name: name.trim()})); }
export function deletePortfolio(data: PortfolioData, id: string): PortfolioData { return {...data, portfolios: data.portfolios.filter(p => p.id !== id)}; }
/** Adds a transaction, and its coin if the portfolio does not hold it yet. */
export function addTransaction(data: PortfolioData, id: string, coin: PortfolioCoin, transaction: Omit<PortfolioTransaction, 'coin'>): PortfolioData {
  return replace(data, id, p => {
    const key = coinKey(coin.ref);
    return {...p, coins: p.coins.some(c => coinKey(c.ref) === key) ? p.coins : [...p.coins, coin], transactions: [...p.transactions, {...transaction, coin: key}]};
  });
}
/** Removes a transaction; refused (by the history check on write) when a later sell would then go below zero. */
export function removeTransaction(data: PortfolioData, id: string, transactionId: string): PortfolioData {
  return replace(data, id, p => ({...p, transactions: p.transactions.filter(t => t.id !== transactionId)}));
}

/** A file for the reader to keep: this key's data, labelled, with nothing else. */
export function exportPortfolios(data: PortfolioData): string { return JSON.stringify({kind: EXPORT_KIND, ...data}, null, 1); }
/** A file chosen to replace this device's portfolios, read and checked in full before anything is written. */
export function parsePortfolioImport(text: string): PortfolioData {
  if (text.length > IMPORT_LIMIT) throw Error('This file is larger than the 2 MB Portfolio can restore. Nothing was changed.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw Error('This file is not a ZIGoals Portfolio export. Nothing was changed.'); }
  if (!raw || typeof raw !== 'object' || (raw as {kind?: unknown}).kind !== EXPORT_KIND) throw Error('This file is not a ZIGoals Portfolio export. Nothing was changed.');
  const rest: Record<string, unknown> = {...(raw as Record<string, unknown>)};
  delete rest.kind;
  const parsed = portfolioDataSchema.safeParse(rest);
  if (!parsed.success) throw Error('This Portfolio export is incomplete or damaged. Nothing was changed.');
  try { checkHistories(parsed.data); } catch (error) { if (error instanceof HoldingsBelowZero) throw Error('This Portfolio export has a sale before its coins came in. Nothing was changed.'); throw error; }
  return parsed.data;
}
