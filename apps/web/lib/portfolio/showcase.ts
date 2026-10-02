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
