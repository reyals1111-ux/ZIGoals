import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { deployedManifest } from "./deployment-config";
import { verifyContractEvidence } from "./contract-evidence";
import {
  BASE_FEE_REST_PATH,
  NetworkUpgradedError,
  REVIEWED,
  TESTNET,
  checkVersion,
  formatGazig,
  parseBaseFee,
  verifyNetwork,
} from "@zigoals/chain-config";
export function shortAccount(address: string) {
  return !address
    ? "Disconnected"
    : address.startsWith("local")
      ? "Local demo"
      : `${address.slice(0, 8)}…${address.slice(-6)}`;
}
export type Health = { ok: boolean; detail: string };
export type Diagnostics = {
  checkedAt: string;
  rpc: Health;
  rest: Health;
  contract: Health & { checksum?: string };
};
export async function readDiagnostics(
  fetcher: typeof fetch = fetch,
): Promise<Diagnostics> {
  const read = async (url: string) => {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw Error("Unavailable");
    return response.json();
  };
  const [rpc, rest, contract] = await Promise.all([
    (async (): Promise<Health> => {
      try {
        const { result } = await read(`${TESTNET.rpcUrl}/status`);
        const sync = result?.sync_info;
        const time = Date.parse(sync?.latest_block_time);
        if (
          result?.node_info?.network !== TESTNET.chainId ||
          sync?.catching_up !== false ||
          typeof sync.latest_block_height !== "string" ||
          !/^[1-9]\d*$/.test(sync.latest_block_height) ||
          !Number.isFinite(time) ||
          time > Date.now() + 300_000 ||
          time < Date.now() - 300_000
        )
          throw Error("Invalid or stale");
        return {
          ok: true,
          detail: `Verified zig-test-2 · height ${sync.latest_block_height}`,
        };
      } catch {
        return {
          ok: false,
          detail:
            "Unavailable, stale or incompatible RPC response. Try again later.",
        };
      }
    })(),
    (async (): Promise<Health> => {
      try {
        // Session X Part 1, Session AJ (ADR-035 D1, P3): any patch of a reviewed minor line (zig-test-2 runs zigchaind
        // v6.0.0 since 27 Oct 2026); the detail names the version the node reported. On a base-fee line (v6.0) the
        // network's current base fee is read too and named: the staking quote prices from it, so a node that cannot
        // give it is not healthy for signing. A newer line says so in D1's words, still naming the version.
        const version = await verifyNetwork(TESTNET, fetcher, REVIEWED);
        const check = checkVersion(TESTNET.chainId, version);
        const base = `Verified zig-test-2 · azig · 18 decimals · ${version}`;
        if (!check.ok || check.fee !== "base-fee") return { ok: true, detail: base };
        try {
          const fee = await read(`${TESTNET.restUrl}${BASE_FEE_REST_PATH}`);
          return {
            ok: true,
            detail: `${base} · base fee ${formatGazig(parseBaseFee(fee?.base_fee, "decimal"))} per gas`,
          };
        } catch {
          return {
            ok: false,
            detail: `${base} · the network fee could not be read. Try again later.`,
          };
        }
      } catch (error) {
        if (error instanceof NetworkUpgradedError)
          return {
            ok: false,
            detail: `The network was upgraded; checks are pending. zig-test-2 reports ${error.version}.`,
          };
        return {
          ok: false,
          detail:
            "Unavailable or changed REST network/denomination/version. Try again later.",
        };
      }
    })(),
    (async (): Promise<Health & { checksum?: string }> => {
      if (!deployedManifest) return { ok: false, detail: "NOT DEPLOYED" };
      let client: CosmWasmClient | undefined;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          (async () => {
            const { CosmWasmClient } = await import("@cosmjs/cosmwasm-stargate");
            client = await CosmWasmClient.connect(TESTNET.rpcUrl);
            if (cancelled) {
              client.disconnect();
              throw Error("Timed out");
            }
            if ((await client.getChainId()) !== TESTNET.chainId)
              throw Error("Wrong chain");
            const evidence = await verifyContractEvidence(
              client,
              deployedManifest,
            );
            return {
              ok: true,
              detail: "Matches reviewed manifest",
              checksum: evidence.checksum,
            };
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              cancelled = true;
              client?.disconnect();
              reject(Error("Timed out"));
            }, 12_000);
          }),
        ]);
      } catch {
        return {
          ok: false,
          detail:
            "Contract verification unavailable or mismatched; actions require a fresh successful check.",
        };
      } finally {
        if (timer) clearTimeout(timer);
        client?.disconnect();
      }
    })(),
  ]);
  return { checkedAt: new Date().toISOString(), rpc, rest, contract };
}
