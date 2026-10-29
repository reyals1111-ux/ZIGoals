import {addLocalDays} from '../local-date';
import {priceAlertsSchema, type PriceAlerts} from './schema';

/**
 * Session AJ (item 15, D9): the Showcase's fictional price alerts: one waiting (far from any real price, so it does not
 * fire on view) and one that fired and was seen two days ago (in Activity). Deterministic for a day; labelled as an example.
 */
export function showcasePriceAlerts(day: string): PriceAlerts {
  const at = (offset: number, time = '09:00:00') => `${addLocalDays(day, offset)}T${time}.000Z`;
  return priceAlertsSchema.parse({version: 1,
    alerts: [
      {id: 'alert_showcase-waiting-btc', kind: 'price', coin: 'bitcoin', coinName: 'BTC (example)', currency: 'USD', direction: 'above', price: '250000', createdAt: at(-6), active: true, channels: {inApp: true, push: false}},
      {id: 'alert_showcase-fired-eth', kind: 'price', coin: 'ethereum', coinName: 'ETH (example)', currency: 'USD', direction: 'below', price: '2500', createdAt: at(-9), active: false, firedAt: at(-2, '14:20:00'), seenAt: at(-2, '18:05:00'), channels: {inApp: true, push: false}},
    ],
    fired: [{alertId: 'alert_showcase-fired-eth', at: at(-2, '14:20:00'), text: 'ETH (example) is below 2500 USD: 2481.12 USD (SHOWCASE DATA).'}],
  });
}
