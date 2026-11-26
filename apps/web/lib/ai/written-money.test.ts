import {describe, expect, it} from 'vitest';
import {writtenMoney} from './written-money';
import {writtenFigures} from '../../components/nova/chat/nova-readout';
import {withNumberLocale} from '../visual-format';

/**
 * Session AW (fr-money, FR-AW-14): ZIGi's on-device answers and NOVA's read-out write a stored amount with the same one
 * writer, so the same record reads the same in both ("€100.75", "US$2,400.00" in en-GB), and the Dutch shape is kept.
 */
const plain = (s: string) => s.replace(/[  ]/g, ' ');
describe('one money writer for ZIGi and NOVA (FR-AW-14)', () => {
  it('writes dollars and euros as the pages do, to the cent', () => {
    expect(plain(withNumberLocale('en-GB', () => writtenMoney('You spent 100.75 EUR on groceries this week.')))).toBe('You spent €100.75 on groceries this week.');
    expect(plain(withNumberLocale('en-GB', () => writtenMoney('You owe 2,400.00 USD across 1 debt')))).toBe('You owe US$2,400.00 across 1 debt');
    expect(plain(withNumberLocale('en-US', () => writtenMoney('1,250.00 USD left')))).toBe('$1,250.00 left');
  });
  it('NOVA\'s read-out gives the very same words for the same amounts', () => {
    for (const words of ['You spent 100.75 EUR on groceries this week.', 'You owe 2,400.00 USD across 1 debt', 'Room to spend: 144.40 EUR of 200.00 EUR.'])
      for (const locale of ['en-GB', 'en-US', 'nl-NL']) expect(withNumberLocale(locale, () => writtenFigures(words)), `${locale}: ${words}`).toBe(withNumberLocale(locale, () => writtenMoney(words)));
  });
  it('anything else, the Dutch shape included, stays exactly as written', () => {
    for (const words of ['€ 55,60 uitgegeven', '55,60 EUR', '1.234,56 EUR', '950.00 GBP', '12.5 EUR', '1,200 ZIG staked', '435.599 EUR', 'No figures here.', '2026-12-01'])
      expect(writtenMoney(words), words).toBe(words);
  });
});
