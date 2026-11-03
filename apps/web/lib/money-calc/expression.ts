/**
 * Session AK (BUILD list 2 #19, COMPETITORS_2: Actual 26.7): a calculator in the money amount field. In the money log's
 * and the budgets' amount fields only (never a chain amount, never a `parseUnits` path), "12,50+3,20" or "3*4.99" shows
 * "= 15.70" and that amount is the one saved. A hand-written parser: digits with a decimal comma or point (at most two
 * decimals in each number), + − × ÷ (also - * x / :) with × and ÷ before + and −, no brackets, no `eval`, no `Function`.
 * Arithmetic is exact (fractions of BigInts); only the result is rounded, half away from zero, to two decimals.
 * Division by zero, an amount at or below zero and anything else unreadable are refused with a plain reason.
 */
export const MAX_EXPRESSION_LENGTH = 80, MAX_NUMBERS = 20;
export const RESULT_MAX_CENTS = 100_000_000_000n; // a billion, as the money log allows
type Fraction = {n: bigint; d: bigint};
export type CalcResult = {ok: true; text: string; cents: bigint} | {ok: false; reason: string};

const OPERATOR: Record<string, '+' | '-' | '*' | '/'> = {'+': '+', '-': '-', '−': '-', '–': '-', '*': '*', '×': '*', 'x': '*', 'X': '*', '·': '*', '/': '/', '÷': '/', ':': '/'};
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const norm = ({n, d}: Fraction): Fraction => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return {n: n / g, d: d / g}; };
const apply = (a: Fraction, op: '+' | '-' | '*' | '/', b: Fraction): Fraction | null => {
  if (op === '+') return norm({n: a.n * b.d + b.n * a.d, d: a.d * b.d});
  if (op === '-') return norm({n: a.n * b.d - b.n * a.d, d: a.d * b.d});
  if (op === '*') return norm({n: a.n * b.n, d: a.d * b.d});
  return b.n === 0n ? null : norm({n: a.n * b.d, d: a.d * b.n});
};

/** True when the text is a sum to work out (an operator between two numbers), not a plain amount. */
export function isExpression(raw: string): boolean {
  return /\d\s*[-+−–*×xX·/÷:]\s*\d/.test(raw.trim());
}

/** The most digits before the decimal mark in one number (a billion has 10). */
export const MAX_WHOLE_DIGITS = 10;
const TOO_LONG = `Keep each number to ${MAX_WHOLE_DIGITS} digits or fewer before the decimal mark.`;
const TOO_LARGE = 'That amount is too large: keep it at a billion or less.';
/**
 * Reads "12,5" or "3.99" (at most two decimals) as a fraction; null when it is not a plain number. Session AK lane EXF
 * (EX-9): a number with more than 10 digits is a number too long, not "not a number", so it gets its own reason.
 */
function number(text: string): Fraction | null | 'decimals' | 'digits' {
  const m = /^(\d+)(?:[.,](\d{1,}))?$/.exec(text);
  if (!m) return null;
  if (m[1]!.length > MAX_WHOLE_DIGITS) return 'digits';
  if ((m[2] ?? '').length > 2) return 'decimals';
  const frac = (m[2] ?? '').padEnd(2, '0');
  return norm({n: BigInt(m[1]!) * 100n + BigInt(frac), d: 100n});
}

/** Works out the sum, or says plainly why it cannot. */
export function evaluateAmount(raw: string): CalcResult {
  const text = raw.trim().replace(/\s+/g, '');
  if (!text) return {ok: false, reason: 'Enter an amount.'};
  if (text.length > MAX_EXPRESSION_LENGTH) return {ok: false, reason: `Keep the sum under ${MAX_EXPRESSION_LENGTH} characters.`};
  // Numbers and operators, alternating; a leading or trailing operator, two in a row or any other sign is refused.
  const parts = text.split(/([-+−–*×xX·/÷:])/).filter(p => p !== '');
  const values: Fraction[] = [], ops: ('+' | '-' | '*' | '/')[] = [];
  for (const [i, part] of parts.entries()) {
    if (i % 2 === 0) {
      const v = number(part);
      if (v === 'decimals') return {ok: false, reason: 'Use at most two decimals in each number.'};
      if (v === 'digits') return {ok: false, reason: TOO_LONG};
      if (!v) return {ok: false, reason: 'Use only numbers and + − × ÷.'};
      values.push(v);
    } else {
      const op = OPERATOR[part];
      if (!op) return {ok: false, reason: 'Use only numbers and + − × ÷.'};
      ops.push(op);
    }
  }
  if (!values.length || values.length !== ops.length + 1) return {ok: false, reason: 'Finish the sum with a number.'};
  if (values.length > MAX_NUMBERS) return {ok: false, reason: `Use at most ${MAX_NUMBERS} numbers.`};
  // × and ÷ first, left to right; then + and −, left to right.
  const terms: Fraction[] = [values[0]!], signs: ('+' | '-')[] = [];
  for (const [i, op] of ops.entries()) {
    const next = values[i + 1]!;
    if (op === '*' || op === '/') {
      const v = apply(terms.at(-1)!, op, next);
      if (!v) return {ok: false, reason: 'A number cannot be divided by zero.'};
      terms[terms.length - 1] = v;
    } else { signs.push(op); terms.push(next); }
  }
  let total = terms[0]!;
  for (const [i, sign] of signs.entries()) total = apply(total, sign, terms[i + 1]!)!;
  // Rounded to cents, half away from zero.
  const scaled = total.n * 100n, whole = scaled / total.d, rest = scaled % total.d;
  const cents = 2n * (rest < 0n ? -rest : rest) >= total.d ? whole + (scaled < 0n ? -1n : 1n) : whole;
  if (cents <= 0n) return {ok: false, reason: 'The result is not above zero.'};
  if (cents > RESULT_MAX_CENTS) return {ok: false, reason: 'The result is above a billion.'};
  return {ok: true, cents, text: `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`};
}

/**
 * What an amount field holds once read: a sum's result ("12,50+3,20" → "15.70"), or the text as typed when it is not a
 * sum (the field's own reading then applies, unchanged). `null` when it is a sum that cannot be worked out.
 */
export function resolveAmountText(raw: string): string | null {
  if (!isExpression(raw)) return raw;
  const out = evaluateAmount(raw);
  return out.ok ? out.text : null;
}

/**
 * Session AK lane EXF (EX-9): why an amount field's text cannot be saved, when the reason is the sum or the size; null when
 * the field's own message fits (empty, zero, below zero, letters). A sum gets its own reason; a plain amount that is only
 * too long or above a billion is told so, instead of "with at most two decimals".
 */
export function amountProblem(raw: string): string | null {
  if (isExpression(raw)) { const out = evaluateAmount(raw); return out.ok ? null : out.reason; }
  const v = number(raw.trim().replace(/\s+/g, ''));
  if (v === 'digits') return TOO_LARGE;
  if (v && v !== 'decimals' && v.n > RESULT_MAX_CENTS * v.d / 100n) return TOO_LARGE;
  return null;
}
