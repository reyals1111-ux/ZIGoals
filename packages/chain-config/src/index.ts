import testnet from "./testnet.json" with { type: "json" };
export interface NativeAssetConfig {
  symbol: "ZIG";
  displayDenom: "ZIG";
  baseDenom: string;
  decimals: number;
}
export interface NetworkConfig {
  network: "testnet" | "mainnet";
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  grpcUrl?: string;
  addressPrefix: string;
  nativeAsset: NativeAssetConfig;
  gasPrice: string;
}
/** Refuse malformed public config before it reaches wallet/fee construction. */
export function validateNetworkConfig(input: unknown): Readonly<NetworkConfig> {
  const n = input as Partial<NetworkConfig> | null;
  if (
    !n ||
    n.network !== "testnet" ||
    n.chainId !== "zig-test-2" ||
    n.rpcUrl !== "https://testnet-rpc.zigchain.com" ||
    n.restUrl !== "https://testnet-api.zigchain.com" ||
    n.grpcUrl !== "grpc-t.zigchain.nodestake.org:443" ||
    n.addressPrefix !== "zig" ||
    n.gasPrice !== "2500000000" ||
    n.nativeAsset?.symbol !== "ZIG" ||
    n.nativeAsset.displayDenom !== "ZIG" ||
    n.nativeAsset.baseDenom !== "azig" ||
    n.nativeAsset.decimals !== 18
  )
    throw Error("Unsupported or incomplete public testnet configuration.");
  return Object.freeze({
    network: n.network,
    chainId: n.chainId,
    rpcUrl: n.rpcUrl,
    restUrl: n.restUrl,
    grpcUrl: n.grpcUrl,
    addressPrefix: n.addressPrefix,
    gasPrice: n.gasPrice,
    nativeAsset: Object.freeze({ ...n.nativeAsset }),
  });
}
// Source values are validated before exposure; live identity is rechecked before signing.
export const TESTNET = validateNetworkConfig(testnet);
export function assertTestnet(config: NetworkConfig): void {
  if (config.network !== "testnet" || config.chainId !== "zig-test-2")
    throw new Error("This build supports ZIGChain Testnet only.");
}
function validateDecimals(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
    throw new Error("Unsupported decimal precision.");
}
export function parseUnits(value: string, decimals: number): bigint {
  validateDecimals(decimals);
  if (value.length > 80 || !/^\d+(\.\d+)?$/.test(value))
    throw new Error("Enter a non-negative decimal amount.");
  const [whole = "0", part = ""] = value.split(".");
  if (part.length > decimals)
    throw new Error(`Use at most ${decimals} decimal places.`);
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(part.padEnd(decimals, "0") || "0")
  );
}
export function formatUnits(value: string, decimals: number): string {
  validateDecimals(decimals);
  if (!/^\d+$/.test(value) || value.length > 100)
    throw new Error("Invalid base-unit integer.");
  const n = BigInt(value),
    scale = 10n ** BigInt(decimals);
  const fraction = (n % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${n / scale}${fraction ? `.${fraction}` : ""}`;
}
export function safeMaximum(balance: string, fee: string): string {
  if (!/^\d+$/.test(balance) || !/^\d+$/.test(fee))
    throw new Error("Invalid balance or fee.");
  const v = BigInt(balance) - BigInt(fee);
  return (v > 0n ? v : 0n).toString();
}
export async function verifyNetwork(
  config: NetworkConfig = TESTNET,
  fetcher: typeof fetch = fetch,
  expectedVersion?: string,
): Promise<void> {
  assertTestnet(config);
  const read = async (path: string) => {
    const response = await fetcher(config.restUrl + path, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error("Testnet is unavailable. Try again shortly.");
    return response.json();
  };
  const [node, staking, bank] = await Promise.all([
    read("/cosmos/base/tendermint/v1beta1/node_info"),
    read("/cosmos/staking/v1beta1/params"),
    read(
      `/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(config.nativeAsset.baseDenom)}`,
    ),
  ]);
  const metadata = bank.metadata;
  if (
    node.default_node_info?.network !== config.chainId ||
    (expectedVersion !== undefined &&
      node.application_version?.version !== expectedVersion) ||
    staking.params?.bond_denom !== config.nativeAsset.baseDenom ||
    metadata?.base !== config.nativeAsset.baseDenom ||
    !metadata.denom_units?.some(
      (d: { denom: string; exponent: number }) =>
        d.denom === metadata.display &&
        d.exponent === config.nativeAsset.decimals,
    )
  )
    throw new Error(
      "Network or denomination changed. Signing is disabled until configuration is verified.",
    );
}
export function keplrChainInfo(config: NetworkConfig = TESTNET) {
  assertTestnet(config);
  const asset = {
    coinDenom: config.nativeAsset.symbol,
    coinMinimalDenom: config.nativeAsset.baseDenom,
    coinDecimals: config.nativeAsset.decimals,
  };
  const p = config.addressPrefix;
  return {
    chainId: config.chainId,
    chainName: "ZIGChain Testnet",
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
    feeCurrencies: [
      {
        ...asset,
        gasPriceStep: {
          low: 2500000000,
          average: 2500000000,
          high: 4000000000,
        },
      },
    ],
  };
}
