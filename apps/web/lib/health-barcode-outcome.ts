/**
 * Session AL fourth pass (MO-007, MO-107, C-MO-01, C-DVG-35, Oct-26 "barcode provider inactive"): what a person sees when
 * a barcode lookup does not return a product. In a build with no lookup provider configured, the lookup answers 503:
 * that is said plainly, and, as for a code no database knows (404), the "Add it yourself" form opens with the code kept,
 * so a lookup never ends without a way on. `draft` is true when that form is offered.
 */
export type LookupFailure = {message: string; draft: boolean};
export function lookupFailure(status: number, barcode: string): LookupFailure {
  if (status === 404) return {message: `Barcode ${barcode} was not found in the food databases. Add it yourself below, or search the generic foods.`, draft: true};
  if (status === 503) return {message: `Barcode lookup is not available in this version yet, so ${barcode} could not be looked up. Add the food yourself below (the code stays with it), or search foods by name. Your private food library still works.`, draft: true};
  return {message: 'Food lookup is unavailable right now. Your private food library still works.', draft: false};
}
