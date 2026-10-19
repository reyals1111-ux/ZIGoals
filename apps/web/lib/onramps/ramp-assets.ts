import * as z from 'zod';
import {BUY_ASSETS} from './assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H35, H58, H89; A2.5): the wire shape of `GET /api/onramps/ramp-assets?currency=EUR|USD`,
 * ZIGoals' server read of Ramp Network's public asset list (`api.rampnetwork.com/api/host-api/v3/assets`, no key, no
 * address of anyone). Only the assets Add money offers are passed on, each with Ramp's own minimum, maximum and network
 * fee, and the global fee range, with the source and "as of". A failure answers HTTP 200 with `status: 'unavailable'` and
 * a reason (H58); ZIGoals never states a fee it did not read (H35).
 */
export const RAMP_ASSETS_SOURCE = 'https://api.rampnetwork.com/api/host-api/v3/assets';
const money = z.number().finite().min(0).max(1_000_000);
export const rampAssetWire = z.object({code: z.string().regex(/^[A-Z0-9]{2,16}_[A-Z0-9]{2,12}$/), enabled: z.boolean(), minPurchaseAmount: money.nullable(), maxPurchaseAmount: money.nullable(), networkFee: money.nullable()}).strict();
export const rampAssetsWire = z.discriminatedUnion('status', [
  z.object({version: z.literal(1), status: z.literal('ok'), source: z.literal(RAMP_ASSETS_SOURCE), currency: z.enum(['USD', 'EUR']), asOf: z.iso.datetime(),
    fees: z.object({minFeePercent: money, maxFeePercent: money, minFeeAmount: money, minPurchaseAmount: money, maxPurchaseAmount: money}).strict(),
    assets: z.array(rampAssetWire).max(64)}).strict(),
  z.object({version: z.literal(1), status: z.literal('unavailable'), source: z.literal(RAMP_ASSETS_SOURCE), currency: z.enum(['USD', 'EUR']), reason: z.enum(['UPSTREAM_DOWN', 'TIMEOUT', 'MALFORMED', 'TOO_LARGE', 'RATE_LIMITED']), asOf: z.iso.datetime().optional()}).strict(),
]);
export type RampAssets = z.infer<typeof rampAssetsWire>;
/** The Ramp codes Add money offers (the table's), the only ones passed on. */
export const OFFERED_RAMP_CODES: ReadonlySet<string> = new Set(BUY_ASSETS.flatMap(a => a.offers.flatMap(o => o.ramp ? [o.ramp.value] : [])));
export const UNAVAILABLE_WORDS: Record<Extract<RampAssets, {status: 'unavailable'}>['reason'], string> = {
  UPSTREAM_DOWN: 'Ramp’s asset list did not answer just now.', TIMEOUT: 'Ramp’s asset list did not answer in time.', MALFORMED: 'Ramp’s asset list sent something ZIGoals could not check.',
  TOO_LARGE: 'Ramp’s asset list was larger than ZIGoals reads.', RATE_LIMITED: 'Ramp’s asset list was read too often just now; try again in a minute.',
};
