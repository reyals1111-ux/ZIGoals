import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (J14; `TIER 3 (stored format)`): the exchanges connected on this device and what they last reported — never
 * a key or a secret (those are sealed in IndexedDB, lib/exchanges/vault.ts). A new device-only key, loose and versioned;
 * in Export everything (balances only) and its restore; erased with the account; not synced (ADR-034 N34).
 */
export const EXCHANGES_KEY = 'zigoals:exchanges:v1';
const balance = z.looseObject({asset: z.string().min(1).max(20), amount: z.string().regex(/^\d+(\.\d+)?$/)});
const connection = z.looseObject({
  connectedAt: z.string().max(40),
  /** The last good read: when, and the balances (a failed read keeps these and adds `error`, never zeros). */
  read: z.looseObject({at: z.string().max(40), balances: z.array(balance).max(500)}).optional(),
  error: z.string().max(200).optional(),
});
export const exchangesSchema = z.looseObject({version: z.literal(1), connections: z.record(z.string().max(20), connection)});
export type ExchangesRecord = z.infer<typeof exchangesSchema>;
export const EXCHANGES_RECORD: DeviceRecordSpec<ExchangesRecord> = {key: EXCHANGES_KEY, schema: exchangesSchema, empty: () => ({version: 1, connections: {}})};
/** A decimal amount as base units and decimals ("0.15" → "15", 2), for the Portfolio's wallet import. */
export function baseUnits(amount: string): {amount: string; decimals: number} {
  const [whole, frac = ''] = amount.split('.');
  return {amount: `${whole}${frac}`.replace(/^0+(?=\d)/, ''), decimals: frac.length};
}
