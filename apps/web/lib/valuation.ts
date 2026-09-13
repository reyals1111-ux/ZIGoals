import Decimal from "decimal.js";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
// Deliberately separate from transfer accounting. No market prices or oracle claims.
export const DemoPriceProvider = {
  label: "Demo valuation",
  value(baseUnits: string, currency: "EUR" | "USD" | "ZIG"): string {
    const zig = formatUnits(baseUnits, TESTNET.nativeAsset.decimals);
    return currency === "ZIG" ? zig : new Decimal(zig).mul("1").toFixed();
  },
};
