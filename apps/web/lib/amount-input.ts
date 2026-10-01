import { parseUnits } from "@zigoals/chain-config";
import { normalizeDecimalInput } from "./decimal-input";

/**
 * A money or quantity amount typed into a private form (Goal targets and plans, manual valuations, prices, quantities,
 * allocations, contributions and evidence). Surrounding spaces are ignored and an unambiguous decimal comma is read as
 * in Health ("1200,50"); "1,234" is refused with a reason. The result is exactly `parseUnits` of the canonical text, so
 * precision, limits and messages are unchanged. Chain transaction amounts keep calling `parseUnits` directly.
 */
export function parseAmountInput(raw: string, decimals: number): bigint {
  return parseUnits(normalizeDecimalInput(raw), decimals);
}

/** The canonical text of a typed amount ("1200,50" → "1200.50"), or the reason it would be refused on save. */
export function amountInputPreview(raw: string, decimals: number): { text: string } | { error: string } {
  try {
    const text = normalizeDecimalInput(raw);
    parseUnits(text, decimals);
    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enter a non-negative decimal amount." };
  }
}
