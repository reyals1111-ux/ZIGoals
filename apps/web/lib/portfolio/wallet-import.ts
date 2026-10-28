import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {PortfolioCoin} from './schema';

/**
 * Session AI (B3, WE20; owner decision on ADR-013: the Portfolio may hold rows read from a linked wallet). The balances a
 * linked wallet reported (lib/wallets/balances/store.ts) can be imported into a portfolio as one "transfer in" per asset,
 * with no price (its cost stays unknown until the person adds one) and the note "From wallet …". Each imported row is
 * marked in `zigoals:portfolio-imports:v1` (loose, device-only; ADR-034 N31), so it shows "from wallet", cannot be edited
 * by hand, and "Update from the wallet" sets it to the wallet's latest amount. Only coins with a known price identity are
 * offered; the rest are named and left out. Read-only throughout: nothing is signed or sent.
 */
export const IMPORTS_KEY = 'zigoals:portfolio-imports:v1';
export const COIN_OF_SYMBOL: Readonly<Record<string, PortfolioCoin>> = {
  BTC: {ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'},
  ETH: {ref: {provider: 'coingecko', kind: 'coin', id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'},
  SOL: {ref: {provider: 'coingecko', kind: 'coin', id: 'solana'}, name: 'Solana', symbol: 'SOL'},
  ZIG: {ref: {provider: 'coingecko', kind: 'coin', id: 'zignaly'}, name: 'ZIG', symbol: 'ZIG'},
  USDC: {ref: {provider: 'coingecko', kind: 'coin', id: 'usd-coin'}, name: 'USD Coin', symbol: 'USDC'},
} as const;
const importSchema = z.looseObject({walletId: z.string().max(64), chainId: z.string().max(40), assetId: z.string().max(120), portfolioId: z.string().max(80), at: z.string().max(40)});
export const importsSchema = z.looseObject({version: z.literal(1), rows: z.record(z.string().max(80), importSchema)});
export type WalletImports = z.infer<typeof importsSchema>;
export type WalletImport = z.infer<typeof importSchema>;
export const IMPORTS: DeviceRecordSpec<WalletImports> = {key: IMPORTS_KEY, schema: importsSchema, empty: () => ({version: 1, rows: {}})};
/** A base-unit integer amount as a decimal quantity ("1500000", 6 → "1.5"). */
export function quantityOf(amount: string, decimals: number): string {
  const s = amount.replace(/^0+(?=\d)/, '').padStart(decimals + 1, '0'), whole = s.slice(0, s.length - decimals), frac = decimals ? s.slice(-decimals).replace(/0+$/, '') : '';
  return frac ? `${whole}.${frac}` : whole;
}
export type Importable = {walletId: string; chainId: string; assetId: string; symbol: string; quantity: string; coin: PortfolioCoin | null; at?: string; imported?: string};
/** The assets a wallet reported, with the coin each would be in a portfolio (null: no price identity, left out). */
export function importables(observations: readonly {walletId: string; chainId: string; at?: string; assets?: readonly {id: string; symbol: string; decimals: number; amount: string}[]}[], imports: WalletImports, portfolioId: string): Importable[] {
  return observations.flatMap(o => (o.assets ?? []).filter(a => /[1-9]/.test(a.amount)).map(a => {
    const imported = Object.entries(imports.rows).find(([, r]) => r.walletId === o.walletId && r.chainId === o.chainId && r.assetId === a.id && r.portfolioId === portfolioId)?.[0];
    return {walletId: o.walletId, chainId: o.chainId, assetId: a.id, symbol: a.symbol, quantity: quantityOf(a.amount, a.decimals), coin: COIN_OF_SYMBOL[a.symbol.toUpperCase()] ?? null, ...(o.at ? {at: o.at} : {}), ...(imported ? {imported} : {})};
  }));
}
export const markImported = (record: WalletImports, transactionId: string, row: WalletImport): WalletImports => importsSchema.parse({...record, rows: {...record.rows, [transactionId]: row}});
export const unmarkImported = (record: WalletImports, transactionId: string): WalletImports => { const rows = {...record.rows}; delete rows[transactionId]; return {...record, rows}; };
