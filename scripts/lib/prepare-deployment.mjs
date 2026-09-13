import { verifyCandidate } from "../release/manifest.mjs";
import { deploymentSchema } from "../../packages/shared-types/src/deployment.ts";
// Pure formatting boundary: canonical byte/schema/source-commit checks are repeated
// here; the CLI additionally verifies trusted git objects and runs the validator.
export function buildPreparedManifest({ bytes, candidate, expectedCommit, now = new Date().toISOString() }) {
  verifyCandidate({ expectedCommit, manifest: candidate, wasm: bytes });
  const e = candidate.environment;
  const sha256 = candidate.artifact.sha256;
  return deploymentSchema.parse({
    schemaVersion: 2,
    status: "PREPARED_NOT_DEPLOYED",
    environment: "testnet",
    chainId: "zig-test-2",
    chainVersion: "v5.0.0-patch-1",
    denom: "azig",
    decimals: 18,
    codeId: null,
    contractAddress: null,
    wasmSha256: sha256,
    uploadTx: null,
    instantiateTx: null,
    deployerPublicAddress: null,
    migrationAdmin: null,
    pauseAdmin: null,
    contractName: "crates.io:zigoals-goal-manager",
    contractVersion: "0.1.0",
    gitCommit: candidate.source.commit,
    buildEnvironment: {
      platform: e.platform,
      arch: e.arch,
      rust: "1.85.1",
      binaryen: "123",
      cosmwasmCheck: "2.2.2",
      sourceDirty: false,
    },
    preparedAt: now,
    deploymentTimestamp: null,
    rpcUsed: "https://testnet-rpc.zigchain.com",
    restUsed: "https://testnet-api.zigchain.com",
    explorerVerification: {
      status: "NOT_VERIFIED",
      url: null,
      verifiedAt: null,
    },
  });
}
