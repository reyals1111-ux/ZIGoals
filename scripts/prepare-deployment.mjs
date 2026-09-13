import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { TESTNET, verifyNetwork } from "../packages/chain-config/src/index.ts";
await verifyNetwork();
const bytes = readFileSync(
  new URL("../artifacts/zigoals_goal_manager.wasm", import.meta.url),
);
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      status: "PREPARED_NOT_DEPLOYED",
      network: "testnet",
      chain_id: TESTNET.chainId,
      native_denom: TESTNET.nativeAsset.baseDenom,
      decimals: TESTNET.nativeAsset.decimals,
      code_id: null,
      contract_address: null,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      upload_tx: null,
      instantiate_tx: null,
      deployer_public_address: null,
      timestamp: new Date().toISOString(),
      git_commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      contract_version: "0.1.0",
      rpc: TESTNET.rpcUrl,
      instantiate_msg: {
        admin: null,
        native_denom: TESTNET.nativeAsset.baseDenom,
      },
      chain_admin: null,
      blockers: [
        "Owner faucet funding unresolved",
        "Owner upload whitelisting unverified",
      ],
      transaction_sent: false,
    },
    null,
    2,
  ),
);
