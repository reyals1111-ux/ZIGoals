import { parseUnits } from "@zigoals/chain-config";
import { normalizeDecimalInput } from "./decimal-input";

/**
 * A money or quantity amount typed into a private form (Goal targets and plans, manual valuations, prices, quantities,
 * allocations, contributions and evidence). Surrounding spaces are ignored, an unambiguous decimal comma is read as in
 * Health ("1200,50") and unambiguous grouping is read (parseLocaleAmount); "1,234" is refused with a reason. The result is exactly `parseUnits` of the canonical text, so
 * precision, limits and messages are unchanged. Chain transaction amounts keep calling `parseUnits` directly.
 */
export function parseAmountInput(raw: string, decimals: number, locale?: string): bigint {
  return parseUnits(normalizeDecimalInput(parseLocaleAmount(raw, locale)), decimals);
}

/** The device's number separators ("," and "." for en-US; "." and "," for nl-NL; a narrow space for fr-FR). */
export function numberSeparators(locale?: string): { group: string; decimal: string } {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    return { group: parts.find((p) => p.type === "group")?.value ?? ",", decimal: parts.find((p) => p.type === "decimal")?.value ?? "." };
  } catch { return { group: ",", decimal: "." }; }
}

/**
 * Session AB-Cloud Part 8 (ADR-023 C25; Session X P2.1 refused these with the text to type): a grouped amount that can be
 * read only one way is read, whatever the device's language — "3,250.40", "3.250,40", "1,234,567", "1.234.567",
 * "1 234,56" (a space or narrow space), "1'234.50" — and the form shows the plain value it read before saving (the Goal
 * preview). Ambiguous input is still never guessed: "1,234" keeps its reason (normalizeDecimalInput), and on a device whose
 * thousands separator is "." (nl, de, …) "1.234" is refused the same way instead of being read as 1.234. Returns the text
 * with the grouping removed and a comma decimal turned into a point; anything else is returned as typed.
 */
export function parseLocaleAmount(raw: string, locale?: string): string {
  const value = raw.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,3}(?:,\d{3})+)(\.\d+)?$/.exec(value)) && (m[2] || m[1]!.split(",").length > 2)) return m[1]!.replaceAll(",", "") + (m[2] ?? "");
  if ((m = /^(\d{1,3}(?:\.\d{3})+)(,\d+)?$/.exec(value)) && (m[2] || m[1]!.split(".").length > 2)) return m[1]!.replaceAll(".", "") + (m[2] ? `.${m[2].slice(1)}` : "");
  if ((m = /^(\d{1,3}(?:[ \u00a0\u202f]\d{3})+)([.,]\d+)?$/.exec(value))) return m[1]!.replace(/[ \u00a0\u202f]/g, "") + (m[2] ? `.${m[2].slice(1)}` : "");
  if ((m = /^(\d{1,3}(?:['\u2019]\d{3})+)(\.\d+)?$/.exec(value))) return m[1]!.replace(/['\u2019]/g, "") + (m[2] ?? "");
  if (/^[1-9]\d{0,2}\.\d{3}$/.test(value) && numberSeparators(locale).group === ".") {
    const [whole, fraction] = value.split(".");
    throw new Error(`“${value}” could mean ${whole}${fraction} or ${whole}.${fraction}. Type it without a thousands separator.`);
  }
  return value;
}

/** The canonical text of a typed amount ("1200,50" → "1200.50"), or the reason it would be refused on save. */
export function amountInputPreview(raw: string, decimals: number, locale?: string): { text: string } | { error: string } {
  try {
    const text = normalizeDecimalInput(parseLocaleAmount(raw, locale));
    parseUnits(text, decimals);
    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enter a non-negative decimal amount." };
  }
}
