import { afterEach, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPreparedManifest } from "./lib/prepare-deployment.mjs";
import { schema } from "./release/manifest.mjs";
const bytes = Buffer.from("synthetic fixture bytes");
const hash = value => createHash("sha256").update(value).digest("hex");
const git = args => execFileSync("git", args, { encoding: "utf8" }).trim();
const expectedCommit = git(["rev-parse", "HEAD"]);
const source = {
  commit: expectedCommit,
  tree: git(["rev-parse", "HEAD^{tree}"]),
  cargoLockSha256: hash(execFileSync("git", ["show", "HEAD:Cargo.lock"])),
  sourceDateEpoch: Number(git(["show", "-s", "--format=%ct", "HEAD"])),
};
const candidate = () => ({
  schemaVersion: 2, status: "REPRODUCIBLE", approval: "NOT_APPROVED", source,
  environment: { ...Object.fromEntries(Object.entries(schema.properties.environment.properties).filter(([, rule]) => "const" in rule).map(([key, rule]) => [key, rule.const])), osRelease: "fixture-kernel" },
  artifact: { name: "zigoals_goal_manager.wasm", sha256: hash(bytes), sizeBytes: bytes.length },
  independentBuildCount: 2,
  builds: ["a", "b"].map(job => ({ repository: "owner/repo", runId: "123", runAttempt: "1", job, runner: { imageVersion: job === "a" ? "20260920.314.1" : "20260907.300.1" }, builtAt: "2026-09-13T00:00:00.000Z", validation: { tool: "cosmwasm-check", version: "2.2.2", passed: true } })),
});
test("canonical preparation retains actual artifact identity and leaves every live field null", () => {
  const m = buildPreparedManifest({ bytes, candidate: candidate(), expectedCommit });
  expect(m).toMatchObject({
    status: "PREPARED_NOT_DEPLOYED", codeId: null, contractAddress: null,
    migrationAdmin: null, pauseAdmin: null, uploadTx: null, instantiateTx: null,
    deployerPublicAddress: null, deploymentTimestamp: null,
    explorerVerification: { status: "NOT_VERIFIED", url: null, verifiedAt: null },
    gitCommit: expectedCommit, wasmSha256: hash(bytes),
    buildEnvironment: { platform: "linux", arch: "x64", rust: "1.85.1", binaryen: "123", cosmwasmCheck: "2.2.2", sourceDirty: false },
  });
});
test.each(["DEVELOPMENT_ONLY", "BUILD_VERIFIED"])("refuses %s evidence", status => {
  const report = candidate(); report.status = status; report.independentBuildCount = 1; report.builds.pop();
  expect(() => buildPreparedManifest({ bytes, candidate: report, expectedCommit })).toThrow();
});
test("refuses the legacy developer report even when its actual checksum matches", () => {
  const report = { artifact: "artifacts/zigoals_goal_manager.wasm", sha256: hash(bytes), bytes: bytes.length, sourceCommit: expectedCommit, sourceDirty: false, validation: { passed: true }, environment: { platform: "darwin", arch: "arm64", rust: "rustc 1.85.1 (fixture)", binaryen: "wasm-opt version 123 (version_123)", cosmwasmCheck: "Contract checking 2.2.2" } };
  expect(() => buildPreparedManifest({ bytes, candidate: report, expectedCommit })).toThrow();
});
test("refuses same-length tampering and independently expected source mismatch", () => {
  const changed = Buffer.from(bytes); changed[0] ^= 1;
  expect(() => buildPreparedManifest({ bytes: changed, candidate: candidate(), expectedCommit })).toThrow();
  expect(() => buildPreparedManifest({ bytes, candidate: candidate(), expectedCommit: "a".repeat(40) })).toThrow();
});
const directories = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
test.each([
  ["single", "Candidate requires two independently verified builds"],
  ["bytes", "Actual Wasm bytes/hash/size mismatch"],
  ["source", "Source tree, Cargo.lock or source-date epoch differs from the trusted commit"],
  ["environment", "manifest.environment.node: wrong constant"],
  ["validator", "spawnSync /nonexistent/trusted-validator ENOENT"],
])("CLI preparation rejects %s before any network request", async (kind, expectedError) => {
  const { prepareDeployment } = await import("./prepare-deployment.mjs");
  const dir = mkdtempSync(join(tmpdir(), "zigoals-preparation-")); directories.push(dir);
  const report = candidate(); const wasm = Buffer.from(bytes);
  if (kind === "single") { report.status = "BUILD_VERIFIED"; report.independentBuildCount = 1; report.builds.pop(); }
  if (kind === "bytes") wasm[0] ^= 1;
  if (kind === "source") report.source = { ...source, tree: "f".repeat(40) };
  if (kind === "environment") report.environment.node = "0.0.0";
  writeFileSync(join(dir, "artifact-manifest.json"), JSON.stringify(report));
  writeFileSync(join(dir, "zigoals_goal_manager.wasm"), wasm);
  const fetcher = vi.fn();
  await expect(prepareDeployment({ expectedCommit, candidateDir: dir, validator: "/nonexistent/trusted-validator" }, fetcher)).rejects.toThrow(expectedError);
  expect(fetcher).not.toHaveBeenCalled();
});
