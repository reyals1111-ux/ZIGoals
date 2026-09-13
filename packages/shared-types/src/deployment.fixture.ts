import { toBech32 } from "@cosmjs/encoding";
// Synthetic test evidence only; never production configuration.
export function deployedFixture() {
  const contractAddress = toBech32("zig", new Uint8Array(32).fill(2));
  return {
    schemaVersion: 2,
    status: "DEPLOYED",
    environment: "testnet",
    chainId: "zig-test-2",
    chainVersion: "v5.0.0-patch-1",
    denom: "azig",
    decimals: 18,
    codeId: "7",
    contractAddress,
    wasmSha256: "ab".repeat(32),
    uploadTx: "12".repeat(32),
    instantiateTx: "34".repeat(32),
    deployerPublicAddress: toBech32("zig", new Uint8Array(20).fill(1)),
    migrationAdmin: null,
    pauseAdmin: null,
    contractName: "crates.io:zigoals-goal-manager",
    contractVersion: "0.1.0",
    gitCommit: "56".repeat(20),
    buildEnvironment: {
      platform: "linux",
      arch: "x64",
      rust: "1.85.1",
      binaryen: "123",
      cosmwasmCheck: "2.2.2",
      sourceDirty: false,
    },
    preparedAt: "2026-09-12T10:00:00.000Z",
    deploymentTimestamp: "2026-09-13T10:00:00.000Z",
    rpcUsed: "https://testnet-rpc.zigchain.com",
    restUsed: "https://testnet-api.zigchain.com",
    explorerVerification: {
      status: "VERIFIED",
      url: `https://testnet.zigscan.org/smart-contracts/contract/${contractAddress}`,
      verifiedAt: "2026-09-13T10:05:00.000Z",
    },
  };
}
