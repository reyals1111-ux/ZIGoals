import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {WALLET_BALANCES_KEY} from '../../af-wallet-keys';

/**
 * Session AF (L2b, ADR-028 H16 §11.4; `TIER 3 (storage)`): the last balances read for each linked wallet × chain,
 * `{version: 1, observations?: {"<walletId>|<chainId>": {walletId, chainId, at?, assets?, error?, errorAt?}}}`.
 * - **Device-only and personal:** what someone holds is personal; never synced, never restored, in Export everything,
 *   removed by the account's erase and, per wallet, by Remove / "Forget balances". The Showcase never writes it.
 * - **Honest:** a failed read never writes 0: it keeps the last good amounts with their own `at` and adds `error` (the
 *   plain reason) and `errorAt`; a wallet never read has no observation, which the page says is "not read yet".
 * - **Loose and versioned:** unknown fields are kept; an entry this build cannot use is left out of what it shows; a record
 *   that cannot be read is never overwritten. Amounts are base-unit integer strings (never numbers).
 */
export {WALLET_BALANCES_KEY};
export const MAX_OBSERVATIONS = 200;
export const MAX_ASSETS = 16;
const amount = z.string().regex(/^\d{1,78}$/);
const assetSchema = z.looseObject({
  /** 'native', an ERC-20 contract, an SPL mint or a Cosmos denom: which asset of the chain. */
  id: z.string().min(1).max(120),
  symbol: z.string().min(1).max(16),
  decimals: z.number().int().min(0).max(30),
  amount,
});
const observationSchema = z.looseObject({
  walletId: z.string().min(1).max(64),
  chainId: z.string().min(1).max(40),
  at: z.string().max(40).optional(),
  /** The block (or slot) the amounts were read at, when the source says so. */
  height: z.string().regex(/^\d{1,20}$/).optional(),
  assets: z.array(assetSchema).max(MAX_ASSETS).optional(),
  error: z.string().max(200).optional(),
  errorAt: z.string().max(40).optional(),
});
export const walletBalancesSchema = z.looseObject({
  version: z.literal(1),
  observations: z.record(z.string().max(120), observationSchema).optional(),
});
export type WalletBalances = z.infer<typeof walletBalancesSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type ObservedAsset = z.infer<typeof assetSchema>;
export const WALLET_BALANCES: DeviceRecordSpec<WalletBalances> = {key: WALLET_BALANCES_KEY, schema: walletBalancesSchema, empty: () => ({version: 1})};
export const observationKey = (walletId: string, chainId: string) => `${walletId}|${chainId}`;

/** The observation for a wallet on a chain, when its key and fields agree. */
export function observationOf(record: WalletBalances, walletId: string, chainId: string): Observation | null {
  const o = record.observations?.[observationKey(walletId, chainId)];
  return o && o.walletId === walletId && o.chainId === chainId ? o : null;
}
const sized = (record: WalletBalances, key: string) => {
  const observations = record.observations ?? {};
  if (!(key in observations) && Object.keys(observations).length >= MAX_OBSERVATIONS) throw Error('This device holds the most wallet balances it keeps; remove a wallet first.');
  return observations;
};
/** A successful read: the amounts replace the previous ones and any earlier error goes. */
export function withObservation(record: WalletBalances, read: {walletId: string; chainId: string; at: string; assets: readonly ObservedAsset[]; height?: string}): WalletBalances {
  const key = observationKey(read.walletId, read.chainId), observations = sized(record, key);
  const next: Observation = {walletId: read.walletId, chainId: read.chainId, at: read.at, assets: read.assets.slice(0, MAX_ASSETS).map(a => ({id: a.id, symbol: a.symbol, decimals: a.decimals, amount: a.amount})), ...(read.height ? {height: read.height} : {})};
  return {...record, observations: {...observations, [key]: next}};
}
/** A failed read: the last good amounts stay with their own time; the reason is added. */
export function withFailure(record: WalletBalances, walletId: string, chainId: string, reason: string, at: string): WalletBalances {
  const key = observationKey(walletId, chainId), observations = sized(record, key), previous = observationOf(record, walletId, chainId);
  return {...record, observations: {...observations, [key]: {...(previous ?? {walletId, chainId}), error: reason.slice(0, 200), errorAt: at}}};
}
/** Forget every balance of one wallet (Remove, "Forget balances"). */
export function withoutWalletBalances(record: WalletBalances, walletId: string): WalletBalances {
  const observations = Object.fromEntries(Object.entries(record.observations ?? {}).filter(([, o]) => o.walletId !== walletId));
  return {...record, observations};
}
/** The one write: refused while the stored record cannot be read (never replaced by an empty one). */
export function writeWalletBalances(storage: Pick<Storage, 'getItem' | 'setItem'>, change: (current: WalletBalances) => WalletBalances): WalletBalances {
  if (readDeviceRecord(storage, WALLET_BALANCES).unreadable) throw Error('The wallet balances on this device could not be read, so nothing was changed.');
  return updateDeviceRecord(storage, WALLET_BALANCES, change);
}
/** Remove's companion: the wallet's balances leave with it, best effort (an unreadable record is left as it is). */
export function forgetWalletBalances(storage: Pick<Storage, 'getItem' | 'setItem'>, walletId: string): void {
  try { if (readDeviceRecord(storage, WALLET_BALANCES).data.observations) writeWalletBalances(storage, record => withoutWalletBalances(record, walletId)); } catch { /* kept as it is */ }
}
