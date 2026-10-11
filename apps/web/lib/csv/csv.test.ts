import {describe, expect, test} from 'vitest';
import {CSV_NO_HEADER, CSV_TOO_LARGE, CSV_TOO_MANY_ROWS, detectDelimiter, parseCsv} from './parse';
import {HOLDINGS_FIELDS, TRANSACTION_FIELDS, guessMapping} from './mapping';
import {guessNumberStyle, parseNumberCell} from './numbers';
import {guessDateFormat, parseDateCell} from './dates';

// W3 and I1 (docs/product/features/W3-holdings-import.md, "Tests" 1-4): the shared CSV reader.
describe('parseCsv', () => {
  test('quotes, doubled quotes, CRLF and a byte-order mark', () => {
    expect(parseCsv('﻿a,b\r\n1,"x, y"\r\n2,"say ""hi"""\r\n')).toEqual({header: ['a', 'b'], rows: [['1', 'x, y'], ['2', 'say "hi"']], delimiter: ',', warnings: []});
  });
  test('semicolon and tab files use the detected delimiter; a line break inside quotes stays one field', () => {
    expect(parseCsv('a;b\n1;"two\nlines"\n')).toEqual({header: ['a', 'b'], rows: [['1', 'two\nlines']], delimiter: ';', warnings: []});
    expect(parseCsv('a\tb\n1\t2\n').delimiter).toBe('\t');
    expect(parseCsv('a\rb\r1\r2').header).toEqual(['a']); // CR-only line ends: one column
    expect(detectDelimiter('x;y,z\n1;2,3\n')).toBe(',');
    expect(detectDelimiter('x;y\n1;2\n')).toBe(';');
  });
  test('a ragged row is padded with a warning; a quote inside a value is kept with a warning', () => {
    const parsed = parseCsv('a,b,c\n1,2\n3,4,5\n');
    expect(parsed.rows).toEqual([['1', '2', ''], ['3', '4', '5']]);
    expect(parsed.warnings).toEqual(['Row 1 has fewer columns than the header.']);
    expect(parseCsv('a,b\n5"6,7\n')).toMatchObject({rows: [['5"6', '7']], warnings: ['Row 1 has a quote inside a value.']});
  });
  test('limits and the header', () => {
    expect(() => parseCsv('a'.repeat(2_000_001))).toThrow(CSV_TOO_LARGE);
    expect(() => parseCsv(`a\n${'1\n'.repeat(20_001)}`)).toThrow(CSV_TOO_MANY_ROWS);
    expect(() => parseCsv('')).toThrow(CSV_NO_HEADER);
    expect(() => parseCsv('\n\n')).toThrow(CSV_NO_HEADER);
    expect(parseCsv('a,b\n1,2\n\n\n').rows).toEqual([['1', '2']]);
  });
});
describe('guessMapping', () => {
  test('every transaction field is found from common headers; unknown headers guess nothing', () => {
    expect(guessMapping(['Date', 'Type', 'Pair', 'Amount', 'Price', 'Fee', 'Note'], TRANSACTION_FIELDS)).toEqual({coin: 2, kind: 1, quantity: 3, price: 4, fee: 5, date: 0, note: 6});
    expect(guessMapping(['Datum', 'Menge'], TRANSACTION_FIELDS)).toEqual({});
    expect(guessMapping(['Name', 'Symbol', 'Quantity', 'Category', 'Value', 'Currency'], HOLDINGS_FIELDS)).toEqual({name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5});
    // A column is used once: "currency" serves the coin, not also a second field.
    expect(guessMapping(['currency', 'amount'], TRANSACTION_FIELDS)).toEqual({coin: 0, quantity: 1});
  });
});
describe('numbers', () => {
  test('styles, blanks and refusals', () => {
    expect(parseNumberCell('1,234.5', 'point')).toBe('1234.5');
    expect(parseNumberCell('1.234,5', 'comma')).toBe('1234.5');
    expect(parseNumberCell('0,5', 'comma')).toBe('0.5');
    expect(parseNumberCell(' 12 ', 'point')).toBe('12');
    expect(parseNumberCell('12.500', 'point')).toBe('12.5');
    expect(parseNumberCell('', 'point')).toBeNull();
    expect(() => parseNumberCell('1e5', 'point')).toThrow('exponent');
    expect(() => parseNumberCell('-3', 'point')).toThrow('negative');
    expect(() => parseNumberCell('abc', 'point')).toThrow('not a number');
    expect(guessNumberStyle(['0,5', '12,25', ''])).toBe('comma');
    expect(guessNumberStyle(['1,234.5', '0,5'])).toBe('point');
    expect(guessNumberStyle(['1,234', '2,500'])).toBe('point');
    expect(guessNumberStyle(['12', '13.5'])).toBe('point');
  });
});
describe('dates', () => {
  test('formats, a time part, ambiguity and the future', () => {
    expect(parseDateCell('2026-10-01T12:00:00Z', 'iso')).toBe('2026-10-01');
    expect(parseDateCell('01/10/2026', 'dmy')).toBe('2026-10-01');
    expect(parseDateCell('01/10/2026', 'mdy')).toBe('2026-01-10');
    expect(parseDateCell('1.10.2026', 'dmy-dot')).toBe('2026-10-01');
    expect(parseDateCell('1 Oct 2026', 'month-name')).toBe('2026-10-01');
    expect(parseDateCell('October 1, 2026', 'month-name')).toBe('2026-10-01');
    expect(parseDateCell('31/02/2026', 'dmy')).toBeNull();
    expect(parseDateCell('', 'iso')).toBeNull();
    expect(guessDateFormat(['2026-10-01', '2026-09-30'])).toEqual({format: 'iso', ambiguous: false});
    expect(guessDateFormat(['03/04/2026', '05/06/2026'])).toEqual({format: 'dmy', ambiguous: true});
    expect(guessDateFormat(['13/04/2026', '05/06/2026'])).toEqual({format: 'dmy', ambiguous: false});
    expect(guessDateFormat(['04/13/2026'])).toEqual({format: 'mdy', ambiguous: false});
    expect(guessDateFormat(['1 Oct 2026', '2 Oct 2026'])).toEqual({format: 'month-name', ambiguous: false});
  });
});
