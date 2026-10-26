import {expect, test} from 'vitest';
import {realizedSales} from './performance';
import {realizedGainsCsv} from './realized-csv';
import type {PortfolioData, PortfolioTransaction} from './schema';

// Session AH (WE18): realised gains per year from the person's own sales; fictional data only.
const BTC = 'coingecko:coin:bitcoin', ETH = 'coingecko:coin:ethereum';
let n = 0;
const tx = (coin: string, kind: PortfolioTransaction['kind'], quantity: string, date: string, price?: string, fee?: string): PortfolioTransaction => ({id: `t${++n}`, coin, kind, quantity, date, note: '', createdAt: `${date}T12:00:00.000Z`, ...(price === undefined ? {} : {price}), ...(fee === undefined ? {} : {fee})});
const coins = [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}, {ref: {provider: 'coingecko', kind: 'coin', id: 'ethereum'}, name: '=Ether', symbol: 'ETH'}] as PortfolioData['portfolios'][number]['coins'];
const data = (transactions: PortfolioTransaction[], kind: 'real' | 'hypothetical' = 'real'): PortfolioData => ({version: 1, portfolios: [{id: 'p1', name: 'Fictional pot', kind, currency: 'EUR', createdAt: '2025-01-01T00:00:00.000Z', coins, transactions}]});

test('each sale has its average cost and result; the rows add up per year; a loss stays a number', () => {
  const trades = [tx(BTC, 'buy', '1', '2025-01-01', '100', '1'), tx(BTC, 'buy', '1', '2025-02-01', '200'), tx(BTC, 'sell', '0.5', '2025-03-01', '300', '2'), tx(BTC, 'sell', '0.5', '2026-04-01', '100'), tx(BTC, 'transfer-out', '0.5', '2026-05-01', undefined, '1')];
  expect(realizedSales({transactions: trades}).map(s => [s.kind, s.result])).toEqual([['sell', '72.75'], ['sell', '-25.25'], ['transfer-fee', '-1']]);
  const lines = realizedGainsCsv(data(trades)).split('\r\n');
  expect(lines[0]).toContain('"Realised result"');
  expect(lines.find(l => l.includes('"Total 2025"'))).toMatch(/,72\.75,"EUR"$/);
  expect(lines.find(l => l.includes('"Total 2026"'))).toMatch(/,-26\.25,"EUR"$/);
  expect(lines.find(l => l.startsWith('2026,"2026-04-01"'))).toBe('2026,"2026-04-01","Fictional pot","Bitcoin","BTC","Sell",0.5,50,0,75.25,-25.25,"EUR"');
  expect(lines.some(l => l.includes(',-25.25,'))).toBe(true);
});

test('an unknown cost stays empty and its year says so; a formula-like name is defused; a hypothetical portfolio is left out', () => {
  const trades = [tx(ETH, 'transfer-in', '2', '2026-01-15'), tx(ETH, 'sell', '1', '2026-02-15', '50')];
  const csv = realizedGainsCsv(data(trades));
  expect(csv).toContain('"\'=Ether"');
  expect(csv).toContain('Total 2026: unknown');
  expect(realizedGainsCsv(data(trades, 'hypothetical')).split('\r\n')).toHaveLength(1);
});
