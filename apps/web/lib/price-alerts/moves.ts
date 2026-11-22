import {MAX_ALERTS, MAX_FIRED, MAX_PORTFOLIO_ALERTS, type PriceAlerts} from './schema';

/**
 * Session AV lane 2 (money; CoinStats' percent-change and portfolio-value alerts): two alerts that follow a move, not a
 * fixed price, from the prices this app already reads (no extra request, no new service):
 * - a coin that moves `percent` up, down or either way within 24 hours — the 24 h change the market insights already
 *   carry (CoinGecko's `price_change_percentage_24h`); it fires again at most once a day while the move lasts;
 * - a portfolio whose whole value moves `percent` from its value when the alert was set (`base`); it fires once.
 * Information only, not advice; nothing is bought, sold or sent. Pure.
 */
export type MoveAlert = NonNullable<PriceAlerts['moves']>[number];
export type PortfolioMove = NonNullable<PriceAlerts['portfolioMoves']>[number];
const DAY_MS = 86_400_000, SCALE = 30;
const decimalScaled = (text: string) => { const [whole = '0', part = ''] = text.split('.'); return BigInt(whole) * 10n ** BigInt(SCALE) + BigInt((part + '0'.repeat(SCALE)).slice(0, SCALE)); };
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace(/\.0$/, '')}%`;
export const directionWords = (d: MoveAlert['direction']) => d === 'up' ? 'up' : d === 'down' ? 'down' : 'up or down';
export const moveAlertLine = (a: MoveAlert) => `${a.coinName} moves ${a.percent}% ${directionWords(a.direction)} in 24 h`;
export const portfolioMoveLine = (a: PortfolioMove) => `${a.portfolioName} worth ${a.percent}% ${directionWords(a.direction)} from ${a.base} ${a.currency}`;
const passes = (change: number, percent: number, d: MoveAlert['direction']) => d === 'up' ? change >= percent : d === 'down' ? change <= -percent : Math.abs(change) >= percent;

function addTo<T extends {active: boolean}>(list: readonly T[] | undefined, alert: T, max: number, same: (a: T) => boolean): T[] {
  const all = list ?? [];
  if (all.filter(a => a.active).length >= max) throw new Error(`Up to ${max} of these alerts at a time; remove one first.`);
  if (all.some(a => a.active && same(a))) throw new Error('That alert is already set.');
  return [...all, alert];
}
export function addMoveAlert(record: PriceAlerts, alert: MoveAlert): PriceAlerts {
  if (!Number.isInteger(alert.percent) || alert.percent < 1 || alert.percent > 90) throw new Error('Choose a move of 1 to 90 %.');
  return {...record, moves: addTo(record.moves, alert, MAX_ALERTS, a => a.coin === alert.coin && a.currency === alert.currency && a.percent === alert.percent && a.direction === alert.direction)};
}
export function addPortfolioMove(record: PriceAlerts, alert: PortfolioMove): PriceAlerts {
  if (!Number.isInteger(alert.percent) || alert.percent < 1 || alert.percent > 90) throw new Error('Choose a move of 1 to 90 %.');
  if (!/^\d{1,18}(\.\d{1,12})?$/.test(alert.base) || Number(alert.base) <= 0) throw new Error('This portfolio has no full value yet, so there is nothing to measure a move from.');
  return {...record, portfolioMoves: addTo(record.portfolioMoves, alert, MAX_PORTFOLIO_ALERTS, a => a.portfolioId === alert.portfolioId && a.percent === alert.percent && a.direction === alert.direction)};
}
export function removeMove(record: PriceAlerts, id: string): PriceAlerts {
  const moves = (record.moves ?? []).filter(a => a.id !== id), portfolioMoves = (record.portfolioMoves ?? []).filter(a => a.id !== id);
  const {moves: _m, portfolioMoves: _p, ...rest} = record; void _m; void _p;
  return {...rest, ...(moves.length ? {moves} : {}), ...(portfolioMoves.length ? {portfolioMoves} : {})} as PriceAlerts;
}
const logged = (record: PriceAlerts, fired: {id: string; text: string}[], at: string) => [...record.fired, ...fired.map(f => ({alertId: f.id, at, text: f.text.slice(0, 300)}))].slice(-MAX_FIRED);
/** Checks the 24 h move alerts against each coin's 24 h change (a decimal percent text, or null when unknown). */
export function checkMoveAlerts(record: PriceAlerts, change24h: (coin: string, currency: string) => string | null, now: string): {record: PriceAlerts; fired: {id: string; text: string}[]} {
  const fired: {id: string; text: string}[] = [], t = Date.parse(now);
  const moves = (record.moves ?? []).map(a => {
    if (!a.active || (a.firedAt && t - Date.parse(a.firedAt) < DAY_MS)) return a;
    const raw = change24h(a.coin, a.currency), change = raw === null ? NaN : Number(raw);
    if (!Number.isFinite(change) || !passes(change, a.percent, a.direction)) return a;
    fired.push({id: a.id, text: `${a.coinName} moved ${pct(change)} in 24 h in ${a.currency} (your alert: ${a.percent}% ${directionWords(a.direction)}).`});
    const {seenAt: _s, ...rest} = a; void _s;
    return {...rest, firedAt: now};
  });
  return fired.length ? {record: {...record, moves, fired: logged(record, fired, now)}, fired} : {record, fired};
}
/** Checks the portfolio move alerts against each portfolio's whole value now (null while any coin has no price). */
export function checkPortfolioMoves(record: PriceAlerts, valueOf: (portfolioId: string) => string | null, now: string): {record: PriceAlerts; fired: {id: string; text: string}[]} {
  const fired: {id: string; text: string}[] = [];
  const portfolioMoves = (record.portfolioMoves ?? []).map(a => {
    if (!a.active) return a;
    const v = valueOf(a.portfolioId);
    if (v === null || !/^\d+(\.\d+)?$/.test(v)) return a;
    const base = decimalScaled(a.base), nowV = decimalScaled(v);
    if (base <= 0n) return a;
    const change = Number((nowV - base) * 10000n / base) / 100;
    if (!passes(change, a.percent, a.direction)) return a;
    fired.push({id: a.id, text: `${a.portfolioName} is worth ${pct(change)} from ${a.base} ${a.currency}: ${Number(v).toFixed(2)} ${a.currency} now.`});
    return {...a, active: false, firedAt: now};
  });
  return fired.length ? {record: {...record, portfolioMoves, fired: logged(record, fired, now)}, fired} : {record, fired};
}
/** What fired and is not seen, and what waits, for Today's card (beside the coin, goal and value alerts). */
export function movesForToday(record: PriceAlerts): {fresh: {id: string; line: string; firedAt: string | undefined}[]; waiting: {id: string; line: string}[]} {
  const said = (id: string, fallback: string) => [...record.fired].reverse().find(f => f.alertId === id)?.text ?? fallback;
  const all = [...(record.moves ?? []).map(a => ({a, line: moveAlertLine(a)})), ...(record.portfolioMoves ?? []).map(a => ({a, line: portfolioMoveLine(a)}))];
  return {fresh: all.filter(x => x.a.firedAt && !x.a.seenAt).map(x => ({id: x.a.id, line: said(x.a.id, x.line), firedAt: x.a.firedAt})), waiting: all.filter(x => x.a.active).map(x => ({id: x.a.id, line: x.line}))};
}
export const movesSeen = (record: PriceAlerts, now: string): PriceAlerts => ({...record,
  ...(record.moves ? {moves: record.moves.map(a => a.firedAt && !a.seenAt ? {...a, seenAt: now} : a)} : {}),
  ...(record.portfolioMoves ? {portfolioMoves: record.portfolioMoves.map(a => a.firedAt && !a.seenAt ? {...a, seenAt: now} : a)} : {})});
export const anyMoveActive = (record: PriceAlerts) => (record.moves ?? []).some(a => a.active) || (record.portfolioMoves ?? []).some(a => a.active);
