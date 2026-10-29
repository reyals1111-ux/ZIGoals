import mainnet from "./mainnet.json" with { type: "json" };
import {
  REVIEWED_TESTNET_VERSIONS,
  TESTNET,
  type NetworkConfig,
} from "./index";
import { GAS_PRICE_FLOOR, checkVersion, requireReviewedVersion, type FeeModel } from "./reviewed-versions";

/**
 * Session AF (ADR-028 H46, H61, H74; `TIER 3 (wallet/signing)`): the two networks native staking may sign on. `TESTNET`,
 * `validateNetworkConfig`, `assertTestnet`, `verifyNetwork` and `keplrChainInfo` in index.ts are untouched: the Goal
 * Manager contract path and Session AE's wallet links keep using them, testnet only. This module adds ZIGChain mainnet
 * (zigchain-1) beside the testnet for the native staking messages only (delegate, undelegate, redelegate, claim, vote);
 * a contract path never reads it.
 *
 * Every literal was read live on 2026-10-18 (20:52 UTC): `https://api.zigchain.com` node_info network `zigchain-1`,
 * application_version `v5.1.2` on both RPC nodes (zrpc01-mainnet, zrpc02-mainnet, six reads), staking params
 * bond_denom `azig` and unbonding_time `1814400s`, bank metadata base `azig` with display unit `zig` at exponent 18,
 * node config minimum gas price `2500000000azig` (testnet the same); `https://rpc.zigchain.com` status network
 * `zigchain-1` on CometBFT 0.38.25, CORS `*` for GET and for a POST preflight (content-type).
 */
export type StakingNetwork = "practice" | "real";
export const STAKING_NETWORK_IDS: readonly StakingNetwork[] = Object.freeze(["practice", "real"]);

/** Refuse anything but the reviewed mainnet literals (the twin of index.ts's validateNetworkConfig for zig-test-2). */
export function validateMainnetConfig(input: unknown): Readonly<NetworkConfig> {
  const n = input as Partial<NetworkConfig> | null;
  if (
    !n ||
    n.network !== "mainnet" ||
    n.chainId !== "zigchain-1" ||
    n.rpcUrl !== "https://rpc.zigchain.com" ||
    n.restUrl !== "https://api.zigchain.com" ||
    n.grpcUrl !== undefined ||
    n.addressPrefix !== "zig" ||
    n.gasPrice !== "2500000000" ||
    n.nativeAsset?.symbol !== "ZIG" ||
    n.nativeAsset.displayDenom !== "ZIG" ||
    n.nativeAsset.baseDenom !== "azig" ||
    n.nativeAsset.decimals !== 18
  )
    throw Error("Unsupported or incomplete public mainnet configuration.");
  return Object.freeze({
    network: n.network,
    chainId: n.chainId,
    rpcUrl: n.rpcUrl,
    restUrl: n.restUrl,
    addressPrefix: n.addressPrefix,
    gasPrice: n.gasPrice,
    nativeAsset: Object.freeze({ ...n.nativeAsset }),
  });
}
export const MAINNET = validateMainnetConfig(mainnet);

/** practice = ZIGChain Testnet (zig-test-2, no real value); real = ZIGChain mainnet (zigchain-1, real ZIG). */
export const STAKING_NETWORKS: Readonly<Record<StakingNetwork, Readonly<NetworkConfig>>> = Object.freeze({
  practice: TESTNET,
  real: MAINNET,
});
/** The network a chain id belongs to, or undefined for any other chain (a look-alike id never maps). */
export function stakingNetworkOf(chainId: unknown): StakingNetwork | undefined {
  return chainId === TESTNET.chainId ? "practice" : chainId === MAINNET.chainId ? "real" : undefined;
}

/**
 * zigchaind versions seen and reviewed per network (examples; the rule is reviewed-versions.ts, Session AJ D1: any patch
 * of a reviewed minor line). Practice: index.ts's list (v5.1.0–v5.1.2, v6.0.0). Real: v5.1.2, the version both mainnet
 * RPC nodes answered on 2026-10-18 and 2026-10-29; v6.0.x is accepted by the rule once proposal #45 upgrades it (P2).
 */
