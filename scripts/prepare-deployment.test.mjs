import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import { buildPreparedManifest } from "./lib/prepare-deployment.mjs";
const bytes = Buffer.from("synthetic fixture bytes");
const report = () => ({
  artifact: "artifacts/zigoals_goal_manager.wasm",
  sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: bytes.length,
  sourceCommit: "ab".repeat(20),
  sourceDirty: false,
  validation: { passed: true },
  environment: {
    platform: "linux",
    arch: "x64",
    rust: "rustc 1.85.1 (fixture)",
    binaryen: "wasm-opt version 123 (version_123)",
    cosmwasmCheck: "Contract checking 2.2.2",
  },
});
test("preparation hashes actual bytes and leaves all live deployment fields empty", () => {
  const m = buildPreparedManifest(bytes, report());
  expect(m).toMatchObject({
    status: "PREPARED_NOT_DEPLOYED",
    codeId: null,
    contractAddress: null,
    migrationAdmin: null,
    uploadTx: null,
    instantiateTx: null,
  });
  expect(m.wasmSha256).toBe(report().sha256);
});
test.each([
  { sha256: "00".repeat(32) },
  { bytes: 123 },
  { validation: { passed: false } },
  { environment: {} },
])("mismatched or unvalidated build evidence cannot prepare %j", (patch) => {
  expect(() =>
    buildPreparedManifest(bytes, { ...report(), ...patch }),
  ).toThrow();
});
