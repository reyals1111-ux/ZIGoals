import {describe, expect, test} from 'vitest';
import {BitArray, Code128Reader, EAN13Reader, MultiFormatOneDReader, type OneDReader} from '@zxing/library';
import {CODE128, CODE128_STOP, barRuns, checkDigit, code128Values, encodeBars, formatFromScan, guessFormat, withCheck} from './barcode';
import {storeCardsSchema} from './schema';
import {addCard, removeCard, renameCard} from './cards';

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty cards): ZIGoals' own barcode encoder, checked by decoding its bars
 * with the reader already installed (@zxing/library, the food scanner's decoder) — so a till scanner reads what we draw.
 */
const row = (modules: readonly boolean[], scale = 2) => {
  const quiet = 12 * scale, out = new BitArray(modules.length * scale + quiet * 2);
  modules.forEach((bar, i) => { if (bar) for (let k = 0; k < scale; k++) out.set(quiet + i * scale + k); });
  return out;
};
const read = (reader: Pick<OneDReader, 'decodeRow'>, modules: readonly boolean[]) => reader.decodeRow(0, row(modules), new Map()).getText();
const bars = (n: string, f: Parameters<typeof encodeBars>[1]) => { const r = encodeBars(n, f); if (!r.ok) throw new Error(r.problem); return r.bars; };

describe('the Code 128 table', () => {
  test('106 symbols of 11 modules each, all different; the stop is 13', () => {
    expect(CODE128).toHaveLength(106);
    for (const s of CODE128) expect([...s].reduce((a, b) => a + Number(b), 0), s).toBe(11);
    expect(new Set(CODE128).size).toBe(106);
    expect([...CODE128_STOP].reduce((a, b) => a + Number(b), 0)).toBe(13);
  });
  test('set C for runs of digits, set B for the rest, with its checksum', () => {
    expect(code128Values('123456')).toEqual([105, 12, 34, 56, (105 + 12 + 34 * 2 + 56 * 3) % 103]);
    expect(code128Values('AB')).toEqual([104, 33, 34, (104 + 33 + 34 * 2) % 103]);
    expect(code128Values('12345').slice(0, 5)).toEqual([105, 12, 34, 100, 21]);
    expect(() => code128Values('é')).toThrow();
  });
});

describe('the bars decode with the installed reader', () => {
  test.each(['LIB-00042', '1234567890', '12345', 'Bonus 2620 0012 3456', 'A1', '9'])('Code 128 "%s"', text => {
    expect(read(new Code128Reader(), bars(text, 'code128').modules)).toBe(text);
  });
  test('EAN-13, EAN-8 and UPC-A, the check digit added or checked', () => {
    expect(withCheck('400638133393', 13)).toBe('4006381333931');
    expect(withCheck('4006381333932', 13)).toBeNull();
    expect(checkDigit('9638507')).toBe(4);
    expect(bars('4006381333931', 'ean13').modules).toHaveLength(95);
    expect(read(new EAN13Reader(), bars('4006381333931', 'ean13').modules)).toBe('4006381333931');
    expect(read(new EAN13Reader(), bars('262000123456', 'ean13').modules)).toBe(`262000123456${checkDigit('262000123456')}`);
    expect(read(new MultiFormatOneDReader(new Map()), bars('96385074', 'ean8').modules)).toBe('96385074');
    expect(read(new MultiFormatOneDReader(new Map()), bars('03600029145', 'upca').modules)).toBe('036000291452');
    const no = encodeBars('12345', 'ean13');
    expect(no.ok ? '' : no.problem).toContain('Choose Code 128 or QR code instead');
  });
  test('the format guessed from the number, and from a scanner\'s name; bar runs for the drawing', () => {
    expect(guessFormat('4006381333931')).toBe('ean13'); expect(guessFormat('036000291452')).toBe('upca'); expect(guessFormat('96385074')).toBe('ean8'); expect(guessFormat('4006381333932')).toBe('code128');
    expect(formatFromScan('ean_13')).toBe('ean13'); expect(formatFromScan('CODE_128')).toBe('code128'); expect(formatFromScan('qr_code')).toBe('qr'); expect(formatFromScan('aztec')).toBeNull();
    expect(barRuns([true, true, false, true, false, false, true])).toEqual([[0, 2], [3, 1], [6, 1]]);
  });
});

describe('the cards record', () => {
  test('added (at most 50, the number checked against its format), renamed, removed', () => {
    let r = addCard({version: 1, cards: []}, {name: 'Albert Heijn Bonus', number: '262000123456', format: 'ean13'}, 'c1', '2026-11-20T10:00:00.000Z');
    r = addCard(r, {name: 'Library', number: 'LIB-00042', format: 'code128', note: 'Back door'}, 'c2', '2026-11-20T10:00:00.000Z');
    expect(storeCardsSchema.parse(r)).toEqual(r);
    expect(r.cards[0]!.number).toBe(`262000123456${checkDigit('262000123456')}`);
    expect(() => addCard(r, {name: 'Bad', number: '12', format: 'ean13'}, 'c3', '2026-11-20T10:00:00.000Z')).toThrow('EAN-13');
    expect(() => addCard(r, {name: ' ', number: '12', format: 'code128'}, 'c3', '2026-11-20T10:00:00.000Z')).toThrow('name');
    expect(renameCard(r, 'c2', 'City library').cards[1]!.name).toBe('City library');
    expect(removeCard(r, 'c1').cards.map(c => c.id)).toEqual(['c2']);
  });
});
