import { createHash } from "node:crypto";
import { deploymentSchema } from "../../packages/shared-types/src/deployment.ts";
export function buildPreparedManifest(
  bytes,
  report,
  now = new Date().toISOString(),
) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (
    report.artifact !== "artifacts/zigoals_goal_manager.wasm" ||
    report.sha256 !== sha256 ||
    report.bytes !== bytes.length ||
    report.validation?.passed !== true
  )
    throw Error(
      "Build evidence does not match the actual validated artifact. Rebuild first.",
    );
  const e = report.environment;
  if (
    !e?.rust?.startsWith("rustc 1.85.1 ") ||
    !e.binaryen?.startsWith("wasm-opt version 123 ") ||
    e.cosmwasmCheck !== "Contract checking 2.2.2"
  )
    throw Error("Build evidence uses an unsupported toolchain.");
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
    gitCommit: report.sourceCommit,
    buildEnvironment: {
      platform: e.platform,
      arch: e.arch,
      rust: "1.85.1",
      binaryen: "123",
      cosmwasmCheck: "2.2.2",
      sourceDirty: report.sourceDirty,
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
