import { expect, test } from "vitest";
import {
  parseUnits,
  formatUnits,
  safeMaximum,
  TESTNET,
  assertTestnet,
  validateNetworkConfig,
  verifyNetwork,
  keplrChainInfo,
  REVIEWED_TESTNET_VERSIONS,
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

// Session X Part 1 (zig-test-2 on zigchaind v5.1, read 2026-10-07).
const node = (version: unknown) => ({
  default_node_info: { network: "zig-test-2" },
  application_version: { version },
});
const network =
  (version: unknown) =>
  async (url: string | URL): Promise<Response> =>
    Response.json(
      String(url).includes("node_info")
        ? node(version)
        : String(url).includes("staking")
          ? { params: { bond_denom: "azig" } }
          : {
              metadata: {
                base: "azig",
                display: "zig",
                denom_units: [
                  { denom: "azig", exponent: 0 },
                  { denom: "zig", exponent: 18 },
                ],
              },
            },
    );
test("the reviewed testnet versions are exactly v5.1.0, v5.1.1 and v5.1.2, frozen", () => {
  expect(REVIEWED_TESTNET_VERSIONS).toEqual(["v5.1.0", "v5.1.1", "v5.1.2"]);
  expect(Object.isFrozen(REVIEWED_TESTNET_VERSIONS)).toBe(true);
});
test.each(["v5.1.0", "v5.1.1", "v5.1.2"])(
  "verifyNetwork accepts the reviewed %s from a list and returns it",
  async (version) => {
    await expect(
      verifyNetwork(TESTNET, network(version) as typeof fetch, REVIEWED_TESTNET_VERSIONS),
    ).resolves.toBe(version);
  },
);
test.each(["v5.0.0-patch-1", "v5.2.0", "v5.1.3", "v5.1.1-rc1", "", null, undefined, 51])(
  "verifyNetwork refuses the unreviewed version %j",
  async (version) => {
    await expect(
      verifyNetwork(TESTNET, network(version) as typeof fetch, REVIEWED_TESTNET_VERSIONS),
    ).rejects.toThrow("Network or denomination changed");
  },
);
test("one exact version still works as before; no expected version checks none", async () => {
  await expect(
    verifyNetwork(TESTNET, network("v5.1.0") as typeof fetch, "v5.1.0"),
  ).resolves.toBe("v5.1.0");
  await expect(
    verifyNetwork(TESTNET, network("v5.1.1") as typeof fetch, "v5.1.0"),
  ).rejects.toThrow();
  await expect(
    verifyNetwork(TESTNET, network("v9") as typeof fetch),
  ).resolves.toBe("v9");
});
test("the Keplr chain suggestion matches the live testnet (REST and RPC read 2026-10-07)", () => {
  expect(keplrChainInfo()).toEqual({
    chainId: "zig-test-2",
    chainName: "ZIGChain Testnet",
    rpc: "https://testnet-rpc.zigchain.com",
    rest: "https://testnet-api.zigchain.com",
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: "zig",
      bech32PrefixAccPub: "zigpub",
      bech32PrefixValAddr: "zigvaloper",
      bech32PrefixValPub: "zigvaloperpub",
      bech32PrefixConsAddr: "zigvalcons",
      bech32PrefixConsPub: "zigvalconspub",
    },
    currencies: [{ coinDenom: "ZIG", coinMinimalDenom: "azig", coinDecimals: 18 }],
    stakeCurrency: { coinDenom: "ZIG", coinMinimalDenom: "azig", coinDecimals: 18 },
    // The node's minimum gas price is 2500000000azig (GET /cosmos/base/node/v1beta1/config, 2026-10-07): low and
    // average sit at it.
    feeCurrencies: [
      {
        coinDenom: "ZIG",
        coinMinimalDenom: "azig",
        coinDecimals: 18,
        gasPriceStep: { low: 2500000000, average: 2500000000, high: 4000000000 },
      },
    ],
  });
});
