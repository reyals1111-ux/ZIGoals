/**
 * Session AL fourth pass (MO-007, MO-107, C-MO-01, C-DVG-35, Oct-26 "barcode provider inactive"): what a person sees when
 * a barcode lookup does not return a product. In a build with no lookup provider configured, the lookup answers 503:
 * that is said plainly, and, as for a code no database knows (404), the "Add it yourself" form opens with the code kept,
 * so a lookup never ends without a way on. `draft` is true when that form is offered.
 */
export type LookupFailure = {message: string; draft: boolean};

/**
 * Session AL fifth pass (MO-007, MO-107): a typed barcode is checked as the GTIN family it claims to be (EAN-8, UPC-A,
 * EAN-13, GTIN-14): digits only, one of those lengths, and its last digit the standard mod-10 check digit of the others.
 * The sentence to show under the field, or '' when the code can be looked up. The code is always shown as typed (the
 * lookup's own identity form, which drops leading zeros, made "0000000000000" read "Barcode 00000000").
 */
export function gtinCheckDigitOk(code: string): boolean {
  if (!/^\d+$/.test(code) || code.length < 2) return false;
  const digits = [...code].map(Number), check = digits.pop()!;
  const sum = digits.reverse().reduce((total, d, i) => total + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
export function barcodeCodeHint(text: string): string {
  const digits = text.trim();
  if (!digits) return '';
  if (!/^\d+$/.test(digits)) return 'A barcode has digits only, with no spaces.';
  if (![8, 12, 13, 14].includes(digits.length)) return `A barcode has 8, 12, 13 or 14 digits; this one has ${digits.length}.`;
  if (!gtinCheckDigitOk(digits)) return `The last digit of this ${digits.length === 8 ? 'EAN-8' : digits.length === 12 ? 'UPC' : digits.length === 13 ? 'EAN-13' : 'GTIN-14'} code does not match the others (its check digit). Check the number on the package.`;
  return '';
}
export function lookupFailure(status: number, barcode: string): LookupFailure {
  if (status === 404) return {message: `Barcode ${barcode} was not found in the food databases. Add it yourself below, or search the generic foods.`, draft: true};
  if (status === 503) return {message: `Barcode lookup is not available in this version yet, so ${barcode} could not be looked up. Add the food yourself below (the code stays with it), or search foods by name. Your private food library still works.`, draft: true};
  return {message: 'Food lookup is unavailable right now. Your private food library still works.', draft: false};
}
