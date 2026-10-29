import {addAlert} from '../../price-alerts/engine';
import {PRICE_ALERTS, PRICE_ALERTS_KEY, priceAlertSchema, type PriceAlerts} from '../../price-alerts/schema';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Session AJ (item 15, D9): the price alerts join the device records a ZIGi card may change, through their own entry. The
 * one patch is `{add: alert}`, checked against the alert's own schema and the record's own rules (at most 50, no twin)
 * before it is written; removing one happens where it is listed. The card is never auto-accepted (it is about money).
 */
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const priceAlertEntry: Entry<PriceAlerts> = {spec: PRICE_ALERTS, apply: (record, patch) => {
  if (!object(patch) || !object(patch.add)) throw new Error('That change is not one a card can make.');
  const alert = priceAlertSchema.safeParse(patch.add);
  if (!alert.success || alert.data.channels.push) throw new Error('This alert cannot be set as proposed; set it on the coin\'s page.');
  return addAlert(record, alert.data);
}};
registerDeviceWrite(PRICE_ALERTS_KEY, priceAlertEntry);
