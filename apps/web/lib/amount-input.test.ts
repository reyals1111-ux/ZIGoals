import { parseUnits } from "@zigoals/chain-config";
import { describe, expect, it } from "vitest";
import { amountInputPreview, parseAmountInput } from "./amount-input";
import { manualSourcePosition } from "./manual-source";
import { saveAprAssumption } from "./owner-preview";
import { emptyPlatform, positionSchema } from "./positions";

describe("private amount fields (QA-14)", () => {
  it("read a decimal comma and surrounding spaces exactly as parseUnits reads the canonical text", () => {
    expect(parseAmountInput("1200,50", 2)).toBe(120050n);
    expect(parseAmountInput(" 1000 ", 2)).toBe(100000n);
    expect(parseAmountInput("0,125", 18)).toBe(parseUnits("0.125", 18));
    expect(() => parseAmountInput("1,234", 2)).toThrow("“1,234” could mean 1234 or 1.234");
    // Session X P2.1: a grouped amount is still refused, now with the reason and the text to type.
    expect(() => parseAmountInput("1.234,5", 2)).toThrow("Type “1.234,5” without the thousands separator: 1234,5.");
    expect(() => parseAmountInput("3,250.40", 2)).toThrow("Type “3,250.40” without the thousands separator: 3250.40.");
    expect(() => parseAmountInput("1,234,567", 2)).toThrow("Type “1,234,567” without the thousands separator: 1234567.");
    expect(() => parseAmountInput("1,999", 2)).toThrow("could mean");
    expect(() => parseAmountInput("1,995", 0)).toThrow("could mean");
    expect(() => parseAmountInput("1,5", 0)).toThrow("Use at most 0 decimal places.");
  });
  it("leave chain amounts strict: parseUnits itself is unchanged", () => {
    expect(() => parseUnits("1200,50", 2)).toThrow("Enter a non-negative decimal amount.");
    expect(() => parseUnits(" 1000 ", 2)).toThrow("Enter a non-negative decimal amount.");
  });
  it("preview exactly what saving reads, or the reason it refuses", () => {
    expect(amountInputPreview("1200,50", 2)).toEqual({ text: "1200.50" });
    expect(amountInputPreview(" 1000 ", 2)).toEqual({ text: "1000" });
    expect(amountInputPreview("1,234", 2)).toEqual({ error: "“1,234” could mean 1234 or 1.234. Type it without a thousands separator." });
    expect(amountInputPreview("12.345", 2)).toEqual({ error: "Use at most 2 decimal places." });
  });
  it("apply to manual valuations and APR assumptions", () => {
    const cash = manualSourcePosition({ category: "Cash", name: "Comma savings", quantity: " 1250,75 ", currency: "EUR", symbol: "", metal: "", unit: "", value: "", notes: "" });
    expect(cash.quantity).toBe("1250750000000000000000");
    const base = { ...emptyPlatform(), positions: [positionSchema.parse({ id: "n", providerId: "native-zig", sourceType: "NATIVE_STAKING", network: "zigchain-1", account: "fictional-account", asset: "ZIG", denom: "uzig", decimals: 6, quantity: "1", verification: "VERIFIED_READ_ONLY", sync: "CURRENT", observedAt: "2026-09-30T10:00:00.000Z", liquidity: "BONDED", provenance: "Fictional test data" })] };
    expect(saveAprAssumption(base, "zigchain-1", "fictional-account", " 5,5 ").aprAssumptions).toEqual([{ network: "zigchain-1", account: "fictional-account", percent: "5.5" }]);
  });
});
