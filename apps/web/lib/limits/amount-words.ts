/**
 * Session AL final pass (BUG-012, M-057, NB-189, DV-144, B-024, DV-003a, DV-049a, MO-121, BN-141, N-DV-16): the one set of
 * sentences for a typed amount that can't be used, wherever it is typed (Goal targets and plans, Fund Goal, Wealth's Add
 * asset, the wizard's preview). "0" and "-5" get the same sentence; letters or an exponent ("abc", "1e3") get an example of
 * what to type. The old "Enter a non-negative decimal amount." implied 0 was fine while 0 was refused, and was jargon.
 */
export const ABOVE_ZERO = 'Enter an amount above 0.';
export const UNREADABLE = 'Enter a number, like 1500 or 12.50.';
export const OVER_CAP = 'Enter an amount up to a trillion (1,000,000,000,000).';
/** The low-level parser's sentence (packages/chain-config parseUnits), which no form shows as is. */
const PARSER_SENTENCE = /non-negative decimal/i;

/** A typed text that starts with a minus sign ("-5", "−5", " -0.5"). */
export const typedNegative = (raw: string): boolean => /^\s*[-−]/.test(String(raw ?? ''));

/** The sentence to show for a refused amount: the parser's own reason when it is plain ("could mean 1234 or 1.234"), else one of the two above. */
export function amountRefusal(raw: string, said: string): string {
  if (said && !PARSER_SENTENCE.test(said)) return said;
  return typedNegative(raw) ? ABOVE_ZERO : UNREADABLE;
}
