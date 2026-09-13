import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { deployedManifest } from "./deployment-config";
import { verifyContractEvidence } from "./contract-evidence";
import { TESTNET, verifyNetwork } from "@zigoals/chain-config";
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
        await verifyNetwork(TESTNET, fetcher, "v5.0.0-patch-1");
        const node = await read(
          `${TESTNET.restUrl}/cosmos/base/tendermint/v1beta1/node_info`,
        );
        if (node.application_version?.version !== "v5.0.0-patch-1")
          throw Error("Version changed");
        return {
          ok: true,
          detail: "Verified zig-test-2 · azig · 18 decimals · v5.0.0-patch-1",
        };
      } catch {
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
