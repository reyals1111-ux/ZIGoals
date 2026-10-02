import {z} from 'zod';
import {marketAssetRefSchema} from '../market-assets';

/**
 * Portfolio (Session I, Part 11): crypto portfolios kept on this device only, under one versioned key. Nothing here
 * is synced, backed up with the private modules, or read by Wealth, Goals, Positions, Allocation, Activity or Today.
 * Amounts are exact decimal text (decimal.js does the arithmetic, lib/portfolio/math.ts); prices are never stored as
 * live values, only as the price per coin a transaction recorded.
 */
export const PORTFOLIO_KEY = 'zigoals:portfolio:v1';
export const MAX_PORTFOLIOS = 50, MAX_COINS = 200, MAX_TRANSACTIONS = 5000;
export const PORTFOLIO_CURRENCIES = ['USD', 'EUR'] as const;
export const TRANSACTION_KINDS = ['buy', 'sell', 'transfer-in', 'transfer-out'] as const;

/** A non-negative decimal written plainly ("0.5", "65000"), at most 30 whole and 18 fraction digits. */
export const decimalText = z.string().regex(/^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/);
const positive = decimalText.refine(value => /[1-9]/.test(value), 'Enter an amount above zero.');
const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const instant = z.string().refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value);
/** Coins only (CoinGecko coin references), never free text (owner decision g). */
export const coinRefSchema = marketAssetRefSchema.refine(ref => ref.kind === 'coin', 'Choose a coin from the list.');
export const coinSchema = z.strictObject({ref: coinRefSchema, name: z.string().trim().min(1).max(120), symbol: z.string().trim().min(1).max(30)});
export const transactionSchema = z.strictObject({
  id,
  /** The coin's key: "coingecko:coin:<id>". */
  coin: z.string().min(1).max(200),
  kind: z.enum(TRANSACTION_KINDS),
  quantity: positive,
  /** Price per coin in the portfolio's currency. Required to buy or sell; a transfer may leave it out (cost unknown). */
  price: decimalText.optional(),
  fee: decimalText.optional(),
  date: day,
  note: z.string().max(500),
  createdAt: instant,
}).refine(t => t.kind === 'transfer-in' || t.kind === 'transfer-out' || t.price !== undefined, 'A buy or a sell needs its price per coin.');
export const portfolioSchema = z.strictObject({
  id,
  name: z.string().trim().min(1).max(80),
  /** Real holdings, or a hypothetical one for planning; labelled wherever it shows. */
  kind: z.enum(['real', 'hypothetical']),
  currency: z.enum(PORTFOLIO_CURRENCIES),
  createdAt: instant,
  coins: z.array(coinSchema).max(MAX_COINS),
  transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS),
});
export const portfolioDataSchema = z.strictObject({version: z.literal(1), portfolios: z.array(portfolioSchema).max(MAX_PORTFOLIOS)}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  for (const [index, portfolio] of data.portfolios.entries()) {
    if (ids.has(portfolio.id)) ctx.addIssue({code: 'custom', path: ['portfolios', index, 'id'], message: 'Repeated portfolio id.'});
    ids.add(portfolio.id);
    const coins = new Set(portfolio.coins.map(c => coinKey(c.ref)));
    if (coins.size !== portfolio.coins.length) ctx.addIssue({code: 'custom', path: ['portfolios', index, 'coins'], message: 'Repeated coin.'});
    const transactions = new Set<string>();
    for (const t of portfolio.transactions) {
      if (!coins.has(t.coin)) ctx.addIssue({code: 'custom', path: ['portfolios', index, 'transactions'], message: 'A transaction names a coin that is not in its portfolio.'});
      if (transactions.has(t.id)) ctx.addIssue({code: 'custom', path: ['portfolios', index, 'transactions'], message: 'Repeated transaction id.'});
      transactions.add(t.id);
    }
  }
});
export type PortfolioCoin = z.infer<typeof coinSchema>;
export type PortfolioTransaction = z.infer<typeof transactionSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export type PortfolioData = z.infer<typeof portfolioDataSchema>;
export type PortfolioCurrency = (typeof PORTFOLIO_CURRENCIES)[number];
export const emptyPortfolioData = (): PortfolioData => ({version: 1, portfolios: []});
export function coinKey(ref: {provider: string; kind: string; id: string}) { return `${ref.provider}:${ref.kind}:${ref.id}`; }
