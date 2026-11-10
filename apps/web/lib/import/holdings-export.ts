import {formatUnits} from '@zigoals/chain-config';
import {csvSafeCell} from '../export/csv-safe';
import type {Platform, Position} from '../positions';

/**
 * Session AL (TK-018, P15, C-TK-02): Wealth's holdings as a person reads them and as Wealth's own CSV import takes them
 * back: the import template's columns (Name, Asset, Quantity, Kind of asset, Value, Currency, Notes), quantities and
 * values as plain decimals ("0.5", "1850.40"), never stored minor units or 18-decimal integers. An asset priced from the
 * market has no stored value: its Value is empty and its quote currency is kept, so a re-import adds it as a manual
 * holding the person values (a CSV row cannot carry a market link). Archived assets are left out.
 */
export const READABLE_HOLDINGS_FILE = 'wealth-holdings.csv';
export const READABLE_HOLDINGS_HEADER = ['Name', 'Asset', 'Quantity', 'Kind of asset', 'Value', 'Currency', 'Notes'] as const;
const KIND: Record<string, string> = {Cash: 'Cash', Crypto: 'Crypto', Stablecoins: 'Stablecoins', Stocks: 'Stocks', 'Precious Metals': 'Precious metals', Property: 'Property', Custom: 'Custom asset'};
/** A decimal without trailing zeros after the point ("0.500000" → "0.5", "12.00" → "12"). */
const plain = (text: string) => text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
export function readableHoldingRow(p: Position): string[] {
  const quantity = plain(formatUnits(p.quantity, p.decimals));
  // Money keeps its two decimals ("1850.40"), as a person types it.
  const value = p.valuation ? (([whole, fraction = '']) => `${whole}.${fraction.padEnd(2, '0')}`)(formatUnits(p.valuation.value, p.valuation.decimals).split('.')) : '';
  const currency = p.valuation?.currency ?? p.quoteCurrency ?? 'USD';
  const kind = KIND[p.assetClass ?? ''] ?? 'Custom asset';
  // A property or custom asset carries "UNIT" as its code; the template leaves Asset empty for them.
  const asset = p.asset === 'UNIT' ? '' : p.asset;
  return [p.providerId, asset, quantity, kind, value, currency, p.notes ?? ''];
}
export function readableHoldingsCsv(platform: Pick<Platform, 'positions'>): string {
  const rows = platform.positions.filter(p => !p.archivedAt).map(readableHoldingRow);
  return [READABLE_HOLDINGS_HEADER as readonly string[], ...rows].map(row => row.map(csvSafeCell).join(',')).join('\r\n') + '\r\n';
}