export const REVIEWED_VERSIONS: Readonly<Record<StakingNetwork, readonly string[]>> = Object.freeze({
  practice: REVIEWED_TESTNET_VERSIONS,
  real: Object.freeze(["v5.1.2"]),
});
/** The fee model of a reviewed version on a staking network (throws like assertNetworkEvidence for any other). */
export function feeModelFor(network: StakingNetwork, version: unknown): FeeModel {
  const config = STAKING_NETWORKS[network];
  if (!config) throw new Error(NETWORK_CHANGED);
  return requireReviewedVersion(config.chainId, version, NETWORK_CHANGED).fee;
}
/** Whether a version is a reviewed patch on this staking network (the D1 rule). */
export function isReviewedOn(network: StakingNetwork, version: unknown): boolean {
  const config = STAKING_NETWORKS[network];
  return !!config && checkVersion(config.chainId, version).ok;
}

/** The words every staking screen uses for the two networks: big, plain and never abbreviated. */
export const NETWORK_WORDS = Object.freeze({
  practice: Object.freeze({
    label: "Practice network (no real value)",
    badge: "PRACTICE",
    name: "ZIGChain Testnet",
    chainId: "zig-test-2",
    value: "no real value",
    line: "PRACTICE · zig-test-2 · no real value",
  }),
  real: Object.freeze({
    label: "Real network (real ZIG)",
    badge: "REAL",
    name: "ZIGChain mainnet",
    chainId: "zigchain-1",
    value: "real ZIG",
    line: "REAL · zigchain-1 · real ZIG",
  }),
} as const);

/** Unstaking takes 21 days on both networks (staking params unbonding_time 1814400s, read 2026-10-18); verified live. */
export const UNBONDING_SECONDS = 1814400;
/** Unbonding entries the chain allows per delegator and validator (staking params max_entries 7, both networks). */
export const MAX_UNBONDING_ENTRIES = 7;
/**
 * Keplr's chain-registry gas price steps for zigchain-1 and zig-test-2 (ADR-028 H74, read 2026-10-18): low 2.5, average
 * 25 and high 50 Gazig per gas; low equals the node minimum (2500000000azig). The app's own fee quote stays at the chain
 * minimum × simulated gas × 1.3 and the review says the wallet may raise it.
 */
export const GAS_PRICE_STEPS = Object.freeze({ low: 2500000000, average: 25000000000, high: 50000000000 });
/**
 * Session AJ (ADR-035 A1): the steps above suit both reviewed fee models: `low` is the fixed price of v5.1 and the
 * feemarket floor of v6.0 (GAS_PRICE_FLOOR), and every step is at or above it. They never set the signed fee: the
 * signer is asked with `preferNoSetFee`, and the signed bytes must carry exactly the reviewed fee (receipt.ts).
 */
export const GAS_PRICE_STEPS_FLOOR = Number(GAS_PRICE_FLOOR);
/** The same-name decoy: symbol "ZIG", exponent 6, not the chain's coin. ZIG is identified by its base denom azig only. */
export const DECOY_DENOMS: readonly string[] = Object.freeze(["coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig"]);

export const NETWORK_CHANGED =
  "Network or denomination changed. Signing is disabled until configuration is verified.";
/** What the chain said about itself, from its REST API or from the RPC the browser signs through. */
export interface NetworkEvidence {
  chainId: unknown;
  version: unknown;
  bondDenom: unknown;
  unbondingSeconds: unknown;
  metadata: unknown;
}
/**
 * The one check both paths use: the chain id, a reviewed application version, the bond denom, the unbonding time and the
 * bank metadata's base denom with the display unit at 18 decimals. Throws NETWORK_CHANGED on any difference; returns the
 * version read. The display unit is compared as the chain names it (lowercase `zig`), never a hard-coded "ZIG".
 */
