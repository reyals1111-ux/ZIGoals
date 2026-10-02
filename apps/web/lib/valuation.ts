import { formatUnits, TESTNET } from "@zigoals/chain-config";
// Deliberately separate from transfer accounting. No market prices or oracle claims.
export const DemoPriceProvider = {
  label: "Simulated ZIG",
  /**
   * The simulated ZIG a legacy Goal holds. Simulated ZIG has no price, so its value in EUR or USD is unknown: null,
   * never a 1:1 conversion (QA-37, Session I, Part 10).
   */
  value(baseUnits: string, currency: "EUR" | "USD" | "ZIG"): string | null {
    return currency === "ZIG" ? formatUnits(baseUnits, TESTNET.nativeAsset.decimals) : null;
  },
};
