import type {MarketQuote} from '../market-quotes';
import {MAX_ALERTS, MAX_FIRED, MAX_PORTFOLIO_ALERTS, portfolioAlertSchema, priceAlertSchema, type PortfolioAlert, type PriceAlert, type PriceAlerts} from './schema';

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
/** Session AV (fresh-agent check q2, rank 35): marks the portfolio-value alerts seen too. */
export const markSeen = (record: PriceAlerts, now: string): PriceAlerts => ({...record, alerts: record.alerts.map(a => a.firedAt && !a.seenAt ? {...a, seenAt: now} : a),
  ...(record.portfolio ? {portfolio: record.portfolio.map(a => a.firedAt && !a.seenAt ? {...a, seenAt: now} : a)} : {})});
/** Fired alerts not yet seen on Today. */
export const unseen = (record: PriceAlerts): PriceAlert[] => record.alerts.filter(a => a.firedAt && !a.seenAt);
/**
 * Session AV (fresh-agent check q2, rank 35): everything that fired and is not seen yet — coin and goal alerts, and a
 * portfolio's value alerts — and everything still waiting, as Today's card counts them (newest first for the fired).
 */
export type AlertItem = {id: string; line: string; firedAt?: string};
export function alertsForToday(record: PriceAlerts): {fresh: AlertItem[]; waiting: AlertItem[]} {
  const said = (id: string, fallback: string) => [...record.fired].reverse().find(f => f.alertId === id)?.text ?? fallback;
  const fresh = [...unseen(record).map(a => ({id: a.id, line: said(a.id, alertLine(a)), firedAt: a.firedAt})), ...(record.portfolio ?? []).filter(a => a.firedAt && !a.seenAt).map(a => ({id: a.id, line: said(a.id, portfolioAlertLine(a)), firedAt: a.firedAt}))]
    .sort((a, b) => (b.firedAt ?? '').localeCompare(a.firedAt ?? ''));
  const waiting = [...record.alerts.filter(a => a.active).map(a => ({id: a.id, line: alertLine(a)})), ...(record.portfolio ?? []).filter(a => a.active).map(a => ({id: a.id, line: portfolioAlertLine(a)}))];
  return {fresh, waiting};
}
/** Whether anything is waiting to be checked (a coin, goal or portfolio-value alert). */
export const anyActive = (record: PriceAlerts) => record.alerts.some(a => a.active) || (record.portfolio ?? []).some(a => a.active);

/**
 * Session AV (owner follow-up 1, F-MOVE-ALERT; CoinStats' percent-change alerts): the price a move of `percent` up or
 * down from `current` reaches, in exact decimals (up to 8 places, trailing zeros dropped), so a "10 % up from today"
 * alert is an ordinary price alert above that price — the stored format older builds read, unchanged.
 */
export function movePrice(current: string, percent: number, up: boolean): string {
  if (!Number.isInteger(percent) || percent < 1 || percent > (up ? 1000 : 90)) throw new Error(up ? 'Choose a move of 1 to 1000 %.' : 'Choose a fall of 1 to 90 %.');
  const now = decimalScaled(current), target = now * BigInt(100 + (up ? percent : -percent)) / 100n, unit = 10n ** BigInt(SCALE);
  const whole = target / unit, part = (target % unit).toString().padStart(SCALE, '0').slice(0, 8).replace(/0+$/, '');
  return `${whole}${part ? `.${part}` : ''}`;
}

/* ---- Session AV (owner follow-up 1, F-MOVE-ALERT): a portfolio's whole value above or below a value ---------------- */
export const portfolioAlertLine = (a: PortfolioAlert) => `${a.portfolioName} worth ${a.direction} ${a.value} ${a.currency}`;
export function addPortfolioAlert(record: PriceAlerts, alert: PortfolioAlert): PriceAlerts {
  const parsed = portfolioAlertSchema.parse(alert), list = record.portfolio ?? [];
  if (list.filter(a => a.active).length >= MAX_PORTFOLIO_ALERTS) throw new Error(`Up to ${MAX_PORTFOLIO_ALERTS} portfolio alerts at a time.`);
  if (list.some(a => a.active && a.portfolioId === parsed.portfolioId && a.direction === parsed.direction && a.value === parsed.value)) throw new Error('That alert is already set.');
  return {...record, portfolio: [...list, parsed]};
}
export function removePortfolioAlert(record: PriceAlerts, id: string): PriceAlerts {
  const list = (record.portfolio ?? []).filter(a => a.id !== id);
  const {portfolio: _p, ...rest} = record; void _p;
  return (list.length ? {...rest, portfolio: list} : rest) as PriceAlerts;
}
/**
 * Checks the active portfolio alerts against each portfolio's value now (`valueOf` gives the value only when every held
 * coin has a price, else null: an unknown value never fires an alert). Fired ones turn inactive and join the log.
 */
export function checkPortfolioAlerts(record: PriceAlerts, valueOf: (portfolioId: string) => string | null, now: string): {record: PriceAlerts; fired: {alert: PortfolioAlert; text: string}[]} {
  const fired: {alert: PortfolioAlert; text: string}[] = [];
  const list = (record.portfolio ?? []).map(a => {
    if (!a.active) return a;
    const v = valueOf(a.portfolioId);
    if (v === null || !/^\d+(\.\d+)?$/.test(v)) return a;
    const nowV = decimalScaled(v), limit = decimalScaled(a.value);
    if (a.direction === 'above' ? nowV < limit : nowV > limit) return a;
    const shown = (() => { const [w, p = ''] = v.split('.'); return `${w}${p ? `.${p.slice(0, 2)}` : ''}`; })();
    fired.push({alert: a, text: `${a.portfolioName} is worth ${a.direction} ${a.value} ${a.currency}: ${shown} ${a.currency} now.`});
    return {...a, active: false, firedAt: now};
  });
  if (!fired.length) return {record, fired};
  const log = [...record.fired, ...fired.map(f => ({alertId: f.alert.id, at: now, text: f.text.slice(0, 300)}))].slice(-MAX_FIRED);
  return {record: {...record, portfolio: list, fired: log}, fired};
}
