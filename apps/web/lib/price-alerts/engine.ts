import type {MarketQuote} from '../market-quotes';
import {MAX_ALERTS, MAX_FIRED, priceAlertSchema, type PriceAlert, type PriceAlerts} from './schema';

/**
 * Session AJ (item 15; D9): the rules of the price alerts. A price is compared exactly (both sides scaled to 30
 * decimals), from a quote already read for that coin and currency; an alert fires once and turns itself off. A goal alert
 * fires when the goal's progress, counted with the same quotes as the Goals page, reaches its percent. Nothing here reads
 * the network; the words say what happened, never what to do.
 */
const SCALE = 30;
const scaled = (value: string, decimals: number) => BigInt(value) * 10n ** BigInt(SCALE - decimals);
export function decimalScaled(text: string): bigint { const [whole = '0', part = ''] = text.split('.'); return BigInt(whole) * 10n ** BigInt(SCALE) + BigInt((part + '0'.repeat(SCALE)).slice(0, SCALE)); }
export function quoteFor(quotes: readonly MarketQuote[], coin: string, currency: string): MarketQuote | undefined {
  return quotes.filter(q => q.providerAssetId === coin && q.currency === currency).sort((a, b) => (b.observedAt ?? '').localeCompare(a.observedAt ?? ''))[0];
}
export const priceText = (q: MarketQuote) => { const s = q.price.padStart(q.priceDecimals + 1, '0'), whole = s.slice(0, s.length - q.priceDecimals), part = s.slice(s.length - q.priceDecimals).replace(/0+$/, ''); return `${whole}${part ? `.${part.slice(0, 8)}` : ''}`; };
export type Fired = {alert: PriceAlert; text: string};
export function alertLine(a: PriceAlert): string {
  return a.kind === 'price' ? `${a.coinName} ${a.direction} ${a.price} ${a.currency}` : `When ${a.coinName} puts “${a.goalName ?? 'your goal'}” at ${a.percent}%`;
}
/** Checks every active alert against the quotes (and, for goal alerts, `goalPercent`); returns the record and what fired. */
export function checkPriceAlerts(record: PriceAlerts, quotes: readonly MarketQuote[], now: string, goalPercent?: (goalId: string) => number | null): {record: PriceAlerts; fired: Fired[]} {
  const fired: Fired[] = [];
  const alerts = record.alerts.map(a => {
    if (!a.active) return a;
    const q = quoteFor(quotes, a.coin, a.currency);
    if (a.kind === 'price') {
      if (!q || !a.price) return a;
      const now_ = scaled(q.price, q.priceDecimals), limit = decimalScaled(a.price);
      if (a.direction === 'above' ? now_ < limit : now_ > limit) return a;
      const text = `${a.coinName} is ${a.direction} ${a.price} ${a.currency}: ${priceText(q)} ${a.currency} (${q.source}).`;
      fired.push({alert: a, text}); return {...a, active: false, firedAt: now};
    }
    const pct = a.goalId && goalPercent ? goalPercent(a.goalId) : null;
    if (pct === null || pct === undefined || !a.percent || pct < a.percent) return a;
    const text = `${a.coinName} puts “${a.goalName ?? 'your goal'}” at ${Math.floor(pct)}% (your alert: ${a.percent}%).`;
    fired.push({alert: a, text}); return {...a, active: false, firedAt: now};
  });
  if (!fired.length) return {record, fired};
  const log = [...record.fired, ...fired.map(f => ({alertId: f.alert.id, at: now, text: f.text.slice(0, 300)}))].slice(-MAX_FIRED);
  return {record: {...record, alerts, fired: log}, fired};
}
export const newAlertId = () => `alert_${crypto.randomUUID()}`;
/** Adds one alert (checked against its schema); refuses the 51st and an exact twin of an active one. */
export function addAlert(record: PriceAlerts, alert: PriceAlert): PriceAlerts {
  const parsed = priceAlertSchema.parse(alert);
  if (record.alerts.filter(a => a.active).length >= MAX_ALERTS) throw new Error(`Up to ${MAX_ALERTS} alerts at a time; remove one first.`);
  const twin = record.alerts.find(a => a.active && a.kind === parsed.kind && a.coin === parsed.coin && a.currency === parsed.currency && a.direction === parsed.direction && a.price === parsed.price && a.goalId === parsed.goalId && a.percent === parsed.percent);
  if (twin) throw new Error('That alert is already set.');
  const kept = record.alerts.length >= MAX_ALERTS ? record.alerts.filter(a => a.active) : record.alerts;
  return {...record, alerts: [...kept, parsed]};
}
export const removeAlert = (record: PriceAlerts, id: string): PriceAlerts => ({...record, alerts: record.alerts.filter(a => a.id !== id)});
export const markSeen = (record: PriceAlerts, now: string): PriceAlerts => ({...record, alerts: record.alerts.map(a => a.firedAt && !a.seenAt ? {...a, seenAt: now} : a)});
/** Fired alerts not yet seen on Today. */
export const unseen = (record: PriceAlerts): PriceAlert[] => record.alerts.filter(a => a.firedAt && !a.seenAt);
