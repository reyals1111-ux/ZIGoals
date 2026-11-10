import { parseLocaleAmount } from "../amount-input";
import { normalizeDecimalInput } from "../decimal-input";

/**
 * Session AL (3f, TK-003): one reader for every number a person types — forms, Quick add, ZIGi/NOVA confirm cards, the
 * Checklist and imports. It reads the same text the same way everywhere:
 * - a decimal comma or point: "1234,5", "0,5", ",5", "1234.5";
 * - unambiguous grouping: "1.234,56", "1,234.56", "1 234,56" (any space), "1'234.56" (an apostrophe), "1,234,567";
 * - an ambiguous text is refused with a sentence, never guessed: "1,234" (1234 or 1.234?), and "1.234" on a device whose
 *   thousands separator is a point (de, nl…);
 * - no exponent, no letters, no currency signs; a sign only with `allowNegative`.
 * `text` is the canonical decimal ("1234.56", digits exactly as typed) for exact money (parseUnits); `value` is the Number.
 */
export type ParsedNumber = { ok: true; value: number; text: string; error: null } | { ok: false; value: null; text: null; error: string };
export type ParseNumberOptions = {
  /** Read a comma as the decimal sign when it cannot be a thousands separator (default true). */
  allowDecimalComma?: boolean;
  /** Accept a leading "-" or "−" (default false: amounts, weights and counts are never negative). */
  allowNegative?: boolean;
  /** The device's locale, for "1.234" (default: the runtime's). */
  locale?: string;
};
const MAX_DIGITS = 30;
const fail = (error: string): ParsedNumber => ({ ok: false, value: null, text: null, error });

export function parseNumberInput(raw: string | number, { allowDecimalComma = true, allowNegative = false, locale }: ParseNumberOptions = {}): ParsedNumber {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return fail("Enter a number.");
    if (raw < 0 && !allowNegative) return fail("Enter a number that is not negative.");
    return { ok: true, value: raw, text: plainText(raw), error: null };
  }
  // Thin and narrow no-break spaces, the typographic apostrophe and the Unicode minus are what phones and copied text bring.
  let value = String(raw ?? "").replace(/[   ]/g, " ").replace(/[’ʼ]/g, "'").replace(/^\s*−/, "-").trim();
  if (!value) return fail("Enter a number.");
  let negative = false;
  if (/^[+-]/.test(value)) {
    negative = value.startsWith("-");
    if (negative && !allowNegative) return fail("Enter a number that is not negative.");
    value = value.slice(1).trim();
  }
  if (/[eE]/.test(value)) return fail(`Write “${String(raw).trim()}” as a plain number, like 1500 or 0.5.`);
  if (!allowDecimalComma && /,/.test(value) && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value)) return fail("Use a point for decimals, like 0.5.");
  let text: string;
  try {
    text = normalizeDecimalInput(parseLocaleAmount(value, locale));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Type it without a thousands separator.");
  }
  if (/^\.\d+$/.test(text)) text = `0${text}`;
  if (/^,\d+$/.test(text)) text = `0.${text.slice(1)}`;
  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    return fail(/[.,'\s].*[.,'\s]/.test(value) ? `“${String(raw).trim()}” mixes separators in a way that can’t be read. Type it like 1234.56.` : "Enter a number, like 1500 or 0.5.");
  }
  if (text.replace(".", "").length > MAX_DIGITS) return fail(`Use at most ${MAX_DIGITS} digits.`);
  const number = Number(text);
  if (!Number.isFinite(number)) return fail("Enter a smaller number.");
  const signed = negative && number !== 0;
  return { ok: true, value: signed ? -number : number, text: signed ? `-${text}` : text, error: null };
}

/** A Number as plain decimal text, never exponent notation ("1e-7" → "0.0000001"). */
function plainText(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e21) return String(value);
  return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
}
