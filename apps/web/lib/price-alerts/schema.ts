import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AJ (item 15, WE17/J11; owner decision D9; `TIER 3 (stored format)`): price alerts tied to goals, a new device
 * key `zigoals:price-alerts:v1`. Two kinds: a coin's price above or below a figure, and "when <coin> puts <goal> at X %".
 * In the app only: checked when the app opens and when prices refresh, from the prices already read (no extra request);
 * a fired alert shows once as a toast, stays on Today until seen, and is listed in Activity. `channels.push` is kept for
 * the later push step (CO11) and is never true in this build. Loose and versioned; device-only (not synced); in Export
 * everything and its restore; erased with the account. At most 50 alerts and the last 200 firings.
 */
export const PRICE_ALERTS_KEY = 'zigoals:price-alerts:v1';
export const MAX_ALERTS = 50, MAX_FIRED = 200;
const decimal = z.string().regex(/^\d{1,18}(\.\d{1,12})?$/);
export const priceAlertSchema = z.looseObject({
  id: z.string().regex(/^alert_[A-Za-z0-9-]{8,60}$/),
  kind: z.enum(['price', 'goal']),
  coin: z.string().regex(/^[a-zA-Z0-9._-]{1,150}$/),
  coinName: z.string().trim().min(1).max(100),
  currency: z.enum(['USD', 'EUR']),
  direction: z.enum(['above', 'below']).optional(),
  price: decimal.optional(),
  goalId: z.string().min(1).max(250).optional(),
  goalName: z.string().max(100).optional(),
  percent: z.number().int().min(1).max(1000).optional(),
  createdAt: z.iso.datetime(),
  active: z.boolean(),
  firedAt: z.iso.datetime().optional(),
  seenAt: z.iso.datetime().optional(),
  channels: z.looseObject({inApp: z.boolean().default(true), push: z.boolean().default(false)}).default({inApp: true, push: false}),
}).refine(a => a.kind === 'price' ? !!a.direction && !!a.price : !!a.goalId && !!a.percent, 'A price alert needs a direction and a price; a goal alert a goal and a percent.');
export const firedAlertSchema = z.looseObject({alertId: z.string().max(80), at: z.iso.datetime(), text: z.string().max(300)});
export const priceAlertsSchema = z.looseObject({
  version: z.literal(1),
  alerts: z.array(priceAlertSchema).max(MAX_ALERTS).default([]),
  fired: z.array(firedAlertSchema).max(MAX_FIRED).default([]),
});
export type PriceAlert = z.infer<typeof priceAlertSchema>;
export type PriceAlerts = z.infer<typeof priceAlertsSchema>;
export const emptyPriceAlerts = (): PriceAlerts => ({version: 1, alerts: [], fired: []});
export const PRICE_ALERTS: DeviceRecordSpec<PriceAlerts> = {key: PRICE_ALERTS_KEY, schema: priceAlertsSchema, empty: emptyPriceAlerts};
