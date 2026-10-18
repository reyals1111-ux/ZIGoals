import { expect, test } from "vitest";
import mainnetJson from "./mainnet.json" with { type: "json" };
import { REVIEWED_TESTNET_VERSIONS, TESTNET, keplrChainInfo, validateNetworkConfig } from "./index";
import {
  DECOY_DENOMS,
  GAS_PRICE_STEPS,
  MAINNET,
  NETWORK_CHANGED,
  NETWORK_WORDS,
  REVIEWED_VERSIONS,
  STAKING_NETWORKS,
  UNBONDING_SECONDS,
  assertNetworkEvidence,
  durationSeconds,
  keplrChainInfoFor,
  stakingNetworkOf,
  validateMainnetConfig,
  verifyNetworkFor,
} from "./networks";

// Session AF (ADR-028 H46, H61, H74): literals read live on 2026-10-18 (see networks.ts).
test("mainnet literals are exact and deeply frozen; the testnet config is the untouched TESTNET", () => {
  expect(MAINNET).toEqual({
    network: "mainnet",
    chainId: "zigchain-1",
    rpcUrl: "https://rpc.zigchain.com",
    restUrl: "https://api.zigchain.com",
    addressPrefix: "zig",
    gasPrice: "2500000000",
    nativeAsset: { symbol: "ZIG", displayDenom: "ZIG", baseDenom: "azig", decimals: 18 },
  });
  expect(Object.isFrozen(MAINNET)).toBe(true);
  expect(Object.isFrozen(MAINNET.nativeAsset)).toBe(true);
  expect(STAKING_NETWORKS.practice).toBe(TESTNET);
  expect(STAKING_NETWORKS.real).toBe(MAINNET);
  expect(Object.isFrozen(STAKING_NETWORKS)).toBe(true);
  // The testnet validator still refuses the mainnet file, and the mainnet validator the testnet one.
  expect(() => validateNetworkConfig(mainnetJson)).toThrow();
  expect(() => validateMainnetConfig(TESTNET)).toThrow();
});
test.each([
  { chainId: "zigchain-2" },
  { chainId: "zig-test-2" },
  { network: "testnet" },
  { rpcUrl: "https://rpc.zigchain.com.evil.example" },
  { rpcUrl: "http://rpc.zigchain.com" },
  { restUrl: "https://testnet-api.zigchain.com" },
  { grpcUrl: "grpc.zigchain.com:443" },
  { addressPrefix: "cosmos" },
  { gasPrice: "250000000" },
  { nativeAsset: { ...MAINNET.nativeAsset, baseDenom: "uzig" } },
  { nativeAsset: { ...MAINNET.nativeAsset, decimals: 6 } },
  { nativeAsset: { ...MAINNET.nativeAsset, symbol: "ZIGG" } },
])("a changed mainnet literal is refused: %j", (patch) => {
  expect(() => validateMainnetConfig({ ...mainnetJson, ...patch })).toThrow("mainnet configuration");
});
test("chain ids map to exactly one network; look-alikes map to none", () => {
  expect(stakingNetworkOf("zig-test-2")).toBe("practice");
  expect(stakingNetworkOf("zigchain-1")).toBe("real");
  for (const id of ["zigchain-2", "zig-test-1", "ZIGCHAIN-1", " zigchain-1", "", null, undefined, 1]) expect(stakingNetworkOf(id), String(id)).toBeUndefined();
});
test("reviewed versions: practice is index.ts's list, real is exactly v5.1.2", () => {
  expect(REVIEWED_VERSIONS.practice).toBe(REVIEWED_TESTNET_VERSIONS);
  expect(REVIEWED_VERSIONS.real).toEqual(["v5.1.2"]);
  expect(Object.isFrozen(REVIEWED_VERSIONS.real)).toBe(true);
});
test("network words are the plain labels every staking screen shows", () => {
  expect(NETWORK_WORDS.practice.label).toBe("Practice network (no real value)");
  expect(NETWORK_WORDS.real.label).toBe("Real network (real ZIG)");
  expect(NETWORK_WORDS.practice.chainId).toBe(TESTNET.chainId);
  expect(NETWORK_WORDS.real.chainId).toBe(MAINNET.chainId);
  expect(NETWORK_WORDS.practice.line).toBe("PRACTICE · zig-test-2 · no real value");
  expect(NETWORK_WORDS.real.line).toBe("REAL · zigchain-1 · real ZIG");
});
test("constants: 21 days unbonding, the registry gas steps, the decoy denom", () => {
  expect(UNBONDING_SECONDS).toBe(21 * 24 * 3600);
  expect(GAS_PRICE_STEPS).toEqual({ low: 2500000000, average: 25000000000, high: 50000000000 });
  expect(String(GAS_PRICE_STEPS.low)).toBe(MAINNET.gasPrice);
  expect(DECOY_DENOMS).toEqual(["coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig"]);
  expect(durationSeconds("1814400s")).toBe(1814400);
  for (const bad of ["1814400", "1814400.5s", "-1s", "s", 1814400, null]) expect(durationSeconds(bad)).toBeNaN();
});

