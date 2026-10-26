import {describe, expect, it} from 'vitest';
import {formatQuantity} from './visual-format';
import {referencePriceLabel} from './product-insights';
import type {MarketQuote} from './market-quotes';

// Session AH Part 4 (TR4/B2, BUG-007, BUG-028, M17): prices follow the one price rule; quantities in lists show 8 decimals at most.
const quote = (price: string, priceDecimals: number, currency = 'USD') => ({base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, currency, price, priceDecimals, source: 'CoinGecko', observedAt: '2026-10-25T10:00:00.000Z', verification: 'VERIFIED'}) as MarketQuote;
describe('rounding (Session AH)', () => {
  it('a reference price shows its currency\'s minor digits, four significant digits below one unit', () => {
    expect(referencePriceLabel(quote('8335664376998547', 11))).toBe('$83,356.64');
    expect(referencePriceLabel(quote('33726971234567', 11))).toBe('$337.26');
    expect(referencePriceLabel(quote('4812345', 8))).toBe('$0.04812');
    expect(referencePriceLabel(quote('8335664376998547', 11, 'EUR'))).toBe('€83,356.64');
  });
  it('a quantity in a list keeps at most 8 decimals, cut, and says when it was cut', () => {
    expect(formatQuantity('0.45')).toBe('0.45');
    expect(formatQuantity('1234.567890123456789012')).toBe('≈ 1,234.56789012');
    expect(formatQuantity('2.50000000000')).toBe('2.5');
    expect(formatQuantity('-0.000000001')).toBe('≈ 0');
    expect(formatQuantity('nope')).toBe('Unavailable');
  });
});
