import {expect, test} from 'vitest';
import {importables, markImported, quantityOf} from './wallet-import';

test('Session AI (WE20): base units to a quantity; only priced coins are offered; an imported row is found again', () => {
  expect(quantityOf('1500000', 6)).toBe('1.5'); expect(quantityOf('42', 0)).toBe('42'); expect(quantityOf('5', 8)).toBe('0.00000005');
  const obs = [{walletId: 'w1', chainId: 'zigchain-1', at: '2026-10-28T08:00:00Z', assets: [{id: 'uzig', symbol: 'ZIG', decimals: 6, amount: '250000000'}, {id: 'ibc/x', symbol: 'FOO', decimals: 6, amount: '1'}, {id: 'uzero', symbol: 'ZIG', decimals: 6, amount: '0'}]}];
  let imports = {version: 1 as const, rows: {}};
  let list = importables(obs, imports, 'p1');
  expect(list.map(i => [i.symbol, i.quantity, i.coin?.ref.id ?? null])).toEqual([['ZIG', '250', 'zignaly'], ['FOO', '0.000001', null]]);
  imports = markImported(imports, 'tx1', {walletId: 'w1', chainId: 'zigchain-1', assetId: 'uzig', portfolioId: 'p1', at: '2026-10-28T08:00:00Z'});
  list = importables(obs, imports, 'p1');
  expect(list[0]!.imported).toBe('tx1');
  expect(importables(obs, imports, 'p2')[0]!.imported).toBeUndefined();
});
