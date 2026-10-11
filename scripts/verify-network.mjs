import { TESTNET, verifyNetwork } from "../packages/chain-config/src/index.ts";
await verifyNetwork();
const response = await fetch(`${TESTNET.rpcUrl}/status`, {
  signal: AbortSignal.timeout(12000),
});
if (!response.ok) throw Error(`RPC status HTTP ${response.status}`);
const { result } = await response.json();
if (
  result.node_info.network !== TESTNET.chainId ||
  result.sync_info.catching_up
)
  throw Error("RPC chain mismatch or node still catching up.");
console.log(
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      chainId: TESTNET.chainId,
      baseDenom: TESTNET.nativeAsset.baseDenom,
      decimals: TESTNET.nativeAsset.decimals,
      rpc: TESTNET.rpcUrl,
      rest: TESTNET.restUrl,
      height: result.sync_info.latest_block_height,
      blockTime: result.sync_info.latest_block_time,
    },
    null,
    2,
  ),
);
