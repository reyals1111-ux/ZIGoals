import {formatMoney} from '../visual-format';

/**
 * Session AW (fr-money, FR-AW-14): the one way an on-device answer's stored money shape reaches the eye, in ZIGi and NOVA
 * alike. The answers keep their figures in the plain stored form a model also reads ("2,400.00 USD", "100.75 EUR"); on
 * screen they are written the way the app's pages write money in the display locale ("US$2,400.00" or "$2,400.00",
 * "€100.75"), with formatMoney. NOVA's read-out did this alone (components/nova/chat/nova-readout.tsx writtenFigures, which
 * now calls this), so ZIGi said "100.75 EUR" where NOVA said "€100.75" for the same record.
 * For the eye only: the turn's own text (what is kept, copied and shared) is unchanged, the value is the same to the cent,
 * and anything that is not exactly "<amount with two decimals> USD|EUR" in the English shape — another currency, a token
 * amount, a Dutch "55,60 EUR", which a Dutch answer already writes as "€ 55,60" — stays as it is written.
 */
const STORED_AMOUNT = /(?<![\d.,])(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2}) (USD|EUR)\b/g;
export function writtenMoney(words: string): string {
  if (!/\d/.test(words)) return words;
  return words.replace(STORED_AMOUNT, (all, whole: string, cents: string, code: string) => { const out = formatMoney(`${whole.replace(/,/g, '')}.${cents}`, code); return out === 'Unavailable' ? all : out; });
}