export function assertNetworkEvidence(network: StakingNetwork, evidence: NetworkEvidence): string {
  const config = STAKING_NETWORKS[network];
  const m = evidence.metadata as {
    base?: unknown;
    display?: unknown;
    denom_units?: unknown;
  } | null;
  const units = Array.isArray(m?.denom_units) ? (m.denom_units as { denom?: unknown; exponent?: unknown }[]) : [];
  if (
    !config ||
    evidence.chainId !== config.chainId ||
    typeof evidence.version !== "string" ||
    evidence.bondDenom !== config.nativeAsset.baseDenom ||
    evidence.unbondingSeconds !== UNBONDING_SECONDS ||
    !m ||
    m.base !== config.nativeAsset.baseDenom ||
    typeof m.display !== "string" ||
    !units.some((d) => d.denom === m.display && d.exponent === config.nativeAsset.decimals)
  )
    throw new Error(NETWORK_CHANGED);
  // Session AJ (D1, P5): any patch of a reviewed minor; a newer line throws NetworkUpgradedError (D1's sentence).
  return requireReviewedVersion(config.chainId, evidence.version, NETWORK_CHANGED).version;
}
/** "1814400s" → 1814400; anything else → NaN (and the evidence check fails closed). */
export function durationSeconds(value: unknown): number {
  return typeof value === "string" && /^\d{1,12}s$/.test(value) ? Number(value.slice(0, -1)) : Number.NaN;
}

/**
 * Live identity check of a staking network through its REST API (server routes, scripts and the practice network in the
 * browser; the browser never reaches the mainnet REST host, so the signing path checks the same evidence over the RPC it
 * signs through). Fails closed; returns the version read.
 */
export async function verifyNetworkFor(network: StakingNetwork, fetcher: typeof fetch = fetch): Promise<string> {
  const config = STAKING_NETWORKS[network];
  if (!config) throw new Error(NETWORK_CHANGED);
  const read = async (path: string) => {
    const response = await fetcher(config.restUrl + path, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("The network is unavailable. Try again shortly.");
    return response.json() as Promise<Record<string, unknown> | null>;
  };
  const [node, staking, bank] = await Promise.all([
    read("/cosmos/base/tendermint/v1beta1/node_info"),
    read("/cosmos/staking/v1beta1/params"),
    read(`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(config.nativeAsset.baseDenom)}`),
  ]);
  const n = node as { default_node_info?: { network?: unknown }; application_version?: { version?: unknown } } | null;
  const s = staking as { params?: { bond_denom?: unknown; unbonding_time?: unknown } } | null;
  return assertNetworkEvidence(network, {
    chainId: n?.default_node_info?.network,
    version: n?.application_version?.version,
    bondDenom: s?.params?.bond_denom,
    unbondingSeconds: durationSeconds(s?.params?.unbonding_time),
    metadata: (bank as { metadata?: unknown } | null)?.metadata,
  });
}

/**
 * Keplr's chain details for a staking network, used only when Keplr answers that it has no chain info (both chains are
 * in Keplr's registry: cosmos/zigchain.json and cosmos/zig-test.json, read 2026-10-18; ADR-028 H61). Gas steps are the
 * registry's (H74); index.ts's testnet suggestion (2.5/2.5/4 Gazig) stays for the Goal Manager path.
 */
export function keplrChainInfoFor(network: StakingNetwork) {
  const config = STAKING_NETWORKS[network];
  if (!config) throw new Error(NETWORK_CHANGED);
  const asset = {
    coinDenom: config.nativeAsset.symbol,
    coinMinimalDenom: config.nativeAsset.baseDenom,
    coinDecimals: config.nativeAsset.decimals,
  };
  const p = config.addressPrefix;
  return {
    chainId: config.chainId,
    chainName: network === "real" ? "ZIGChain" : "ZIGChain Testnet",
    rpc: config.rpcUrl,
    rest: config.restUrl,
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: p,
      bech32PrefixAccPub: p + "pub",
      bech32PrefixValAddr: p + "valoper",
      bech32PrefixValPub: p + "valoperpub",
      bech32PrefixConsAddr: p + "valcons",
      bech32PrefixConsPub: p + "valconspub",
    },
    currencies: [asset],
    stakeCurrency: asset,
    feeCurrencies: [{ ...asset, gasPriceStep: { ...GAS_PRICE_STEPS } }],
  };
}
