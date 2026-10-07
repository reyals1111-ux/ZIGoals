import {coinKey, type PortfolioData} from './schema';

/**
 * The Showcase portfolio (Session I, Part 11): clearly fictional records with fixture prices, labelled Showcase
 * wherever they show. Shown only in Showcase, never written on view, and never fetched.
 */
const COINS = [
  {ref: {provider: 'coingecko' as const, kind: 'coin' as const, id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'},
  {ref: {provider: 'coingecko' as const, kind: 'coin' as const, id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'},
  {ref: {provider: 'coingecko' as const, kind: 'coin' as const, id: 'solana'}, name: 'Solana', symbol: 'SOL'},
];
/** Fixture prices per coin in USD, for the Showcase only; they are not market data. */
export const SHOWCASE_PRICES: Readonly<Record<string, string>> = {[coinKey(COINS[0]!.ref)]: '65000', [coinKey(COINS[1]!.ref)]: '2400', [coinKey(COINS[2]!.ref)]: '150'};
export function showcasePortfolios(day: string): PortfolioData {
  const at = (offset: number) => new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86400000).toISOString();
  const date = (offset: number) => at(offset).slice(0, 10);
  const [btc, eth, sol] = COINS.map(c => coinKey(c.ref));
  return {version: 1, portfolios: [{
    id: 'showcase-portfolio', name: 'Fictional long-term coins', kind: 'hypothetical', currency: 'USD', createdAt: at(-120), coins: COINS,
    transactions: [
      {id: 'showcase-tx-1', coin: btc!, kind: 'buy', quantity: '0.05', price: '58000', fee: '12', date: date(-110), note: 'Fictional first buy', createdAt: at(-110)},
      {id: 'showcase-tx-2', coin: eth!, kind: 'buy', quantity: '1.2', price: '2600', fee: '6', date: date(-90), note: '', createdAt: at(-90)},
      {id: 'showcase-tx-3', coin: btc!, kind: 'buy', quantity: '0.02', price: '61000', date: date(-60), note: '', createdAt: at(-60)},
      {id: 'showcase-tx-4', coin: sol!, kind: 'transfer-in', quantity: '10', date: date(-45), note: 'Fictional transfer from another wallet', createdAt: at(-45)},
      {id: 'showcase-tx-5', coin: eth!, kind: 'sell', quantity: '0.2', price: '2500', fee: '2', date: date(-20), note: '', createdAt: at(-20)},
    ],
  }]};
}

/**
 * Session W Part 15: the Showcase's fixture market for Portfolio v2 (fictional, labelled wherever it shows; never fetched).
 * A smooth made-up price line per coin that ends at its fixture price, so the value chart, the sparklines and the
 * 1h/24h/7d changes agree with each other; round made-up sizes for the coin page.
 */
const SHAPE: Readonly<Record<string, {slow: number; mid: number; fast: number; phase: number}>> = {[coinKey(COINS[0]!.ref)]: {slow: 0.09, mid: 0.03, fast: 0.008, phase: 0.3}, [coinKey(COINS[1]!.ref)]: {slow: 0.12, mid: 0.04, fast: 0.01, phase: 1.7}, [coinKey(COINS[2]!.ref)]: {slow: 0.18, mid: 0.06, fast: 0.015, phase: 3.1}};
const HOUR = 3600000, DAY = 24 * HOUR;
const level = (coin: string, at: number) => { const s = SHAPE[coin]; if (!s) return 1; return 1 + s.slow * Math.sin(at / (47 * DAY) + s.phase) + s.mid * Math.sin(at / (6.1 * DAY) + 2 * s.phase) + s.fast * Math.sin(at / (0.9 * DAY) + 3 * s.phase); };
/** The fixture price at a moment, in USD with two decimals (Showcase only). */
export function showcasePriceAt(coin: string, at: number, now: number): string | undefined {
  const base = SHOWCASE_PRICES[coin]; if (base === undefined) return undefined;
  return (Number(base) * level(coin, at) / level(coin, now)).toFixed(2);
}
/** Fixture observations every `stepMs` from `start` to `now`. */
export function showcasePrices(coin: string, start: number, now: number, stepMs: number): {at: number; price: string}[] {
  const points: {at: number; price: string}[] = [];
  for (let at = start; at < now; at += stepMs) points.push({at, price: showcasePriceAt(coin, at, now)!});
  points.push({at: now, price: showcasePriceAt(coin, now, now)!});
  return points;
}
const pct = (now: string, then: string) => ((Number(now) / Number(then) - 1) * 100).toFixed(2);
export type ShowcaseMarket = {change1h: string; change24h: string; change7d: string; sparkline: {value: string; decimals: number}[]; marketCap: string; volume24h: string; circulatingSupply: string; totalSupply: string | null; maxSupply: string | null};
const SIZES: Readonly<Record<string, Pick<ShowcaseMarket, 'marketCap' | 'volume24h' | 'circulatingSupply' | 'totalSupply' | 'maxSupply'>>> = {
  [coinKey(COINS[0]!.ref)]: {marketCap: '1200000000000', volume24h: '30000000000', circulatingSupply: '19000000', totalSupply: '21000000', maxSupply: '21000000'},
  [coinKey(COINS[1]!.ref)]: {marketCap: '280000000000', volume24h: '12000000000', circulatingSupply: '120000000', totalSupply: '120000000', maxSupply: null},
  [coinKey(COINS[2]!.ref)]: {marketCap: '70000000000', volume24h: '2500000000', circulatingSupply: '450000000', totalSupply: '580000000', maxSupply: null},
};
/** A coin's fixture changes, 7-day line (hourly, 168 points) and sizes; undefined for a coin the Showcase does not hold. */
export function showcaseMarket(coin: string, now: number): ShowcaseMarket | undefined {
  const price = showcasePriceAt(coin, now, now), sizes = SIZES[coin];
  if (price === undefined || !sizes) return undefined;
  const at = (ms: number) => showcasePriceAt(coin, now - ms, now)!;
  const sparkline = showcasePrices(coin, now - 7 * DAY, now, HOUR).slice(-168).map(p => ({value: p.price.replace('.', '').replace(/^0+(?=\d)/, ''), decimals: 2}));
  return {change1h: pct(price, at(HOUR)), change24h: pct(price, at(DAY)), change7d: pct(price, at(7 * DAY)), sparkline, ...sizes};
}
