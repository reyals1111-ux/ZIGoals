import { expect, test } from "vitest";
import {
  BASE_FEE_TOO_HIGH,
  BASE_FEE_UNREADABLE,
  GAS_PRICE_FLOOR,
  NETWORK_UPGRADED,
  NetworkUpgradedError,
  checkVersion,
  decodeBaseFeeResponse,
  parseBaseFee,
  quotedGasPrice,
  requireReviewedVersion,
  reviewedVersionPattern,
} from "./reviewed-versions";

// Session AJ (ADR-035 D1, P2, P3, P5).
test.each([
  ["zig-test-2", "v5.1.2", "fixed"],
  ["zig-test-2", "v6.0.0", "base-fee"],
  ["zig-test-2", "v6.0.3", "base-fee"],
  ["zigchain-1", "v5.1.2", "fixed"],
  ["zigchain-1", "v6.0.0", "base-fee"],
  ["zigchain-1", "v6.0.3", "base-fee"],
])("%s accepts %s (%s)", (chainId, version, fee) => {
  expect(checkVersion(chainId, version)).toEqual({ ok: true, version, fee });
});
test.each([
  ["zig-test-2", "v6.1.0"], ["zig-test-2", "v7.0.0"], ["zigchain-1", "v6.1.0"], ["zigchain-1", "v7.0.0"], ["zigchain-1", "v10.0.0"],
])("%s refuses the newer line %s as upgraded", (chainId, version) => {
  expect(checkVersion(chainId, version)).toEqual({ ok: false, reason: "upgraded", version });
  expect(() => requireReviewedVersion(chainId, version, "changed")).toThrow(NETWORK_UPGRADED);
  try { requireReviewedVersion(chainId, version, "changed"); } catch (e) { expect((e as NetworkUpgradedError).version).toBe(version); }
});
test.each(["v5.0.9", "v5.2.0", "v4.9.9", "v6.0.0-rc1", "v6.0", "6.0.0", "v6.0.0 ", "", null, undefined, 600, "v99999.0.0"])(
  "refuses %j as unknown (the caller's old words)",
  (version) => {
    expect(checkVersion("zig-test-2", version)).toEqual({ ok: false, reason: "unknown" });
    expect(() => requireReviewedVersion("zig-test-2", version, "changed")).toThrow("changed");
  },
);
test("an unknown chain id is never reviewed", () => {
  expect(checkVersion("zig-test-3", "v6.0.0")).toEqual({ ok: false, reason: "unknown" });
  expect(checkVersion(undefined, "v6.0.0")).toEqual({ ok: false, reason: "unknown" });
});
test("the verifier's pattern matches every reviewed patch and nothing past it", () => {
  const re = new RegExp(`^(?:${reviewedVersionPattern("zig-test-2")})$`);
  for (const v of ["v5.1.0", "v5.1.2", "v5.1.12", "v6.0.0", "v6.0.3"]) expect(re.test(v)).toBe(true);
  for (const v of ["v6.1.0", "v7.0.0", "v5.0.9", "v6.0.0-rc1", "v6.0"]) expect(re.test(v)).toBe(false);
});
test("the base fee parses from both of the chain's forms, rounded up to whole azig", () => {
  expect(parseBaseFee("2500000000.000000000000000000", "decimal")).toBe(2_500_000_000n);
  expect(parseBaseFee("2500000000.000000000000000001", "decimal")).toBe(2_500_000_001n);
  expect(parseBaseFee("2500000000000000000000000000", "scaled")).toBe(2_500_000_000n);
  expect(parseBaseFee("2500000000000000000000000001", "scaled")).toBe(2_500_000_001n);
  for (const bad of ["", "-1", "1e9", "abc", "0", "0.000", null, 25, "1".repeat(81)]) expect(() => parseBaseFee(bad, "decimal")).toThrow(BASE_FEE_UNREADABLE);
  expect(() => parseBaseFee("0", "scaled")).toThrow(BASE_FEE_UNREADABLE);
  expect(() => parseBaseFee("2500000000001", "decimal")).toThrow(BASE_FEE_TOO_HIGH);
});
test("the quoted gas price: the floor on v5; max(floor, ceil(base fee × 1.5)) on v6", () => {
  expect(quotedGasPrice("fixed")).toBe(GAS_PRICE_FLOOR);
  expect(quotedGasPrice("fixed", 9_000_000_000n)).toBe(GAS_PRICE_FLOOR);
  expect(quotedGasPrice("base-fee", 2_500_000_000n)).toBe(3_750_000_000n);
  expect(quotedGasPrice("base-fee", 1_000_000_000n)).toBe(GAS_PRICE_FLOOR);
  expect(quotedGasPrice("base-fee", 3n)).toBe(GAS_PRICE_FLOOR);
  expect(quotedGasPrice("base-fee", 10_000_000_001n)).toBe(15_000_000_002n);
  expect(() => quotedGasPrice("base-fee")).toThrow(BASE_FEE_UNREADABLE);
  expect(() => quotedGasPrice("base-fee", 0n)).toThrow(BASE_FEE_UNREADABLE);
});
test("the RPC answer zig-test-2 gave on 29 Oct decodes to its base fee", () => {
  // abci_query /cosmos.evm.feemarket.v1.Query/BaseFee at height 8460194, value as returned (base64).
  const bytes = Uint8Array.from(atob("ChwyNTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw"), (c) => c.charCodeAt(0));
  expect(decodeBaseFeeResponse(bytes)).toBe("2500000000000000000000000000");
  expect(parseBaseFee(decodeBaseFeeResponse(bytes), "scaled")).toBe(2_500_000_000n);
  for (const bad of [new Uint8Array(), Uint8Array.of(0x12, 1, 0x31), Uint8Array.of(0x0a, 5, 0x31), Uint8Array.of(0x0a, 0)]) expect(() => decodeBaseFeeResponse(bad)).toThrow(BASE_FEE_UNREADABLE);
});
test("gas prices read as Gazig", async () => {
  const { formatGazig } = await import("./reviewed-versions");
  expect(formatGazig(2_500_000_000n)).toBe("2.5 Gazig");
  expect(formatGazig(3_750_000_000n)).toBe("3.75 Gazig");
  expect(formatGazig(15_000_000_002n)).toBe("15.001 Gazig");
  expect(formatGazig(25_000_000_000n)).toBe("25 Gazig");
});
