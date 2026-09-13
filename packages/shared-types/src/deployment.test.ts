import { expect, test } from "vitest";
import { deployedFixture } from "./deployment.fixture";
import { deploymentSchema, requireDeployedManifest } from "./deployment";

test("complete deployed evidence is accepted; it remains structurally validated rather than chain-proven", () => {
  expect(requireDeployedManifest(deployedFixture()).codeId).toBe("7");
});
test("prepared manifests retain null live identities and cannot enable actions", () => {
  const p = {
    ...deployedFixture(),
    status: "PREPARED_NOT_DEPLOYED",
    codeId: null,
    contractAddress: null,
    uploadTx: null,
    instantiateTx: null,
    deployerPublicAddress: null,
    deploymentTimestamp: null,
    explorerVerification: {
      status: "NOT_VERIFIED",
      url: null,
      verifiedAt: null,
    },
  };
  expect(deploymentSchema.safeParse(p).success).toBe(true);
  expect(() => requireDeployedManifest(p)).toThrow(/not deployed/i);
  expect(deploymentSchema.safeParse({ ...p, codeId: "7" }).success).toBe(false);
});
test.each([
  { schemaVersion: 1 },
  { environment: "mainnet" },
  { chainId: "zig-1" },
  { chainVersion: "v4" },
  { denom: "uzig" },
  { decimals: 6 },
  { codeId: "9007199254740992" },
  { codeId: "0" },
  { contractAddress: "zig1fake" },
  { deployerPublicAddress: "zig1fake" },
  { migrationAdmin: "zig1fake" },
  { pauseAdmin: "zig1fake" },
  { wasmSha256: "0".repeat(64) },
  { uploadTx: null },
  { instantiateTx: "no" },
  { deploymentTimestamp: "2026-02-30T00:00:00.000Z" },
  { deploymentTimestamp: "9999-01-01T00:00:00.000Z" },
  { contractName: "other" },
  { contractVersion: "9.0.0" },
  { gitCommit: "pending" },
  { rpcUsed: "https://other.example" },
  {
    explorerVerification: {
      status: "VERIFIED",
      url: "https://evil.example",
      verifiedAt: "2026-09-13T10:05:00.000Z",
    },
  },
  { mnemonic: "fixture" },
  {
    buildEnvironment: {
      ...deployedFixture().buildEnvironment,
      sourceDirty: true,
    },
  },
])(
  "malformed, partial, incompatible or unsafe deployed evidence fails closed: %j",
  (patch) => {
    expect(
      deploymentSchema.safeParse({ ...deployedFixture(), ...patch }).success,
    ).toBe(false);
  },
);
test("unknown nested fields and incorrect contract explorer path are refused", () => {
  const f = deployedFixture();
  expect(
    deploymentSchema.safeParse({
      ...f,
      buildEnvironment: { ...f.buildEnvironment, key: "fixture" },
    }).success,
  ).toBe(false);
  expect(
    deploymentSchema.safeParse({
      ...f,
      explorerVerification: {
        ...f.explorerVerification,
        url: f.explorerVerification.url + "x",
      },
    }).success,
  ).toBe(false);
});
