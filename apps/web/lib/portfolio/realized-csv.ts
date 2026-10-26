import {csvSafeCell} from '../export/csv-safe';
import {PortfolioDecimal} from './math';
import {realizedSales} from './performance';
import type {PortfolioData} from './schema';

/**
 * Session AH (WE18): realised gains per year "for your accountant", from the person's own sales with the app's average-cost
 * rules. Real portfolios only (a hypothetical one is planning). One row per sale (and per fee on a transfer out), then a
 * total per year, portfolio and currency. A cost that is unknown stays empty and that year's total says so, never 0.
 * Plain decimals stay numbers (a loss is "-12.5", not text); every other cell goes through the one CSV formula guard.
 */
const NUMBER = /^-?\d+(\.\d+)?$/;
const cell = (value: string | undefined) => value !== undefined && NUMBER.test(value) ? value : csvSafeCell(value ?? '');
export const REALIZED_HEADER = ['Year', 'Date', 'Portfolio', 'Coin', 'Symbol', 'Type', 'Quantity', 'Proceeds', 'Fee', 'Cost basis (average cost)', 'Realised result', 'Currency'] as const;

export function realizedGainsRows(data: PortfolioData): string[][] {
  const rows: string[][] = [];
  for (const portfolio of data.portfolios) {
    if (portfolio.kind !== 'real') continue;
    const coins = new Map(portfolio.coins.map(c => [`${c.ref.provider}:${c.ref.kind}:${c.ref.id}`, c]));
    const byYear = new Map<string, ReturnType<typeof realizedSales>>();
    for (const sale of realizedSales(portfolio)) byYear.set(sale.date.slice(0, 4), [...byYear.get(sale.date.slice(0, 4)) ?? [], sale]);
    for (const [year, sales] of [...byYear].sort(([a], [b]) => a.localeCompare(b))) {
      for (const s of sales) {
        const coin = coins.get(s.coin);
        rows.push([year, s.date, portfolio.name, coin?.name ?? s.coin, coin?.symbol ?? '', s.kind === 'sell' ? 'Sell' : 'Transfer fee', s.quantity, s.proceeds, s.fee, s.cost ?? '', s.result ?? '', portfolio.currency]);
      }
      const known = sales.every(s => s.result !== undefined);
      const total = known ? sales.reduce((sum, s) => sum.plus(s.result!), new PortfolioDecimal(0)).toFixed() : '';
      rows.push([year, '', portfolio.name, known ? `Total ${year}` : `Total ${year}: unknown (a sold coin's cost is not recorded)`, '', '', '', '', '', '', total, portfolio.currency]);
    }
  }
  return rows;
}

export function realizedGainsCsv(data: PortfolioData): string {
  return [REALIZED_HEADER.map(h => csvSafeCell(h)).join(','), ...realizedGainsRows(data).map(row => row.map(cell).join(','))].join('\r\n');
}
