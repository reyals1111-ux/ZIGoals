// Session AL (Tokyo TK-009, TK-011, TK-013): what the Wealth CSV import does with metals and repeated rows.
import {expect, test} from 'vitest';
import {parseCsv} from '../csv/parse';
import {guessMapping, HOLDINGS_FIELDS} from '../csv/mapping';
import {barWeight, metalOf, planHoldingsImport} from './holdings';

const plan = (text: string) => { const file = parseCsv(text); return planHoldingsImport({rows: file.rows, mapping: guessMapping(file.header, HOLDINGS_FIELDS), numberStyle: 'point'}); };

test('TK-013: XAG is silver, never "Gold grams"; a bar’s weight comes from its name', () => {
  expect(metalOf('XAG', '')).toBe('Silver'); expect(metalOf('', 'Gold bar 100g')).toBe('Gold'); expect(metalOf('AAPL', 'Apple')).toBeNull();
  expect(barWeight('Gold bar 100g', '2')).toMatchObject({quantity: '200', unit: 'grams'});
  expect(barWeight('Silver coin 1 oz', '10')).toMatchObject({quantity: '10', unit: 'troy ounces'});
  expect(barWeight('Gold', '2')).toBeNull();
  const p = plan('Name,Asset,Quantity,Kind of asset,Value,Currency\nSilver,XAG,50,Precious metals,1200,EUR\nGold bar 100g,XAU,2,Precious metals,15000,EUR\n');
  expect(p.refused).toEqual([]);
  expect(p.ready[0]!.input).toMatchObject({category: 'Precious metals', metal: 'Silver', unit: 'grams', quantity: '50'});
  expect(p.ready[1]!.input).toMatchObject({metal: 'Gold', unit: 'grams', quantity: '200'});
  expect(p.ready[1]!.input.notes).toContain('2 × 100 grams');
});

test('TK-011/TK-009: an identical row in the same file is refused with its row number and the reason', () => {
  const p = plan('Name,Asset,Quantity,Kind of asset,Value,Currency\nApple,AAPL,10,Stocks,1850.40,USD\nApple,AAPL,10,Stocks,1850.40,USD\nBad,XYZ,1,Stocks,5,XYZ\n');
  expect(p.ready).toHaveLength(1);
  expect(p.refused.map(r => r.reason)).toEqual([
    'Row 2: the same as row 1 (name, quantity, value and currency), so it was left out to avoid counting it twice. If both are real, change one row and import again.',
    'Row 3: “XYZ” is not a currency code; use one such as EUR, USD or GBP.',
  ]);
});

test('TK-018: Wealth’s readable holdings CSV goes back in through Wealth’s own import, with the same names, kinds, quantities and values', async () => {
  const {readableHoldingsCsv} = await import('./holdings-export');
  const {manualSourcePosition} = await import('../manual-source');
  const at = '2026-10-01T10:00:00.000Z';
  const positions = [
    manualSourcePosition({category: 'Cash', name: 'EUR Cash', quantity: '1500.75', currency: 'EUR'}, 'a1', at),
    manualSourcePosition({category: 'Stocks', name: 'Apple', symbol: 'AAPL', quantity: '10', value: '1850.40', currency: 'USD'}, 'a2', at),
    manualSourcePosition({category: 'Precious metals', name: 'Silver', metal: 'Silver', unit: 'troy ounces', quantity: '50', value: '1200', currency: 'EUR'}, 'a3', at),
    manualSourcePosition({category: 'Property', name: '=House', quantity: '1', value: '350000', currency: 'EUR'}, 'a4', at),
  ];
  const text = readableHoldingsCsv({positions});
  expect(text.split('\r\n')[0]).toBe('"Name","Asset","Quantity","Kind of asset","Value","Currency","Notes"');
  expect(text).toContain('"Apple","AAPL","10","Stocks","1850.40","USD"');
  expect(text).not.toMatch(/\d{15,}/); // never 18-decimal integers or minor units
  const back = plan(text);
  // A name a spreadsheet would run ("=House") is written with the guard apostrophe and comes back as plain text.
  expect(back.ready.map(r => [r.input.name.replace(/^'/, ''), r.input.category, r.input.quantity, r.input.value ?? '', r.input.currency])).toEqual([
    ['EUR Cash', 'Cash', '1500.75', '1500.75', 'EUR'],
    ['Apple', 'Stocks', '10', '1850.4', 'USD'],
    ['Silver', 'Precious metals', '50', '1200', 'EUR'],
    ['=House', 'Property', '1', '350000', 'EUR'],
  ]);
  expect(back.ready[2]!.input).toMatchObject({metal: 'Silver', unit: 'troy ounces'});
});
