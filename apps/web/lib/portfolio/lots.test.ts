import {expect, test} from 'vitest';
import {lotResults} from './lots';
import {realizedResults} from './performance';
import type {PortfolioTransaction} from './schema';

/** Session AI (WE21): FIFO and LIFO beside average cost, on the same fictional history. */
let n = 0;
const tx = (kind: PortfolioTransaction['kind'], date: string, quantity: string, price?: string, fee?: string) => ({id: `t${++n}`, kind, coin: 'BTC', date, quantity, ...(price ? {price} : {}), ...(fee ? {fee} : {}), createdAt: `${date}T12:00:00.000Z`}) as PortfolioTransaction;
const history = [tx('buy', '2026-01-01', '1', '10000'), tx('buy', '2026-02-01', '1', '20000'), tx('sell', '2026-03-01', '1', '30000', '10')];
test('one sale: FIFO takes the 10,000 lot, LIFO the 20,000 lot, average cost 15,000; what is held keeps the other', () => {
  expect(lotResults({transactions: history}, 'fifo').get('BTC')).toEqual({coin: 'BTC', realized: '19990', heldCost: '20000', heldQuantity: '1'});
  expect(lotResults({transactions: history}, 'lifo').get('BTC')).toEqual({coin: 'BTC', realized: '9990', heldCost: '10000', heldQuantity: '1'});
  expect(realizedResults({transactions: history}).get('BTC')).toBe('14990');
});
test('a sale across lots, a fee on a buy, and an unpriced transfer in leaves what it touches unknown', () => {
  const across = [tx('buy', '2026-01-01', '1', '100', '2'), tx('buy', '2026-01-02', '2', '200'), tx('sell', '2026-01-03', '2', '300')];
  expect(lotResults({transactions: across}, 'fifo').get('BTC')).toMatchObject({realized: '298', heldCost: '200'}); // 600 − (102 + 200)
  const unpriced = [tx('transfer-in', '2026-01-01', '1'), tx('buy', '2026-01-02', '1', '100'), tx('sell', '2026-01-03', '1', '150')];
  expect(lotResults({transactions: unpriced}, 'fifo').get('BTC')).toMatchObject({realized: undefined, heldCost: '100'});
  expect(lotResults({transactions: unpriced}, 'lifo').get('BTC')).toMatchObject({realized: '50', heldCost: undefined});
  expect(() => lotResults({transactions: [tx('sell', '2026-01-01', '1', '1')]}, 'fifo')).toThrow();
});