const metadata = { base: "azig", display: "zig", denom_units: [{ denom: "azig", exponent: 0 }, { denom: "zig", exponent: 18 }] };
const good = (chainId: string, version = "v5.1.2") => ({ chainId, version, bondDenom: "azig", unbondingSeconds: 1814400, metadata });
test("evidence: both networks pass with their own chain id and a reviewed version", () => {
  expect(assertNetworkEvidence("real", good("zigchain-1"))).toBe("v5.1.2");
  expect(assertNetworkEvidence("practice", good("zig-test-2", "v5.1.0"))).toBe("v5.1.0");
});
test.each([
  ["the other network's id", { chainId: "zig-test-2" }],
  ["an unreviewed version", { version: "v5.1.3" }],
  ["a testnet-only version on mainnet", { version: "v5.1.0" }],
  ["no version", { version: undefined }],
  ["the legacy bond denom", { bondDenom: "uzig" }],
  ["a changed unbonding time", { unbondingSeconds: 604800 }],
  ["metadata on another base", { metadata: { ...metadata, base: "uzig" } }],
  ["the display unit at 6 decimals", { metadata: { ...metadata, denom_units: [{ denom: "azig", exponent: 0 }, { denom: "zig", exponent: 6 }] } }],
  ["no metadata", { metadata: null }],
])("evidence fails closed on %s", (_, patch) => {
  expect(() => assertNetworkEvidence("real", { ...good("zigchain-1"), ...patch })).toThrow(NETWORK_CHANGED);
});
const rest = (chainId: string, version: unknown, unbonding = "1814400s") => {
  const urls: string[] = [];
  const fetcher = async (url: string | URL): Promise<Response> => {
    urls.push(String(url));
    return Response.json(
      String(url).includes("node_info")
        ? { default_node_info: { network: chainId }, application_version: { version } }
        : String(url).includes("staking")
          ? { params: { bond_denom: "azig", unbonding_time: unbonding } }
          : { metadata },
    );
  };
  return { urls, fetcher: fetcher as typeof fetch };
};
test("verifyNetworkFor reads the network's own REST host and returns the version", async () => {
  const real = rest("zigchain-1", "v5.1.2");
  await expect(verifyNetworkFor("real", real.fetcher)).resolves.toBe("v5.1.2");
  expect(real.urls.every((u) => u.startsWith("https://api.zigchain.com/cosmos/"))).toBe(true);
  const practice = rest("zig-test-2", "v5.1.1");
  await expect(verifyNetworkFor("practice", practice.fetcher)).resolves.toBe("v5.1.1");
  expect(practice.urls.every((u) => u.startsWith("https://testnet-api.zigchain.com/cosmos/"))).toBe(true);
});
test("verifyNetworkFor fails closed on a wrong network, version or unbonding time, and on an unavailable host", async () => {
  await expect(verifyNetworkFor("real", rest("zig-test-2", "v5.1.2").fetcher)).rejects.toThrow(NETWORK_CHANGED);
  await expect(verifyNetworkFor("real", rest("zigchain-1", "v5.2.0").fetcher)).rejects.toThrow(NETWORK_CHANGED);
  await expect(verifyNetworkFor("practice", rest("zig-test-2", "v5.1.2", "604800s").fetcher)).rejects.toThrow(NETWORK_CHANGED);
  await expect(verifyNetworkFor("real", (async () => new Response("", { status: 503 })) as typeof fetch)).rejects.toThrow("unavailable");
  await expect(verifyNetworkFor("staging" as "real", rest("zigchain-1", "v5.1.2").fetcher)).rejects.toThrow(NETWORK_CHANGED);
});
test("Keplr chain details per network: registry gas steps, coin type 118, the zig prefixes; the testnet suggestion of index.ts is unchanged", () => {
  const bech32Config = {
    bech32PrefixAccAddr: "zig",
    bech32PrefixAccPub: "zigpub",
    bech32PrefixValAddr: "zigvaloper",
    bech32PrefixValPub: "zigvaloperpub",
    bech32PrefixConsAddr: "zigvalcons",
    bech32PrefixConsPub: "zigvalconspub",
  };
  const asset = { coinDenom: "ZIG", coinMinimalDenom: "azig", coinDecimals: 18 };
  expect(keplrChainInfoFor("real")).toEqual({
    chainId: "zigchain-1",
    chainName: "ZIGChain",
    rpc: "https://rpc.zigchain.com",
    rest: "https://api.zigchain.com",
    bip44: { coinType: 118 },
    bech32Config,
    currencies: [asset],
    stakeCurrency: asset,
    feeCurrencies: [{ ...asset, gasPriceStep: { low: 2500000000, average: 25000000000, high: 50000000000 } }],
  });
  expect(keplrChainInfoFor("practice")).toMatchObject({ chainId: "zig-test-2", chainName: "ZIGChain Testnet", rpc: "https://testnet-rpc.zigchain.com", feeCurrencies: [{ gasPriceStep: { low: 2500000000, average: 25000000000, high: 50000000000 } }] });
  expect(keplrChainInfo().feeCurrencies[0]!.gasPriceStep).toEqual({ low: 2500000000, average: 2500000000, high: 4000000000 });
});
