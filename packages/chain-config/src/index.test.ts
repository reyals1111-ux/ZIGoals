import { expect, test } from "vitest";
import {
  parseUnits,
  formatUnits,
  safeMaximum,
  TESTNET,
  assertTestnet,
  validateNetworkConfig,
} from "./index";
test("base units preserve single atomic unit at 18 decimals", () => {
  expect(parseUnits("1.000000000000000001", 18)).toBe(1000000000000000001n);
  expect(formatUnits("1000000000000000001", 18)).toBe("1.000000000000000001");
});
test("same conversion supports old denomination without global assumption", () => {
  expect(parseUnits("12.000001", 6)).toBe(12000001n);
  expect(formatUnits("12000001", 6)).toBe("12.000001");
});
test.each(["-1", "1e6", "NaN", "Infinity", "0.0000001", "", "1.2.3"])(
  "rejects invalid or excessive precision %s",
  (value) => {
    expect(() => parseUnits(value, 6)).toThrow();
  },
);
test("keeps a simulated fee reserve without floating point", () => {
  expect(safeMaximum("1000000000000000001", "900000000000000000")).toBe(
    "100000000000000001",
  );
  expect(safeMaximum("10", "11")).toBe("0");
});
test("mainnet and lookalike IDs are blocked", () => {
  expect(() => assertTestnet(TESTNET)).not.toThrow();
  expect(() =>
    assertTestnet({ ...TESTNET, network: "mainnet", chainId: "zigchain-1" }),
  ).toThrow();
  expect(() => assertTestnet({ ...TESTNET, chainId: "zig-test-3" })).toThrow();
});

test.each([
  { gasPrice: "" },
  { gasPrice: "-1" },
  { addressPrefix: "cosmos" },
  { grpcUrl: null },
  { nativeAsset: { ...TESTNET.nativeAsset, symbol: "ETH" } },
  { nativeAsset: { ...TESTNET.nativeAsset, displayDenom: null } },
  { nativeAsset: { ...TESTNET.nativeAsset, decimals: 6 } },
])("malformed transaction configuration cannot be exported: %j", (patch) => {
  expect(() => validateNetworkConfig({ ...TESTNET, ...patch })).toThrow();
});
test("validated network is deeply frozen", () => {
  const n = validateNetworkConfig(TESTNET);
  expect(Object.isFrozen(n)).toBe(true);
  expect(Object.isFrozen(n.nativeAsset)).toBe(true);
});
