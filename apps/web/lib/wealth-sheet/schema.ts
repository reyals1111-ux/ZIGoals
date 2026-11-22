import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {WEALTH_SHEET_KEY_LITERAL} from '../av2-money-device-keys';

/**
 * Session AV lane 2 (money; Kubera's net-worth sheet), TIER 3 (stored format): a NEW device-only record, loose and
 * versioned, keyed by account id in `zigoals:accounts:v1` (whose strict record every release reads, so nothing is ever
 * added to it). Every field optional and bounded; a value this build cannot read is dropped on read, never failing the
 * record. Not synced; in Export everything, the restore and the account erase (lib/av2-money-device-keys.ts).
 * - `secures`: a mortgage (or loan) account → the property account it is secured on; the property shows its equity.
 * - `share`: the person's share of an account, in percent (1–100; a joint account at 50); the sheet counts that part.
 * - `group`: the person's own group name for an account (a sheet section), with a subtotal per currency.
 * - `every`: how often the person updates a balance by hand (month or quarter); overdue shows on Wealth and Today.
 * - `flows`: money in and out of an account with their days (at most 200 each), for its annual return (IRR).
 * - `rates`: exchange rates the person types (1 `from` = `rate` `to`, with the day), at most 20; `total`: the currency of
 *   the one total. Typed, never fetched, and labelled as the person's.
 */
export const WEALTH_SHEET_KEY = WEALTH_SHEET_KEY_LITERAL;
export const MAX_FLOWS = 200, MAX_RATES = 20, MAX_SHEET_ACCOUNTS = 200;
const accountId = z.string().regex(/^[0-9a-fA-F-]{8,40}$/);
const currency = z.string().regex(/^[A-Z]{3}$/);
const amount = z.string().regex(/^\d{1,13}(\.\d{1,2})?$/).refine(v => Number(v) > 0, 'Above zero.');
const day = z.iso.date();
const bounded = <T extends z.ZodType>(value: T) => z.record(accountId, value).refine(r => Object.keys(r).length <= MAX_SHEET_ACCOUNTS, `Up to ${MAX_SHEET_ACCOUNTS} accounts.`);
export const flowSchema = z.looseObject({date: day, amount, kind: z.enum(['in', 'out'])});
export const rateSchema = z.looseObject({from: currency, to: currency, rate: z.string().regex(/^\d{1,9}(\.\d{1,8})?$/).refine(v => Number(v) > 0, 'Above zero.'), on: day});
export const wealthSheetSchema = z.looseObject({
  version: z.literal(1),
  secures: bounded(accountId).optional().catch(undefined),
  share: bounded(z.number().min(1).max(100)).optional().catch(undefined),
  group: bounded(z.string().trim().min(1).max(40)).optional().catch(undefined),
  every: bounded(z.enum(['month', 'quarter'])).optional().catch(undefined),
  flows: bounded(z.array(flowSchema).max(MAX_FLOWS)).optional().catch(undefined),
  rates: z.array(rateSchema).max(MAX_RATES).optional().catch(undefined),
  total: currency.optional().catch(undefined),
});
export type WealthSheet = z.infer<typeof wealthSheetSchema>;
export const emptyWealthSheet = (): WealthSheet => ({version: 1});
export const WEALTH_SHEET: DeviceRecordSpec<WealthSheet> = {key: WEALTH_SHEET_KEY, schema: wealthSheetSchema, empty: emptyWealthSheet};
