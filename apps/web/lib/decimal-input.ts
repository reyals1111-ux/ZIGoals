/**
 * Typed decimal input, read the same way everywhere (Health since QA-01/QA-09, Habits and money forms since QA-14).
 * Surrounding whitespace is ignored. A decimal comma ("1,5", "0,125") is read as a decimal point only when it cannot be
 * a thousands separator: "1,234" could mean 1234 or 1.234, so it is refused with a reason instead of guessed. Grouped or
 * mixed separators ("1,234,567", "1.234,5") are left as typed, so the caller's own pattern refuses them.
 */
export function normalizeDecimalInput(raw: string): string {
  const value = raw.trim();
  if (!value.includes(",")) return value;
  const match = /^(\d+),(\d+)$/.exec(value);
  if (!match) return value;
  const whole = match[1]!, fraction = match[2]!;
  if (fraction.length === 3 && !/^0+$/.test(whole)) throw new Error(`“${value}” could mean ${whole}${fraction} or ${whole}.${fraction}. Type it without a thousands separator.`);
  return `${whole}.${fraction}`;
}

const groupedLimit = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 6 });

/**
 * A plain number typed into a form (no exponent, no sign, no grouping). `whole` refuses decimals; `positive` refuses 0.
 * Throws an Error whose message can be shown as is.
 */
export function readFormNumber(raw: string, { min = 0, max, whole = false, positive = false }: { min?: number; max: number; whole?: boolean; positive?: boolean }): number {
  const range = positive && min <= 0 ? `greater than 0 and at most ${groupedLimit(max)}` : `from ${groupedLimit(min)} to ${groupedLimit(max)}`;
  const message = `Enter ${whole ? "a whole number" : "a number"} ${range}.`;
  if (!raw.trim()) throw new Error(message);
  const value = normalizeDecimalInput(raw);
  if (!(whole ? /^\d+$/ : /^\d+(?:\.\d+)?$/).test(value) || value.length > 30) throw new Error(message);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || positive && number <= 0) throw new Error(message);
  return number;
}

/** A number for a form field's initial text: never exponent notation ("1e-7"), never grouped. */
export function formNumberText(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
}
