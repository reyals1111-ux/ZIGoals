// Read-only preparation: no signer, key input, wallet, upload or broadcast API.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TESTNET, verifyNetwork } from "../packages/chain-config/src/index.ts";
import { buildPreparedManifest } from "./lib/prepare-deployment.mjs";
if (process.argv.length !== 2)
  throw Error(
    "Usage: node scripts/prepare-deployment.mjs (no wallet or secret arguments)",
  );
await verifyNetwork();
const read = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error("Network evidence unavailable; preparation stopped.");
  return r.json();
};
const [node, rpc] = await Promise.all([
  read(`${TESTNET.restUrl}/cosmos/base/tendermint/v1beta1/node_info`),
  read(`${TESTNET.rpcUrl}/status`),
]);
if (
  node.application_version?.version !== "v5.0.0-patch-1" ||
  rpc.result?.node_info?.network !== TESTNET.chainId ||
  rpc.result?.sync_info?.catching_up !== false
)
  throw Error(
    "Testnet version or RPC readiness changed; review before preparing.",
  );
const report = JSON.parse(
  readFileSync(
    new URL("../artifacts/build-report.json", import.meta.url),
    "utf8",
  ),
);
const bytes = readFileSync(
  new URL("../artifacts/zigoals_goal_manager.wasm", import.meta.url),
);
const manifest = buildPreparedManifest(bytes, report);
// Revalidate actual bytes; a hand-edited report cannot substitute for validation.
const root = fileURLToPath(new URL("../", import.meta.url));
execFileSync(
  process.env.COSMWASM_CHECK ?? `${root}.toolchain/check/bin/cosmwasm-check`,
  [`${root}artifacts/zigoals_goal_manager.wasm`],
  { encoding: "utf8", timeout: 30000 },
);
console.log(JSON.stringify(manifest, null, 2));
